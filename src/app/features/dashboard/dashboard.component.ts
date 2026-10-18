import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { AgentService } from '../../core/services/agent.service';
import { ApplicantService } from '../../core/services/applicant.service';
import { DashboardResponse, UpcomingExpiration } from '../../core/models/dashboard.model';
import { ApplicantResponse } from '../../core/models/applicant.model';
import { PositionEligibilitySummaryDto } from '../../core/models/position.model';
import { RiskScore } from '../../core/models/risk-score.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatTableModule,
    MatChipsModule, MatButtonModule, MatProgressSpinnerModule,
    MatTooltipModule, TranslocoModule, RouterLink
  ],
  template: `
    @if (loading) {
      <div class="loading-container">
        <mat-spinner></mat-spinner>
      </div>
    } @else if (data) {
      <h2>{{ 'dashboard.title' | transloco }}</h2>

      <!-- Row 1: Action Required (urgent items first) -->
      @if (actionRequiredCount > 0) {
        <mat-card class="action-required-card">
          <mat-card-content>
            <div class="action-required-header">
              <mat-icon>priority_high</mat-icon>
              <span>{{ (actionRequiredCount === 1 ? 'dashboard.actionRequired.summaryOne' : 'dashboard.actionRequired.summaryMany') | transloco: { count: actionRequiredCount } }}</span>
            </div>
            <div class="action-required-items">
              @if (data.credentials.expired > 0) {
                <div class="action-item clickable" (click)="navigate('/credentials', {filter: 'attention'})">
                  <mat-icon class="action-icon expired">cancel</mat-icon>
                  <span class="action-text"><strong>{{ data.credentials.expired }}</strong> {{ 'dashboard.actionRequired.expiredCredentials' | transloco }}</span>
                  <mat-icon class="action-arrow">chevron_right</mat-icon>
                </div>
              }
              @if (data.credentials.critical > 0) {
                <div class="action-item clickable" (click)="navigate('/credentials', {filter: 'attention'})">
                  <mat-icon class="action-icon critical">error</mat-icon>
                  <span class="action-text"><strong>{{ data.credentials.critical }}</strong> {{ 'dashboard.actionRequired.criticalCredentials' | transloco }}</span>
                  <mat-icon class="action-arrow">chevron_right</mat-icon>
                </div>
              }
              @if (data.credentials.pendingReview > 0) {
                <div class="action-item clickable" (click)="navigate('/review')">
                  <mat-icon class="action-icon pending">rate_review</mat-icon>
                  <span class="action-text"><strong>{{ data.credentials.pendingReview }}</strong> {{ 'dashboard.actionRequired.pendingReview' | transloco }}</span>
                  <mat-icon class="action-arrow">chevron_right</mat-icon>
                </div>
              }
              @if (data.employees.applicants > 0) {
                <div class="action-item clickable" (click)="navigate('/applicants')">
                  <mat-icon class="action-icon applicant">person_add</mat-icon>
                  <span class="action-text"><strong>{{ data.employees.applicants }}</strong> {{ (data.employees.applicants === 1 ? 'dashboard.actionRequired.applicantsToReviewOne' : 'dashboard.actionRequired.applicantsToReviewMany') | transloco }}</span>
                  <mat-icon class="action-arrow">chevron_right</mat-icon>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Row 1.5: Applicants pending approval — approve inline, no navigation -->
      @if (pendingApplicants.length > 0) {
        <mat-card class="pending-applicants">
          <mat-card-header>
            <mat-icon class="section-title-icon">how_to_reg</mat-icon>
            <mat-card-title>{{ 'dashboard.pendingApplicants.title' | transloco }}</mat-card-title>
            <mat-card-subtitle>{{ 'dashboard.pendingApplicants.subtitle' | transloco }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="applicant-list">
              @for (a of pendingApplicants; track a.publicId) {
                <div class="applicant-row">
                  <div class="applicant-info clickable" (click)="navigate('/applicants')">
                    <div class="applicant-name">{{ a.firstName }} {{ a.lastName }}</div>
                    <div class="applicant-meta">{{ a.positionName }}<span *ngIf="a.applicationDate"> · {{ a.applicationDate }}</span></div>
                  </div>
                  <button mat-flat-button color="primary"
                          [disabled]="approvingId === a.publicId" (click)="approveApplicant(a)">
                    <mat-icon>check</mat-icon> {{ 'dashboard.pendingApplicants.approve' | transloco }}
                  </button>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Row 2: Key Metrics -->
      <div class="stats-grid">
        <mat-card class="stat-card clickable"
                  (click)="navigate('/credentials', {filter: 'attention'})"
                  [matTooltip]="'dashboard.stats.tooltipAttention' | transloco">
          <mat-card-content>
            <div class="stat-icon alerts" [class.danger]="data.credentials.expired > 0">
              <mat-icon>notification_important</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ data.credentials.expired + data.credentials.critical }}</div>
              <div class="stat-label">{{ 'dashboard.stats.actionRequired' | transloco }}</div>
              <div class="stat-detail">{{ 'dashboard.stats.expiredCriticalDetail' | transloco: { expired: data.credentials.expired, critical: data.credentials.critical } }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon compliance" [class.warning]="data.complianceRate < 80">
              <mat-icon>{{ data.complianceRate >= 80 ? 'verified' : 'warning' }}</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ data.complianceRate }}%</div>
              <div class="stat-label">{{ 'dashboard.stats.compliance' | transloco }}</div>
              <div class="stat-detail">{{ 'dashboard.stats.complianceDetail' | transloco: { valid: data.credentials.valid, expiring: data.credentials.expiringSoon, expired: data.credentials.expired } }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card clickable" (click)="navigate('/review')"
                  [matTooltip]="'dashboard.stats.tooltipReview' | transloco">
          <mat-card-content>
            <div class="stat-icon pending-icon" [class.has-pending]="data.credentials.pendingReview > 0">
              <mat-icon>rate_review</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ data.credentials.pendingReview }}</div>
              <div class="stat-label">{{ 'dashboard.stats.pendingReview' | transloco }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card clickable" (click)="navigate('/employees')"
                  [matTooltip]="'dashboard.stats.tooltipEmployees' | transloco">
          <mat-card-content>
            <div class="stat-icon employees"><mat-icon>people</mat-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ data.employees.active }}</div>
              <div class="stat-label">{{ 'dashboard.stats.activeEmployees' | transloco }}</div>
              <div class="stat-detail">{{ 'dashboard.stats.totalDetail' | transloco: { total: data.employees.total } }}</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Row 3: Credential breakdown + Upcoming expirations -->
      <div class="section-grid">
        <mat-card class="credential-breakdown">
          <mat-card-header>
            <mat-card-title>{{ 'dashboard.credentialStatus.title' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="status-bars">
              <div class="status-bar-row clickable"
                   (click)="navigate('/credentials', {filter: 'VALID'})"
                   [matTooltip]="'dashboard.credentialStatus.tooltipValid' | transloco">
                <span class="status-label">{{ 'dashboard.credentialStatus.valid' | transloco }}</span>
                <div class="status-bar">
                  <div class="status-bar-fill valid"
                       [style.width.%]="getPercent(data.credentials.valid)"></div>
                </div>
                <span class="status-count">{{ data.credentials.valid }}</span>
              </div>
              <div class="status-bar-row clickable"
                   (click)="navigate('/credentials', {filter: 'EXPIRING_SOON'})"
                   [matTooltip]="'dashboard.credentialStatus.tooltipExpiring' | transloco">
                <span class="status-label">{{ 'dashboard.credentialStatus.expiringSoon' | transloco }}</span>
                <div class="status-bar">
                  <div class="status-bar-fill expiring"
                       [style.width.%]="getPercent(data.credentials.expiringSoon)"></div>
                </div>
                <span class="status-count">{{ data.credentials.expiringSoon }}</span>
              </div>
              <div class="status-bar-row clickable"
                   (click)="navigate('/credentials', {filter: 'attention'})"
                   [matTooltip]="'dashboard.credentialStatus.tooltipCritical' | transloco">
                <span class="status-label">{{ 'dashboard.credentialStatus.critical' | transloco }}</span>
                <div class="status-bar">
                  <div class="status-bar-fill critical"
                       [style.width.%]="getPercent(data.credentials.critical)"></div>
                </div>
                <span class="status-count">{{ data.credentials.critical }}</span>
              </div>
              <div class="status-bar-row clickable"
                   (click)="navigate('/credentials', {filter: 'attention'})"
                   [matTooltip]="'dashboard.credentialStatus.tooltipExpired' | transloco">
                <span class="status-label">{{ 'dashboard.credentialStatus.expired' | transloco }}</span>
                <div class="status-bar">
                  <div class="status-bar-fill expired"
                       [style.width.%]="getPercent(data.credentials.expired)"></div>
                </div>
                <span class="status-count">{{ data.credentials.expired }}</span>
              </div>
              <div class="status-bar-row clickable"
                   (click)="navigate('/review')"
                   [matTooltip]="'dashboard.credentialStatus.tooltipPending' | transloco">
                <span class="status-label">{{ 'dashboard.credentialStatus.pendingReview' | transloco }}</span>
                <div class="status-bar">
                  <div class="status-bar-fill pending"
                       [style.width.%]="getPercent(data.credentials.pendingReview)"></div>
                </div>
                <span class="status-count">{{ data.credentials.pendingReview }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="upcoming-expirations">
          <mat-card-header>
            <mat-card-title>{{ 'dashboard.upcomingExpirations.title' | transloco }}</mat-card-title>
            <mat-card-subtitle>{{ 'dashboard.upcomingExpirations.subtitle' | transloco }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (data.upcomingExpirations.length > 0) {
              <div class="table-scroll">
              <table mat-table [dataSource]="data.upcomingExpirations" class="full-width">
                <ng-container matColumnDef="employeeName">
                  <th mat-header-cell *matHeaderCellDef>{{ 'dashboard.upcomingExpirations.colEmployee' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.employeeName }}</td>
                </ng-container>
                <ng-container matColumnDef="credentialTypeName">
                  <th mat-header-cell *matHeaderCellDef>{{ 'dashboard.upcomingExpirations.colCredential' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.credentialTypeName }}</td>
                </ng-container>
                <ng-container matColumnDef="expirationDate">
                  <th mat-header-cell *matHeaderCellDef>{{ 'dashboard.upcomingExpirations.colExpires' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.expirationDate }}</td>
                </ng-container>
                <ng-container matColumnDef="daysUntilExpiry">
                  <th mat-header-cell *matHeaderCellDef>{{ 'dashboard.upcomingExpirations.colDays' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="days-chip" [class]="getStatusClass(row.status)">
                      {{ row.daysUntilExpiry }}d
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                    class="clickable-row" (click)="navigate('/credentials')"
                    [matTooltip]="'dashboard.upcomingExpirations.tooltipRow' | transloco"></tr>
              </table>
              </div>
            } @else {
              <div class="empty-expirations">
                <mat-icon>event_available</mat-icon>
                <p>{{ 'dashboard.upcomingExpirations.empty' | transloco }}</p>
              </div>
            }

            @if (data.upcomingExpirations.length > 0) {
              <div class="view-all">
                <button mat-button color="primary" (click)="navigate('/credentials')">
                  {{ 'dashboard.upcomingExpirations.viewAll' | transloco }} <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Row 4: Risk Caregivers (AI-driven) -->
      @if (agentVisible && riskCaregivers.length > 0) {
        <mat-card class="risk-caregivers">
          <mat-card-header>
            <mat-icon class="section-title-icon">shield_person</mat-icon>
            <mat-card-title>{{ 'dashboard.riskCaregivers.title' | transloco }}</mat-card-title>
            <mat-card-subtitle>{{ 'dashboard.riskCaregivers.subtitle' | transloco }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="risk-list">
              @for (r of riskCaregivers; track r.employeePublicId) {
                <div class="risk-row clickable" (click)="navigate('/employees/' + r.employeePublicId)"
                     [matTooltip]="riskTooltip(r)" matTooltipClass="risk-factors-tooltip">
                  <span class="risk-chip" [class]="'level-' + r.level"
                        [matTooltip]="'dashboard.riskCaregivers.level' + r.level | transloco">{{ r.score }}</span>
                  <div class="risk-info">
                    <div class="risk-name">
                      {{ r.employeeName }}
                      <span class="risk-level-tag" [class]="'level-' + r.level">{{ ('dashboard.riskCaregivers.level' + r.level) | transloco }}</span>
                    </div>
                    <div class="risk-reason">{{ r.factors[0]?.description }}</div>
                  </div>
                  <mat-icon class="risk-arrow">chevron_right</mat-icon>
                </div>
              }
            </div>
            <div class="risk-see-all">
              <a mat-button color="primary" routerLink="/risk">
                {{ 'dashboard.riskCaregivers.seeAll' | transloco }}
                <mat-icon>arrow_forward</mat-icon>
              </a>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Row 5: Position Eligibility -->
      @if (data.positionEligibility && data.positionEligibility.length > 0) {
        <mat-card class="position-eligibility">
          <mat-card-header>
            <mat-icon class="section-title-icon">work</mat-icon>
            <mat-card-title>{{ 'dashboard.roleEligibility.title' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="position-elig-grid">
              @for (pos of data.positionEligibility; track pos.positionPublicId) {
                <div class="pos-elig-card clickable" (click)="navigate('/positions')">
                  <div class="pos-name">{{ pos.positionName }}</div>
                  <div class="pos-assigned">{{ 'dashboard.roleEligibility.assigned' | transloco: { count: pos.totalAssigned } }}</div>
                  <div class="pos-elig-bar">
                    <div class="elig-fill eligible"
                         [style.width.%]="getPositionPercent(pos, 'eligible')"></div>
                    <div class="elig-fill partial"
                         [style.width.%]="getPositionPercent(pos, 'partial')"></div>
                    <div class="elig-fill not-eligible"
                         [style.width.%]="getPositionPercent(pos, 'not')"></div>
                  </div>
                  <div class="pos-elig-legend">
                    <span class="legend-item"><span class="dot eligible"></span>{{ pos.fullyEligible }} {{ 'dashboard.roleEligibility.ready' | transloco }}</span>
                    <span class="legend-item"><span class="dot partial"></span>{{ pos.partiallyEligible }} {{ 'dashboard.roleEligibility.atRisk' | transloco }}</span>
                    <span class="legend-item"><span class="dot not-eligible"></span>{{ pos.notEligible }} {{ 'dashboard.roleEligibility.blocked' | transloco }}</span>
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Row 5: Onboarding Pipeline (compact) -->
      @if (data.employees.applicants > 0 || data.employees.onboarding > 0) {
        <mat-card class="pipeline-card">
          <mat-card-content>
            <div class="pipeline-row-compact">
              <span class="pipeline-title">{{ 'dashboard.pipeline.title' | transloco }}</span>
              <div class="pipeline-chips">
                <span class="pipeline-chip clickable" (click)="navigate('/applicants')">
                  <strong>{{ data.employees.applicants }}</strong> {{ 'dashboard.pipeline.applicants' | transloco }}
                </span>
                <mat-icon class="pipeline-arrow-compact">arrow_forward</mat-icon>
                <span class="pipeline-chip clickable" (click)="navigate('/applicants')">
                  <strong>{{ data.employees.onboarding }}</strong> {{ 'dashboard.pipeline.onboarding' | transloco }}
                </span>
                <mat-icon class="pipeline-arrow-compact">arrow_forward</mat-icon>
                <span class="pipeline-chip clickable" (click)="navigate('/employees')">
                  <strong>{{ data.employees.active }}</strong> {{ 'dashboard.pipeline.active' | transloco }}
                </span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .loading-container {
      display: flex; justify-content: center; padding: 64px;
    }
    h2 { margin: 0 0 24px; color: #333; }

    /* Action required */
    .action-required-card {
      margin-bottom: 20px; border-left: 4px solid #d32f2f;
      background: linear-gradient(135deg, #fff5f5, #ffffff);
    }
    .action-required-header {
      display: flex; align-items: center; gap: 10px;
      font-size: 15px; font-weight: 600; color: #c62828; margin-bottom: 12px;
    }
    .action-required-header mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .action-required-items { display: flex; flex-direction: column; gap: 4px; }
    .action-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 8px; transition: background 0.15s;
    }
    .action-item.clickable { cursor: pointer; }
    .action-item.clickable:hover { background: rgba(0,0,0,0.03); }
    .action-icon { font-size: 20px; width: 20px; height: 20px; }
    .action-icon.expired { color: #9e9e9e; }
    .action-icon.critical { color: #d32f2f; }
    .action-icon.pending { color: #1565c0; }
    .action-icon.applicant { color: #42a5f5; }
    .action-text { flex: 1; font-size: 14px; color: #333; }
    .action-arrow { color: #ccc; font-size: 18px; width: 18px; height: 18px; }

    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat-card mat-card-content {
      display: flex; align-items: center; gap: 16px; padding: 16px !important;
    }
    .clickable { cursor: pointer; transition: box-shadow 0.2s, transform 0.2s; }
    .clickable:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-2px); }
    .stat-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
    .stat-icon.employees { background: #1565c0; }
    .stat-icon.compliance { background: #2e7d32; }
    .stat-icon.compliance.warning { background: #f57f17; }
    .stat-icon.alerts { background: #e65100; }
    .stat-icon.alerts.danger { background: #c62828; }
    .stat-icon.pending-icon { background: #78909c; }
    .stat-icon.pending-icon.has-pending { background: #1565c0; }
    .stat-value { font-size: 28px; font-weight: 700; color: #333; }
    .stat-label { font-size: 13px; color: #666; }
    .stat-detail { font-size: 12px; color: #999; }

    /* Pipeline card (compact) */
    .pipeline-card { margin-bottom: 20px; }
    .section-title-icon { color: #1565c0; margin-right: 8px; flex: 0 0 auto; }
    /* Pending applicants (inline approve) */
    .pending-applicants { margin-bottom: 20px; border-left: 4px solid #2e7d32; }
    .applicant-list { display: flex; flex-direction: column; gap: 6px; padding-top: 8px; }
    .applicant-row { display: flex; align-items: center; gap: 12px; padding: 8px 4px; border-bottom: 1px solid #f0f0f0; }
    .applicant-info { flex: 1; min-width: 0; }
    .applicant-info.clickable { cursor: pointer; }
    .applicant-name { font-weight: 600; font-size: 14px; color: #333; }
    .applicant-meta { font-size: 13px; color: #777; }
    .applicant-row button mat-icon { margin-right: 4px; }
    @media (max-width: 600px) {
      .applicant-row { flex-wrap: wrap; }
      .applicant-row button { width: 100%; }
    }
    .mat-mdc-card-header { align-items: center; }
    .pipeline-row-compact {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .pipeline-title { font-size: 14px; font-weight: 600; color: #555; }
    .pipeline-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pipeline-chip {
      padding: 6px 14px; border-radius: 20px; font-size: 13px; color: #333;
      background: #f5f5f5; border: 1px solid #e0e0e0; transition: background 0.15s;
    }
    .pipeline-chip.clickable { cursor: pointer; }
    .pipeline-chip.clickable:hover { background: #e8f5e9; }
    .pipeline-chip strong { color: #1a237e; }
    .pipeline-arrow-compact { color: #ccc; font-size: 16px; width: 16px; height: 16px; }

    /* Section grid */
    .section-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .status-bars { display: flex; flex-direction: column; gap: 12px; padding-top: 16px; }
    .status-bar-row { display: flex; align-items: center; gap: 12px; padding: 4px 8px; border-radius: 6px; }
    .status-bar-row.clickable { cursor: pointer; transition: background 0.15s; }
    .status-bar-row.clickable:hover { background: #f5f5f5; }
    .status-label { width: 120px; font-size: 13px; color: #555; }
    .status-bar {
      flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;
    }
    .status-bar-fill {
      height: 100%; border-radius: 4px; transition: width 0.5s ease;
    }
    .status-bar-fill.valid { background: #4caf50; }
    .status-bar-fill.expiring { background: #ff9800; }
    .status-bar-fill.critical { background: #f44336; }
    .status-bar-fill.expired { background: #9e9e9e; }
    .status-bar-fill.pending { background: #2196f3; }
    .status-count { width: 30px; text-align: right; font-size: 13px; font-weight: 500; }
    .full-width { width: 100%; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .days-chip {
      padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;
    }
    .days-chip.status-CRITICAL { background: #ffebee; color: #c62828; }
    .days-chip.status-EXPIRING_SOON { background: #fff3e0; color: #e65100; }
    .days-chip.status-EXPIRED { background: #eeeeee; color: #616161; }
    .days-chip.status-VALID { background: #e8f5e9; color: #2e7d32; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f5f5f5 !important; }
    .view-all { text-align: right; padding-top: 8px; }
    .view-all button mat-icon { font-size: 18px; vertical-align: middle; }
    .empty-expirations {
      text-align: center; padding: 32px; color: #999;
    }
    .empty-expirations mat-icon {
      font-size: 40px; width: 40px; height: 40px; color: #4caf50;
    }

    /* Position eligibility */
    .position-eligibility { margin-bottom: 20px; }
    .position-elig-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px; padding-top: 16px;
    }
    .pos-elig-card {
      padding: 12px; border-radius: 8px; background: #fafafa;
      border: 1px solid #eee; transition: box-shadow 0.2s;
    }
    .pos-elig-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .pos-name { font-weight: 600; font-size: 14px; color: #333; }
    .pos-assigned { font-size: 12px; color: #999; margin-bottom: 8px; }
    .pos-elig-bar {
      display: flex; height: 8px; border-radius: 4px; overflow: hidden;
      background: #eee; margin-bottom: 6px;
    }
    .pos-elig-bar .elig-fill.eligible { background: #4caf50; }
    .pos-elig-bar .elig-fill.partial { background: #ff9800; }
    .pos-elig-bar .elig-fill.not-eligible { background: #f44336; }
    .pos-elig-legend { display: flex; gap: 10px; font-size: 11px; color: #555; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 2px; }
    .dot.eligible { background: #4caf50; }
    .dot.partial { background: #ff9800; }
    .dot.not-eligible { background: #f44336; }
    .legend-item { display: flex; align-items: center; }

    /* Risk caregivers */
    .risk-caregivers { margin-bottom: 20px; border-left: 4px solid #8e24aa; }
    .risk-list { display: flex; flex-direction: column; gap: 6px; padding-top: 12px; }
    .risk-row {
      display: flex; align-items: center; gap: 14px;
      padding: 10px 12px; border-radius: 8px; transition: background 0.15s;
    }
    .risk-row.clickable { cursor: pointer; }
    .risk-row.clickable:hover { background: #f5f5f5; }
    .risk-chip {
      min-width: 40px; height: 32px; padding: 0 10px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 16px; font-weight: 700; font-size: 14px; color: #fff;
    }
    .risk-chip.level-RED { background: #c62828; }
    .risk-chip.level-ORANGE { background: #ef6c00; }
    .risk-chip.level-YELLOW { background: #f9a825; color: #333; }
    .risk-chip.level-GREEN { background: #2e7d32; }
    .risk-info { flex: 1; min-width: 0; }
    .risk-name { font-weight: 600; font-size: 14px; color: #333; }
    .risk-level-tag {
      font-size: 11px; font-weight: 600; margin-left: 6px; padding: 1px 7px;
      border-radius: 10px; color: #fff; vertical-align: middle;
    }
    .risk-level-tag.level-RED { background: #c62828; }
    .risk-level-tag.level-ORANGE { background: #ef6c00; }
    .risk-level-tag.level-YELLOW { background: #f9a825; color: #333; }
    .risk-level-tag.level-GREEN { background: #2e7d32; }
    .risk-see-all { display: flex; justify-content: flex-end; padding-top: 6px; }
    .risk-reason {
      font-size: 12px; color: #666;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .risk-arrow { color: #ccc; font-size: 20px; width: 20px; height: 20px; }

    /* Quick actions */
    .quick-actions { margin-bottom: 20px; }
    .quick-actions mat-card-content { padding-top: 16px !important; }
    .actions-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .actions-row button mat-icon { margin-right: 4px; }

    /* Prevent flex children from overflowing/clipping their text. */
    .stat-info { min-width: 0; }
    .stat-value { white-space: nowrap; }
    .stat-label, .stat-detail { overflow-wrap: anywhere; }
    .action-required-header { flex-wrap: wrap; }

    /* Mobile */
    @media (max-width: 600px) {
      /* Leave room at the bottom so the floating Cora button doesn't cover the
         last section's corner. */
      :host { display: block; overflow-x: hidden; padding-bottom: 88px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .stat-card mat-card-content { padding: 12px !important; gap: 10px; }
      .stat-value { font-size: 22px; }
      .stat-label { font-size: 12px; }
      .stat-detail { font-size: 11px; }
      .stat-icon { width: 40px; height: 40px; flex: 0 0 auto; }
      .stat-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
      .section-grid { grid-template-columns: 1fr; }
      .status-label { width: 84px; }
      .position-elig-grid { grid-template-columns: 1fr; }
      .pipeline-row-compact { flex-direction: column; align-items: flex-start; }
      .pipeline-chips { width: 100%; justify-content: center; }
      /* Comfortable tap size + no sideways clipping for the risk rows. */
      .risk-reason { white-space: normal; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  data: DashboardResponse | null = null;
  loading = true;
  isMobile = false;
  displayedColumns = ['employeeName', 'credentialTypeName', 'expirationDate', 'daysUntilExpiry'];

  riskCaregivers: RiskScore[] = [];
  pendingApplicants: ApplicantResponse[] = [];
  approvingId: string | null = null;
  readonly agentVisible = environment.agentEnabled;

  private readonly desktopColumns = ['employeeName', 'credentialTypeName', 'expirationDate', 'daysUntilExpiry'];
  private readonly mobileColumns = ['employeeName', 'credentialTypeName', 'daysUntilExpiry'];
  private static readonly RISK_LIST_LIMIT = 5;
  private static readonly RISK_MIN_SCORE = 20;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private agentService: AgentService,
    private applicantService: ApplicantService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService,
    private router: Router,
    private breakpointObserver: BreakpointObserver
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
      this.displayedColumns = result.matches ? this.mobileColumns : this.desktopColumns;
    });
  }

  ngOnInit(): void {
    const agencyId = this.authService.agencyPublicId();
    if (!agencyId) return;

    this.dashboardService.getDashboard(agencyId).subscribe({
      next: data => { this.data = data; this.loading = false; },
      error: () => { this.loading = false; }
    });

    this.loadPendingApplicants();

    if (this.agentVisible) {
      this.agentService.listRiskScores(agencyId).subscribe({
        next: scores => {
          this.riskCaregivers = scores
            .filter(s => s.score >= DashboardComponent.RISK_MIN_SCORE)
            .slice(0, DashboardComponent.RISK_LIST_LIMIT);
        },
        // Silent failure: card just stays empty if the agent endpoint is off or
        // errors. Don't block the rest of the dashboard.
        error: () => { this.riskCaregivers = []; }
      });
    }
  }

  private loadPendingApplicants(): void {
    this.applicantService.listApplicants().subscribe({
      // Only those still awaiting approval (APPLICANT); ONBOARDING are already approved.
      next: list => { this.pendingApplicants = list.filter(a => a.status === 'APPLICANT'); },
      error: () => { this.pendingApplicants = []; }
    });
  }

  approveApplicant(a: ApplicantResponse): void {
    if (this.approvingId) {
      return;
    }
    this.approvingId = a.publicId;
    this.applicantService.approve(a.publicId).subscribe({
      next: () => {
        this.approvingId = null;
        this.pendingApplicants = this.pendingApplicants.filter(p => p.publicId !== a.publicId);
        this.snackBar.open(
          this.transloco.translate('dashboard.pendingApplicants.approved', { name: a.firstName }),
          'OK', { duration: 3000 });
      },
      error: err => {
        this.approvingId = null;
        this.snackBar.open(
          err?.error?.message ?? this.transloco.translate('dashboard.pendingApplicants.approveError'),
          'OK', { duration: 5000 });
      }
    });
  }

  get actionRequiredCount(): number {
    if (!this.data) return 0;
    let count = 0;
    if (this.data.credentials.expired > 0) count++;
    if (this.data.credentials.critical > 0) count++;
    if (this.data.credentials.pendingReview > 0) count++;
    if (this.data.employees.applicants > 0) count++;
    return count;
  }

  getPercent(value: number): number {
    if (!this.data || this.data.credentials.total === 0) return 0;
    return (value / this.data.credentials.total) * 100;
  }

  getStatusClass(status: string): string {
    return 'status-' + status;
  }

  getPositionPercent(pos: PositionEligibilitySummaryDto, type: string): number {
    if (pos.totalAssigned === 0) return 0;
    const val = type === 'eligible' ? pos.fullyEligible
              : type === 'partial' ? pos.partiallyEligible
              : pos.notEligible;
    return (val / pos.totalAssigned) * 100;
  }

  navigate(path: string, queryParams?: Record<string, string>): void {
    this.router.navigate([path], { queryParams });
  }

  riskTooltip(r: RiskScore): string {
    return r.factors.map(f => `• ${f.description} (+${f.points})`).join('\n');
  }
}
