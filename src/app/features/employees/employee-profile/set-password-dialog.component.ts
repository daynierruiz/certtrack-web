import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

export interface SetPasswordDialogData {
  firstName: string;
  lastName: string;
}

/**
 * Admin dialog to assign a temporary password to an employee. Returns the chosen
 * password string on confirm, or undefined on cancel. Validation here is a UX aid;
 * the server re-validates (min length) and forces the employee to change it on
 * next login.
 */
@Component({
  selector: 'app-set-password-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslocoModule,
    MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <div class="setpw-dialog">
      <div class="setpw-icon"><mat-icon>password</mat-icon></div>
      <h2 mat-dialog-title>{{ 'employeeProfile.account.setPasswordTitle' | transloco }}</h2>

      <mat-dialog-content>
        <p class="setpw-sub">
          {{ 'employeeProfile.account.setPasswordMessage' | transloco:{ firstName: data.firstName, lastName: data.lastName } }}
        </p>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'employeeProfile.account.setPasswordNew' | transloco }}</mat-label>
          <input matInput type="password" name="newPassword" [(ngModel)]="newPassword"
                 minlength="8" autocomplete="new-password" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'employeeProfile.account.setPasswordConfirm' | transloco }}</mat-label>
          <input matInput type="password" name="confirmPassword" [(ngModel)]="confirmPassword"
                 autocomplete="new-password" />
        </mat-form-field>

        @if (error) {
          <div class="setpw-error">{{ error }}</div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="center">
        <button mat-stroked-button (click)="dialogRef.close()">
          {{ 'common.cancel' | transloco }}
        </button>
        <button mat-raised-button color="primary" (click)="submit()">
          <mat-icon>password</mat-icon>
          {{ 'employeeProfile.account.setPasswordSubmit' | transloco }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .setpw-dialog { padding: 8px 0; text-align: center; }
    .setpw-icon {
      width: 56px; height: 56px; border-radius: 50%; background: #e3f2fd;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
    }
    .setpw-icon mat-icon { color: #1565c0; font-size: 32px; width: 32px; height: 32px; }
    h2 { margin: 0 0 8px !important; font-size: 18px !important; text-align: center; }
    .setpw-sub { color: #666; font-size: 14px; margin: 0 0 16px; }
    .full-width { width: 100%; }
    .setpw-error { color: #c62828; font-size: 13px; margin: 4px 0 8px; }
    mat-dialog-actions { padding-top: 8px !important; gap: 12px; justify-content: center !important; }
    mat-dialog-actions button mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
  `]
})
export class SetPasswordDialogComponent {
  newPassword = '';
  confirmPassword = '';
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<SetPasswordDialogComponent, string>,
    private transloco: TranslocoService,
    @Inject(MAT_DIALOG_DATA) public data: SetPasswordDialogData
  ) {}

  submit(): void {
    this.error = null;
    if (this.newPassword.length < 8) {
      this.error = this.transloco.translate('employeeProfile.account.setPasswordTooShort');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = this.transloco.translate('employeeProfile.account.setPasswordNoMatch');
      return;
    }
    this.dialogRef.close(this.newPassword);
  }
}
