import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'ct_access_token';
const REFRESH_TOKEN_KEY = 'ct_refresh_token';

const REFRESH_RES: AuthResponse = {
  accessToken: 'refreshed-access',
  refreshToken: 'refreshed-refresh',
  expiresIn: 900,
  userPublicId: 'u-1',
  agencyPublicId: 'ag-1',
  role: 'OWNER'
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function setTokens(access = 'access-token', refresh = 'refresh-token'): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  describe('Authorization header rules', () => {
    it('adds a Bearer token to relative /api/* requests', () => {
      setTokens();
      http.get('/api/employees').subscribe();

      const req = httpMock.expectOne('/api/employees');
      expect(req.request.headers.get('Authorization')).toBe('Bearer access-token');
      req.flush([]);
    });

    it('does not add the header when there is no token', () => {
      http.get('/api/employees').subscribe();

      const req = httpMock.expectOne('/api/employees');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush([]);
    });

    it('does not touch absolute external URLs (http/https)', () => {
      setTokens();
      http.get('https://api.geoapify.com/v1/geocode').subscribe();
      http.get('http://example.com/data').subscribe();

      const httpsReq = httpMock.expectOne('https://api.geoapify.com/v1/geocode');
      const httpReq = httpMock.expectOne('http://example.com/data');
      expect(httpsReq.request.headers.has('Authorization')).toBeFalse();
      expect(httpReq.request.headers.has('Authorization')).toBeFalse();
      httpsReq.flush({});
      httpReq.flush({});
    });

    it('does not add the header to /api/auth/login nor /api/auth/refresh', () => {
      setTokens();
      http.post('/api/auth/login', {}).subscribe();
      http.post('/api/auth/refresh', {}).subscribe();

      const loginReq = httpMock.expectOne('/api/auth/login');
      const refreshReq = httpMock.expectOne('/api/auth/refresh');
      expect(loginReq.request.headers.has('Authorization')).toBeFalse();
      expect(refreshReq.request.headers.has('Authorization')).toBeFalse();
      loginReq.flush(REFRESH_RES);
      refreshReq.flush(REFRESH_RES);
    });

    it('DOES add the header to /api/auth/me (explicit exception)', () => {
      setTokens();
      http.get('/api/auth/me').subscribe();

      const req = httpMock.expectOne('/api/auth/me');
      expect(req.request.headers.get('Authorization')).toBe('Bearer access-token');
      req.flush({});
    });
  });

  describe('401 handling', () => {
    it('on 401 refreshes the token and retries the original request with the new one', () => {
      setTokens('stale-access', 'valid-refresh');
      let result: unknown;
      http.get('/api/employees').subscribe(res => result = res);

      const original = httpMock.expectOne('/api/employees');
      expect(original.request.headers.get('Authorization')).toBe('Bearer stale-access');
      original.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

      const refreshReq = httpMock.expectOne('/api/auth/refresh');
      expect(refreshReq.request.body).toEqual({ refreshToken: 'valid-refresh' });
      expect(refreshReq.request.headers.has('Authorization')).toBeFalse();
      refreshReq.flush(REFRESH_RES);

      const retried = httpMock.expectOne('/api/employees');
      expect(retried.request.headers.get('Authorization')).toBe('Bearer refreshed-access');
      retried.flush([{ id: 1 }]);

      expect(result).toEqual([{ id: 1 }]);
    });

    it('on 401 with failing refresh expires the session and rethrows the original 401', () => {
      setTokens('stale-access', 'revoked-refresh');
      const sessionExpiredSpy = spyOn(authService, 'sessionExpired');
      let errorStatus: number | undefined;

      http.get('/api/employees').subscribe({
        error: (err: HttpErrorResponse) => errorStatus = err.status
      });

      httpMock.expectOne('/api/employees')
        .flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });
      httpMock.expectOne('/api/auth/refresh')
        .flush({ message: 'revoked' }, { status: 401, statusText: 'Unauthorized' });

      expect(sessionExpiredSpy).toHaveBeenCalledTimes(1);
      expect(errorStatus).toBe(401);
    });

    it('on 401 without a refresh token expires the session directly (no refresh call)', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'stale-access');
      const sessionExpiredSpy = spyOn(authService, 'sessionExpired');
      let errorStatus: number | undefined;

      http.get('/api/employees').subscribe({
        error: (err: HttpErrorResponse) => errorStatus = err.status
      });

      httpMock.expectOne('/api/employees')
        .flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

      httpMock.expectNone('/api/auth/refresh');
      expect(sessionExpiredSpy).toHaveBeenCalledTimes(1);
      expect(errorStatus).toBe(401);
    });

    it('two concurrent 401s trigger a single POST /refresh and both requests retry', () => {
      setTokens('stale-access', 'valid-refresh');
      let resultA: unknown;
      let resultB: unknown;

      http.get('/api/employees').subscribe(res => resultA = res);
      http.get('/api/credentials').subscribe(res => resultB = res);

      httpMock.expectOne('/api/employees')
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      httpMock.expectOne('/api/credentials')
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      // expectOne throws if the refresh was not de-duplicated.
      const refreshReq = httpMock.expectOne('/api/auth/refresh');
      refreshReq.flush(REFRESH_RES);

      const retryA = httpMock.expectOne('/api/employees');
      const retryB = httpMock.expectOne('/api/credentials');
      expect(retryA.request.headers.get('Authorization')).toBe('Bearer refreshed-access');
      expect(retryB.request.headers.get('Authorization')).toBe('Bearer refreshed-access');
      retryA.flush({ list: 'a' });
      retryB.flush({ list: 'b' });

      expect(resultA).toEqual({ list: 'a' });
      expect(resultB).toEqual({ list: 'b' });
    });

    it('non-401 errors pass through without touching the session', () => {
      setTokens();
      const sessionExpiredSpy = spyOn(authService, 'sessionExpired');
      let errorStatus: number | undefined;

      http.get('/api/employees').subscribe({
        error: (err: HttpErrorResponse) => errorStatus = err.status
      });

      httpMock.expectOne('/api/employees')
        .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(errorStatus).toBe(500);
      expect(sessionExpiredSpy).not.toHaveBeenCalled();
      httpMock.expectNone('/api/auth/refresh');
    });
  });
});
