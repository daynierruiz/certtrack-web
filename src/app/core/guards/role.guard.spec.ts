import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { adminGuard, employeeGuard } from './role.guard';
import { MeResponse } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'ct_access_token';
const REFRESH_TOKEN_KEY = 'ct_refresh_token';
const USER_KEY = 'ct_user';

function seedUser(role: string): void {
  const user: MeResponse = {
    userPublicId: 'u-1',
    agencyPublicId: 'ag-1',
    agencyName: 'Acme Care',
    employeePublicId: role === 'EMPLOYEE' ? 'emp-1' : null,
    email: 'user@acme.com',
    fullName: 'User One',
    role
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

describe('role guards', () => {
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

  function runGuard(guard: CanActivateFn): boolean {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as boolean;
  }

  function expectSessionExpired(): void {
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  }

  describe('adminGuard', () => {
    it('allows OWNER', () => {
      seedUser('OWNER');
      expect(runGuard(adminGuard)).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('allows ADMIN', () => {
      seedUser('ADMIN');
      expect(runGuard(adminGuard)).toBeTrue();
    });

    it('allows VIEWER', () => {
      seedUser('VIEWER');
      expect(runGuard(adminGuard)).toBeTrue();
    });

    it('redirects EMPLOYEE to /my-profile and blocks', () => {
      seedUser('EMPLOYEE');
      expect(runGuard(adminGuard)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/my-profile']);
    });

    it('unknown role expires the session and blocks (anti redirect-loop fix)', () => {
      seedUser('SUPERVISOR');
      expect(runGuard(adminGuard)).toBeFalse();
      expectSessionExpired();
      expect(router.navigate).not.toHaveBeenCalledWith(['/my-profile']);
    });

    it('empty role (no stored user) expires the session and blocks', () => {
      expect(runGuard(adminGuard)).toBeFalse();
      expectSessionExpired();
    });
  });

  describe('employeeGuard', () => {
    it('allows EMPLOYEE', () => {
      seedUser('EMPLOYEE');
      expect(runGuard(employeeGuard)).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('redirects ADMIN to /dashboard and blocks', () => {
      seedUser('ADMIN');
      expect(runGuard(employeeGuard)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('redirects OWNER to /dashboard and blocks', () => {
      seedUser('OWNER');
      expect(runGuard(employeeGuard)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('unknown role expires the session and blocks (anti redirect-loop fix)', () => {
      seedUser('SUPERVISOR');
      expect(runGuard(employeeGuard)).toBeFalse();
      expectSessionExpired();
      expect(router.navigate).not.toHaveBeenCalledWith(['/dashboard']);
    });

    it('empty role (no stored user) expires the session and blocks', () => {
      expect(runGuard(employeeGuard)).toBeFalse();
      expectSessionExpired();
    });
  });
});
