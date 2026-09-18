import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();

  // No token at all → login
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // Token present and not expired → allow
  if (!authService.isTokenExpired(token)) {
    return true;
  }

  // Token expired — try silent refresh before blocking the route
  if (authService.getRefreshToken()) {
    return authService.refreshToken().pipe(
      map(() => true),
      catchError(() => {
        authService.sessionExpired();
        return of(false);
      })
    );
  }

  // No refresh token either → session fully expired
  authService.sessionExpired();
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasValidAccessToken()) {
    return true;
  }

  const target = authService.isEmployee() ? '/my-profile' : '/dashboard';
  router.navigate([target]);
  return false;
};
