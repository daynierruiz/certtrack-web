import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
import { AgencyService } from '../../core/services/agency.service';
import { AgencyResponse } from '../../core/models/agency.model';
import { prepareFileForUpload } from '../../core/utils/file-prep.util';

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

      @if (authService.mustChangePassword()) {
        <div class="account-mustchange" role="alert">
          <mat-icon>info</mat-icon>
          <span>{{ 'account.mustChangePassword' | transloco }}</span>
        </div>
      }

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

      @if (isOwner) {
        <mat-card class="account-card">
          <h2>{{ 'account.branding.title' | transloco }}</h2>
          <p class="branding-hint">{{ 'account.branding.hint' | transloco }}</p>

          <div class="branding-logo-row">
            <div class="branding-logo-preview">
              @if (agencyLogoUrl) {
                <img [src]="agencyLogoUrl" alt="">
              } @else {
                <mat-icon>image</mat-icon>
              }
            </div>
            <div class="branding-logo-actions">
              <button mat-stroked-button color="primary" type="button"
                      [disabled]="uploadingLogo || !agency" (click)="logoInput.click()">
                @if (uploadingLogo) {
                  <mat-icon>hourglass_empty</mat-icon>
                } @else {
                  <mat-icon>upload</mat-icon>
                }
                {{ 'account.branding.uploadLogo' | transloco }}
              </button>
              <div class="branding-logo-help">{{ 'account.branding.logoHelp' | transloco }}</div>
            </div>
            <input #logoInput type="file" accept="image/jpeg,image/png,image/webp" hidden
                   (change)="onLogoSelected($event)">
          </div>

          <form (ngSubmit)="saveAgencyName()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'account.branding.agencyName' | transloco }}</mat-label>
              <input matInput name="agencyName" [(ngModel)]="agencyName" required maxlength="200">
            </mat-form-field>
            <div class="account-actions">
              <button mat-flat-button color="primary" type="submit"
                      [disabled]="savingAgency || !agencyName.trim() || !agency">
                {{ 'account.branding.save' | transloco }}
              </button>
            </div>
          </form>
        </mat-card>
      }
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
    .account-mustchange {
      display: flex; align-items: center; gap: 10px;
      background: #fff8e1; border: 1px solid #ffe082; color: #8a6d00;
      border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px;
    }
    .account-mustchange mat-icon { color: #f9a825; }
    .branding-hint { color: #555; font-size: 13px; margin: -4px 0 16px; }
    .branding-logo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .branding-logo-preview {
      width: 120px; height: 80px; border: 1px dashed #cfd8dc; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fafafa;
    }
    .branding-logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .branding-logo-preview mat-icon { color: #b0bec5; font-size: 32px; width: 32px; height: 32px; }
    .branding-logo-actions { display: flex; flex-direction: column; gap: 6px; }
    .branding-logo-help { font-size: 12px; color: #888; }
  `]
})
export class AccountComponent implements OnInit {
  readonly authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);
  private router = inject(Router);
  private agencyService = inject(AgencyService);

  fullName = this.authService.user()?.fullName ?? '';
  email = this.authService.user()?.email ?? '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError: string | null = null;

  profileSaving = false;
  passwordSaving = false;

  // Agency branding (OWNER only).
  agency: AgencyResponse | null = null;
  agencyName = '';
  uploadingLogo = false;
  savingAgency = false;
  private logoBust = 0;

  get isOwner(): boolean {
    return this.authService.user()?.role === 'OWNER';
  }

  get agencyLogoUrl(): string | null {
    return this.agency?.hasLogo
      ? this.agencyService.logoUrl(this.agency.publicId, this.logoBust || undefined)
      : null;
  }

  ngOnInit(): void {
    if (!this.isOwner) return;
    this.agencyService.getOwn().subscribe({
      next: a => { this.agency = a; this.agencyName = a.name; },
      error: () => { /* non-fatal: branding card just stays empty */ }
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.agency) return;
    this.uploadingLogo = true;
    // Logos are small by nature; cap tight (<~500KB) so the upload clears nginx's
    // body limit even where the 50M override isn't applied.
    prepareFileForUpload(file, { maxDimension: 800, maxBytes: 500 * 1024 }).then(prepared => {
      this.agencyService.uploadLogo(this.agency!.publicId, prepared).subscribe({
        next: () => {
          this.uploadingLogo = false;
          if (this.agency) this.agency.hasLogo = true;
          this.logoBust = Date.now();   // cache-bust the <img>
          this.snackBar.open(this.transloco.translate('account.branding.logoSaved'), 'OK', { duration: 3000 });
        },
        error: err => {
          this.uploadingLogo = false;
          this.snackBar.open(err?.error?.message ?? this.transloco.translate('account.saveError'), 'OK', { duration: 5000 });
        }
      });
    }).catch(() => {
      this.uploadingLogo = false;
      this.snackBar.open(this.transloco.translate('common.unsupportedFileType'), 'OK', { duration: 4000 });
    });
  }

  saveAgencyName(): void {
    if (this.savingAgency || !this.agency || !this.agencyName.trim()) return;
    this.savingAgency = true;
    const a = this.agency;
    this.agencyService.update(a.publicId, {
      name: this.agencyName.trim(),
      slug: a.slug,
      timezone: a.timezone,
      country: a.country,
      state: a.state,
      contactEmail: a.contactEmail,
      briefingEnabled: a.briefingEnabled,
      briefingLanguage: a.briefingLanguage
    }).subscribe({
      next: res => {
        this.savingAgency = false;
        this.agency = res;
        this.agencyName = res.name;
        this.snackBar.open(this.transloco.translate('account.branding.saved'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.savingAgency = false;
        this.snackBar.open(err?.error?.message ?? this.transloco.translate('account.saveError'), 'OK', { duration: 5000 });
      }
    });
  }

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
        const wasForced = this.authService.mustChangePassword();
        this.snackBar.open(this.transloco.translate('account.passwordChanged'), 'OK', { duration: 3000 });
        // Refresh the session user so the "must change" flag clears; if this was a
        // forced change, send the user on to their home screen.
        this.authService.loadMe().subscribe({
          next: me => {
            if (wasForced) {
              this.router.navigate([me.role === 'EMPLOYEE' ? '/my-profile' : '/dashboard']);
            }
          },
          error: () => { /* non-fatal: the password already changed */ }
        });
      },
      error: err => {
        this.passwordSaving = false;
        this.passwordError = err?.error?.message ?? this.transloco.translate('account.saveError');
      }
    });
  }
}
