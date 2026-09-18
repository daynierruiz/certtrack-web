import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Employee } from '../../../core/models/employee.model';
import { Credential } from '../../../core/models/credential.model';
import { EmployeeEligibilityResponse } from '../../../core/models/position.model';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  current: boolean;
}

@Component({
  selector: 'app-hiring-roadmap',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTooltipModule, TranslocoModule],
  template: `
    @if (visible) {
      <mat-card class="roadmap-card">
        <div class="roadmap-header">
          <div class="roadmap-title">
            <mat-icon>route</mat-icon>
            <span>{{ 'employees.roadmap.title' | transloco }}</span>
          </div>
          <span class="roadmap-count">{{ completedCount }}/{{ steps.length }}</span>
        </div>

        <div class="step-track">
          @for (step of steps; track step.id; let i = $index) {
            <div class="step-node"
                 [class.done]="step.done"
                 [class.current]="step.current"
                 [class.selected]="selectedStep === step"
                 [matTooltip]="step.title"
                 (click)="selectStep(step)">
              <mat-icon class="step-dot">
                {{ step.done ? 'check' : (step.current ? 'pending' : 'fiber_manual_record') }}
              </mat-icon>
            </div>
            @if (i < steps.length - 1) {
              <div class="step-line" [class.done]="step.done"></div>
            }
          }
        </div>

        @if (displayStep) {
          <div class="step-current-info">
            <span class="next-label">{{ stepLabel(displayStep) }}</span>
            <strong>{{ displayStep.title }}</strong>
            <span class="next-desc">— {{ displayStep.description }}</span>
          </div>
        } @else {
          <div class="step-current-info done">
            <mat-icon>check_circle</mat-icon>
            <strong>{{ 'employees.roadmap.allComplete' | transloco }}</strong>
          </div>
        }
        <div class="tap-hint">{{ 'employees.roadmap.tapHint' | transloco }}</div>
      </mat-card>
    }
  `,
  styles: [`
    .roadmap-card { margin-bottom: 16px; padding: 12px 16px; }
    .roadmap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .roadmap-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .roadmap-title mat-icon { color: #1565c0; font-size: 18px; width: 18px; height: 18px; }
    .roadmap-count {
      font-size: 12px;
      font-weight: 600;
      color: #1565c0;
      background: #e3f2fd;
      padding: 2px 10px;
      border-radius: 10px;
    }
    .step-track {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
      overflow-x: auto;
    }
    .step-node {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: #f5f5f5;
      border: 2px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.2s;
    }
    .step-dot { font-size: 14px; width: 14px; height: 14px; color: #bbb; }
    .step-node.done {
      background: #2e7d32;
      border-color: #2e7d32;
    }
    .step-node.done .step-dot { color: white; }
    .step-node.current {
      background: #1976d2;
      border-color: #1976d2;
      box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.18);
      animation: pulse 1.6s ease-in-out infinite;
    }
    .step-node.current .step-dot { color: white; }
    .step-node.selected { border-color: #1565c0; box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.25); }
    .tap-hint { display: none; }
    .step-line {
      flex: 1;
      height: 2px;
      background: #ddd;
      min-width: 14px;
      transition: background 0.2s;
    }
    .step-line.done { background: #2e7d32; }
    .step-current-info {
      margin-top: 10px;
      font-size: 13px;
      color: #555;
      line-height: 1.4;
    }
    .step-current-info .next-label {
      color: #1565c0;
      font-weight: 600;
      margin-right: 4px;
    }
    .step-current-info strong { color: #222; }
    .step-current-info .next-desc { color: #757575; }
    .step-current-info.done {
      display: flex; align-items: center; gap: 6px; color: #2e7d32;
    }
    .step-current-info.done mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.18); }
      50% { box-shadow: 0 0 0 8px rgba(25, 118, 210, 0.08); }
    }
    @media (max-width: 600px) {
      /* Shrink the node track so all steps fit without an awkward horizontal scroll */
      .step-track { overflow-x: visible; gap: 2px; }
      .step-node { width: 24px; height: 24px; border-width: 1.5px; }
      .step-dot { font-size: 13px; width: 13px; height: 13px; }
      .step-line { min-width: 4px; }
      .step-node.current { box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.18); animation: none; }
      .tap-hint { display: block; font-size: 11px; color: #aaa; margin-top: 6px; }
    }
  `]
})
export class HiringRoadmapComponent implements OnChanges {
  @Input() employee: Employee | null = null;
  @Input() credentials: Credential[] = [];
  @Input() positionEligibility: EmployeeEligibilityResponse[] = [];
  @Input() pendingContractsCount = 0;
  @Input() signedContractsCount = 0;
  @Input() accountLastLoginAt: string | null = null;

  steps: RoadmapStep[] = [];
  visible = false;
  completedCount = 0;
  currentStep: RoadmapStep | null = null;
  selectedStep: RoadmapStep | null = null;

  constructor(private transloco: TranslocoService) {}

  /** Step shown in the info bar: the one tapped, else the current step. */
  get displayStep(): RoadmapStep | null {
    return this.selectedStep ?? this.currentStep;
  }

  selectStep(step: RoadmapStep): void {
    this.selectedStep = step;
  }

  stepLabel(step: RoadmapStep): string {
    if (step.done) return this.transloco.translate('employees.roadmap.labelDone');
    if (step.current) return this.transloco.translate('employees.roadmap.labelNext');
    return this.transloco.translate('employees.roadmap.labelStep');
  }

  ngOnChanges(): void {
    this.compute();
  }

  private t(key: string, params?: object): string {
    return this.transloco.translate(key, params);
  }

  private compute(): void {
    if (!this.employee) {
      this.steps = [];
      this.visible = false;
      return;
    }

    this.visible = this.employee.status !== 'ACTIVE';
    if (!this.visible) {
      this.steps = [];
      this.currentStep = null;
      return;
    }

    const status = this.employee.status;
    const hasAddress = !!this.employee.address;
    const accountSetup = !!this.accountLastLoginAt;
    const missingMandatoryCount = this.countMissingMandatory();
    const pendingReviewCount = this.credentials.filter(c => c.status === 'PENDING_REVIEW').length;

    const raw: Omit<RoadmapStep, 'current'>[] = [
      {
        id: 'apply',
        title: this.t('employees.roadmap.steps.apply.title'),
        description: this.t('employees.roadmap.steps.apply.desc'),
        done: true
      },
      {
        id: 'approve',
        title: this.t('employees.roadmap.steps.approve.title'),
        description: status === 'APPLICANT'
          ? this.t('employees.roadmap.steps.approve.descPending')
          : this.t('employees.roadmap.steps.approve.descDone'),
        done: status !== 'APPLICANT'
      },
      {
        id: 'account',
        title: this.t('employees.roadmap.steps.account.title'),
        description: accountSetup
          ? this.t('employees.roadmap.steps.account.descDone')
          : this.t('employees.roadmap.steps.account.descPending'),
        done: accountSetup
      },
      {
        id: 'address',
        title: this.t('employees.roadmap.steps.address.title'),
        description: hasAddress
          ? this.t('employees.roadmap.steps.address.descDone')
          : this.t('employees.roadmap.steps.address.descPending'),
        done: hasAddress
      },
      {
        id: 'docs-submit',
        title: this.t('employees.roadmap.steps.docsSubmit.title'),
        description: missingMandatoryCount > 0
          ? this.t('employees.roadmap.steps.docsSubmit.descMissing', { count: missingMandatoryCount })
          : this.t('employees.roadmap.steps.docsSubmit.descDone'),
        done: missingMandatoryCount === 0 && this.positionEligibility.length > 0
      },
      {
        id: 'docs-verify',
        title: this.t('employees.roadmap.steps.docsVerify.title'),
        description: pendingReviewCount > 0
          ? this.t('employees.roadmap.steps.docsVerify.descPending', { count: pendingReviewCount })
          : this.t('employees.roadmap.steps.docsVerify.descDone'),
        done: missingMandatoryCount === 0 && pendingReviewCount === 0 && this.credentials.length > 0
      },
      {
        id: 'contracts',
        title: this.t('employees.roadmap.steps.contracts.title'),
        description: this.pendingContractsCount > 0
          ? this.t('employees.roadmap.steps.contracts.descPending', { count: this.pendingContractsCount })
          : this.signedContractsCount > 0
            ? this.t('employees.roadmap.steps.contracts.descSigned', { count: this.signedContractsCount })
            : this.t('employees.roadmap.steps.contracts.descNone'),
        done: this.signedContractsCount > 0 && this.pendingContractsCount === 0
      },
      {
        id: 'hired',
        title: this.t('employees.roadmap.steps.hired.title'),
        description: this.t('employees.roadmap.steps.hired.desc'),
        done: status === 'ACTIVE'
      }
    ];

    const firstUndoneIdx = raw.findIndex(s => !s.done);
    this.steps = raw.map((s, i) => ({ ...s, current: i === firstUndoneIdx }));
    this.completedCount = this.steps.filter(s => s.done).length;
    this.currentStep = this.steps.find(s => s.current) ?? null;
    this.selectedStep = null;
  }

  private countMissingMandatory(): number {
    if (this.positionEligibility.length === 0) return 0;
    const missing = new Set<string>();
    for (const pos of this.positionEligibility) {
      for (const req of pos.requirements) {
        if (req.isMandatory && !req.met) {
          missing.add(req.credentialTypePublicId);
        }
      }
    }
    return missing.size;
  }
}
