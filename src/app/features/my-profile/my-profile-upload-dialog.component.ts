import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CredentialType } from '../../core/models/credential.model';
import { MyProfileService } from '../../core/services/my-profile.service';
import { DocumentService } from '../../core/services/document.service';
import { AiExtractionResponse } from '../../core/models/document.model';
import { UPLOAD_ACCEPT, prepareFileForUpload } from '../../core/utils/file-prep.util';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-my-profile-upload-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatDatepickerModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatSnackBarModule,
    TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.isRenewal ? 'myProfile.upload.titleRenew' : 'myProfile.upload.titleSubmit') | transloco }} {{ data.credentialType.name }}</h2>

    <mat-dialog-content>
      <form #form="ngForm">
        <!-- File Upload FIRST -->
        <div class="upload-section">
          <label class="upload-label">{{ 'myProfile.upload.documentImages' | transloco }}</label>
          <div class="upload-area" (click)="fileInput.click()"
               (dragover)="onDragOver($event)" (drop)="onDrop($event)"
               [class.extracting]="extracting">
            @if (extracting) {
              <mat-spinner diameter="36"></mat-spinner>
              <p class="ai-analyzing">{{ 'myProfile.upload.analyzingAi' | transloco }}</p>
            } @else if (imagePreviews.length > 0) {
              <div class="preview-grid">
                @for (preview of imagePreviews; track $index) {
                  <div class="preview-item">
                    <img [src]="preview" [attr.aria-label]="'myProfile.upload.previewAlt' | transloco: { n: $index + 1 }" class="preview-img">
                    <span class="preview-label">{{ $index === 0 ? ('myProfile.upload.front' | transloco) : ('myProfile.upload.back' | transloco) }}</span>
                  </div>
                }
              </div>
            } @else {
              <mat-icon>cloud_upload</mat-icon>
              <p>{{ 'myProfile.upload.clickOrDrag' | transloco }}</p>
              <span class="hint">{{ 'myProfile.upload.hint' | transloco }}</span>
            }
            <input #fileInput type="file" [accept]="uploadAccept"
                   (change)="onFileSelected($event)" multiple hidden>
          </div>
          @if (selectedFiles.length > 0 && !extracting) {
            @for (file of selectedFiles; track $index) {
              <div class="file-info">
                <span>{{ file.name }} ({{ formatSize(file.size) }})</span>
                <button mat-icon-button (click)="removeFileAt($index)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
            @if (selectedFiles.length < 5) {
              <button mat-button color="primary" (click)="fileInput.click()" class="add-more-btn">
                <mat-icon>add</mat-icon> {{ 'myProfile.upload.addMoreImages' | transloco }}
              </button>
            }
          }
          @if (extractionDone && aiConfidence !== null) {
            <div class="ai-badge">
              <mat-icon>auto_awesome</mat-icon>
              <span>{{ 'myProfile.upload.aiExtracted' | transloco: { confidence: (aiConfidence * 100).toFixed(0) } }}</span>
            </div>
          }
          @if (uploading) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'myProfile.upload.issueDate' | transloco }}</mat-label>
            <input matInput [matDatepicker]="issuePicker" [(ngModel)]="issueDate" name="issueDate">
            <mat-datepicker-toggle matIconSuffix [for]="issuePicker"></mat-datepicker-toggle>
            <mat-datepicker #issuePicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'myProfile.upload.expirationDate' | transloco }}</mat-label>
            <input matInput [matDatepicker]="expPicker" [(ngModel)]="expirationDate" name="expirationDate">
            <mat-datepicker-toggle matIconSuffix [for]="expPicker"></mat-datepicker-toggle>
            <mat-datepicker #expPicker></mat-datepicker>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'myProfile.upload.credentialNumber' | transloco }}</mat-label>
          <input matInput [(ngModel)]="credentialNumber" name="credentialNumber" maxlength="100">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'myProfile.upload.issuer' | transloco }}</mat-label>
          <input matInput [(ngModel)]="issuer" name="issuer" maxlength="200">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.notes' | transloco }}</mat-label>
          <textarea matInput [(ngModel)]="notes" name="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-raised-button color="primary"
              [disabled]="saving || extracting"
              (click)="onSubmit()">
        {{ saving ? ('myProfile.upload.submitting' | transloco) : (data.isRenewal ? ('myProfile.upload.submitRenewal' | transloco) : ('myProfile.upload.submitForReview' | transloco)) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-row { display: flex; gap: 16px; }
    .form-row mat-form-field { flex: 1; }
    .full-width { width: 100%; }
    mat-dialog-content { min-width: min(420px, 80vw); padding-top: 20px !important; }
    .upload-section { margin-bottom: 16px; }
    .upload-label { display: block; font-size: 12px; color: rgba(0,0,0,0.6); margin-bottom: 8px; }
    .upload-area {
      border: 2px dashed #ccc; border-radius: 8px; padding: 24px;
      text-align: center; cursor: pointer; transition: border-color 0.2s;
    }
    .upload-area:hover { border-color: #1565c0; }
    .upload-area.extracting { border-color: #7c4dff; cursor: default; }
    .upload-area mat-icon { font-size: 36px; width: 36px; height: 36px; color: #999; }
    .upload-area p { margin: 8px 0 4px; color: #666; }
    .upload-area .hint { font-size: 12px; color: #999; }
    .ai-analyzing { color: #7c4dff; font-weight: 500; }
    .preview-grid { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .preview-item { text-align: center; }
    .preview-item .preview-img { max-width: 180px; max-height: 150px; border-radius: 4px; }
    .preview-label { display: block; font-size: 11px; color: #666; margin-top: 4px; }
    .file-info {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px; background: #f5f5f5; border-radius: 4px; margin-top: 8px;
      font-size: 13px;
    }
    .add-more-btn { margin-top: 8px; }
    .ai-badge {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px; margin-top: 8px; border-radius: 4px;
      background: #ede7f6; color: #5e35b1; font-size: 13px;
    }
    .ai-badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 480px) {
      .form-row { flex-direction: column; gap: 0; }
    }
  `]
})
export class MyProfileUploadDialogComponent {
  issueDate: Date | null = null;
  expirationDate: Date | null = null;
  credentialNumber = '';
  issuer = '';
  notes = '';
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  uploadAccept = UPLOAD_ACCEPT;
  saving = false;
  uploading = false;
  extracting = false;
  extractionDone = false;
  aiConfidence: number | null = null;

  constructor(
    private dialogRef: MatDialogRef<MyProfileUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      credentialType: CredentialType;
      agencyPublicId: string;
      employeePublicId: string;
      isRenewal?: boolean;
    },
    private myProfileService: MyProfileService,
    private documentService: DocumentService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.length) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  private async addFiles(files: File[]): Promise<void> {
    const remaining = 5 - this.selectedFiles.length;
    const toAdd = files.slice(0, remaining);

    // Convert/compress before anything else: phone photos may be HEIC or
    // exceed the AI API's 5MB-per-image limit even when the backend's 10MB
    // limit would accept them.
    let rejectedCount = 0;
    for (const file of toAdd) {
      let prepared: File;
      try {
        prepared = await prepareFileForUpload(file);
      } catch {
        rejectedCount++;
        continue;
      }
      this.selectedFiles.push(prepared);
      if (prepared.type.startsWith('image/')) {
        const reader = new FileReader();
        const idx = this.selectedFiles.length - 1;
        reader.onload = () => {
          this.imagePreviews[idx] = reader.result as string;
        };
        reader.readAsDataURL(prepared);
      }
    }

    if (rejectedCount > 0) {
      this.snackBar.open(this.transloco.translate('common.unsupportedFileType'), 'OK', { duration: 5000 });
    }

    this.extractionDone = false;
    this.aiConfidence = null;
    this.runAiExtraction();
  }

  private runAiExtraction(): void {
    if (this.selectedFiles.length === 0) return;
    this.extracting = true;
    this.documentService.extractData(this.selectedFiles, this.data.credentialType.name).subscribe({
      next: (result: AiExtractionResponse) => {
        this.extracting = false;
        this.extractionDone = true;
        this.aiConfidence = result.confidence;

        if (result.issueDate) {
          this.issueDate = this.parseDate(result.issueDate);
        }
        if (result.expirationDate) {
          this.expirationDate = this.parseDate(result.expirationDate);
        }
        if (result.issuer) {
          this.issuer = result.issuer;
        }
        if (result.credentialNumber) {
          this.credentialNumber = result.credentialNumber;
        }
      },
      error: () => {
        this.extracting = false;
        this.snackBar.open(this.transloco.translate('myProfile.upload.aiUnavailable'), 'OK', { duration: 4000 });
      }
    });
  }

  private parseDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  }

  removeFileAt(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
    if (this.selectedFiles.length === 0) {
      this.extractionDone = false;
      this.aiConfidence = null;
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  onSubmit(): void {
    this.saving = true;

    const request = {
      agencyPublicId: this.data.agencyPublicId,
      employeePublicId: this.data.employeePublicId,
      credentialTypePublicId: this.data.credentialType.publicId,
      issueDate: this.issueDate ? this.formatDate(this.issueDate) : undefined,
      expirationDate: this.expirationDate ? this.formatDate(this.expirationDate) : undefined,
      issuer: this.issuer || undefined,
      credentialNumber: this.credentialNumber || undefined,
      notes: this.notes || undefined
    };

    this.myProfileService.submitCredential(request).subscribe({
      next: (credential) => {
        if (this.selectedFiles.length > 0) {
          this.uploading = true;
          const uploads = this.selectedFiles.map(f =>
            this.myProfileService.uploadDocument(f, credential.publicId)
          );
          forkJoin(uploads).subscribe({
            next: () => {
              this.snackBar.open(this.transloco.translate('myProfile.upload.credentialSubmitted'), 'OK', { duration: 3000 });
              this.dialogRef.close(true);
            },
            error: () => {
              this.snackBar.open(this.transloco.translate('myProfile.upload.partialUploadError'), 'OK', { duration: 5000 });
              this.dialogRef.close(true);
            }
          });
        } else {
          this.snackBar.open(this.transloco.translate('myProfile.upload.credentialSubmitted'), 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        }
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.transloco.translate('myProfile.upload.failedToSubmit'), 'Close', { duration: 5000 });
      }
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
