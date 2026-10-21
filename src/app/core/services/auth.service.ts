import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, share, EMPTY, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, InvitationTokenResponse, LoginRequest, MeResponse, RefreshRequest, RegisterRequest } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'ct_access_token';
const REFRESH_TOKEN_KEY = 'ct_refresh_token';
const USER_KEY = 'ct_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly accountUrl = `${environment.apiUrl}/account`;

  private currentUser = signal<MeResponse | null>(this.loadUser());
  private refreshInFlight$: Observable<AuthResponse> | null = null;
  private lastRoleSyncAt = 0;
  private static readonly ROLE_SYNC_INTERVAL_MS = 60_000;

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly agencyPublicId = computed(() => this.currentUser()?.agencyPublicId ?? '');
  readonly userRole = computed(() => this.currentUser()?.role ?? '');
  readonly employeePublicId = computed(() => this.currentUser()?.employeePublicId ?? null);
  readonly isEmployee = computed(() => this.currentUser()?.role === 'EMPLOYEE');
  readonly isAdmin = computed(() => ['OWNER', 'ADMIN'].includes(this.currentUser()?.role ?? ''));
  /** True when an admin assigned a temporary password and the user must set a new one. */
  readonly mustChangePassword = computed(() => this.currentUser()?.mustChangePassword === true);

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(res => this.storeTokens(res))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request).pipe(
      tap(res => this.storeTokens(res))
    );
  }

  /** Public lookup used by the register page to resolve an invitation token. */
  validateInvitationToken(token: string): Observable<InvitationTokenResponse> {
    return this.http.get<InvitationTokenResponse>(
      `${environment.apiUrl}/invitations/by-token`, { params: { token } });
  }

  refreshToken(): Observable<AuthResponse> {
    // Share a single in-flight refresh across concurrent 401s
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.sessionExpired();
      return EMPTY;
    }

    const request: RefreshRequest = { refreshToken };
    this.refreshInFlight$ = this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, request).pipe(
      tap(res => this.storeTokens(res)),
      finalize(() => this.refreshInFlight$ = null),
      share()
    );
    return this.refreshInFlight$;
  }

  loadMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  /**
   * F-11: fire-and-forget reconcile of the cached user with the backend so a
   * server-side role change doesn't leave the UI on a stale (e.g. admin) role
   * until the next login. Throttled so it doesn't issue a /me on every
   * navigation. When the role actually changed, the cache (and all role signals)
   * updates and the user is routed to the home matching their new role.
   */
  syncUserFromServer(force = false): void {
    if (!this.hasValidAccessToken()) {
      return;
    }
    const now = Date.now();
    if (!force && now - this.lastRoleSyncAt < AuthService.ROLE_SYNC_INTERVAL_MS) {
      return;
    }
    this.lastRoleSyncAt = now;
    const previousRole = this.currentUser()?.role ?? '';
    this.loadMe().subscribe({
      next: user => {
        if (user.role !== previousRole) {
          const target = user.role === 'EMPLOYEE' ? '/my-profile' : '/dashboard';
          this.router.navigate([target]);
        }
      },
      // Leave the cache untouched on error; the HTTP interceptor handles 401/expiry.
      error: () => { /* ignore */ }
    });
  }

  /** Update the logged-in user's own profile (name + email); refreshes the session user. */
  updateProfile(fullName: string, email: string): Observable<MeResponse> {
    return this.http.put<MeResponse>(`${this.accountUrl}/profile`, { fullName, email }).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  /** Change the logged-in user's own password (current → new). */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.accountUrl}/change-password`, { currentPassword, newPassword });
  }

  /** Self-service password reset request. Backend always returns 204 (anti-enumeration). */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  /** Stores the tokens of a session obtained outside this service (e.g. applicant setup-password). */
  acceptSession(res: AuthResponse): void {
    this.storeTokens(res);
  }

  logout(): void {
    // Best-effort server-side revocation of the refresh token — fire and
    // forget: local cleanup must happen regardless of the outcome.
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http.post<void>(`${this.apiUrl}/logout`, { refreshToken })
        .subscribe({ error: () => { /* ignore */ } });
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /** Called by the interceptor when both tokens are expired. Clears state and redirects to login. */
  sessionExpired(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login'], { queryParams: { expired: '1' } });
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /** Returns true if the token is valid (present and not expired). */
  hasValidAccessToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  /** Decodes the JWT and checks if the exp claim is in the past. */
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Expired if less than 30 seconds remaining (buffer for network latency)
      return (payload.exp * 1000) <= (Date.now() + 30_000);
    } catch {
      return true;
    }
  }

  private storeTokens(res: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
  }

  private loadUser(): MeResponse | null {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}
