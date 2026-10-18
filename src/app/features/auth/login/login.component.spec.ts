import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Subject, of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse, MeResponse } from '../../../core/models/auth.model';

function getTranslocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: {
      en: {
        auth: {
          sessionExpired: 'Session expired',
          invalidCredentials: 'Invalid credentials'
        }
      }
    },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
      missingHandler: {
        logMissingKey: false,
        useFallbackTranslation: false,
        allowEmpty: true
      }
    },
    preloadLangs: true
  });
}

function makeAuthResponse(): AuthResponse {
  return {
    accessToken: 'at',
    refreshToken: 'rt',
    expiresIn: 3600,
    userPublicId: 'u-1',
    agencyPublicId: 'ag-1',
    role: 'ADMIN'
  };
}

function makeMe(role: string): MeResponse {
  return {
    userPublicId: 'u-1',
    agencyPublicId: 'ag-1',
    agencyName: 'Care Agency',
    employeePublicId: role === 'EMPLOYEE' ? 'emp-1' : null,
    email: 'user@test.com',
    fullName: 'User Test',
    role
  };
}

describe('LoginComponent', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let navigateSpy: jasmine.Spy;

  function setup(queryParams: Record<string, string> = {}): LoginComponent {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'loadMe']);
    TestBed.configureTestingModule({
      imports: [LoginComponent, getTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } }
      ]
    });
    const router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('muestra el aviso de sesión expirada con ?expired=1', () => {
    const component = setup({ expired: '1' });
    expect(component.sessionExpiredMessage).toBe('Session expired');
  });

  it('sin query param expired no muestra el aviso', () => {
    const component = setup();
    expect(component.sessionExpiredMessage).toBe('');
  });

  it('login OK con rol ADMIN navega a /dashboard', () => {
    const component = setup();
    authService.login.and.returnValue(of(makeAuthResponse()));
    authService.loadMe.and.returnValue(of(makeMe('ADMIN')));
    component.email = 'admin@care.com';
    component.password = 'secret';

    component.onLogin();

    expect(authService.login).toHaveBeenCalledWith({ email: 'admin@care.com', password: 'secret' });
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(component.errorMessage).toBe('');
  });

  it('login OK con rol OWNER también navega a /dashboard', () => {
    const component = setup();
    authService.login.and.returnValue(of(makeAuthResponse()));
    authService.loadMe.and.returnValue(of(makeMe('OWNER')));

    component.onLogin();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('login OK con rol EMPLOYEE navega a /my-profile', () => {
    const component = setup();
    authService.login.and.returnValue(of(makeAuthResponse()));
    authService.loadMe.and.returnValue(of(makeMe('EMPLOYEE')));

    component.onLogin();

    expect(navigateSpy).toHaveBeenCalledWith(['/my-profile']);
  });

  it('error de credenciales: muestra el mensaje del backend y apaga loading', () => {
    const component = setup();
    authService.login.and.returnValue(throwError(() => ({ error: { message: 'Bad credentials' } })));

    component.onLogin();

    expect(component.errorMessage).toBe('Bad credentials');
    expect(component.loading).toBeFalse();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('error de credenciales sin cuerpo: usa el mensaje traducido por defecto', () => {
    const component = setup();
    authService.login.and.returnValue(throwError(() => ({ status: 401 })));

    component.onLogin();

    expect(component.errorMessage).toBe('Invalid credentials');
    expect(component.loading).toBeFalse();
  });

  it('loadMe falla tras login OK: NO navega y lo trata como login fallido (fix anti-bucle)', () => {
    const component = setup();
    authService.login.and.returnValue(of(makeAuthResponse()));
    authService.loadMe.and.returnValue(throwError(() => ({ status: 500 })));

    component.onLogin();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBe('Invalid credentials');
  });

  it('loadMe falla con mensaje del backend: lo muestra tal cual', () => {
    const component = setup();
    authService.login.and.returnValue(of(makeAuthResponse()));
    authService.loadMe.and.returnValue(throwError(() => ({ error: { message: 'Profile unavailable' } })));

    component.onLogin();

    expect(component.errorMessage).toBe('Profile unavailable');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('mientras el login está en vuelo: loading activo y error limpio', () => {
    const component = setup();
    const inFlight = new Subject<AuthResponse>();
    authService.login.and.returnValue(inFlight.asObservable());
    component.errorMessage = 'previo';

    component.onLogin();

    expect(component.loading).toBeTrue();
    expect(component.errorMessage).toBe('');
  });
});
