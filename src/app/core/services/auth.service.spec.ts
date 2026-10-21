import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse, MeResponse } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'ct_access_token';
const REFRESH_TOKEN_KEY = 'ct_refresh_token';
const USER_KEY = 'ct_user';

const AUTH_RES: AuthResponse = {
  accessToken: 'new-access',
  refreshToken: 'new-refresh',
  expiresIn: 900,
  userPublicId: 'u-1',
  agencyPublicId: 'ag-1',
  role: 'OWNER'
};

const ME: MeResponse = {
  userPublicId: 'u-1',
  agencyPublicId: 'ag-1',
  agencyName: 'Acme Care',
  employeePublicId: null,
  email: 'owner@acme.com',
  fullName: 'Owner One',
  role: 'OWNER',
  mustChangePassword: false
};

/** Builds a structurally valid (unsigned) JWT whose exp claim is controllable. */
function makeJwt(expEpochSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'u-1', exp: expEpochSeconds }));
  return `${header}.${payload}.fake-signature`;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function seedUser(overrides: Partial<MeResponse> = {}): MeResponse {
  const user: MeResponse = { ...ME, ...overrides };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  /** Lazy inject so tests can seed localStorage BEFORE the service is constructed. */
  function service(): AuthService {
    return TestBed.inject(AuthService);
  }

  describe('login', () => {
    it('POSTs credentials and stores both tokens in localStorage', () => {
      let received: AuthResponse | undefined;
      service().login({ email: 'owner@acme.com', password: 'secret' })
        .subscribe(res => received = res);

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'owner@acme.com', password: 'secret' });
      req.flush(AUTH_RES);

      expect(received).toEqual(AUTH_RES);
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-access');
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh');
    });

    it('does not store tokens when login fails', () => {
      service().login({ email: 'owner@acme.com', password: 'bad' })
        .subscribe({ error: () => { /* expected */ } });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'bad credentials' }, { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    });
  });

  describe('acceptSession', () => {
    it('stores tokens obtained outside the service (e.g. setup-password flow)', () => {
      service().acceptSession(AUTH_RES);

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-access');
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh');
    });
  });

  describe('loadMe', () => {
    it('GETs /auth/me, sets the user signal and persists ct_user', () => {
      const svc = service();
      svc.loadMe().subscribe();

      const req = httpMock.expectOne('/api/auth/me');
      expect(req.request.method).toBe('GET');
      req.flush(ME);

      expect(svc.user()).toEqual(ME);
      expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual(ME);
      expect(svc.isLoggedIn()).toBeTrue();
    });
  });

  describe('signal hydration from ct_user at construction', () => {
    it('hydrates the user signal from a valid stored ct_user', () => {
      const user = seedUser();
      expect(service().user()).toEqual(user);
    });

    it('does not throw on corrupt JSON in ct_user and leaves the user null', () => {
      localStorage.setItem(USER_KEY, '{not valid json');
      let svc!: AuthService;
      expect(() => svc = TestBed.inject(AuthService)).not.toThrow();
      expect(svc.user()).toBeNull();
      expect(svc.isLoggedIn()).toBeFalse();
    });

    it('starts with null user when nothing is stored', () => {
      const svc = service();
      expect(svc.user()).toBeNull();
      expect(svc.isLoggedIn()).toBeFalse();
      expect(svc.userRole()).toBe('');
      expect(svc.agencyPublicId()).toBe('');
      expect(svc.employeePublicId()).toBeNull();
    });
  });

  describe('isTokenExpired / hasValidAccessToken', () => {
    it('returns true for a token whose exp is in the past', () => {
      expect(service().isTokenExpired(makeJwt(nowSeconds() - 3600))).toBeTrue();
    });

    it('returns false for a token expiring well in the future', () => {
      expect(service().isTokenExpired(makeJwt(nowSeconds() + 3600))).toBeFalse();
    });

    it('treats a token with less than 30s remaining as expired (latency buffer)', () => {
      expect(service().isTokenExpired(makeJwt(nowSeconds() + 10))).toBeTrue();
    });

    it('does not apply the buffer beyond 30s (2 min remaining is valid)', () => {
      expect(service().isTokenExpired(makeJwt(nowSeconds() + 120))).toBeFalse();
    });

    it('returns true for a malformed token instead of throwing', () => {
      const svc = service();
      expect(svc.isTokenExpired('not-a-jwt')).toBeTrue();
      expect(svc.isTokenExpired('aaa.%%%not-base64%%%.ccc')).toBeTrue();
      expect(svc.isTokenExpired('')).toBeTrue();
    });

    it('hasValidAccessToken is false without a token and true with a fresh one', () => {
      const svc = service();
      expect(svc.hasValidAccessToken()).toBeFalse();
      localStorage.setItem(ACCESS_TOKEN_KEY, makeJwt(nowSeconds() + 3600));
      expect(svc.hasValidAccessToken()).toBeTrue();
      localStorage.setItem(ACCESS_TOKEN_KEY, makeJwt(nowSeconds() - 10));
      expect(svc.hasValidAccessToken()).toBeFalse();
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'old-access');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'old-refresh');
    });

    it('POSTs the stored refresh token and stores the new token pair', () => {
      let received: AuthResponse | undefined;
      service().refreshToken().subscribe(res => received = res);

      const req = httpMock.expectOne('/api/auth/refresh');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
      req.flush(AUTH_RES);

      expect(received).toEqual(AUTH_RES);
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-access');
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh');
    });

    it('de-duplicates concurrent calls: two subscriptions produce a single POST', () => {
      const svc = service();
      let first: AuthResponse | undefined;
      let second: AuthResponse | undefined;

      svc.refreshToken().subscribe(res => first = res);
      svc.refreshToken().subscribe(res => second = res);

      // expectOne throws if more than one /auth/refresh request is open.
      const req = httpMock.expectOne('/api/auth/refresh');
      req.flush(AUTH_RES);

      expect(first).toEqual(AUTH_RES);
      expect(second).toEqual(AUTH_RES);
    });

    it('returns EMPTY and expires the session when there is no refresh token', () => {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      let emitted = false;
      let completed = false;

      service().refreshToken().subscribe({
        next: () => emitted = true,
        complete: () => completed = true
      });

      expect(emitted).toBeFalse();
      expect(completed).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
      // No HTTP request must have been issued (httpMock.verify() in afterEach).
    });

    it('clears the in-flight observable after an error so a later call retries', () => {
      const svc = service();

      svc.refreshToken().subscribe({ error: () => { /* expected */ } });
      const firstReq = httpMock.expectOne('/api/auth/refresh');
      firstReq.flush({ message: 'revoked' }, { status: 401, statusText: 'Unauthorized' });

      // A new call after the failure must open a NEW request (not the dead one).
      svc.refreshToken().subscribe();
      const secondReq = httpMock.expectOne('/api/auth/refresh');
      secondReq.flush(AUTH_RES);

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-access');
    });
  });

  describe('sessionExpired', () => {
    it('clears tokens, user state and navigates to /login?expired=1', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'a');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'r');
      seedUser();
      const svc = service();
      expect(svc.user()).not.toBeNull();

      svc.sessionExpired();

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
      expect(svc.user()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
    });
  });

  describe('logout', () => {
    it('POSTs the refresh token to /auth/logout and clears everything locally', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'a');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'r');
      seedUser();
      const svc = service();

      svc.logout();

      // Local cleanup happens immediately, without waiting for the server.
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
      expect(svc.user()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);

      const req = httpMock.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'r' });
      req.flush(null);
    });

    it('still cleans up when the revocation POST fails (fire-and-forget)', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'a');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'r');
      const svc = service();

      svc.logout();
      const req = httpMock.expectOne('/api/auth/logout');
      expect(() => req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' }))
        .not.toThrow();

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('does not POST to /auth/logout when there is no refresh token', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'a');
      const svc = service();

      svc.logout();

      httpMock.expectNone('/api/auth/logout');
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('derived role signals', () => {
    it('OWNER is admin, not employee', () => {
      seedUser({ role: 'OWNER' });
      const svc = service();
      expect(svc.isAdmin()).toBeTrue();
      expect(svc.isEmployee()).toBeFalse();
      expect(svc.userRole()).toBe('OWNER');
    });

    it('ADMIN is admin, not employee', () => {
      seedUser({ role: 'ADMIN' });
      const svc = service();
      expect(svc.isAdmin()).toBeTrue();
      expect(svc.isEmployee()).toBeFalse();
    });

    it('VIEWER is neither admin nor employee', () => {
      seedUser({ role: 'VIEWER' });
      const svc = service();
      expect(svc.isAdmin()).toBeFalse();
      expect(svc.isEmployee()).toBeFalse();
    });

    it('EMPLOYEE is employee, not admin, and exposes employeePublicId/agencyPublicId', () => {
      seedUser({ role: 'EMPLOYEE', employeePublicId: 'emp-7' });
      const svc = service();
      expect(svc.isEmployee()).toBeTrue();
      expect(svc.isAdmin()).toBeFalse();
      expect(svc.employeePublicId()).toBe('emp-7');
      expect(svc.agencyPublicId()).toBe('ag-1');
    });
  });
});
