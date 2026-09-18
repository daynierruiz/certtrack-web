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
import { ApplicantService } from '../../../core/services/applicant.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-set-password',
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
          <mat-card-subtitle>{{ 'applicant.setPassword.subtitle' | transloco }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (validating) {
            <div class="loading-center">
              <mat-spinner diameter="40"></mat-spinner>
              <p>{{ 'applicant.setPassword.validating' | transloco }}</p>
            </div>
          } @else if (invalidToken) {
            <div class="error-container">
              <mat-icon class="error-icon">error</mat-icon>
              <h3>{{ 'applicant.setPassword.invalidLinkTitle' | transloco }}</h3>
              <p>{{ errorMessage }}</p>
            </div>
          } @else {
            <p class="welcome-text">
              {{ 'applicant.setPassword.welcome' | transloco: { email: email } }}
            </p>

            <form (ngSubmit)="onSubmit()" #setupForm="ngForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'applicant.setPassword.password' | transloco }}</mat-label>
                <input matInput [type]="hidePassword ? 'password' : 'text'"
                       [(ngModel)]="password" name="password" required minlength="8">
                <button mat-icon-button matSuffix type="button"
                        (click)="hidePassword = !hidePassword">
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-hint>{{ 'applicant.setPassword.passwordHint' | transloco }}</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'applicant.setPassword.confirmPassword' | transloco }}</mat-label>
                <input matInput [type]="hideConfirm ? 'password' : 'text'"
                       [(ngModel)]="confirmPassword" name="confirmPassword" required>
                <button mat-icon-button matSuffix type="button"
                        (click)="hideConfirm = !hideConfirm">
                  <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>

              @if (passwordMismatch) {
                <div class="error-message">{{ 'applicant.setPassword.passwordMismatch' | transloco }}</div>
              }
              @if (submitError) {
                <div class="error-message">{{ submitError }}</div>
              }

              <button mat-raised-button color="primary" type="submit"
                      class="full-width submit-btn"
                      [disabled]="loading || !setupForm.valid || password.length < 8">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  {{ 'applicant.setPassword.createBtn' | transloco }}
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
    .setup-card {
      width: min(440px, 95vw);
      padding: 32px;
    }
    .lang-switch {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin: -8px -8px 4px 0;
    }
    .lang-btn {
      min-width: 0;
      padding: 0 10px;
      line-height: 30px;
      color: #5c6bc0;
      font-size: 13px;
    }
    .lang-btn.active {
      color: #1a237e;
      font-weight: 700;
      text-decoration: underline;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      font-weight: 600;
      color: #1a237e;
    }
    .logo-img { max-width: 250px; height: auto; }
    .full-width { width: 100%; }
    .submit-btn {
      margin-top: 16px;
      height: 48px;
      font-size: 16px;
    }
    .welcome-text {
      color: #333;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .error-message {
      color: #d32f2f;
      font-size: 14px;
      margin-bottom: 8px;
      text-align: center;
    }
    .loading-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 0;
      gap: 16px;
      color: #666;
    }
    .error-container {
      text-align: center;
      padding: 24px 0;
    }
    .error-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #d32f2f;
    }
    .error-container h3 { color: #d32f2f; }
    .error-container p { color: #666; }
    mat-card-header { margin-bottom: 24px; }
  `]
})
export class SetPasswordComponent implements OnInit {
  token = '';
  email = '';
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
    private applicantService: ApplicantService,
    public languageService: LanguageService,
    private authService: AuthService,
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
      this.errorMessage = this.transloco.translate('applicant.setPassword.noToken');
      return;
    }

    this.applicantService.validateSetupToken(this.token).subscribe({
      next: (res) => {
        this.email = res.email;
        this.validating = false;
      },
      error: (err) => {
        this.validating = false;
        this.invalidToken = true;
        this.errorMessage = err.error?.message || this.transloco.translate('applicant.setPassword.invalidLink');
      }
    });
  }

  onSubmit(): void {
    if (this.password !== this.confirmPassword) return;

    this.loading = true;
    this.submitError = '';

    this.applicantService.setupPassword({ token: this.token, password: this.password }).subscribe({
      next: (authRes) => {
        // Store tokens and redirect to my-profile
        localStorage.setItem('ct_access_token', authRes.accessToken);
        localStorage.setItem('ct_refresh_token', authRes.refreshToken);
        this.authService.loadMe().subscribe({
          next: () => {
            this.router.navigate(['/my-profile']);
            // Persists across the navigation — reminds them how to return later.
            this.snackBar.open(
              this.transloco.translate('applicant.setPassword.signedInSnack'),
              this.transloco.translate('applicant.setPassword.gotIt'),
              { duration: 8000 }
            );
          },
          error: () => this.router.navigate(['/login'])
        });
      },
      error: (err) => {
        this.loading = false;
        this.submitError = err.error?.message || this.transloco.translate('applicant.setPassword.submitError');
      }
    });
  }
}
