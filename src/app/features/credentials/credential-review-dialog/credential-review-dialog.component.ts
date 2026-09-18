import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CredentialService } from '../../../core/services/credential.service';
import { DocumentService } from '../../../core/services/document.service';
import { Credential } from '../../../core/models/credential.model';
import { DocumentResponse } from '../../../core/models/document.model';

@Component({
  selector: 'app-credential-review-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatSnackBarModule, TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'credentials.reviewDialog.title' | transloco }}</h2>
    <mat-dialog-content>
      <div class="review-layout">
        <!-- Credential Info -->
        <div class="info-section">
          <div class="info-row">
            <label>{{ 'credentials.reviewDialog.employee' | transloco }}</label>
            <span>{{ data.employeeName }}</span>
          </div>
          <div class="info-row">
            <label>{{ 'common.type' | transloco }}</label>
            <span>{{ data.typeName }}</span>
          </div>
          <div class="info-row">
            <label>{{ 'credentials.reviewDialog.issuer' | transloco }}</label>
            <span>{{ data.credential.issuer || '-' }}</span>
          </div>
          <div class="info-row">
            <label>{{ 'credentials.reviewDialog.credentialNumber' | transloco }}</label>
            <span>{{ data.credential.credentialNumber || '-' }}</span>
          </div>
          <div class="info-row">
            <label>{{ 'credentials.reviewDialog.issueDate' | transloco }}</label>
            <span>{{ data.credential.issueDate || '-' }}</span>
          </div>
          <div class="info-row">
            <label>{{ 'credentials.reviewDialog.expiration' | transloco }}</label>
            <span>{{ data.credential.expirationDate || 'N/A' }}</span>
          </div>
          @if (data.credential.notes) {
            <div class="info-row">
              <label>{{ 'common.notes' | transloco }}</label>
              <span>{{ data.credential.notes }}</span>
            </div>
          }
        </div>

        <!-- Document Preview -->
        <div class="doc-section">
          @if (data.documents.length > 0) {
            @for (doc of data.documents; track doc.publicId; let i = $index) {
              <div class="doc-preview">
                @if (doc.contentType.startsWith('image/') && blobUrls[i]) {
                  <img [src]="blobUrls[i]" alt="Document" class="doc-image"
                       (click)="openInNewTab(doc)">
                } @else if (doc.contentType.startsWith('image/')) {
                  <div class="loading-doc">{{ 'credentials.reviewDialog.loadingImage' | transloco }}</div>
                } @else if (doc.contentType === 'application/pdf') {
                  <div class="file-placeholder" (click)="openInNewTab(doc)">
                    <mat-icon>picture_as_pdf</mat-icon>
                    <span>{{ doc.originalFilename }}</span>
                  </div>
                } @else {
                  <div class="file-placeholder">
                    <mat-icon>{{ getFileIcon(doc.contentType) }}</mat-icon>
                    <span>{{ doc.originalFilename }}</span>
                  </div>
                }
                <div class="doc-actions">
                  <span class="doc-name">{{ doc.originalFilename }}</span>
                  <button mat-icon-button [matTooltip]="'common.download' | transloco" (click)="downloadDocument(doc)">
                    <mat-icon>download</mat-icon>
                  </button>
                  @if (doc.contentType.startsWith('image/') || doc.contentType === 'application/pdf') {
                    <button mat-icon-button [matTooltip]="'credentials.reviewDialog.openInNewTab' | transloco" (click)="openInNewTab(doc)">
                      <mat-icon>open_in_new</mat-icon>
                    </button>
                  }
                </div>
              </div>
            }
          } @else {
            <div class="no-docs">
              <mat-icon>image_not_supported</mat-icon>
              <p>{{ 'credentials.reviewDialog.noDocument' | transloco }}</p>
            </div>
          }
        </div>
      </div>

      <!-- Review Notes -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'credentials.reviewDialog.reviewNotesLabel' | transloco }}</mat-label>
        <textarea matInput [(ngModel)]="reviewNotes" name="reviewNotes" rows="3"
                  [placeholder]="'credentials.reviewDialog.reviewNotesPlaceholder' | transloco"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-raised-button color="warn"
              [disabled]="saving"
              (click)="onReview(false)">
        <mat-icon>close</mat-icon> {{ 'credentials.reviewDialog.reject' | transloco }}
      </button>
      <button mat-raised-button color="primary"
              [disabled]="saving"
              (click)="onReview(true)">
        <mat-icon>check</mat-icon> {{ 'credentials.reviewDialog.approve' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .review-layout {
      display: flex; gap: 24px; margin-bottom: 16px; min-width: min(600px, 80vw);
    }
    .info-section { flex: 1; }
    .info-row {
      display: flex; margin-bottom: 8px; font-size: 14px;
    }
    .info-row label {
      width: 110px; font-weight: 500; color: #666; flex-shrink: 0;
    }
    .doc-section {
      flex: 1; display: flex; flex-direction: column; align-items: center;
    }
    .doc-preview { text-align: center; margin-bottom: 12px; }
    .doc-image {
      max-width: 280px; max-height: 300px; border-radius: 8px;
      border: 1px solid #e0e0e0; cursor: pointer;
    }
    .doc-image:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .doc-actions {
      display: flex; align-items: center; justify-content: center;
      gap: 4px; margin-top: 4px;
    }
    .doc-name { font-size: 12px; color: #999; }
    .file-placeholder {
      padding: 32px; background: #f5f5f5; border-radius: 8px; text-align: center;
      cursor: pointer;
    }
    .file-placeholder:hover { background: #eeeeee; }
    .file-placeholder mat-icon {
      font-size: 48px; width: 48px; height: 48px; color: #c62828; display: block; margin: 0 auto 8px;
    }
    .file-placeholder span { font-size: 13px; color: #666; }
    .no-docs {
      text-align: center; padding: 32px; color: #999;
    }
    .no-docs mat-icon {
      font-size: 48px; width: 48px; height: 48px; color: #ccc;
    }
    .full-width { width: 100%; }
    @media (max-width: 600px) {
      .review-layout { flex-direction: column; gap: 16px; }
      .doc-image { max-width: 100%; }
      .info-row { flex-direction: column; gap: 2px; }
      .info-row label { width: auto; }
    }
  `]
})
export class CredentialReviewDialogComponent implements OnInit, OnDestroy {
  reviewNotes = '';
  saving = false;
  blobUrls: (string | null)[] = [];

  constructor(
    private dialogRef: MatDialogRef<CredentialReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      credential: Credential;
      documents: DocumentResponse[];
      employeeName: string;
      typeName: string;
    },
    private credentialService: CredentialService,
    private documentService: DocumentService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.blobUrls = new Array(this.data.documents.length).fill(null);
    this.data.documents.forEach((doc, i) => {
      if (doc.contentType.startsWith('image/')) {
        this.documentService.downloadAsBlob(doc.publicId).subscribe({
          next: url => this.blobUrls[i] = url
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.blobUrls.forEach(url => { if (url) URL.revokeObjectURL(url); });
  }

  downloadDocument(doc: DocumentResponse): void {
    this.documentService.downloadAsBlob(doc.publicId).subscribe({
      next: (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalFilename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open(this.transloco.translate('credentials.reviewDialog.downloadError'), this.transloco.translate('common.close'), { duration: 3000 })
    });
  }

  openInNewTab(doc: DocumentResponse): void {
    this.documentService.downloadAsBlob(doc.publicId).subscribe({
      next: (url) => {
        window.open(url, '_blank');
      },
      error: () => this.snackBar.open(this.transloco.translate('credentials.reviewDialog.openDocError'), this.transloco.translate('common.close'), { duration: 3000 })
    });
  }

  getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    if (contentType.includes('word') || contentType.includes('document')) return 'description';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return 'table_chart';
    return 'insert_drive_file';
  }

  onReview(approved: boolean): void {
    this.saving = true;
    this.credentialService.review(this.data.credential.publicId, {
      approved,
      reviewNotes: this.reviewNotes || undefined
    }).subscribe({
      next: () => {
        this.snackBar.open(
          this.transloco.translate(approved ? 'credentials.reviewDialog.approvedOk' : 'credentials.reviewDialog.rejectedOk'),
          'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.transloco.translate('credentials.reviewDialog.reviewError'), 'OK', { duration: 5000 });
      }
    });
  }
}
