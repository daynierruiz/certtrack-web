import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CredentialService } from '../../../core/services/credential.service';
import { DocumentService } from '../../../core/services/document.service';
import { Credential, CredentialStatus, CredentialType, CredentialUpsertRequest } from '../../../core/models/credential.model';
import { AiExtractionResponse, DocumentResponse } from '../../../core/models/document.model';
import { Employee } from '../../../core/models/employee.model';
import { UPLOAD_ACCEPT, prepareFileForUpload } from '../../../core/utils/file-prep.util';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-credential-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatDatepickerModule,
    MatNativeDateModule, MatSnackBarModule, MatIconModule,
    MatProgressBarModule, MatProgressSpinnerModule, TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>{{ (isEdit ? 'credentials.form.titleEdit' : 'credentials.form.titleAdd') | transloco }}</h2>
    <mat-dialog-content>
      <form #form="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'credentials.form.employee' | transloco }}</mat-label>
          <mat-select [(ngModel)]="model.employeePublicId" name="employeePublicId" required>
            @for (emp of data.employees; track emp.publicId) {
              <mat-option [value]="emp.publicId">{{ emp.lastName }}, {{ emp.firstName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'credentials.form.credentialType' | transloco }}</mat-label>
          <mat-select [(ngModel)]="model.credentialTypePublicId" name="credentialTypePublicId" required
                      (selectionChange)="onCredentialTypeChange()">
            @for (type of data.credentialTypes; track type.publicId) {
              <mat-option [value]="type.publicId">{{ type.name }} ({{ type.code }})</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'credentials.form.issueDate' | transloco }}</mat-label>
            <input matInput [matDatepicker]="issuePicker" [(ngModel)]="issueDate" name="issueDate">
            <mat-datepicker-toggle matIconSuffix [for]="issuePicker"></mat-datepicker-toggle>
            <mat-datepicker #issuePicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'credentials.form.expirationDate' | transloco }}</mat-label>
            <input matInput [matDatepicker]="expPicker" [(ngModel)]="expirationDate" name="expirationDate">
            <mat-datepicker-toggle matIconSuffix [for]="expPicker"></mat-datepicker-toggle>
            <mat-datepicker #expPicker></mat-datepicker>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'credentials.form.credentialNumber' | transloco }}</mat-label>
          <input matInput [(ngModel)]="model.credentialNumber" name="credentialNumber" maxlength="100">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'credentials.form.issuer' | transloco }}</mat-label>
          <input matInput [(ngModel)]="model.issuer" name="issuer" maxlength="200">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.notes' | transloco }}</mat-label>
          <textarea matInput [(ngModel)]="model.notes" name="notes" rows="3"></textarea>
        </mat-form-field>

        <!-- Existing attached documents (edit mode) -->
        @if (isEdit) {
          <div class="existing-docs">
            <label class="upload-label">{{ 'credentials.form.attachedDocs' | transloco }}</label>
            @if (loadingDocs) {
              <mat-spinner diameter="24"></mat-spinner>
            } @else if (existingDocs.length === 0) {
              <p class="no-docs">{{ 'credentials.form.noDocsAttached' | transloco }}</p>
            } @else {
              @for (doc of existingDocs; track doc.publicId) {
                <div class="doc-row">
                  <mat-icon class="doc-icon">{{ doc.contentType.startsWith('image/') ? 'image' : 'description' }}</mat-icon>
                  <span class="doc-name">{{ doc.originalFilename }}</span>
                  <span class="doc-size">{{ formatSize(doc.sizeBytes) }}</span>
                  <button mat-icon-button color="primary" type="button" (click)="viewDocument(doc)" [title]="'credentials.form.viewDownload' | transloco">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </div>
              }
            }
          </div>
        }

        <!-- File Upload -->
        <div class="upload-section">
          <label class="upload-label">{{ (isEdit ? 'credentials.form.uploadLabelEdit' : 'credentials.form.uploadLabelAdd') | transloco }}</label>

          @if (selectedFiles.length > 0 && !model.credentialTypePublicId && !extracting && !extractionDone) {
            <div class="ai-pending-hint">
              <mat-icon>info</mat-icon>
              <span>{{ 'credentials.form.selectTypeFirst' | transloco }}</span>
            </div>
          }

          <div class="upload-area"
               (click)="fileInput.click()"
               (dragover)="onDragOver($event)"
               (drop)="onDrop($event)"
               [class.extracting]="extracting">
            @if (extracting) {
              <mat-spinner diameter="36"></mat-spinner>
              <p class="ai-analyzing">{{ 'credentials.form.aiAnalyzing' | transloco }}</p>
            } @else if (imagePreviews.length > 0) {
              <div class="preview-grid">
                @for (preview of imagePreviews; track $index) {
                  <div class="preview-item">
                    <img [src]="preview" alt="Preview {{ $index + 1 }}" class="preview-img">
                    <span class="preview-label">{{ ($index === 0 ? 'credentials.form.previewFront' : 'credentials.form.previewBack') | transloco }}</span>
                  </div>
                }
              </div>
            } @else {
              <mat-icon>cloud_upload</mat-icon>
              <p>{{ 'credentials.form.uploadPrompt' | transloco }}</p>
              <span class="hint">{{ 'credentials.form.uploadHint' | transloco }}</span>
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
                <mat-icon>add</mat-icon> {{ 'credentials.form.addMoreImages' | transloco }}
              </button>
            }
          }
          @if (extractionDone && aiConfidence !== null) {
            <div class="ai-panel" #aiPanel>
              <div class="ai-panel-head">
                <mat-icon>auto_awesome</mat-icon>
                <span>{{ 'credentials.form.aiExtracted' | transloco: { confidence: (aiConfidence! * 100).toFixed(0) } }}</span>
              </div>
              @if (hasAnyAiValue()) {
                <ul class="ai-values">
                  @if (aiResult?.issueDate) {
                    <li>{{ 'credentials.form.aiIssueDate' | transloco }}: <strong>{{ aiResult!.issueDate }}</strong>
                      @if (issueDate) { <span class="ai-kept">{{ 'credentials.form.aiKeepsValue' | transloco }}</span> }
                    </li>
                  }
                  @if (aiResult?.expirationDate) {
                    <li>{{ 'credentials.form.aiExpiration' | transloco }}: <strong>{{ aiResult!.expirationDate }}</strong>
                      @if (expirationDate) { <span class="ai-kept">{{ 'credentials.form.aiKeepsValue' | transloco }}</span> }
                    </li>
                  }
                  @if (aiResult?.issuer) {
                    <li>{{ 'credentials.form.aiIssuer' | transloco }}: <strong>{{ aiResult!.issuer }}</strong>
                      @if (model.issuer) { <span class="ai-kept">{{ 'credentials.form.aiKeepsValue' | transloco }}</span> }
                    </li>
                  }
                  @if (aiResult?.credentialNumber) {
                    <li>{{ 'credentials.form.aiNumber' | transloco }}: <strong>{{ aiResult!.credentialNumber }}</strong>
                      @if (model.credentialNumber) { <span class="ai-kept">{{ 'credentials.form.aiKeepsValue' | transloco }}</span> }
                    </li>
                  }
                </ul>
                <div class="ai-actions">
                  <button mat-stroked-button color="primary" type="button" (click)="applyAiData(false)">
                    <mat-icon>playlist_add</mat-icon> {{ 'credentials.form.aiFillEmpty' | transloco }}
                  </button>
                  <button mat-button type="button" (click)="applyAiData(true)">
                    {{ 'credentials.form.aiOverwriteAll' | transloco }}
                  </button>
                </div>
                @if (aiApplied) {
                  <div class="ai-applied"><mat-icon>check</mat-icon> {{ 'credentials.form.aiApplied' | transloco }}</div>
                }
              } @else {
                <span class="ai-none">{{ 'credentials.form.aiNoData' | transloco }}</span>
              }
            </div>
          }
          @if (uploading) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-raised-button color="primary"
              [disabled]="!form.valid || saving || extracting"
              (click)="onSave()">
        {{ saving ? ('common.saving' | transloco) : ((isEdit ? 'common.update' : 'common.create') | transloco) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-row { display: flex; gap: 16px; }
    .form-row mat-form-field { flex: 1; }
    .full-width { width: 100%; }
    mat-dialog-content { min-width: min(500px, 80vw); padding-top: 20px !important; }
    .upload-section { margin-bottom: 16px; }
    .existing-docs { margin-bottom: 16px; }
    .no-docs { color: #999; font-size: 13px; margin: 4px 0; }
    .doc-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 6px;
    }
    .doc-row .doc-icon { color: #1565c0; font-size: 20px; width: 20px; height: 20px; }
    .doc-row .doc-name { flex: 1; font-size: 13px; word-break: break-all; }
    .doc-row .doc-size { font-size: 12px; color: #999; }
    .upload-label {
      display: block; font-size: 12px; color: rgba(0,0,0,0.6);
      margin-bottom: 8px;
    }
    .ai-pending-hint {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; border-radius: 8px;
      background: #fff4e5; border: 1px solid #ffb74d;
      color: #6d4c00; font-size: 13px; line-height: 1.4;
      margin-bottom: 10px;
    }
    .ai-pending-hint mat-icon {
      color: #ed6c02; font-size: 20px; width: 20px; height: 20px;
      flex-shrink: 0; margin-top: 1px;
    }
    .upload-area {
      border: 2px dashed #ccc; border-radius: 8px; padding: 24px;
      text-align: center; cursor: pointer; transition: border-color 0.2s;
    }
    .upload-area:hover { border-color: #1565c0; }
    .upload-area.extracting { border-color: #7c4dff; cursor: default; }
    .upload-area mat-icon { font-size: 40px; width: 40px; height: 40px; color: #999; }
    .ai-analyzing { color: #7c4dff; font-weight: 500; }
    .upload-area p { margin: 8px 0 4px; color: #666; }
    .upload-area .hint { font-size: 12px; color: #999; }
    .preview-grid { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .preview-item { text-align: center; }
    .preview-item .preview-img { max-width: 180px; max-height: 150px; border-radius: 4px; }
    .preview-label { display: block; font-size: 11px; color: #666; margin-top: 4px; }
    .file-info {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 8px; padding: 4px 8px; background: #f5f5f5; border-radius: 4px;
      font-size: 13px;
    }
    .add-more-btn { margin-top: 8px; }
    .ai-panel {
      margin-top: 8px; padding: 10px 12px; border-radius: 6px;
      background: #ede7f6; color: #5e35b1; font-size: 13px;
    }
    .ai-panel-head { display: flex; align-items: center; gap: 6px; font-weight: 500; }
    .ai-panel-head mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .ai-values { margin: 8px 0; padding-left: 18px; color: #4527a0; }
    .ai-values li { margin: 2px 0; }
    .ai-kept { color: #7e57c2; font-size: 12px; font-style: italic; }
    .ai-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
    .ai-actions mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .ai-applied { display: flex; align-items: center; gap: 4px; margin-top: 8px; color: #2e7d32; font-size: 12px; }
    .ai-applied mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .ai-none { display: block; margin-top: 6px; color: #6a1b9a; }
    @media (max-width: 480px) {
      .form-row { flex-direction: column; gap: 0; }
    }
  `]
})
export class CredentialFormDialogComponent {
  @ViewChild('aiPanel') aiPanel?: ElementRef<HTMLElement>;
  isEdit: boolean;
  saving = false;
  uploading = false;
  extracting = false;
  extractionDone = false;
  aiConfidence: number | null = null;
  aiResult: AiExtractionResponse | null = null;
  aiApplied = false;
  issueDate: Date | null = null;
  expirationDate: Date | null = null;
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  uploadAccept = UPLOAD_ACCEPT;
  existingDocs: DocumentResponse[] = [];
  loadingDocs = false;

  model: CredentialUpsertRequest;

  constructor(
    private dialogRef: MatDialogRef<CredentialFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      credential?: Credential;
      agencyPublicId: string;
      credentialTypes: CredentialType[];
      employees: Employee[];
    },
    private credentialService: CredentialService,
    private documentService: DocumentService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {
    this.isEdit = !!data.credential;
    const c = data.credential;
    // When opened from an employee profile, employees has length 1 — pre-select it.
    const defaultEmployeeId = (!c && data.employees.length === 1)
      ? data.employees[0].publicId : '';
    this.model = {
      agencyPublicId: data.agencyPublicId,
      employeePublicId: c?.employeePublicId ?? defaultEmployeeId,
      credentialTypePublicId: c?.credentialTypePublicId ?? '',
      issuer: c?.issuer ?? '',
      credentialNumber: c?.credentialNumber ?? '',
      notes: c?.notes ?? ''
    };
    if (c?.issueDate) this.issueDate = new Date(c.issueDate + 'T00:00:00');
    if (c?.expirationDate) this.expirationDate = new Date(c.expirationDate + 'T00:00:00');

    // When editing, load the documents already attached to this credential so
    // the user can see (and open) what is on file, not just upload new ones.
    if (this.isEdit && c) {
      this.loadingDocs = true;
      this.documentService.getByCredential(c.publicId).subscribe({
        next: (docs) => { this.existingDocs = docs; this.loadingDocs = false; },
        error: () => { this.loadingDocs = false; }
      });
    }
  }

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
    if (event.dataTransfer?.files.length) {
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

    this.resetAiState();
    this.tryAiExtraction();
  }

  /** Re-runs AI extraction once the user picks a credential type if files were already uploaded. */
  onCredentialTypeChange(): void {
    if (this.selectedFiles.length > 0 && !this.extracting && !this.extractionDone) {
      this.tryAiExtraction();
    }
  }

  private tryAiExtraction(): void {
    if (this.selectedFiles.length === 0) return;
    // Inline persistent hint in the upload area handles the "no type yet" case
    // — no snackbar needed (snackbars at the bottom were easy to miss).
    if (!this.model.credentialTypePublicId) return;
    const credType = this.data.credentialTypes.find(t => t.publicId === this.model.credentialTypePublicId);
    if (!credType) return;

    this.extracting = true;
    this.documentService.extractData(this.selectedFiles, credType.name).subscribe({
      next: (result: AiExtractionResponse) => {
        this.extracting = false;
        this.extractionDone = true;
        this.aiConfidence = result.confidence;
        // Don't touch the form yet: show what was extracted and let the user
        // decide. Auto-applying silently used to overwrite values the user had
        // already typed.
        this.aiResult = result;
        // On mobile the AI panel renders below the fold — bring it into view.
        setTimeout(() => this.aiPanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      },
      error: () => {
        this.extracting = false;
        this.snackBar.open(this.transloco.translate('credentials.form.aiUnavailable'), 'OK', { duration: 4000 });
      }
    });
  }

  /** True if the AI returned at least one usable value. */
  hasAnyAiValue(): boolean {
    const r = this.aiResult;
    return !!r && !!(r.issueDate || r.expirationDate || r.issuer || r.credentialNumber);
  }

  /**
   * Applies the extracted values to the form. When overwrite is false, only
   * empty fields are filled (the user's manual input is preserved). When true,
   * every field the AI extracted is replaced.
   */
  applyAiData(overwrite: boolean): void {
    const r = this.aiResult;
    if (!r) return;

    if (r.issueDate && (overwrite || !this.issueDate)) {
      const p = r.issueDate.split('-');
      this.issueDate = new Date(+p[0], +p[1] - 1, +p[2]);
    }
    if (r.expirationDate && (overwrite || !this.expirationDate)) {
      const p = r.expirationDate.split('-');
      this.expirationDate = new Date(+p[0], +p[1] - 1, +p[2]);
    }
    if (r.issuer && (overwrite || !this.model.issuer)) this.model.issuer = r.issuer;
    if (r.credentialNumber && (overwrite || !this.model.credentialNumber)) this.model.credentialNumber = r.credentialNumber;

    this.aiApplied = true;
  }

  private resetAiState(): void {
    this.extractionDone = false;
    this.aiConfidence = null;
    this.aiResult = null;
    this.aiApplied = false;
  }

  removeFileAt(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
    if (this.selectedFiles.length === 0) {
      this.resetAiState();
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  viewDocument(doc: DocumentResponse): void {
    this.documentService.downloadAsBlob(doc.publicId).subscribe({
      next: (url) => window.open(url, '_blank'),
      error: () => this.snackBar.open(this.transloco.translate('credentials.form.openDocError'), 'OK', { duration: 3000 })
    });
  }

  onSave(): void {
    this.saving = true;
    const request: CredentialUpsertRequest = {
      ...this.model,
      issueDate: this.issueDate ? this.formatDate(this.issueDate) : undefined,
      expirationDate: this.expirationDate ? this.formatDate(this.expirationDate) : undefined
    };

    const obs = this.isEdit
      ? this.credentialService.update(this.data.credential!.publicId, request)
      : this.credentialService.create(request);

    obs.subscribe({
      next: (credential) => {
        if (this.selectedFiles.length > 0) {
          this.uploading = true;
          const uploads = this.selectedFiles.map(f =>
            this.documentService.upload(f, this.data.agencyPublicId, credential.publicId, request.employeePublicId)
          );
          forkJoin(uploads).subscribe({
            next: () => {
              this.snackBar.open(
                this.transloco.translate(this.isEdit ? 'credentials.form.updatedWithDocs' : 'credentials.form.createdWithDocs'),
                'OK', { duration: 3000 });
              this.dialogRef.close(true);
            },
            error: () => {
              this.snackBar.open(this.transloco.translate('credentials.form.savedDocsFailed'), 'OK', { duration: 5000 });
              this.dialogRef.close(true);
            }
          });
        } else {
          this.snackBar.open(this.transloco.translate(this.isEdit ? 'credentials.form.updated' : 'credentials.form.created'), 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        }
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.transloco.translate('credentials.form.saveError'), 'OK', { duration: 5000 });
      }
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
