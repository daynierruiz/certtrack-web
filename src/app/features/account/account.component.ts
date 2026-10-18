import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';

/**
 * Self-service account page for the logged-in user (any role): edit name/email
 * and change password. Backed by /api/account.
 */
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslocoModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule
  ],
  template: `
    <div class="account-page">
      <h1>{{ 'account.title' | transloco }}</h1>

      <mat-card class="account-card">
        <h2>{{ 'account.profile' | transloco }}</h2>
        <form (ngSubmit)="saveProfile()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'account.fullName' | transloco }}</mat-label>
            <input matInput name="fullName" [(ngModel)]="fullName" required maxlength="200" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'account.email' | transloco }}</mat-label>
            <input matInput name="email" type="email" [(ngModel)]="email" required maxlength="191" />
          </mat-form-field>
          <div class="account-meta">
            <span><strong>{{ 'account.role' | transloco }}:</strong> {{ roleLabel() }}</span>
            <span><strong>{{ 'account.agency' | transloco }}:</strong> {{ authService.user()?.agencyName }}</span>
          </div>
          <div class="account-actions">
            <button mat-flat-button color="primary" type="submit"
                    [disabled]="profileSaving || !fullName.trim() || !email.trim()">
              {{ 'account.saveProfile' | transloco }}
            </button>
          </div>
        </form>
      </mat-card>

      <mat-card class="account-card">
        <h2>{{ 'account.changePassword' | transloco }}</h2>
        <form (ngSubmit)="changePassword()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'account.currentPassword' | transloco }}</mat-label>
            <input matInput name="current" type="password" [(ngModel)]="currentPassword" required autocomplete="current-password" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'account.newPassword' | transloco }}</mat-label>
            <input matInput name="new" type="password" [(ngModel)]="newPassword" required minlength="8" autocomplete="new-password" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'account.confirmPassword' | transloco }}</mat-label>
            <input matInput name="confirm" type="password" [(ngModel)]="confirmPassword" required autocomplete="new-password" />
          </mat-form-field>
          @if (passwordError) {
            <div class="account-error">{{ passwordError }}</div>
          }
          <div class="account-actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="passwordSaving">
              {{ 'account.updatePassword' | transloco }}
            </button>
          </div>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .account-page { max-width: 560px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 22px; margin: 8px 0 16px; }
    .account-card { margin-bottom: 20px; padding: 20px; }
    .account-card h2 { font-size: 16px; margin: 0 0 16px; color: #2563eb; }
    .full-width { width: 100%; }
    .account-meta { display: flex; flex-wrap: wrap; gap: 16px; color: #555; font-size: 13px; margin: 4px 0 16px; }
    .account-actions { display: flex; justify-content: flex-end; }
    .account-error { color: #c62828; font-size: 13px; margin-bottom: 12px; }
  `]
})
export class AccountComponent {
  readonly authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  fullName = this.authService.user()?.fullName ?? '';
  email = this.authService.user()?.email ?? '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError: string | null = null;

  profileSaving = false;
  passwordSaving = false;

  roleLabel(): string {
    const role = this.authService.user()?.role ?? '';
    const key = 'roles.' + role;
    const translated = this.transloco.translate(key);
    return translated === key ? role : translated;
  }

  saveProfile(): void {
    if (this.profileSaving || !this.fullName.trim() || !this.email.trim()) {
      return;
    }
    this.profileSaving = true;
    this.authService.updateProfile(this.fullName.trim(), this.email.trim()).subscribe({
      next: () => {
        this.profileSaving = false;
        this.snackBar.open(this.transloco.translate('account.profileSaved'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.profileSaving = false;
        this.snackBar.open(err?.error?.message ?? this.transloco.translate('account.saveError'), 'OK', { duration: 5000 });
      }
    });
  }

  changePassword(): void {
    this.passwordError = null;
    if (this.passwordSaving) {
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError = this.transloco.translate('account.passwordTooShort');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = this.transloco.translate('account.passwordsNoMatch');
      return;
    }
    this.passwordSaving = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordSaving = false;
        this.currentPassword = this.newPassword = this.confirmPassword = '';
        this.snackBar.open(this.transloco.translate('account.passwordChanged'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.passwordSaving = false;
        this.passwordError = err?.error?.message ?? this.transloco.translate('account.saveError');
      }
    });
  }
}
