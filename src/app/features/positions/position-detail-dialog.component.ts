import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { PositionService } from '../../core/services/position.service';
import {
  PositionEligibilitySummary,
  EmployeeEligibilityResponse,
  RequirementResponse
} from '../../core/models/position.model';
import { EmployeeService } from '../../core/services/employee.service';

interface DialogData {
  positionPublicId: string;
  agencyPublicId: string;
  positionName: string;
  positionCode: string;
  requirements: RequirementResponse[];
}

@Component({
  selector: 'app-position-detail-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatSelectModule, MatFormFieldModule, MatSnackBarModule, MatTooltipModule,
    MatDividerModule, TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>
      <div class="title-row">
        <div>
          <span class="title-name">{{ data.positionName }}</span>
          <span class="title-code">{{ data.positionCode }}</span>
        </div>
        <button mat-icon-button mat-dialog-close [attr.aria-label]="'common.close' | transloco" class="dialog-close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </h2>

    <mat-dialog-content>

      <!-- ========== SECTION 1: Position Requirements ========== -->
      <div class="section">
        <div class="section-header">
          <mat-icon>checklist</mat-icon>
          <h3>{{ 'positions.detail.requirementsSection' | transloco }}</h3>
          <span class="section-count">{{ 'positions.detail.mandatoryOptionalCount' | transloco: { mandatory: mandatoryCount, optional: optionalCount } }}</span>
        </div>

        <div class="requirements-grid">
          @for (req of data.requirements; track req.publicId) {
            <div class="req-chip-item">
              <mat-icon [class]="req.isMandatory ? 'mandatory-icon' : 'optional-icon'">
                {{ req.isMandatory ? 'verified' : 'star_border' }}
              </mat-icon>
              <span class="req-chip-name">{{ req.credentialTypeName }}</span>
              <span class="req-chip-badge" [class.mandatory]="req.isMandatory">
                {{ (req.isMandatory ? 'positions.detail.required' : 'positions.detail.optional') | transloco }}
              </span>
            </div>
          }
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- ========== SECTION 2: Assigned Employees ========== -->
      <div class="section">
        <div class="section-header">
          <mat-icon>group</mat-icon>
          <h3>{{ 'positions.detail.assignedEmployees' | transloco }}</h3>
        </div>

        @if (loading) {
          <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
        } @else {

          <!-- Summary cards -->
          @if (summary && summary.totalAssigned > 0) {
            <div class="summary-cards">
              <div class="summary-card eligible">
                <div class="val">{{ summary.fullyEligible }}</div>
                <div class="label">{{ 'positions.detail.statusReady' | transloco }}</div>
              </div>
              <div class="summary-card partial">
                <div class="val">{{ summary.partiallyEligible }}</div>
                <div class="label">{{ 'positions.detail.statusAtRisk' | transloco }}</div>
              </div>
              <div class="summary-card not-eligible">
                <div class="val">{{ summary.notEligible }}</div>
                <div class="label">{{ 'positions.detail.statusBlocked' | transloco }}</div>
              </div>
            </div>
          }

          <!-- Assign employee -->
          <div class="assign-row">
            <mat-form-field appearance="outline" class="assign-select">
              <mat-label>{{ 'positions.detail.assignEmployee' | transloco }}</mat-label>
              <mat-select [(ngModel)]="selectedEmployeeId">
                @for (emp of availableEmployees; track emp.publicId) {
                  <mat-option [value]="emp.publicId">{{ emp.lastName }}, {{ emp.firstName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" [disabled]="!selectedEmployeeId"
                    (click)="assignEmployee()">
              <mat-icon>person_add</mat-icon> {{ 'positions.detail.assign' | transloco }}
            </button>
          </div>

          <!-- Employee list -->
          @if (summary && summary.employees.length > 0) {
            <div class="employee-list">
              @for (emp of summary.employees; track emp.employeePublicId) {
                <div class="employee-card" [class.expanded]="expandedEmployee === emp.employeePublicId">
                  <!-- Employee row (always visible) -->
                  <div class="employee-row" (click)="toggleEmployee(emp.employeePublicId)">
                    <div class="emp-left">
                      <mat-icon class="expand-icon">
                        {{ expandedEmployee === emp.employeePublicId ? 'expand_less' : 'expand_more' }}
                      </mat-icon>
                      <div class="emp-info">
                        <span class="emp-name">{{ emp.employeeName }}</span>
                        <span class="emp-progress-text">{{ 'positions.detail.mandatoryProgress' | transloco: { met: emp.metMandatory, total: emp.totalMandatory } }}</span>
                      </div>
                    </div>
                    <div class="emp-right">
                      <div class="emp-bar-container">
                        <mat-progress-bar mode="determinate" [value]="emp.percentComplete"
                          [color]="emp.percentComplete === 100 ? 'primary' : 'warn'">
                        </mat-progress-bar>
                      </div>
                      <span class="status-chip" [class]="'status-' + emp.status">
                        {{ formatStatus(emp.status) }}
                      </span>
                      <button mat-icon-button [matTooltip]="'positions.detail.viewProfile' | transloco"
                              (click)="viewEmployee(emp.employeePublicId, $event)">
                        <mat-icon>open_in_new</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" [matTooltip]="'positions.detail.unassign' | transloco"
                              (click)="unassignEmployee(emp.employeePublicId, $event)">
                        <mat-icon>person_remove</mat-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Expanded: credential checklist for this employee -->
                  @if (expandedEmployee === emp.employeePublicId) {
                    <div class="emp-detail">
                      @for (req of emp.requirements; track req.credentialTypeCode) {
                        <div class="req-row" [class.met]="req.met" [class.not-met]="!req.met">
                          <mat-icon class="req-icon">{{ req.met ? 'check_circle' : 'cancel' }}</mat-icon>
                          <span class="req-label">{{ req.credentialTypeName }}</span>
                          <span class="req-type-badge" [class.mandatory]="req.isMandatory">
                            {{ (req.isMandatory ? 'positions.detail.required' : 'positions.detail.optional') | transloco }}
                          </span>
                          <span class="req-credential-status" [class]="'cred-' + (req.credentialStatus || 'missing')">
                            {{ req.credentialStatus ? (('positions.detail.credStatus.' + req.credentialStatus) | transloco) : ('positions.detail.credStatus.missing' | transloco) }}
                          </span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <p class="no-employees">{{ 'positions.detail.noEmployees' | transloco }}</p>
          }
        }
      </div>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | transloco }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* Title */
    .title-row { display: flex; align-items: center; justify-content: space-between; }
    .title-name { font-size: 20px; }
    .title-code {
      font-size: 13px; color: #666; font-weight: 400;
      margin-left: 8px; background: #f0f0f0; padding: 2px 8px; border-radius: 4px;
    }

    /* Dialog */
    mat-dialog-content { min-width: min(650px, 85vw); max-height: 75vh; padding-top: 8px !important; }

    /* Sections */
    .section { padding: 16px 0; }
    .section-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .section-header mat-icon { color: #1565c0; font-size: 20px; width: 20px; height: 20px; }
    .section-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: #333; }
    .section-count { font-size: 12px; color: #999; margin-left: auto; }

    /* Requirements grid */
    .requirements-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px;
    }
    .req-chip-item {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 6px; background: #fafafa; border: 1px solid #eee;
    }
    .mandatory-icon { color: #1565c0; font-size: 18px; width: 18px; height: 18px; }
    .optional-icon { color: #999; font-size: 18px; width: 18px; height: 18px; }
    .req-chip-name { flex: 1; font-size: 13px; font-weight: 500; }
    .req-chip-badge {
      font-size: 10px; padding: 1px 6px; border-radius: 8px;
      background: #f5f5f5; color: #999;
    }
    .req-chip-badge.mandatory { background: #e3f2fd; color: #1565c0; }

    /* Summary cards */
    .summary-cards { display: flex; gap: 10px; margin-bottom: 12px; }
    .summary-card { flex: 1; text-align: center; padding: 10px; border-radius: 8px; }
    .summary-card .val { font-size: 22px; font-weight: 700; }
    .summary-card .label { font-size: 11px; }
    .summary-card.eligible { background: #e8f5e9; color: #2e7d32; }
    .summary-card.partial { background: #fff3e0; color: #e65100; }
    .summary-card.not-eligible { background: #ffebee; color: #c62828; }

    /* Assign row */
    .assign-row { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
    .assign-select { flex: 1; }

    /* Employee list */
    .employee-list { display: flex; flex-direction: column; gap: 4px; }
    .employee-card {
      border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .employee-card:hover { box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .employee-card.expanded { border-color: #bbdefb; }
    .employee-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; cursor: pointer; gap: 8px;
    }
    .employee-row:hover { background: #fafafa; }
    .emp-left { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
    .expand-icon { color: #999; font-size: 20px; width: 20px; height: 20px; }
    .emp-info { display: flex; flex-direction: column; min-width: 0; }
    .emp-name { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .emp-progress-text { font-size: 11px; color: #999; }
    .emp-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .emp-bar-container { width: 80px; }

    /* Status chips */
    .status-chip {
      padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap;
    }
    .status-ELIGIBLE { background: #e8f5e9; color: #2e7d32; }
    .status-PARTIALLY_ELIGIBLE { background: #fff3e0; color: #e65100; }
    .status-NOT_ELIGIBLE { background: #ffebee; color: #c62828; }

    /* Employee detail (expanded) */
    .emp-detail {
      padding: 8px 12px 12px 40px;
      background: #f9f9f9; border-top: 1px solid #eee;
      display: flex; flex-direction: column; gap: 4px;
    }
    .req-row {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 10px; border-radius: 4px; font-size: 13px;
    }
    .req-row.met { background: #f1f8e9; }
    .req-row.not-met { background: #fff8f8; }
    .req-icon { font-size: 16px; width: 16px; height: 16px; }
    .req-row.met .req-icon { color: #4caf50; }
    .req-row.not-met .req-icon { color: #ef5350; }
    .req-label { flex: 1; font-weight: 500; }
    .req-type-badge {
      font-size: 10px; padding: 1px 6px; border-radius: 8px;
      background: #f0f0f0; color: #888;
    }
    .req-type-badge.mandatory { background: #e3f2fd; color: #1565c0; }
    .req-credential-status { font-size: 11px; font-weight: 500; min-width: 55px; text-align: right; }
    .cred-VALID { color: #4caf50; }
    .cred-EXPIRED { color: #f44336; }
    .cred-PENDING_REVIEW { color: #ff9800; }
    .cred-missing { color: #f44336; }

    .loading { display: flex; justify-content: center; padding: 24px; }
    .no-employees { text-align: center; color: #999; padding: 24px; }

    @media (max-width: 600px) {
      mat-dialog-content { max-height: 60vh; }
      .summary-cards { flex-direction: column; gap: 6px; }
      .assign-row { flex-direction: column; }
      .assign-select { width: 100%; }
      .emp-right { flex-wrap: wrap; }
      .emp-bar-container { display: none; }
      .requirements-grid { grid-template-columns: 1fr; }
      .emp-detail { padding-left: 12px; }
    }
  `]
})
export class PositionDetailDialogComponent implements OnInit {
  summary: PositionEligibilitySummary | null = null;
  loading = true;
  expandedEmployee: string | null = null;
  selectedEmployeeId = '';
  availableEmployees: any[] = [];

  get mandatoryCount(): number {
    return this.data.requirements.filter(r => r.isMandatory).length;
  }
  get optionalCount(): number {
    return this.data.requirements.filter(r => !r.isMandatory).length;
  }

  constructor(
    private dialogRef: MatDialogRef<PositionDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private positionService: PositionService,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    private router: Router,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.employeeService.getAll(this.data.agencyPublicId).subscribe({
      next: page => this.availableEmployees = page.content
    });
  }

  loadData(): void {
    this.loading = true;
    this.positionService.getPositionEligibility(this.data.positionPublicId).subscribe({
      next: summary => {
        this.summary = summary;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleEmployee(publicId: string): void {
    this.expandedEmployee = this.expandedEmployee === publicId ? null : publicId;
  }

  viewEmployee(employeePublicId: string, event: Event): void {
    event.stopPropagation();
    this.dialogRef.close();
    this.router.navigate(['/employees', employeePublicId]);
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'ELIGIBLE': return this.transloco.translate('positions.detail.statusReady');
      case 'PARTIALLY_ELIGIBLE': return this.transloco.translate('positions.detail.statusAtRisk');
      case 'NOT_ELIGIBLE': return this.transloco.translate('positions.detail.statusBlocked');
      default: return status;
    }
  }

  assignEmployee(): void {
    this.positionService.assignEmployee(this.data.positionPublicId, {
      employeePublicId: this.selectedEmployeeId
    }).subscribe({
      next: () => {
        this.snackBar.open(this.transloco.translate('positions.detail.assignedOk'), 'OK', { duration: 3000 });
        this.selectedEmployeeId = '';
        this.loadData();
      },
      error: (err) => this.snackBar.open(err.error?.message || this.transloco.translate('positions.detail.assignError'), 'Close', { duration: 5000 })
    });
  }

  unassignEmployee(employeePublicId: string, event: Event): void {
    event.stopPropagation();
    this.positionService.unassignEmployee(this.data.positionPublicId, employeePublicId).subscribe({
      next: () => {
        this.snackBar.open(this.transloco.translate('positions.detail.unassignedOk'), 'OK', { duration: 3000 });
        this.loadData();
      }
    });
  }
}
