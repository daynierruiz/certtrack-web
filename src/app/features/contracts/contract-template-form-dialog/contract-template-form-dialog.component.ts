import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ContractTemplateService } from '../../../core/services/contract-template.service';
import { PositionService } from '../../../core/services/position.service';
import { ContractTemplate } from '../../../core/models/contract.model';
import { PositionResponse } from '../../../core/models/position.model';

export interface ContractTemplateFormData {
  template?: ContractTemplate;
  agencyPublicId: string;
}

@Component({
  selector: 'app-contract-template-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatSlideToggleModule,
    MatSnackBarModule, MatIconModule, MatProgressSpinnerModule,
    TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.template ? ('contracts.templateForm.titleEdit' | transloco) : ('contracts.templateForm.titleNew' | transloco) }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'contracts.templateForm.templateName' | transloco }}</mat-label>
        <input matInput [(ngModel)]="name" required #nameField="ngModel">
        @if (nameField.invalid && nameField.touched) {
          <mat-error>{{ 'contracts.templateForm.nameRequired' | transloco }}</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'contracts.templateForm.description' | transloco }}</mat-label>
        <textarea matInput [(ngModel)]="description" rows="2"></textarea>
        <mat-hint>{{ 'contracts.templateForm.descriptionHint' | transloco }}</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'contracts.templateForm.htmlBody' | transloco }}</mat-label>
        <textarea matInput [(ngModel)]="htmlBody" rows="12" required #bodyField="ngModel"
                  style="font-family: monospace; font-size: 12px;"></textarea>
        @if (bodyField.invalid && bodyField.touched) {
          <mat-error>{{ 'contracts.templateForm.htmlBodyRequired' | transloco }}</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'contracts.templateForm.positions' | transloco }}</mat-label>
        @if (loadingPositions) {
          <mat-spinner matSuffix diameter="18"></mat-spinner>
        }
        <mat-select multiple [(ngModel)]="selectedPositionIds" [disabled]="loadingPositions">
          @for (p of availablePositions; track p.publicId) {
            <mat-option [value]="p.publicId">
              {{ p.name }} ({{ p.code }})@if (!p.isActive) { <span class="muted"> — inactive</span> }
            </mat-option>
          }
        </mat-select>
        <mat-hint>{{ 'contracts.templateForm.positionsHint' | transloco }}</mat-hint>
      </mat-form-field>

      <div class="placeholders-hint">
        <strong>{{ 'contracts.templateForm.availablePlaceholders' | transloco }}</strong>
        <div class="placeholder-list">
          @for (p of placeholders; track p) {
            <code>{{ p }}</code>
          }
        </div>
      </div>

      @if (data.template) {
        <mat-slide-toggle [(ngModel)]="isActive">{{ 'common.active' | transloco }}</mat-slide-toggle>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving || !name || !htmlBody">
        {{ saving ? ('common.saving' | transloco) : ('common.save' | transloco) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-dialog-content { min-width: 450px; max-width: 600px; }
    .placeholders-hint {
      background: #f5f5f5; border-radius: 8px; padding: 12px; margin-bottom: 16px;
      font-size: 12px;
    }
    .placeholder-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .placeholder-list code {
      background: #e3f2fd; padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #1565c0;
    }
    .muted { color: #999; font-size: 12px; }
  `]
})
export class ContractTemplateFormDialogComponent implements OnInit {
  name = '';
  description = '';
  htmlBody = '';
  isActive = true;
  saving = false;
  availablePositions: PositionResponse[] = [];
  selectedPositionIds: string[] = [];
  loadingPositions = true;

  placeholders = [
    '{{employeeName}}', '{{employeeFirstName}}', '{{employeeLastName}}',
    '{{employeeEmail}}', '{{employeePhone}}', '{{employeeCode}}',
    '{{hireDate}}', '{{position}}', '{{agencyName}}',
    '{{currentDate}}', '{{effectiveDate}}', '{{contractTitle}}',
    '{{payRate}}', '{{payUnit}}', '{{scheduleDays}}',
    '{{scheduleHoursFrom}}', '{{scheduleHoursTo}}'
  ];

  constructor(
    private dialogRef: MatDialogRef<ContractTemplateFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContractTemplateFormData,
    private templateService: ContractTemplateService,
    private positionService: PositionService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {
    if (data.template) {
      this.name = data.template.name;
      this.description = data.template.description || '';
      this.htmlBody = data.template.htmlBody;
      this.isActive = data.template.isActive;
      this.selectedPositionIds = (data.template.positions ?? []).map(p => p.publicId);
    }
  }

  ngOnInit(): void {
    this.positionService.getAll(this.data.agencyPublicId, 0, 200).subscribe({
      next: page => {
        this.availablePositions = page.content;
        this.loadingPositions = false;
      },
      error: () => { this.loadingPositions = false; }
    });
  }

  save(): void {
    this.saving = true;

    if (this.data.template) {
      this.templateService.update(this.data.template.publicId, {
        name: this.name,
        description: this.description || undefined,
        htmlBody: this.htmlBody,
        isActive: this.isActive,
        positionPublicIds: this.selectedPositionIds
      }).subscribe({
        next: () => {
          this.snackBar.open(this.transloco.translate('contracts.templateForm.updateSuccess'), 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open(this.transloco.translate('contracts.templateForm.updateError'), 'OK', { duration: 3000 });
        }
      });
    } else {
      this.templateService.create({
        agencyPublicId: this.data.agencyPublicId,
        name: this.name,
        description: this.description || undefined,
        htmlBody: this.htmlBody,
        positionPublicIds: this.selectedPositionIds
      }).subscribe({
        next: () => {
          this.snackBar.open(this.transloco.translate('contracts.templateForm.createSuccess'), 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open(this.transloco.translate('contracts.templateForm.createError'), 'OK', { duration: 3000 });
        }
      });
    }
  }
}
