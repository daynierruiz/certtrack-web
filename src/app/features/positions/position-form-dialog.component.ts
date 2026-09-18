import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CredentialService } from '../../core/services/credential.service';
import { PositionService } from '../../core/services/position.service';
import { CredentialType } from '../../core/models/credential.model';
import { PositionResponse, RequirementRequest } from '../../core/models/position.model';

@Component({
  selector: 'app-position-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule,
    MatSelectModule, MatSnackBarModule, TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.position ? 'positions.form.titleEdit' : 'positions.form.titleCreate') | transloco }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'positions.form.code' | transloco }}</mat-label>
        <input matInput [(ngModel)]="code" name="code" maxlength="50" required
               [readonly]="!!data.position">
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'common.name' | transloco }}</mat-label>
        <input matInput [(ngModel)]="name" name="name" maxlength="200" required>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'positions.form.description' | transloco }}</mat-label>
        <textarea matInput [(ngModel)]="description" name="description" rows="2"></textarea>
      </mat-form-field>

      <h3>{{ 'positions.form.requirements' | transloco }}</h3>
      <p class="hint" *ngIf="requirements.length === 0">{{ 'positions.form.requirementsHint' | transloco }}</p>

      @for (req of requirements; track $index) {
        <div class="req-row">
          <mat-form-field appearance="outline" class="req-type">
            <mat-label>{{ 'positions.form.credentialType' | transloco }}</mat-label>
            <mat-select [(ngModel)]="req.credentialTypePublicId" [name]="'type' + $index">
              @for (ct of availableTypesFor($index); track ct.publicId) {
                <mat-option [value]="ct.publicId">{{ ct.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-checkbox [(ngModel)]="req.isMandatory" [name]="'mandatory' + $index">
            {{ 'positions.form.mandatory' | transloco }}
          </mat-checkbox>
          <button mat-icon-button color="warn" (click)="removeRequirement($index)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <button mat-stroked-button (click)="addRequirement()" class="add-btn">
        <mat-icon>add</mat-icon> {{ 'positions.form.addRequirement' | transloco }}
      </button>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="hasSavedChanges">
        {{ (hasSavedChanges ? 'positions.form.done' : 'common.cancel') | transloco }}
      </button>
      <button mat-raised-button color="primary" [disabled]="saving || !code || !name"
              (click)="onSave()">
        {{ (saving ? 'common.saving' : 'common.save') | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-dialog-content { min-width: min(450px, 80vw); padding-top: 20px !important; }
    h3 { margin: 16px 0 8px; font-size: 14px; color: #333; }
    .hint { font-size: 13px; color: #999; }
    .req-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .req-type { flex: 1; }
    .add-btn { margin-top: 8px; }
    .add-btn mat-icon { font-size: 18px; margin-right: 4px; }
    @media (max-width: 480px) {
      .req-row { flex-direction: column; align-items: stretch; gap: 0; }
    }
  `]
})
export class PositionFormDialogComponent implements OnInit {
  code = '';
  name = '';
  description = '';
  requirements: RequirementRequest[] = [];
  credentialTypes: CredentialType[] = [];
  saving = false;
  hasSavedChanges = false;

  constructor(
    private dialogRef: MatDialogRef<PositionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { agencyPublicId: string; position?: PositionResponse },
    private positionService: PositionService,
    private credentialService: CredentialService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {
    if (data.position) {
      this.code = data.position.code;
      this.name = data.position.name;
      this.description = data.position.description || '';
      this.requirements = data.position.requirements.map(r => ({
        credentialTypePublicId: r.credentialTypePublicId,
        isMandatory: r.isMandatory
      }));
    }
  }

  ngOnInit(): void {
    if (!this.data.agencyPublicId) {
      this.snackBar.open(
        'Error: missing agency context. Close and reopen this dialog.',
        'OK', { duration: 6000 }
      );
      return;
    }
    this.credentialService.getTypes(this.data.agencyPublicId).subscribe({
      next: types => {
        this.credentialTypes = types ?? [];
        if (this.credentialTypes.length === 0) {
          this.snackBar.open(
            'No credential types are configured. Create some under Credentials first.',
            'OK', { duration: 6000 }
          );
        }
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'unknown error';
        this.snackBar.open(`Failed to load credential types: ${msg}`, 'Close', { duration: 8000 });
        console.error('getTypes failed', err);
      }
    });
  }

  addRequirement(): void {
    this.requirements.push({ credentialTypePublicId: '', isMandatory: true });
  }

  /** Types not picked in OTHER rows — current row's own value stays available. */
  availableTypesFor(index: number): CredentialType[] {
    const takenByOthers = new Set(
      this.requirements
        .filter((_, i) => i !== index)
        .map(r => r.credentialTypePublicId)
        .filter(id => !!id)
    );
    return this.credentialTypes.filter(ct => !takenByOthers.has(ct.publicId));
  }

  removeRequirement(index: number): void {
    this.requirements.splice(index, 1);
  }

  onSave(): void {
    this.saving = true;
    const request = {
      agencyPublicId: this.data.agencyPublicId,
      code: this.code,
      name: this.name,
      description: this.description || undefined,
      isActive: true,
      requirements: this.requirements.filter(r => r.credentialTypePublicId)
    };

    const op = this.data.position
      ? this.positionService.update(this.data.position.publicId, request)
      : this.positionService.create(request);

    op.subscribe({
      next: (saved) => {
        this.saving = false;
        this.hasSavedChanges = true;
        // Switch into edit mode so subsequent Save calls UPDATE the same position.
        this.data.position = saved;
        // Re-sync local form state from the server response (canonical truth).
        this.requirements = saved.requirements.map(r => ({
          credentialTypePublicId: r.credentialTypePublicId,
          isMandatory: r.isMandatory
        }));
        this.snackBar.open(this.transloco.translate('positions.form.savedOk'), 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.transloco.translate('positions.form.saveError'), 'Close', { duration: 5000 });
      }
    });
  }
}
