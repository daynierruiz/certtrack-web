import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { authGuard, guestGuard } from './auth.guard';
import { AuthResponse, MeResponse } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'ct_access_token';
const REFRESH_TOKEN_KEY = 'ct_refresh_token';
const USER_KEY = 'ct_user';

const REFRESH_RES: AuthResponse = {
  accessToken: 'refreshed-access',
  refreshToken: 'refreshed-refresh',
  expiresIn: 900,
  userPublicId: 'u-1',
  agencyPublicId: 'ag-1',
  role: 'OWNER'
};

/** Builds a structurally valid (unsigned) JWT whose exp claim is controllable. */
function makeJwt(expEpochSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'u-1', exp: expEpochSeconds }));
  return `${header}.${payload}.fake-signature`;
}

function futureJwt(): string {
  return makeJwt(Math.floor(Date.now() / 1000) + 3600);
}

function expiredJwt(): string {
  return makeJwt(Math.floor(Date.now() / 1000) - 3600);
}

function seedUser(role: string): void {
  const user: MeResponse = {
    userPublicId: 'u-1',
    agencyPublicId: 'ag-1',
    agencyName: 'Acme Care',
    employeePublicId: role === 'EMPLOYEE' ? 'emp-1' : null,
    email: 'user@acme.com',
    fullName: 'User One',
    role,
    mustChangePassword: false
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

describe('auth guards', () => {
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

  function runGuard(guard: CanActivateFn): boolean | Observable<boolean> {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean | Observable<boolean>;
  }

  describe('authGuard', () => {
    it('redirects to /login and blocks when there is no access token', () => {
      const result = runGuard(authGuard);

      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('allows navigation with a valid (non-expired) token', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, futureJwt());

      expect(runGuard(authGuard)).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('with expired token and successful silent refresh emits true', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, expiredJwt());
      localStorage.setItem(REFRESH_TOKEN_KEY, 'valid-refresh');

      const result = runGuard(authGuard);
      expect(result instanceof Observable).toBeTrue();

      let value: boolean | undefined;
      (result as Observable<boolean>).subscribe(v => value = v);

      const req = httpMock.expectOne('/api/auth/refresh');
      expect(req.request.body).toEqual({ refreshToken: 'valid-refresh' });
      req.flush(REFRESH_RES);

      expect(value).toBeTrue();
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('refreshed-access');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('with expired token and failing refresh emits false and expires the session', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, expiredJwt());
      localStorage.setItem(REFRESH_TOKEN_KEY, 'revoked-refresh');

      const result = runGuard(authGuard);
      let value: boolean | undefined;
      (result as Observable<boolean>).subscribe(v => value = v);

      httpMock.expectOne('/api/auth/refresh')
        .flush({ message: 'revoked' }, { status: 401, statusText: 'Unauthorized' });

      expect(value).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    });

    it('with expired token and no refresh token blocks and expires the session', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, expiredJwt());

      const result = runGuard(authGuard);

      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
      httpMock.expectNone('/api/auth/refresh');
    });
  });

  describe('guestGuard', () => {
    it('allows navigation when the user is not logged in', () => {
      expect(runGuard(guestGuard)).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('allows navigation when the stored token is expired', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, expiredJwt());

      expect(runGuard(guestGuard)).toBeTrue();
    });

    it('redirects a logged-in EMPLOYEE to /my-profile', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, futureJwt());
      seedUser('EMPLOYEE');

      expect(runGuard(guestGuard)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/my-profile']);
    });

    it('redirects a logged-in admin-side user (OWNER) to /dashboard', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, futureJwt());
      seedUser('OWNER');

      expect(runGuard(guestGuard)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
