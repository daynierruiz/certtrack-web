import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ContractService } from '../../../core/services/contract.service';
import { Contract } from '../../../core/models/contract.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface ContractSignData {
  contract: Contract;
}

@Component({
  selector: 'app-contract-sign-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatCheckboxModule, MatProgressSpinnerModule, MatSnackBarModule,
    TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>draw</mat-icon> {{ 'contracts.sign.title' | transloco }}
    </h2>
    <mat-dialog-content>
      <div class="contract-title">{{ data.contract.title }}</div>

      <!-- Contract preview -->
      @if (loadingPreview) {
        <div class="loading-container"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <div class="preview-container" [innerHTML]="previewHtml"></div>
      }

      <!-- Signature area -->
      <div class="signature-section">
        <h3>{{ 'contracts.sign.yourSignature' | transloco }}</h3>
        <p class="signature-hint">
          <mat-icon class="hint-icon">gesture</mat-icon>
          {{ 'contracts.sign.signatureHint' | transloco }}
        </p>
        <div class="canvas-wrapper" [class.has-signature]="hasSignature">
          @if (!hasSignature) {
            <div class="canvas-placeholder">
              <mat-icon>draw</mat-icon>
              <span>{{ 'contracts.sign.drawHere' | transloco }}</span>
            </div>
          }
          <canvas #signatureCanvas
                  (mousedown)="startDrawing($event)"
                  (mousemove)="draw($event)"
                  (mouseup)="stopDrawing()"
                  (mouseleave)="stopDrawing()"
                  (touchstart)="onTouchStart($event)"
                  (touchmove)="onTouchDraw($event)"
                  (touchend)="stopDrawing()"
                  width="500" height="150">
          </canvas>
          @if (hasSignature) {
            <button mat-button class="clear-btn" (click)="clearSignature()">
              <mat-icon>refresh</mat-icon> {{ 'contracts.sign.clear' | transloco }}
            </button>
          }
        </div>
      </div>

      <!-- Consent -->
      <div class="consent-section">
        <mat-checkbox [(ngModel)]="consentChecked" color="primary">
          {{ 'contracts.sign.consentText' | transloco }}
        </mat-checkbox>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-raised-button color="primary"
              (click)="signContract()"
              [disabled]="signing || !consentChecked || !hasSignature">
        {{ signing ? ('contracts.sign.signing' | transloco) : ('contracts.sign.signContract' | transloco) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 500px; max-width: 700px; }
    .contract-title {
      font-size: 18px; font-weight: 600; color: #1a237e; margin-bottom: 12px;
    }
    .loading-container { display: flex; justify-content: center; padding: 32px; }
    .preview-container {
      border: 1px solid #ddd; border-radius: 8px; padding: 20px;
      max-height: 350px; overflow-y: auto; background: white;
      font-size: 13px; line-height: 1.6; margin-bottom: 20px;
    }
    .signature-section { margin-bottom: 16px; }
    .signature-section h3 {
      font-size: 14px; font-weight: 600; color: #333; margin: 0 0 4px;
    }
    .signature-hint {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #888; margin: 0 0 10px;
    }
    .hint-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important; color: #aaa;
    }
    .canvas-wrapper {
      position: relative; border: 2px dashed #ccc; border-radius: 8px;
      background: #fafafa; width: 100%; max-width: 500px;
      transition: border-color 0.2s;
    }
    .canvas-wrapper.has-signature { border-color: #00796b; }
    .canvas-placeholder {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; pointer-events: none; color: #ccc;
    }
    .canvas-placeholder mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .canvas-placeholder span { font-size: 13px; }
    canvas {
      display: block; cursor: crosshair; touch-action: none;
      width: 100%; height: 150px;
    }
    .clear-btn {
      position: absolute; top: 4px; right: 4px; min-width: unset;
      font-size: 11px; color: #999;
    }
    .consent-section {
      margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 8px;
    }
    @media (max-width: 600px) {
      mat-dialog-content { min-width: unset; }
    }
  `]
})
export class ContractSignDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  previewHtml: SafeHtml = '';
  loadingPreview = true;
  signing = false;
  consentChecked = false;
  hasSignature = false;

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  constructor(
    private dialogRef: MatDialogRef<ContractSignDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContractSignData,
    private contractService: ContractService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.contractService.previewHtml(this.data.contract.publicId).subscribe({
      next: html => {
        this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.loadingPreview = false;
      },
      error: () => { this.loadingPreview = false; }
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private getScaledCoords(event: MouseEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  startDrawing(event: MouseEvent): void {
    this.isDrawing = true;
    const { x, y } = this.getScaledCoords(event);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing) return;
    const { x, y } = this.getScaledCoords(event);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasSignature = true;
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    this.isDrawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  onTouchDraw(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing) return;
    const touch = event.touches[0];
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasSignature = true;
  }

  clearSignature(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasSignature = false;
  }

  signContract(): void {
    if (!this.hasSignature || !this.consentChecked) return;

    this.signing = true;
    const canvas = this.canvasRef.nativeElement;
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1]; // Strip "data:image/png;base64," prefix
    const consentText = this.transloco.translate('contracts.sign.consentText');

    this.contractService.sign(this.data.contract.publicId, {
      signatureBase64: base64,
      consentText: consentText
    }).subscribe({
      next: () => {
        this.snackBar.open(this.transloco.translate('contracts.sign.signSuccess'), 'OK', { duration: 5000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.signing = false;
        const msg = err.error?.message || this.transloco.translate('contracts.sign.signError');
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      }
    });
  }
}
