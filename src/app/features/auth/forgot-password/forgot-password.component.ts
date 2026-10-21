import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslocoModule
  ],
  template: `
    <div class="fp-container">
      <mat-card class="fp-card">
        <mat-card-header>
          <mat-card-title>
            <div class="logo"><img src="assets/logo.png" alt="CareReady" class="logo-img"></div>
          </mat-card-title>
          <mat-card-subtitle>{{ 'auth.forgot.subtitle' | transloco }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (sent) {
            <!-- Generic confirmation shown regardless of whether the email exists
                 (anti-enumeration): never reveals which addresses have an account. -->
            <div class="sent-message">
              <mat-icon>mark_email_read</mat-icon>
              <p>{{ 'auth.forgot.sentMessage' | transloco }}</p>
            </div>
            <a mat-raised-button color="primary" class="full-width" routerLink="/login">
              {{ 'auth.forgot.backToLogin' | transloco }}
            </a>
          } @else {
            <form (ngSubmit)="onSubmit()" #fpForm="ngForm">
              <p class="instructions">{{ 'auth.forgot.instructions' | transloco }}</p>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'auth.email' | transloco }}</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="email" required email>
                <mat-icon matSuffix>email</mat-icon>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit"
                      class="full-width submit-btn" [disabled]="loading || !fpForm.valid">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  {{ 'auth.forgot.submit' | transloco }}
                }
              </button>

              <div class="back-link">
                <a routerLink="/login">{{ 'auth.forgot.backToLogin' | transloco }}</a>
              </div>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .fp-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
    }
    .fp-card { width: min(400px, 90vw); padding: 32px; }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-img { max-width: 250px; height: auto; }
    .full-width { width: 100%; }
    .instructions { color: #555; font-size: 14px; margin: 0 0 16px; }
    .submit-btn { margin-top: 8px; height: 48px; font-size: 16px; }
    .back-link { text-align: center; margin-top: 16px; }
    .back-link a { color: #1565c0; font-size: 14px; text-decoration: none; cursor: pointer; }
    .back-link a:hover { text-decoration: underline; }
    .sent-message { text-align: center; color: #2e7d32; margin-bottom: 16px; }
    .sent-message mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .sent-message p { color: #555; font-size: 14px; }
    mat-card-header { margin-bottom: 24px; }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  sent = false;

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    this.loading = true;
    // The backend always answers 204; success and "no such account" look
    // identical to the UI on purpose, so we show the same confirmation either way.
    this.authService.forgotPassword(this.email).subscribe({
      next: () => { this.loading = false; this.sent = true; },
      error: () => { this.loading = false; this.sent = true; }
    });
  }
}
