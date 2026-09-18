import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@jsverse/transloco';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'warn' | 'primary' | 'accent';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, TranslocoModule],
  template: `
    <div class="confirm-dialog">
      <div class="confirm-icon" [class]="'icon-' + (data.color || 'warn')">
        <mat-icon>{{ data.icon || 'warning' }}</mat-icon>
      </div>

      <h2 mat-dialog-title>{{ data.title }}</h2>

      <mat-dialog-content>
        <p style="white-space: pre-line;">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="center">
        <button mat-stroked-button (click)="dialogRef.close(false)">
          {{ data.cancelText || ('common.cancel' | transloco) }}
        </button>
        <button mat-raised-button [color]="data.color || 'warn'"
                (click)="dialogRef.close(true)">
          <mat-icon>{{ data.icon || 'delete' }}</mat-icon>
          {{ data.confirmText || ('common.delete' | transloco) }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      text-align: center;
      padding: 8px 0;
    }
    .confirm-icon {
      width: 56px; height: 56px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px;
    }
    .confirm-icon mat-icon {
      font-size: 32px; width: 32px; height: 32px;
    }
    .icon-warn {
      background: #ffebee;
    }
    .icon-warn mat-icon { color: #c62828; }
    .icon-primary {
      background: #e3f2fd;
    }
    .icon-primary mat-icon { color: #1565c0; }
    .icon-accent {
      background: #e0f7fa;
    }
    .icon-accent mat-icon { color: #00838f; }
    h2 {
      margin: 0 0 4px !important;
      font-size: 18px !important;
      text-align: center;
    }
    mat-dialog-content p {
      color: #666;
      font-size: 14px;
      margin: 0;
    }
    mat-dialog-actions {
      padding-top: 16px !important;
      gap: 12px;
      justify-content: center !important;
    }
    mat-dialog-actions button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 4px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
