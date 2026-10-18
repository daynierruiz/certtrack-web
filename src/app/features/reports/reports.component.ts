import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ReportService } from '../../core/services/report.service';

/**
 * Reports page: one-click audit-ready compliance exports (PDF / CSV) for the
 * admin's agency. Files are fetched as blobs (so the JWT is attached) and saved.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, TranslocoModule,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="reports-page">
      <h1>{{ 'reports.title' | transloco }}</h1>

      <mat-card class="report-card">
        <div class="report-head">
          <mat-icon>fact_check</mat-icon>
          <div>
            <div class="report-name">{{ 'reports.compliance.title' | transloco }}</div>
            <div class="report-desc">{{ 'reports.compliance.desc' | transloco }}</div>
          </div>
        </div>
        <div class="report-actions">
          <button mat-flat-button color="primary" [disabled]="busy" (click)="downloadPdf()">
            <mat-icon>picture_as_pdf</mat-icon> {{ 'reports.pdf' | transloco }}
          </button>
          <button mat-stroked-button color="primary" [disabled]="busy" (click)="downloadCsv()">
            <mat-icon>table_view</mat-icon> {{ 'reports.csv' | transloco }}
          </button>
          @if (busy) { <mat-spinner diameter="22"></mat-spinner> }
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .reports-page { max-width: 680px; margin: 0 auto; padding: 16px; }
    h1 { font-size: 22px; margin: 8px 0 16px; }
    .report-card { padding: 20px; }
    .report-head { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
    .report-head mat-icon { color: #2563eb; font-size: 32px; width: 32px; height: 32px; flex: 0 0 auto; }
    .report-name { font-weight: 600; font-size: 16px; }
    .report-desc { color: #666; font-size: 14px; margin-top: 4px; }
    .report-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .report-actions button mat-icon { margin-right: 4px; }
  `]
})
export class ReportsComponent {
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  busy = false;

  downloadPdf(): void {
    this.run(this.reportService.compliancePdf(this.authService.agencyPublicId()),
      `compliance-report.pdf`);
  }

  downloadCsv(): void {
    this.run(this.reportService.complianceCsv(this.authService.agencyPublicId()),
      `compliance-report.csv`);
  }

  private run(request$: Observable<Blob>, filename: string): void {
    this.busy = true;
    request$.subscribe({
      next: blob => {
        this.busy = false;
        this.saveBlob(blob, filename);
      },
      error: () => {
        this.busy = false;
        this.snackBar.open(this.transloco.translate('reports.error'), 'OK', { duration: 5000 });
      }
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
