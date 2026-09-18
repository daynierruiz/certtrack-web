import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule } from '@jsverse/transloco';
import { Credential } from '../../core/models/credential.model';
import { DocumentResponse } from '../../core/models/document.model';
import { DocumentService } from '../../core/services/document.service';

@Component({
  selector: 'app-credential-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatDividerModule,
    TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">badge</mat-icon>
      {{ data.credentialTypeName }}
    </h2>

    <mat-dialog-content>
      <!-- Status -->
      <div class="status-row">
        <mat-chip [class]="'status-chip status-' + data.credential.status.toLowerCase()">
          {{ formatStatus(data.credential.status) }}
        </mat-chip>
        @if (data.credential.reviewNotes) {
          <span class="review-notes">
            <mat-icon>comment</mat-icon>
            {{ data.credential.reviewNotes }}
          </span>
        }
      </div>

      <mat-divider></mat-divider>

      <!-- Details Grid -->
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">{{ 'myProfile.credentialDetail.credentialNumber' | transloco }}</span>
          <span class="detail-value">{{ data.credential.credentialNumber || '—' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ 'myProfile.credentialDetail.issuer' | transloco }}</span>
          <span class="detail-value">{{ data.credential.issuer || '—' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ 'myProfile.credentialDetail.issueDate' | transloco }}</span>
          <span class="detail-value">{{ data.credential.issueDate || '—' }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">{{ 'myProfile.credentialDetail.expirationDate' | transloco }}</span>
          <span class="detail-value" [class.expiring]="isExpiring()">
            {{ data.credential.expirationDate || ('myProfile.profile.noExpiration' | transloco) }}
            @if (isExpiring()) {
              <mat-icon class="inline-icon">warning</mat-icon>
            }
          </span>
        </div>
        @if (data.credential.notes) {
          <div class="detail-item full-width">
            <span class="detail-label">{{ 'common.notes' | transloco }}</span>
            <span class="detail-value">{{ data.credential.notes }}</span>
          </div>
        }
      </div>

      <mat-divider></mat-divider>

      <!-- Document Section -->
      <div class="document-section">
        <h3>
          <mat-icon>attach_file</mat-icon>
          {{ 'myProfile.credentialDetail.document' | transloco }}
        </h3>

        @if (loadingDoc) {
          <div class="doc-loading">
            <mat-spinner diameter="32"></mat-spinner>
          </div>
        } @else if (docBlobUrl) {
          <div class="doc-preview">
            @if (isImage) {
              <img [src]="docBlobUrl" [attr.aria-label]="'myProfile.credentialDetail.documentAlt' | transloco" class="doc-image">
            } @else {
              <div class="pdf-indicator">
                <mat-icon>picture_as_pdf</mat-icon>
                <span>{{ document?.originalFilename }}</span>
              </div>
            }
            <div class="doc-actions">
              <a [href]="docBlobUrl" target="_blank" mat-stroked-button>
                <mat-icon>open_in_new</mat-icon>
                {{ 'myProfile.credentialDetail.openFullSize' | transloco }}
              </a>
            </div>
          </div>
        } @else {
          <div class="no-doc">
            <mat-icon>image_not_supported</mat-icon>
            <span>{{ 'myProfile.credentialDetail.noDocument' | transloco }}</span>
          </div>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | transloco }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; }
    .title-icon { color: #1565c0; }
    mat-dialog-content { min-width: min(460px, 80vw); max-width: 600px; }

    .status-row {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 0 16px;
    }
    .review-notes {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; color: #666; font-style: italic;
    }
    .review-notes mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .details-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 16px; padding: 16px 0;
    }
    .detail-item.full-width { grid-column: 1 / -1; }
    .detail-label {
      display: block; font-size: 11px; color: #999;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;
    }
    .detail-value { font-size: 14px; font-weight: 500; }
    .detail-value.expiring { color: #f57c00; }
    .inline-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; }

    .document-section { padding: 16px 0 0; }
    .document-section h3 {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; color: #666; margin: 0 0 12px;
    }
    .doc-loading { text-align: center; padding: 24px; }
    .doc-preview { text-align: center; }
    .doc-image {
      max-width: 100%; max-height: 360px;
      border-radius: 8px; border: 1px solid #e0e0e0;
      margin-bottom: 12px;
    }
    .doc-actions { margin-top: 8px; }
    .pdf-indicator {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; padding: 24px; background: #fafafa;
      border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 12px;
    }
    .pdf-indicator mat-icon { font-size: 32px; width: 32px; height: 32px; color: #d32f2f; }
    .no-doc {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; padding: 24px; color: #999;
      background: #fafafa; border-radius: 8px;
    }
    .no-doc mat-icon { font-size: 24px; width: 24px; height: 24px; }

    .status-chip { font-size: 11px !important; min-height: 24px !important; }
    .status-valid { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-expiring_soon { background: #fff3e0 !important; color: #f57c00 !important; }
    .status-critical { background: #fbe9e7 !important; color: #d32f2f !important; }
    .status-expired { background: #ffebee !important; color: #b71c1c !important; }
    .status-pending_review { background: #e3f2fd !important; color: #1565c0 !important; }
    @media (max-width: 480px) {
      .details-grid { grid-template-columns: 1fr; }
      .status-row { flex-wrap: wrap; }
    }
  `]
})
export class CredentialDetailDialogComponent implements OnInit, OnDestroy {
  loadingDoc = false;
  document: DocumentResponse | null = null;
  docBlobUrl: string | null = null;
  isImage = false;

  constructor(
    private dialogRef: MatDialogRef<CredentialDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      credential: Credential;
      credentialTypeName: string;
    },
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    this.loadDocument();
  }

  ngOnDestroy(): void {
    if (this.docBlobUrl) {
      URL.revokeObjectURL(this.docBlobUrl);
    }
  }

  private loadDocument(): void {
    this.loadingDoc = true;
    this.documentService.getByCredential(this.data.credential.publicId).subscribe({
      next: (docs) => {
        if (docs.length > 0) {
          this.document = docs[0];
          this.isImage = this.document.contentType?.startsWith('image/') ?? false;
          this.documentService.downloadAsBlob(this.document.publicId).subscribe({
            next: (url) => {
              this.docBlobUrl = url;
              this.loadingDoc = false;
            },
            error: () => this.loadingDoc = false
          });
        } else {
          this.loadingDoc = false;
        }
      },
      error: () => this.loadingDoc = false
    });
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  isExpiring(): boolean {
    const s = this.data.credential.status;
    return s === 'EXPIRING_SOON' || s === 'CRITICAL' || s === 'EXPIRED';
  }
}
