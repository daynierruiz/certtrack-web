import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Observable, of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse, InvitationTokenResponse, MeResponse } from '../../../core/models/auth.model';

function getTranslocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: {
      en: {
        invitation: {
          register: {
            noToken: 'No invitation token provided.',
            invalidLink: 'Invalid or expired invitation.',
            submitError: 'Failed to create your account. Please try again.',
            signedInSnack: 'Signed in',
            gotIt: 'Got it'
          }
        }
      }
    },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
      missingHandler: { logMissingKey: false, useFallbackTranslation: false, allowEmpty: true }
    },
    preloadLangs: true
  });
}

function makeInvitation(): InvitationTokenResponse {
  return { email: 'invitee@care.com', agencyPublicId: 'ag-1', agencyName: 'Care Agency', role: 'EMPLOYEE' };
}

function makeAuthResponse(): AuthResponse {
  return { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600, userPublicId: 'u-1', agencyPublicId: 'ag-1', role: 'EMPLOYEE' };
}

function makeMe(role: string): MeResponse {
  return {
    userPublicId: 'u-1', agencyPublicId: 'ag-1', agencyName: 'Care Agency',
    employeePublicId: role === 'EMPLOYEE' ? 'emp-1' : null,
    email: 'invitee@care.com', fullName: 'Invitee', role
  };
}

describe('RegisterComponent', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let navigateSpy: jasmine.Spy;

  function setup(
    queryParams: Record<string, string> = { token: 'raw-token' },
    invitationResult: Observable<InvitationTokenResponse> = of(makeInvitation())
  ): RegisterComponent {
    authService = jasmine.createSpyObj<AuthService>(
      'AuthService', ['validateInvitationToken', 'register', 'acceptSession', 'loadMe']);
    // Must be stubbed before the fixture is created: ngOnInit (triggered by
    // detectChanges below) calls validateInvitationToken immediately when a
    // token is present, so the spy needs a return value in place first.
    authService.validateInvitationToken.and.returnValue(invitationResult);
    TestBed.configureTestingModule({
      imports: [RegisterComponent, getTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } }
      ]
    });
    const router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('sin token en la URL: muestra invalidToken sin llamar al backend', () => {
    const component = setup({});

    expect(component.invalidToken).toBeTrue();
    expect(component.validating).toBeFalse();
    expect(authService.validateInvitationToken).not.toHaveBeenCalled();
  });

  it('token válido: prellena email/agencia desde la respuesta del backend', () => {
    const component = setup();

    expect(component.email).toBe('invitee@care.com');
    expect(component.agencyPublicId).toBe('ag-1');
    expect(component.agencyName).toBe('Care Agency');
    expect(component.validating).toBeFalse();
    expect(component.invalidToken).toBeFalse();
  });

  it('token inválido/expirado: muestra el mensaje del backend', () => {
    const component = setup(
      { token: 'raw-token' },
      throwError(() => ({ error: { message: 'Invalid or expired invitation.' } })));

    expect(component.invalidToken).toBeTrue();
    expect(component.errorMessage).toBe('Invalid or expired invitation.');
  });

  it('contraseñas no coinciden: onSubmit no llama a register', () => {
    const component = setup();
    component.password = 'password1';
    component.confirmPassword = 'password2';

    component.onSubmit();

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('registro OK con rol EMPLOYEE: acepta sesión y navega a /my-profile', () => {
    const component = setup();
    component.fullName = 'Invitee Name';
    component.password = 'secret123';
    component.confirmPassword = 'secret123';
    authService.register.and.returnValue(of(makeAuthResponse()));
    authService.loadMe.and.returnValue(of(makeMe('EMPLOYEE')));

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith({
      agencyPublicId: 'ag-1', email: 'invitee@care.com',
      password: 'secret123', fullName: 'Invitee Name', invitationToken: 'raw-token'
    });
    expect(authService.acceptSession).toHaveBeenCalledWith(jasmine.any(Object));
    expect(navigateSpy).toHaveBeenCalledWith(['/my-profile']);
  });

  it('registro OK con rol ADMIN: navega a /dashboard', () => {
    const component = setup(
      { token: 'raw-token' }, of({ ...makeInvitation(), role: 'ADMIN' }));
    component.fullName = 'Admin Name';
    component.password = 'secret123';
    component.confirmPassword = 'secret123';
    authService.register.and.returnValue(of(makeAuthResponse()));
    authService.loadMe.and.returnValue(of(makeMe('ADMIN')));

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('error al registrar: muestra el mensaje del backend y apaga loading', () => {
    const component = setup();
    component.fullName = 'Invitee Name';
    component.password = 'secret123';
    component.confirmPassword = 'secret123';
    authService.register.and.returnValue(throwError(() => ({ error: { message: 'Email already registered.' } })));

    component.onSubmit();

    expect(component.submitError).toBe('Email already registered.');
    expect(component.loading).toBeFalse();
  });
});
