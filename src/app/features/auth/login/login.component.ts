import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslocoModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <div class="logo">
              <img src="assets/logo.png" alt="CareReady" class="logo-img">
            </div>
          </mat-card-title>
          <mat-card-subtitle>{{ 'auth.subtitle' | transloco }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form (ngSubmit)="onLogin()" #loginForm="ngForm">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.email' | transloco }}</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email"
                     required email placeholder="admin@carereadyhr.com">
              <mat-icon matSuffix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.password' | transloco }}</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'"
                     [(ngModel)]="password" name="password" required>
              <button mat-icon-button matSuffix type="button"
                      (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (sessionExpiredMessage) {
              <div class="info-message">{{ sessionExpiredMessage }}</div>
            }

            @if (errorMessage) {
              <div class="error-message">{{ errorMessage }}</div>
            }

            <button mat-raised-button color="primary" type="submit"
                    class="full-width login-btn"
                    [disabled]="loading || !loginForm.valid">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'auth.signIn' | transloco }}
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
    }
    .login-card {
      width: min(400px, 90vw);
      padding: 32px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      font-weight: 600;
      color: #1a237e;
    }
    .logo-img {
      max-width: 250px;
      height: auto;
    }
    .full-width {
      width: 100%;
    }
    .login-btn {
      margin-top: 16px;
      height: 48px;
      font-size: 16px;
    }
    .error-message {
      color: #d32f2f;
      font-size: 14px;
      margin-bottom: 8px;
      text-align: center;
    }
    .info-message {
      color: #f57c00;
      font-size: 14px;
      margin-bottom: 8px;
      text-align: center;
      background: #fff3e0;
      padding: 8px 12px;
      border-radius: 4px;
    }
    mat-card-header {
      margin-bottom: 24px;
    }
  `]
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  hidePassword = true;
  loading = false;
  errorMessage = '';
  sessionExpiredMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParams['expired']) {
      this.sessionExpiredMessage = this.transloco.translate('auth.sessionExpired');
    }
  }

  onLogin(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.authService.loadMe().subscribe({
          next: (me) => {
            const target = me.role === 'EMPLOYEE' ? '/my-profile' : '/dashboard';
            this.router.navigate([target]);
          },
          error: () => this.router.navigate(['/dashboard'])
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || this.transloco.translate('auth.invalidCredentials');
      }
    });
  }
}
