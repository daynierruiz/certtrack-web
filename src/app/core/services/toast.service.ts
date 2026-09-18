import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Thin wrapper around MatSnackBar that adds a colored variant per message type.
 * Defaults (position top-center, 5s duration, `app-toast` panel class) come from
 * MAT_SNACK_BAR_DEFAULT_OPTIONS in app.config.ts — we only need to layer a
 * variant class on top.
 *
 * Usage:
 *   constructor(private toast: ToastService) {}
 *   this.toast.success('Saved');
 *   this.toast.error('Could not save');
 *   this.toast.warn('Pick a credential type first');
 *   this.toast.info('Check your email');
 */
@Injectable({ providedIn: 'root' })
export class ToastService {

  private snackBar = inject(MatSnackBar);

  success(message: string, action = 'OK', durationMs = 4000): void {
    this.open(message, action, 'toast-success', durationMs);
  }

  error(message: string, action = 'Close', durationMs = 8000): void {
    this.open(message, action, 'toast-error', durationMs);
  }

  warn(message: string, action = 'OK', durationMs = 6000): void {
    this.open(message, action, 'toast-warn', durationMs);
  }

  info(message: string, action = 'OK', durationMs = 5000): void {
    this.open(message, action, 'toast-info', durationMs);
  }

  private open(message: string, action: string, variantClass: string, duration: number): void {
    this.snackBar.open(message, action, {
      duration,
      panelClass: ['app-toast', variantClass]
    });
  }
}
