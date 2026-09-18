import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Don't touch external requests (e.g. Geoapify) — sending Authorization
  // to third-party APIs triggers CORS preflight and breaks the call.
  if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    return next(req);
  }

  // Don't add token to auth endpoints (except /me)
  if (req.url.includes('/api/auth/') && !req.url.includes('/api/auth/me')) {
    return next(req);
  }

  const token = authService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (authService.getRefreshToken()) {
          return authService.refreshToken().pipe(
            switchMap(res => {
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.accessToken}` }
              });
              return next(newReq);
            }),
            catchError(() => {
              authService.sessionExpired();
              return throwError(() => error);
            })
          );
        }
        // No refresh token available - session fully expired
        authService.sessionExpired();
      }
      return throwError(() => error);
    })
  );
};
