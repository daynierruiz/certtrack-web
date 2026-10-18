import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
    TranslocoModule
  ],
  template: `
    <div class="setup-container">
      <mat-card class="setup-card">
        <div class="lang-switch">
          @for (opt of languageService.options; track opt.code) {
            <button mat-button type="button" class="lang-btn"
                    [class.active]="languageService.activeLang() === opt.code"
                    (click)="languageService.use(opt.code)">
              {{ opt.label }}
            </button>
          }
        </div>
        <mat-card-header>
          <mat-card-title>
            <div class="logo">
              <img src="assets/logo.png" alt="CareReady" class="logo-img">
            </div>
          </mat-card-title>
          <mat-card-subtitle>{{ 'invitation.register.subtitle' | transloco }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (validating) {
            <div class="loading-center">
              <mat-spinner diameter="40"></mat-spinner>
              <p>{{ 'invitation.register.validating' | transloco }}</p>
            </div>
          } @else if (invalidToken) {
            <div class="error-container">
              <mat-icon class="error-icon">error</mat-icon>
              <h3>{{ 'invitation.register.invalidLinkTitle' | transloco }}</h3>
              <p>{{ errorMessage }}</p>
            </div>
          } @else {
            <p class="welcome-text">
              {{ 'invitation.register.welcome' | transloco: { agencyName, email } }}
            </p>

            <form (ngSubmit)="onSubmit()" #registerForm="ngForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'invitation.register.fullName' | transloco }}</mat-label>
                <input matInput [(ngModel)]="fullName" name="fullName" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'invitation.register.password' | transloco }}</mat-label>
                <input matInput [type]="hidePassword ? 'password' : 'text'"
                       [(ngModel)]="password" name="password" required minlength="8">
                <button mat-icon-button matSuffix type="button"
                        (click)="hidePassword = !hidePassword">
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-hint>{{ 'invitation.register.passwordHint' | transloco }}</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'invitation.register.confirmPassword' | transloco }}</mat-label>
                <input matInput [type]="hideConfirm ? 'password' : 'text'"
                       [(ngModel)]="confirmPassword" name="confirmPassword" required>
                <button mat-icon-button matSuffix type="button"
                        (click)="hideConfirm = !hideConfirm">
                  <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              @if (passwordMismatch) {
                <div class="error-message">{{ 'invitation.register.passwordMismatch' | transloco }}</div>
              }
              @if (submitError) {
                <div class="error-message">{{ submitError }}</div>
              }

              <button mat-raised-button color="primary" type="submit"
                      class="full-width submit-btn"
                      [disabled]="loading || !registerForm.valid || password.length < 8 || passwordMismatch">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  {{ 'invitation.register.createBtn' | transloco }}
                }
              </button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
      padding: 24px;
    }
    .setup-card { width: min(440px, 95vw); padding: 32px; }
    .lang-switch { display: flex; justify-content: flex-end; gap: 4px; margin: -8px -8px 4px 0; }
    .lang-btn { min-width: 0; padding: 0 10px; line-height: 30px; color: #5c6bc0; font-size: 13px; }
    .lang-btn.active { color: #1a237e; font-weight: 700; text-decoration: underline; }
    .logo { display: flex; align-items: center; gap: 8px; font-size: 24px; font-weight: 600; color: #1a237e; }
    .logo-img { max-width: 250px; height: auto; }
    .full-width { width: 100%; }
    .submit-btn { margin-top: 16px; height: 48px; font-size: 16px; }
    .welcome-text { color: #333; margin-bottom: 20px; font-size: 14px; }
    .error-message { color: #d32f2f; font-size: 14px; margin-bottom: 8px; text-align: center; }
    .loading-center { display: flex; flex-direction: column; align-items: center; padding: 32px 0; gap: 16px; color: #666; }
    .error-container { text-align: center; padding: 24px 0; }
    .error-icon { font-size: 48px; width: 48px; height: 48px; color: #d32f2f; }
    .error-container h3 { color: #d32f2f; }
    .error-container p { color: #666; }
    mat-card-header { margin-bottom: 24px; }
  `]
})
export class RegisterComponent implements OnInit {
  token = '';
  email = '';
  agencyPublicId = '';
  agencyName = '';
  fullName = '';
  password = '';
  confirmPassword = '';
  hidePassword = true;
  hideConfirm = true;

  validating = true;
  invalidToken = false;
  loading = false;
  errorMessage = '';
  submitError = '';

  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  constructor(
    private authService: AuthService,
    public languageService: LanguageService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.validating = false;
      this.invalidToken = true;
      this.errorMessage = this.transloco.translate('invitation.register.noToken');
      return;
    }

    this.authService.validateInvitationToken(this.token).subscribe({
      next: (res) => {
        this.email = res.email;
        this.agencyPublicId = res.agencyPublicId;
        this.agencyName = res.agencyName;
        this.validating = false;
      },
      error: (err) => {
        this.validating = false;
        this.invalidToken = true;
        this.errorMessage = err.error?.message || this.transloco.translate('invitation.register.invalidLink');
      }
    });
  }

  onSubmit(): void {
    if (this.passwordMismatch) return;

    this.loading = true;
    this.submitError = '';

    this.authService.register({
      agencyPublicId: this.agencyPublicId,
      email: this.email,
      password: this.password,
      fullName: this.fullName,
      invitationToken: this.token
    }).subscribe({
      next: (authRes) => {
        this.authService.acceptSession(authRes);
        this.authService.loadMe().subscribe({
          next: (me) => {
            this.router.navigate([me.role === 'EMPLOYEE' ? '/my-profile' : '/dashboard']);
            this.snackBar.open(
              this.transloco.translate('invitation.register.signedInSnack'),
              this.transloco.translate('invitation.register.gotIt'),
              { duration: 8000 }
            );
          },
          error: () => this.router.navigate(['/login'])
        });
      },
      error: (err) => {
        this.loading = false;
        this.submitError = err.error?.message || this.transloco.translate('invitation.register.submitError');
      }
    });
  }
}
