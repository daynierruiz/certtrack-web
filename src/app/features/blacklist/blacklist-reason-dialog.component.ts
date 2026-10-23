import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@jsverse/transloco';

/** Small dialog to capture a reason when moving an employee to the blacklist. */
@Component({
  selector: 'app-blacklist-reason-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'blacklist.moveTitle' | transloco }}</h2>
    <mat-dialog-content>
      <p>{{ 'blacklist.moveMessage' | transloco: { name: data.name } }}</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'blacklist.reason' | transloco }}</mat-label>
        <textarea matInput [(ngModel)]="reason" rows="3" maxlength="2000"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-raised-button color="warn" (click)="confirm()">
        <mat-icon>block</mat-icon> {{ 'blacklist.add' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } mat-dialog-content { min-width: min(420px, 80vw); }`]
})
export class BlacklistReasonDialogComponent {
  reason = '';
  constructor(
    private dialogRef: MatDialogRef<BlacklistReasonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string }
  ) {}
  confirm(): void { this.dialogRef.close(this.reason.trim()); }
}
