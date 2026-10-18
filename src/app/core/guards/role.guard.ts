import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const KNOWN_ROLES = ['OWNER', 'ADMIN', 'VIEWER', 'EMPLOYEE'];

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.userRole();
  if (['OWNER', 'ADMIN', 'VIEWER'].includes(role)) {
    return true;
  }

  if (!KNOWN_ROLES.includes(role)) {
    // Empty/unknown role means the session state is broken — sending the user
    // to another guarded route would ping-pong between guards forever.
    authService.sessionExpired();
    return false;
  }

  router.navigate(['/my-profile']);
  return false;
};

export const employeeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isEmployee()) {
    return true;
  }

  const role = authService.userRole();
  if (!KNOWN_ROLES.includes(role)) {
    // Same as above: never redirect a broken session to another guarded route.
    authService.sessionExpired();
    return false;
  }

  router.navigate(['/dashboard']);
  return false;
};
