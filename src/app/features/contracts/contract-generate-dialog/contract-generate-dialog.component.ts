import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionSelectionChange } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ContractTemplateService } from '../../../core/services/contract-template.service';
import { ContractService } from '../../../core/services/contract.service';
import { PositionService } from '../../../core/services/position.service';
import { ContractTemplate, Contract } from '../../../core/models/contract.model';
import { EmployeeEligibilityResponse } from '../../../core/models/position.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { forkJoin } from 'rxjs';
import { toLocalIsoDate } from '../../../core/utils/date.util';

export interface ContractGenerateData {
  employeePublicId: string;
  employeeName: string;
  agencyPublicId: string;
}

interface TemplateGroup {
  label: string;
  positionPublicId?: string;
  templates: ContractTemplate[];
}

const GROUP_SENTINEL_PREFIX = '__SELECT_ALL__:';

@Component({
  selector: 'app-contract-generate-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatStepperModule,
    MatDatepickerModule, MatNativeDateModule,
    TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>description</mat-icon> {{ 'contracts.generate.title' | transloco }}
    </h2>
    <mat-dialog-content>
      <p class="subtitle">{{ 'contracts.generate.forEmployee' | transloco }}: <strong>{{ data.employeeName }}</strong></p>

      <!-- Step indicator -->
      <div class="step-indicator">
        <div class="step" [class.active]="!generatedContract" [class.completed]="!!generatedContract">
          <span class="step-number">{{ generatedContract ? '&#10003;' : '1' }}</span>
          <span class="step-label">{{ 'contracts.generate.stepConfigure' | transloco }}</span>
        </div>
        <div class="step-line" [class.active]="!!generatedContract"></div>
        <div class="step" [class.active]="!!generatedContract">
          <span class="step-number">2</span>
          <span class="step-label">{{ 'contracts.generate.stepPreview' | transloco }}</span>
        </div>
      </div>

      @if (loadingTemplates) {
        <div class="loading-container"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!generatedContract) {
        <!-- Step 1: Configure -->
        @if (templateGroups.length === 0) {
          <div class="empty-templates">
            <mat-icon>info</mat-icon>
            <span>{{ 'contracts.generate.noTemplatesForEmployee' | transloco }}</span>
          </div>
        } @else {
          <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
            <mat-label>{{ 'contracts.generate.selectTemplates' | transloco }}</mat-label>
            <mat-select [(ngModel)]="selectedTemplateIds" multiple required
                        panelClass="template-group-panel">
              @for (g of templateGroups; track g.label) {
                @if (g.templates.length > 1) {
                  <mat-option [value]="groupSentinel(g)"
                              class="group-header-opt"
                              (onSelectionChange)="handleSelectAll($event, g)">
                    <mat-icon class="group-check-icon">{{ groupCheckIcon(g) }}</mat-icon>
                    <span class="group-label">{{ g.label }}</span>
                  </mat-option>
                } @else {
                  <mat-option [disabled]="true" class="group-header-opt static">
                    <mat-icon class="group-check-icon hidden">check_box_outline_blank</mat-icon>
                    <span class="group-label">{{ g.label }}</span>
                  </mat-option>
                }
                @for (t of g.templates; track t.publicId) {
                  <mat-option [value]="t.publicId" class="template-child-opt">{{ t.name }}</mat-option>
                }
              }
            </mat-select>
            <mat-hint>{{ 'contracts.generate.selectTemplatesHint' | transloco }}</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
          <mat-label>{{ 'contracts.generate.contractTitle' | transloco }}</mat-label>
          <input matInput [(ngModel)]="title" required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
          <mat-label>{{ 'contracts.generate.position' | transloco }}</mat-label>
          <mat-select [(ngModel)]="position">
            <mat-option value="">{{ 'common.none' | transloco }}</mat-option>
            @for (p of employeePositions; track p.positionPublicId) {
              <mat-option [value]="p.positionName">{{ p.positionName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
          <mat-label>{{ 'contracts.generate.effectiveDate' | transloco }}</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="effectiveDate">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <p class="section-label">{{ 'contracts.generate.compensationSchedule' | transloco }} <span class="optional">({{ 'contracts.generate.compensationHint' | transloco }})</span></p>
        <div class="comp-row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'contracts.generate.payRate' | transloco }}</mat-label>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput [(ngModel)]="payRate" placeholder="15.00">
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'contracts.generate.per' | transloco }}</mat-label>
            <mat-select [(ngModel)]="payUnit">
              <mat-option value="">--</mat-option>
              <mat-option value="per hour">{{ 'contracts.generate.perHour' | transloco }}</mat-option>
              <mat-option value="per visit">{{ 'contracts.generate.perVisit' | transloco }}</mat-option>
              <mat-option value="per day">{{ 'contracts.generate.perDay' | transloco }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="comp-row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'contracts.generate.daysPerWeek' | transloco }}</mat-label>
            <input matInput [(ngModel)]="scheduleDays" placeholder="5">
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'contracts.generate.from' | transloco }}</mat-label>
            <input matInput [(ngModel)]="scheduleHoursFrom" placeholder="9:00 AM">
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'contracts.generate.to' | transloco }}</mat-label>
            <input matInput [(ngModel)]="scheduleHoursTo" placeholder="5:00 PM">
          </mat-form-field>
        </div>
      } @else {
        <!-- Step 2: Preview -->
        <div class="preview-section">
          <div class="preview-header">
            <span class="status-chip draft">{{ 'contracts.generate.statusDraft' | transloco }}</span>
            <span class="preview-title">{{ generatedContract.title }}</span>
          </div>
          <div class="preview-container" [innerHTML]="previewHtml"></div>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      @if (!generatedContract) {
        <button mat-raised-button color="primary" (click)="generate()"
                [disabled]="generating || !selectedTemplateIds.length || !title">
          {{ generating ? ('contracts.generate.generating' | transloco) : ('contracts.generate.generatePreview' | transloco) }}
        </button>
      } @else {
        <button mat-stroked-button (click)="downloadPdf()">
          <mat-icon>download</mat-icon> {{ 'common.download' | transloco }} PDF
        </button>
        <button mat-raised-button color="primary" (click)="sendToEmployee()"
                [disabled]="sending">
          {{ sending ? ('contracts.generate.sending' | transloco) : ('contracts.generate.sendToEmployee' | transloco) }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-dialog-content { min-width: 450px; max-width: 650px; }
    /* subscriptSizing="dynamic" removes the default 22px subscript reserve;
       restore consistent breathing room between fields explicitly. */
    mat-form-field { margin-bottom: 14px; display: block; }
    .comp-row mat-form-field { margin-bottom: 0; display: inline-flex; }
    .comp-row { margin-bottom: 14px; }
    .subtitle { color: #666; margin-bottom: 8px; }
    .section-label {
      font-size: 13px; font-weight: 600; color: #555; margin: 4px 0 8px;
    }
    .section-label .optional { font-weight: 400; color: #999; font-size: 12px; }
    .comp-row { display: flex; gap: 12px; }
    .comp-row mat-form-field { flex: 1; }
    .step-indicator {
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px; padding: 12px 0;
    }
    .step {
      display: flex; align-items: center; gap: 8px; opacity: 0.4;
      transition: opacity 0.2s;
    }
    .step.active, .step.completed { opacity: 1; }
    .step-number {
      width: 28px; height: 28px; border-radius: 50%; background: #e0e0e0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; color: #666;
    }
    .step.active .step-number { background: #00796b; color: white; }
    .step.completed .step-number { background: #4caf50; color: white; }
    .step-label { font-size: 13px; font-weight: 500; color: #555; }
    .step.active .step-label { color: #00796b; }
    .step-line {
      width: 48px; height: 2px; background: #e0e0e0; margin: 0 12px;
      transition: background 0.2s;
    }
    .step-line.active { background: #4caf50; }
    .loading-container { display: flex; justify-content: center; padding: 32px; }
    .preview-section { margin-top: 8px; }
    .preview-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
    }
    .preview-title { font-weight: 600; font-size: 16px; }
    .status-chip {
      padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
    }
    .status-chip.draft { background: #e3f2fd; color: #1565c0; }
    .preview-container {
      border: 1px solid #ddd; border-radius: 8px; padding: 20px;
      max-height: 400px; overflow-y: auto; background: white;
      font-size: 13px; line-height: 1.6;
    }
    .empty-templates {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-radius: 8px;
      background: #fff3e0; color: #6d4c00;
      margin-bottom: 16px; font-size: 13px;
    }
    .empty-templates mat-icon { color: #ed6c02; }
    /* Tree-style group: header (position) as root, templates indented as children */
    ::ng-deep .template-group-panel .group-header-opt {
      background: #eceff1;
      border-bottom: 1px solid #cfd8dc;
      height: 44px;
    }
    ::ng-deep .template-group-panel .group-header-opt.static {
      cursor: default;
      opacity: 0.9;
    }
    ::ng-deep .template-group-panel .group-header-opt .group-check-icon {
      font-size: 20px; width: 20px; height: 20px;
      vertical-align: middle; margin-right: 10px;
      color: #00796b;
    }
    ::ng-deep .template-group-panel .group-header-opt .group-check-icon.hidden {
      visibility: hidden;
    }
    ::ng-deep .template-group-panel .group-label {
      font-size: 12px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px;
      color: #37474f;
    }
    /* Hide Material's own pseudo-checkbox on the header — our icon is the state */
    ::ng-deep .template-group-panel .group-header-opt .mat-pseudo-checkbox,
    ::ng-deep .template-group-panel .group-header-opt .mdc-list-item__start { display: none !important; }
    /* Indent template children to feel like a folder tree */
    ::ng-deep .template-group-panel .template-child-opt {
      padding-left: 40px !important;
    }
    ::ng-deep .template-group-panel .template-child-opt::before {
      content: '└─';
      color: #b0bec5;
      margin-left: -22px;
      margin-right: 8px;
      font-size: 12px;
      font-family: monospace;
    }
    @media (max-width: 600px) {
      mat-dialog-content { min-width: unset; }
    }
  `]
})
export class ContractGenerateDialogComponent implements OnInit {
  templates: ContractTemplate[] = [];
  templateGroups: TemplateGroup[] = [];
  employeePositions: EmployeeEligibilityResponse[] = [];
  loadingTemplates = true;
  selectedTemplateIds: string[] = [];
  title = '';
  position = '';
  effectiveDate: Date | null = null;
  payRate = '';
  payUnit = '';
  scheduleDays = '';
  scheduleHoursFrom = '';
  scheduleHoursTo = '';
  generating = false;
  sending = false;
  generatedContract: Contract | null = null;
  previewHtml: SafeHtml = '';

  constructor(
    private dialogRef: MatDialogRef<ContractGenerateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContractGenerateData,
    private templateService: ContractTemplateService,
    private contractService: ContractService,
    private positionService: PositionService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {
    this.title = `Employment Agreement - ${data.employeeName}`;
  }

  ngOnInit(): void {
    forkJoin({
      templates: this.templateService.getActive(this.data.agencyPublicId),
      positions: this.positionService.getEmployeeEligibility(this.data.employeePublicId)
    }).subscribe({
      next: ({ templates, positions }) => {
        this.templates = templates.content;
        this.employeePositions = positions;
        this.templateGroups = this.buildTemplateGroups();
        this.loadingTemplates = false;
      },
      error: () => { this.loadingTemplates = false; }
    });
  }

  private buildTemplateGroups(): TemplateGroup[] {
    // Backwards-compat safety net: if the employee has no positions assigned,
    // fall back to showing all active templates ungrouped. This preserves the
    // pre-positions behavior and avoids blocking admins from generating
    // contracts for legacy employees that were never assigned to a position.
    if (this.employeePositions.length === 0) {
      return [{
        label: this.transloco.translate('contracts.generate.allTemplatesGroup'),
        templates: [...this.templates]
      }];
    }

    const employeePositionIds = new Set(this.employeePositions.map(p => p.positionPublicId));
    const visible = this.templates.filter(t => {
      const positions = t.positions ?? [];
      return positions.length === 0 ||
        positions.some(p => employeePositionIds.has(p.publicId));
    });

    const groups: TemplateGroup[] = [];
    const assigned = new Set<string>();

    for (const ep of this.employeePositions) {
      const groupTemplates = visible.filter(t =>
        !assigned.has(t.publicId) &&
        (t.positions ?? []).some(p => p.publicId === ep.positionPublicId)
      );
      groupTemplates.forEach(t => assigned.add(t.publicId));
      if (groupTemplates.length > 0) {
        groups.push({
          label: ep.positionName,
          positionPublicId: ep.positionPublicId,
          templates: groupTemplates
        });
      }
    }

    const universal = visible.filter(t => (t.positions ?? []).length === 0);
    if (universal.length > 0) {
      groups.push({
        label: this.transloco.translate('contracts.generate.universalGroup'),
        templates: universal
      });
    }

    return groups;
  }

  isGroupAllSelected(g: TemplateGroup): boolean {
    return g.templates.length > 0 &&
      g.templates.every(t => this.selectedTemplateIds.includes(t.publicId));
  }

  isGroupSomeSelected(g: TemplateGroup): boolean {
    const some = g.templates.some(t => this.selectedTemplateIds.includes(t.publicId));
    return some && !this.isGroupAllSelected(g);
  }

  groupCheckIcon(g: TemplateGroup): string {
    if (this.isGroupAllSelected(g)) return 'check_box';
    if (this.isGroupSomeSelected(g)) return 'indeterminate_check_box';
    return 'check_box_outline_blank';
  }

  groupSentinel(g: TemplateGroup): string {
    return GROUP_SENTINEL_PREFIX + g.label;
  }

  handleSelectAll(event: MatOptionSelectionChange, g: TemplateGroup): void {
    if (!event.isUserInput) return;
    // The sentinel option got selected/deselected by Material — undo that so
    // the sentinel value never ends up in selectedTemplateIds.
    event.source.deselect();
    const groupIds = g.templates.map(t => t.publicId);
    if (this.isGroupAllSelected(g)) {
      this.selectedTemplateIds = this.selectedTemplateIds.filter(id => !groupIds.includes(id));
    } else {
      const set = new Set([...this.selectedTemplateIds, ...groupIds]);
      this.selectedTemplateIds = Array.from(set);
    }
  }

  private cleanSentinels(ids: string[]): string[] {
    return ids.filter(id => !id.startsWith(GROUP_SENTINEL_PREFIX));
  }

  generate(): void {
    this.generating = true;
    this.contractService.generate({
      agencyPublicId: this.data.agencyPublicId,
      employeePublicId: this.data.employeePublicId,
      templatePublicIds: this.cleanSentinels(this.selectedTemplateIds),
      title: this.title,
      position: this.position || undefined,
      effectiveDate: this.effectiveDate ? this.formatDate(this.effectiveDate) : undefined,
      payRate: this.payRate || undefined,
      payUnit: this.payUnit || undefined,
      scheduleDays: this.scheduleDays || undefined,
      scheduleHoursFrom: this.scheduleHoursFrom || undefined,
      scheduleHoursTo: this.scheduleHoursTo || undefined
    }).subscribe({
      next: contract => {
        this.generatedContract = contract;
        this.loadPreview(contract.publicId);
        this.generating = false;
      },
      error: () => {
        this.generating = false;
        this.snackBar.open(this.transloco.translate('contracts.generate.generateError'), 'OK', { duration: 3000 });
      }
    });
  }

  private loadPreview(publicId: string): void {
    this.contractService.previewHtml(publicId).subscribe({
      next: html => {
        this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
      }
    });
  }

  sendToEmployee(): void {
    if (!this.generatedContract) return;
    this.sending = true;
    this.contractService.send(this.generatedContract.publicId).subscribe({
      next: () => {
        this.snackBar.open(this.transloco.translate('contracts.generate.sendSuccess'), 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.sending = false;
        this.snackBar.open(this.transloco.translate('contracts.generate.sendError'), 'OK', { duration: 3000 });
      }
    });
  }

  downloadPdf(): void {
    if (!this.generatedContract) return;
    this.contractService.downloadPdf(this.generatedContract.publicId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.generatedContract!.title + '.pdf';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open(this.transloco.translate('contracts.generate.downloadError'), 'OK', { duration: 3000 })
    });
  }

  private formatDate(date: Date): string {
    return toLocalIsoDate(date);
  }
}
