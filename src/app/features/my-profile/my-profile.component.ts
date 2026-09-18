import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MyProfileService, MyProfileResponse } from '../../core/services/my-profile.service';
import { AuthService } from '../../core/services/auth.service';
import { Credential, CredentialType } from '../../core/models/credential.model';
import { EmployeeEligibilityResponse, RequirementStatusResponse } from '../../core/models/position.model';
import { MyProfileUploadDialogComponent } from './my-profile-upload-dialog.component';
import { CredentialDetailDialogComponent } from './credential-detail-dialog.component';
import { ContractService } from '../../core/services/contract.service';
import { Contract } from '../../core/models/contract.model';
import { ContractSignDialogComponent } from '../contracts/contract-sign-dialog/contract-sign-dialog.component';
import { AddressCardComponent } from './address-card.component';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatTableModule, MatProgressSpinnerModule,
    MatProgressBarModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, AddressCardComponent, TranslocoModule
  ],
  template: `
    @if (loading) {
      <div class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else if (profile) {
      <div class="profile-container">

        <!-- Header -->
        <div class="profile-header">
          <div class="avatar" [class.avatar-applicant]="profile.employee.status === 'APPLICANT'"
               [class.avatar-onboarding]="profile.employee.status === 'ONBOARDING'"
               [class.avatar-active]="profile.employee.status === 'ACTIVE'"
               [class.avatar-inactive]="profile.employee.status === 'INACTIVE'"
               [class.avatar-terminated]="profile.employee.status === 'TERMINATED'">
            <mat-icon>person</mat-icon>
          </div>
          <div class="header-info">
            <h1>{{ profile.employee.lastName }}, {{ profile.employee.firstName }}</h1>
            <p class="subtitle">{{ profile.employee.email }}</p>
            <div class="header-meta">
              <mat-chip-set>
                <mat-chip [class]="'status-' + profile.employee.status.toLowerCase()">
                  {{ formatStatus(profile.employee.status) }}
                </mat-chip>
                <mat-chip>{{ profile.employee.employeeCode }}</mat-chip>
                @if (profile.employee.phone) {
                  <mat-chip>
                    <mat-icon class="chip-icon">phone</mat-icon>
                    {{ profile.employee.phone }}
                  </mat-chip>
                }
              </mat-chip-set>
            </div>
          </div>
        </div>

        <!-- Address Card -->
        <app-address-card
            [address]="profile.employee.address"
            (addressUpdated)="onAddressUpdated($event)">
        </app-address-card>

        <!-- Ready-to-Work Banner -->
        <div class="ready-banner" [class.ready]="isReadyToWork" [class.not-ready]="!isReadyToWork">
          <mat-icon class="ready-icon">
            {{ isReadyToWork ? 'verified' : 'warning' }}
          </mat-icon>
          <div class="ready-body">
            <div class="ready-title">
              {{ isReadyToWork ? ('myProfile.profile.readyToWork' | transloco) : ('myProfile.profile.notReadyToWork' | transloco) }}
            </div>
            <div class="ready-sub">
              @if (isReadyToWork) {
                {{ 'myProfile.profile.allDocumentsComplete' | transloco: { total: profile.totalRequired } }}
              } @else {
                {{ 'myProfile.profile.documentsComplete' | transloco: { completed: profile.totalCompleted, total: profile.totalRequired } }}
                @if (notReadyReasons.length > 0) {
                  · {{ notReadyReasons.join(' · ') }}
                }
              }
            </div>
          </div>
        </div>

        <!-- Contracts Pending Signature (banner at top) -->
        @if (pendingContracts.length > 0) {
          <div class="pending-banner">
            <div class="pending-banner-header">
              <mat-icon>draw</mat-icon>
              <strong>{{ (pendingContracts.length === 1 ? 'myProfile.profile.pendingSignatureOne' : 'myProfile.profile.pendingSignatureMany') | transloco: { count: pendingContracts.length } }}</strong>
            </div>
            <div class="pending-banner-items">
              @for (c of pendingContracts; track c.publicId) {
                <div class="pending-banner-item">
                  <div class="pending-banner-info">
                    <span class="pending-title">{{ c.title }}</span>
                    <span class="pending-date">{{ 'myProfile.profile.sent' | transloco }}: {{ c.sentAt | date:'mediumDate' }}</span>
                  </div>
                  <button mat-raised-button color="primary" (click)="openSignDialog(c)">
                    <mat-icon>draw</mat-icon> {{ 'myProfile.profile.reviewAndSign' | transloco }}
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Stats Cards -->
        <div class="stats-row">
          <mat-card class="stat-card"
                    [matTooltip]="'myProfile.profile.tooltipViewAll' | transloco"
                    (click)="scrollTo('credentials-section')">
            <mat-icon class="stat-icon completed">check_circle</mat-icon>
            <div class="stat-value">{{ profile.totalCompleted }}</div>
            <div class="stat-label">{{ 'myProfile.profile.statCompleted' | transloco }}</div>
          </mat-card>
          <mat-card class="stat-card"
                    [matTooltip]="'myProfile.profile.tooltipRequired' | transloco">
            <mat-icon class="stat-icon required">assignment</mat-icon>
            <div class="stat-value">{{ profile.totalRequired }}</div>
            <div class="stat-label">{{ 'myProfile.profile.statRequired' | transloco }}</div>
          </mat-card>
          <mat-card class="stat-card clickable"
                    [class.warn]="profile.expiringSoon.length > 0"
                    [matTooltip]="'myProfile.profile.tooltipExpiring' | transloco"
                    (click)="profile.expiringSoon.length > 0 && scrollTo('expiring-section')">
            <mat-icon class="stat-icon expiring">schedule</mat-icon>
            <div class="stat-value">{{ profile.expiringSoon.length }}</div>
            <div class="stat-label">{{ 'myProfile.profile.statExpiringSoon' | transloco }}</div>
          </mat-card>
          <mat-card class="stat-card clickable"
                    [class.alert]="profile.missingCredentialTypes.length > 0"
                    [matTooltip]="'myProfile.profile.tooltipMissing' | transloco"
                    (click)="profile.missingCredentialTypes.length > 0 && scrollTo('missing-section')">
            <mat-icon class="stat-icon missing">error_outline</mat-icon>
            <div class="stat-value">{{ profile.missingCredentialTypes.length }}</div>
            <div class="stat-label">{{ 'myProfile.profile.statMissing' | transloco }}</div>
          </mat-card>
        </div>

        <!-- Compliance Progress -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>{{ 'myProfile.profile.complianceProgress' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="compliance-bar-container">
              <mat-progress-bar mode="determinate"
                                [value]="compliancePercent"
                                [color]="compliancePercent === 100 ? 'primary' : 'warn'">
              </mat-progress-bar>
              <span class="compliance-label"
                    [class.complete]="compliancePercent === 100">
                {{ compliancePercent }}%
              </span>
            </div>
            @if (compliancePercent === 100) {
              <div class="compliance-complete">
                <mat-icon>verified</mat-icon>
                {{ 'myProfile.profile.allUpToDate' | transloco }}
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Position Eligibility -->
        @if (profile.positionEligibility && profile.positionEligibility.length > 0) {
          <mat-card class="section-card">
            <mat-card-header>
              <mat-icon class="section-icon" style="color: #1565c0;">work</mat-icon>
              <mat-card-title>{{ 'myProfile.profile.myPositions' | transloco }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (pos of profile.positionEligibility; track pos.positionPublicId) {
                <div class="position-elig-item">
                  <div class="position-elig-header">
                    <span class="position-name">{{ pos.positionName }}</span>
                    <span class="elig-status-chip" [class]="'elig-' + pos.status.toLowerCase()">
                      {{ formatEligStatus(pos.status) }}
                    </span>
                  </div>
                  <div class="position-progress">
                    <mat-progress-bar mode="determinate" [value]="pos.percentComplete"
                      [color]="pos.percentComplete === 100 ? 'primary' : 'warn'">
                    </mat-progress-bar>
                    <span class="progress-label">{{ 'myProfile.profile.mandatoryProgress' | transloco: { met: pos.metMandatory, total: pos.totalMandatory } }}</span>
                  </div>
                  @if (pos.requirements && pos.requirements.length > 0) {
                    <div class="position-reqs">
                      @for (req of getMandatoryReqs(pos); track req.credentialTypeCode) {
                        <span class="req-tag" [class.met]="req.met" [class.unmet]="!req.met">
                          <mat-icon class="req-icon">{{ req.met ? 'check' : 'close' }}</mat-icon>
                          {{ req.credentialTypeName }}
                        </span>
                      }
                    </div>
                    @if (getOptionalReqs(pos).length > 0) {
                      <div class="optional-label">{{ 'common.optional' | transloco }}</div>
                      <div class="position-reqs">
                        @for (req of getOptionalReqs(pos); track req.credentialTypeCode) {
                          <span class="req-tag optional" [class.met]="req.met">
                            <mat-icon class="req-icon">{{ req.met ? 'check' : 'remove' }}</mat-icon>
                            {{ req.credentialTypeName }}
                          </span>
                        }
                      </div>
                    }
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Needs Renewal: EXPIRED + CRITICAL credentials (urgent action) -->
        @if (needsRenewalCredentials.length > 0) {
          <mat-card class="section-card alert-card" id="renewal-section">
            <mat-card-header>
              <mat-icon class="section-icon alert">autorenew</mat-icon>
              <mat-card-title>{{ 'myProfile.profile.needsRenewal' | transloco }}</mat-card-title>
              <mat-card-subtitle>{{ 'myProfile.profile.needsRenewalSub' | transloco }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (cred of needsRenewalCredentials; track cred.publicId) {
                <div class="expiring-item">
                  <div class="expiring-info clickable" (click)="openDetailDialog(cred)">
                    <span class="cred-type">{{ getCredentialTypeName(cred.credentialTypePublicId) }}</span>
                    <span class="expiring-date">
                      <mat-icon class="inline-icon">event</mat-icon>
                      {{ 'myProfile.profile.expires' | transloco }}: {{ cred.expirationDate || ('common.none' | transloco) }}
                    </span>
                  </div>
                  <div class="expiring-actions">
                    <mat-chip [class]="'status-chip status-' + cred.status.toLowerCase()">
                      {{ formatStatus(cred.status) }}
                    </mat-chip>
                    <button mat-stroked-button color="primary" class="renew-btn"
                            (click)="openRenewDialog(cred)">
                      <mat-icon>autorenew</mat-icon> {{ 'myProfile.profile.renew' | transloco }}
                    </button>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Pending Review: PENDING_REVIEW credentials waiting for admin -->
        @if (pendingReviewCredentials.length > 0) {
          <mat-card class="section-card pending-card">
            <mat-card-header>
              <mat-icon class="section-icon" style="color: #1565c0;">hourglass_top</mat-icon>
              <mat-card-title>{{ 'myProfile.profile.pendingAdminReview' | transloco }}</mat-card-title>
              <mat-card-subtitle>{{ 'myProfile.profile.pendingAdminReviewSub' | transloco }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (cred of pendingReviewCredentials; track cred.publicId) {
                <div class="expiring-item">
                  <div class="expiring-info clickable" (click)="openDetailDialog(cred)">
                    <span class="cred-type">{{ getCredentialTypeName(cred.credentialTypePublicId) }}</span>
                    @if (cred.issueDate) {
                      <span class="expiring-date">
                        <mat-icon class="inline-icon">upload</mat-icon>
                        {{ 'myProfile.profile.submitted' | transloco }}: {{ cred.createdAt | date:'mediumDate' }}
                      </span>
                    }
                  </div>
                  <div class="expiring-actions">
                    <mat-chip class="status-chip status-pending_review">{{ 'myProfile.status.PENDING_REVIEW' | transloco }}</mat-chip>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Expiring Soon (non-critical): heads-up only -->
        @if (expiringSoonOnlyCredentials.length > 0) {
          <mat-card class="section-card warning-card" id="expiring-section">
            <mat-card-header>
              <mat-icon class="section-icon warning">schedule</mat-icon>
              <mat-card-title>{{ 'myProfile.profile.expiringSoon' | transloco }}</mat-card-title>
              <mat-card-subtitle>{{ 'myProfile.profile.expiringSoonSub' | transloco }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (cred of expiringSoonOnlyCredentials; track cred.publicId) {
                <div class="expiring-item">
                  <div class="expiring-info clickable" (click)="openDetailDialog(cred)">
                    <span class="cred-type">{{ getCredentialTypeName(cred.credentialTypePublicId) }}</span>
                    <span class="expiring-date">
                      <mat-icon class="inline-icon">event</mat-icon>
                      {{ 'myProfile.profile.expires' | transloco }}: {{ cred.expirationDate }}
                    </span>
                  </div>
                  <div class="expiring-actions">
                    <mat-chip class="status-chip status-expiring_soon">{{ 'myProfile.status.EXPIRING_SOON' | transloco }}</mat-chip>
                    <button mat-stroked-button color="primary" class="renew-btn"
                            (click)="openRenewDialog(cred)">
                      <mat-icon>autorenew</mat-icon> {{ 'myProfile.profile.renew' | transloco }}
                    </button>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Missing Credentials -->
        @if (profile.missingCredentialTypes.length > 0) {
          <mat-card class="section-card alert-card" id="missing-section">
            <mat-card-header>
              <mat-icon class="section-icon alert">assignment_late</mat-icon>
              <mat-card-title>{{ 'myProfile.profile.missingDocuments' | transloco }}</mat-card-title>
              <mat-card-subtitle>{{ 'myProfile.profile.missingDocumentsSub' | transloco }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (ct of profile.missingCredentialTypes; track ct.publicId) {
                <div class="missing-item">
                  <div class="missing-info">
                    <mat-icon>description</mat-icon>
                    <span class="missing-name">{{ ct.name }}</span>
                  </div>
                  <button mat-stroked-button color="primary"
                          (click)="openUploadDialog(ct)">
                    <mat-icon>upload</mat-icon>
                    {{ 'myProfile.profile.submit' | transloco }}
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Optional Credentials -->
        @if (profile.missingOptionalTypes && profile.missingOptionalTypes.length > 0) {
          <mat-card class="section-card optional-card">
            <mat-card-header>
              <mat-icon class="section-icon" style="color: #78909c;">playlist_add</mat-icon>
              <mat-card-title>{{ 'myProfile.profile.optionalCredentials' | transloco }}</mat-card-title>
              <mat-card-subtitle>{{ 'myProfile.profile.optionalCredentialsSub' | transloco }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (ct of profile.missingOptionalTypes; track ct.publicId) {
                <div class="missing-item">
                  <div class="missing-info">
                    <mat-icon style="color: #b0bec5;">description</mat-icon>
                    <span class="missing-name" style="color: #666;">{{ ct.name }}</span>
                  </div>
                  <button mat-stroked-button
                          (click)="openUploadDialog(ct)">
                    <mat-icon>upload</mat-icon>
                    {{ 'myProfile.profile.submit' | transloco }}
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- My Credentials -->
        <mat-card class="section-card" id="credentials-section">
          <mat-card-header>
            <mat-card-title>{{ 'myProfile.profile.myCredentials' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (profile.credentials.length === 0) {
              <div class="empty-state">
                <mat-icon>badge</mat-icon>
                <p>{{ 'myProfile.profile.noCredentials' | transloco }}</p>
              </div>
            } @else {
              <div class="table-scroll">
              <table mat-table [dataSource]="profile.credentials" class="cred-table">
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.type' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="cell-main">{{ getCredentialTypeName(row.credentialTypePublicId) }}</div>
                    @if (isMobile && row.expirationDate) {
                      <div class="cell-sub">{{ 'myProfile.profile.expAbbr' | transloco }}: {{ row.expirationDate }}</div>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="issuer">
                  <th mat-header-cell *matHeaderCellDef>{{ 'myProfile.profile.issuer' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.issuer || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="expirationDate">
                  <th mat-header-cell *matHeaderCellDef>{{ 'myProfile.profile.expires' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">{{ row.expirationDate || ('myProfile.profile.noExpiration' | transloco) }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | transloco }}</th>
                  <td mat-cell *matCellDef="let row">
                    <mat-chip [class]="'status-chip status-' + row.status.toLowerCase()">
                      {{ formatStatus(row.status) }}
                    </mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row" class="actions-cell">
                    <button mat-icon-button [matTooltip]="'myProfile.profile.viewDetails' | transloco"
                            (click)="openDetailDialog(row); $event.stopPropagation()">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    @if (row.status === 'EXPIRING_SOON' || row.status === 'CRITICAL' || row.status === 'EXPIRED') {
                      <button mat-icon-button [matTooltip]="'myProfile.profile.renewCredential' | transloco" color="primary"
                              (click)="openRenewDialog(row); $event.stopPropagation()">
                        <mat-icon>autorenew</mat-icon>
                      </button>
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"
                    class="clickable-row" (click)="openDetailDialog(row)"></tr>
              </table>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- My Contracts -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-icon class="section-icon" style="color: #1565c0;">description</mat-icon>
            <mat-card-title>{{ 'myProfile.profile.myContracts' | transloco }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (myContracts.length === 0) {
              <div class="empty-state">
                <mat-icon>description</mat-icon>
                <p>{{ 'myProfile.profile.noContracts' | transloco }}</p>
              </div>
            } @else {
              @for (c of myContracts; track c.publicId) {
                <div class="contract-item">
                  <div class="contract-item-info">
                    <span class="cred-type">{{ c.title }}</span>
                    <span class="expiring-date">
                      {{ c.createdAt | date:'mediumDate' }}
                      @if (c.signedAt) { · {{ 'myProfile.profile.signed' | transloco }}: {{ c.signedAt | date:'mediumDate' }} }
                    </span>
                  </div>
                  <div class="contract-item-actions">
                    <span class="contract-status-chip" [class]="'cstatus-' + c.status.toLowerCase()">
                      <mat-icon class="cstatus-icon">{{ getContractStatusIcon(c.status) }}</mat-icon>
                      {{ formatStatus(c.status) }}
                    </span>
                    <button mat-icon-button [matTooltip]="'common.download' | transloco" (click)="downloadContractPdf(c)">
                      <mat-icon>download</mat-icon>
                    </button>
                  </div>
                </div>
              }
            }
          </mat-card-content>
        </mat-card>

      </div>
    } @else if (error) {
      <div class="error-container">
        <mat-icon>error_outline</mat-icon>
        <h2>{{ 'myProfile.profile.unableToLoad' | transloco }}</h2>
        <p>{{ error }}</p>
      </div>
    }
  `,
  styles: [`
    .loading-container, .error-container {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 64px; color: #666;
    }
    .error-container mat-icon { font-size: 48px; width: 48px; height: 48px; color: #d32f2f; }
    .profile-container { max-width: 900px; margin: 0 auto; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    /* Ready banner */
    .ready-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 16px;
      border: 1px solid transparent;
    }
    .ready-banner.ready {
      background: #e8f5e9;
      border-color: #66bb6a;
      color: #1b5e20;
    }
    .ready-banner.not-ready {
      background: #fff3e0;
      border-color: #ffb74d;
      color: #e65100;
    }
    .ready-banner .ready-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }
    .ready-banner.ready .ready-icon { color: #2e7d32; }
    .ready-banner.not-ready .ready-icon { color: #ef6c00; }
    .ready-banner .ready-title {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.2;
    }
    .ready-banner .ready-sub {
      font-size: 13px;
      margin-top: 2px;
      opacity: 0.85;
    }

    .profile-header {
      display: flex; align-items: center; gap: 20px;
      margin-bottom: 24px; padding: 24px;
      background: white; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #1565c0, #0d47a1);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .avatar mat-icon { font-size: 36px; width: 36px; height: 36px; color: white; }
    .avatar-applicant { background: linear-gradient(135deg, #1565c0, #42a5f5); }
    .avatar-onboarding { background: linear-gradient(135deg, #7b1fa2, #ab47bc); }
    .avatar-active { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
    .avatar-inactive { background: linear-gradient(135deg, #e65100, #ff9800); }
    .avatar-terminated { background: linear-gradient(135deg, #616161, #9e9e9e); }
    .header-info h1 { margin: 0; font-size: 24px; color: #1a237e; }
    .header-info .subtitle { margin: 4px 0 8px; color: #666; font-size: 14px; }
    .header-meta { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; margin-right: 4px; }

    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 24px;
    }
    .stat-card {
      text-align: center; padding: 20px 16px;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .stat-card.clickable { cursor: pointer; }
    .stat-card.clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .stat-icon { font-size: 28px; width: 28px; height: 28px; margin-bottom: 4px; }
    .stat-icon.completed { color: #2e7d32; }
    .stat-icon.required { color: #1565c0; }
    .stat-icon.expiring { color: #f57c00; }
    .stat-icon.missing { color: #d32f2f; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1a237e; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card.warn { border-left: 3px solid #f57c00; }
    .stat-card.alert { border-left: 3px solid #d32f2f; }

    .section-card { margin-bottom: 20px; }
    .section-icon { margin-right: 8px; }
    .section-icon.warning { color: #f57c00; }
    .section-icon.alert { color: #d32f2f; }

    .compliance-bar-container {
      display: flex; align-items: center; gap: 16px; padding: 8px 0;
    }
    .compliance-bar-container mat-progress-bar { flex: 1; }
    .compliance-label { font-size: 18px; font-weight: 600; color: #1a237e; min-width: 48px; }
    .compliance-label.complete { color: #2e7d32; }
    .compliance-complete {
      display: flex; align-items: center; gap: 8px;
      color: #2e7d32; font-weight: 500; margin-top: 8px;
    }
    .compliance-complete mat-icon { color: #2e7d32; }

    .warning-card { border-left: 3px solid #f57c00; }
    .alert-card { border-left: 3px solid #d32f2f; }
    .optional-card { border-left: 3px dashed #b0bec5; }

    .expiring-item, .missing-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid #eee;
    }
    .expiring-item:last-child, .missing-item:last-child { border-bottom: none; }
    .expiring-info { display: flex; flex-direction: column; gap: 2px; }
    .expiring-info.clickable { cursor: pointer; }
    .expiring-info.clickable:hover .cred-type { color: #1565c0; }
    .missing-info { display: flex; align-items: center; gap: 8px; }
    .missing-info mat-icon { color: #999; font-size: 20px; width: 20px; height: 20px; }
    .cred-type { font-weight: 500; transition: color 0.15s; }
    .expiring-date {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; color: #666;
    }
    .inline-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; color: #999; }
    .missing-name { font-weight: 500; }
    .expiring-actions { display: flex; align-items: center; gap: 8px; }
    .renew-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .cred-table { width: 100%; }
    .cell-main { font-weight: 500; }
    .cell-sub { font-size: 12px; color: #888; line-height: 1.3; }
    .clickable-row { cursor: pointer; transition: background 0.12s; }
    .clickable-row:hover { background: rgba(0,0,0,0.02); }
    .actions-cell { text-align: right; white-space: nowrap; }

    .status-chip { font-size: 11px !important; min-height: 24px !important; }
    .status-valid { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-expiring_soon { background: #fff3e0 !important; color: #f57c00 !important; }
    .status-critical { background: #fbe9e7 !important; color: #d32f2f !important; }
    .status-expired { background: #ffebee !important; color: #b71c1c !important; }
    .status-pending_review { background: #e3f2fd !important; color: #1565c0 !important; }
    .status-superseded { background: #f5f5f5 !important; color: #9e9e9e !important; }
    .status-active { background: #e8f5e9 !important; color: #2e7d32 !important; }

    .empty-state {
      text-align: center; padding: 32px; color: #999;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }

    .position-elig-item {
      padding: 12px 0; border-bottom: 1px solid #eee;
    }
    .position-elig-item:last-child { border-bottom: none; }
    .position-elig-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
    }
    .position-name { font-weight: 600; font-size: 14px; }
    .elig-status-chip {
      padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;
    }
    .elig-eligible { background: #e8f5e9; color: #2e7d32; }
    .elig-partially_eligible { background: #fff3e0; color: #e65100; }
    .elig-not_eligible { background: #ffebee; color: #c62828; }
    .position-progress {
      display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
    }
    .position-progress mat-progress-bar { flex: 1; }
    .progress-label { font-size: 12px; color: #666; white-space: nowrap; }
    .position-reqs { display: flex; flex-wrap: wrap; gap: 6px; }
    .req-tag {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 2px 8px; border-radius: 12px; font-size: 11px;
    }
    .req-tag.met { background: #e8f5e9; color: #2e7d32; }
    .req-tag.unmet { background: #ffebee; color: #c62828; }
    .req-tag.optional { background: #f5f5f5; color: #888; border: 1px dashed #ccc; }
    .req-tag.optional.met { background: #e8f5e9; color: #2e7d32; border: 1px dashed #4caf50; }
    .req-icon { font-size: 12px !important; width: 12px !important; height: 12px !important; }
    .optional-label {
      font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px;
      margin-top: 8px; margin-bottom: 4px;
    }

    /* Pending contracts banner */
    .pending-banner {
      background: linear-gradient(135deg, #fff3e0, #ffe0b2);
      border: 1px solid #ffcc02;
      border-left: 4px solid #f57c00;
      border-radius: 12px; padding: 16px; margin-bottom: 24px;
    }
    .pending-banner-header {
      display: flex; align-items: center; gap: 10px;
      color: #e65100; font-size: 15px; margin-bottom: 12px;
    }
    .pending-banner-header mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .pending-banner-items { display: flex; flex-direction: column; gap: 8px; }
    .pending-banner-item {
      display: flex; align-items: center; justify-content: space-between;
      background: white; border-radius: 8px; padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .pending-banner-info { display: flex; flex-direction: column; gap: 2px; }
    .pending-title { font-weight: 500; font-size: 14px; color: #333; }
    .pending-date { font-size: 12px; color: #888; }

    /* Contracts */
    .contract-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid #eee;
    }
    .contract-item:last-child { border-bottom: none; }
    .contract-item-info { display: flex; flex-direction: column; gap: 2px; }
    .contract-item-actions { display: flex; align-items: center; gap: 8px; }
    .contract-status-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;
    }
    .cstatus-icon { font-size: 13px !important; width: 13px !important; height: 13px !important; }
    .cstatus-draft { background: #e3f2fd; color: #1565c0; }
    .cstatus-sent { background: #fff3e0; color: #e65100; }
    .cstatus-signed { background: #e8f5e9; color: #2e7d32; }
    .cstatus-revoked { background: #eeeeee; color: #616161; }
    .cstatus-expired { background: #ffebee; color: #c62828; }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .profile-header { flex-direction: column; text-align: center; }
      .expiring-item { flex-direction: column; align-items: flex-start; gap: 8px; }
      .expiring-actions { align-self: flex-end; }
      .missing-item { flex-direction: column; align-items: flex-start; gap: 8px; }
      .missing-item button { align-self: flex-end; }
      .contract-item { flex-direction: column; align-items: flex-start; gap: 8px; }
      .pending-banner-item { flex-direction: column; align-items: flex-start; gap: 8px; }
      .pending-banner-item button { align-self: flex-end; }
      .contract-item-actions { align-self: flex-end; }
      .position-elig-header { flex-direction: column; align-items: flex-start; gap: 4px; }
      .position-reqs { gap: 4px; }
    }
    @media (max-width: 480px) {
      .stats-row { grid-template-columns: 1fr 1fr; gap: 8px; }
      .stat-value { font-size: 22px; }
      .profile-container { margin: 0; }
      .profile-header { padding: 16px; }
      .header-info h1 { font-size: 20px; }
    }
  `]
})
export class MyProfileComponent implements OnInit {
  loading = true;
  profile: MyProfileResponse | null = null;
  error = '';
  isMobile = false;
  pendingContracts: Contract[] = [];
  myContracts: Contract[] = [];
  displayedColumns = ['type', 'issuer', 'expirationDate', 'status', 'actions'];

  private readonly desktopColumns = ['type', 'issuer', 'expirationDate', 'status', 'actions'];
  private readonly mobileColumns = ['type', 'status', 'actions'];

  private credTypeNameMap = new Map<string, string>();
  private credTypeMap = new Map<string, CredentialType>();

  get compliancePercent(): number {
    if (!this.profile || this.profile.totalRequired === 0) return 100;
    return Math.round((this.profile.totalCompleted / this.profile.totalRequired) * 100);
  }

  constructor(
    private myProfileService: MyProfileService,
    private contractService: ContractService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private transloco: TranslocoService
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
      this.displayedColumns = result.matches ? this.mobileColumns : this.desktopColumns;
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  onAddressUpdated(address: import('../../core/models/address.model').EmployeeAddress): void {
    if (this.profile) {
      this.profile.employee.address = address;
    }
  }

  get needsRenewalCredentials(): Credential[] {
    if (!this.profile) return [];
    return this.profile.credentials.filter(c =>
        c.status === 'EXPIRED' || c.status === 'CRITICAL');
  }

  get pendingReviewCredentials(): Credential[] {
    if (!this.profile) return [];
    return this.profile.credentials.filter(c => c.status === 'PENDING_REVIEW');
  }

  /** Just EXPIRING_SOON — CRITICAL is shown under "Needs Renewal" instead. */
  get expiringSoonOnlyCredentials(): Credential[] {
    if (!this.profile) return [];
    return this.profile.credentials.filter(c => c.status === 'EXPIRING_SOON');
  }

  get isReadyToWork(): boolean {
    if (!this.profile) return false;
    return this.profile.totalRequired > 0
        && this.profile.totalCompleted === this.profile.totalRequired;
  }

  get notReadyReasons(): string[] {
    if (!this.profile) return [];
    const reasons: string[] = [];
    const missingCount = this.profile.missingCredentialTypes.length;
    if (missingCount > 0) reasons.push(this.transloco.translate('myProfile.profile.reasonMissing', { count: missingCount }));
    const renewalCount = this.needsRenewalCredentials.length;
    if (renewalCount > 0) reasons.push(this.transloco.translate('myProfile.profile.reasonNeedsRenewal', { count: renewalCount }));
    const pendingCount = this.pendingReviewCredentials.length;
    if (pendingCount > 0) reasons.push(this.transloco.translate('myProfile.profile.reasonPendingReview', { count: pendingCount }));
    return reasons;
  }

  loadProfile(): void {
    this.loading = true;
    this.myProfileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.buildCredTypeMap();
        this.loadContracts();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || this.transloco.translate('myProfile.profile.failedToLoad');
        this.loading = false;
      }
    });
  }

  private loadContracts(): void {
    this.contractService.getMyPendingContracts().subscribe({
      next: contracts => this.pendingContracts = contracts,
      error: () => {}
    });
    this.contractService.getMyContracts(0, 500).subscribe({
      next: page => this.myContracts = page.content,
      error: () => {}
    });
  }

  private buildCredTypeMap(): void {
    if (!this.profile) return;
    for (const ct of this.profile.allCredentialTypes) {
      this.credTypeNameMap.set(ct.publicId, ct.name);
      this.credTypeMap.set(ct.publicId, ct);
    }
    for (const ct of this.profile.missingCredentialTypes) {
      this.credTypeNameMap.set(ct.publicId, ct.name);
      this.credTypeMap.set(ct.publicId, ct);
    }
    if (this.profile.missingOptionalTypes) {
      for (const ct of this.profile.missingOptionalTypes) {
        this.credTypeNameMap.set(ct.publicId, ct.name);
        this.credTypeMap.set(ct.publicId, ct);
      }
    }
  }

  getCredentialTypeName(publicId: string): string {
    return this.credTypeNameMap.get(publicId) || publicId.substring(0, 8) + '...';
  }

  formatStatus(status: string): string {
    // Prefer a localized label; fall back to a humanized raw value for any
    // status not present in the myProfile.status map.
    const key = 'myProfile.status.' + status;
    const translated = this.transloco.translate(key);
    return translated === key
      ? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : translated;
  }

  formatEligStatus(status: string): string {
    switch (status) {
      case 'ELIGIBLE': return this.transloco.translate('myProfile.status.ELIGIBLE');
      case 'PARTIALLY_ELIGIBLE': return this.transloco.translate('myProfile.status.PARTIALLY_ELIGIBLE');
      case 'NOT_ELIGIBLE': return this.transloco.translate('myProfile.status.NOT_ELIGIBLE');
      default: return status;
    }
  }

  getMandatoryReqs(pos: EmployeeEligibilityResponse): RequirementStatusResponse[] {
    return pos.requirements.filter(r => r.isMandatory);
  }

  getOptionalReqs(pos: EmployeeEligibilityResponse): RequirementStatusResponse[] {
    return pos.requirements.filter(r => !r.isMandatory);
  }

  scrollTo(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  openDetailDialog(credential: Credential): void {
    this.dialog.open(CredentialDetailDialogComponent, {
      width: '560px', maxWidth: '95vw',
      data: {
        credential,
        credentialTypeName: this.getCredentialTypeName(credential.credentialTypePublicId)
      }
    });
  }

  openRenewDialog(credential: Credential): void {
    const ct = this.credTypeMap.get(credential.credentialTypePublicId);
    if (!ct) return;

    const dialogRef = this.dialog.open(MyProfileUploadDialogComponent, {
      width: '500px', maxWidth: '95vw',
      data: {
        credentialType: ct,
        agencyPublicId: this.authService.agencyPublicId(),
        employeePublicId: this.authService.employeePublicId(),
        isRenewal: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open(this.transloco.translate('myProfile.profile.renewalSubmitted'), 'OK', { duration: 3000 });
        this.loadProfile();
      }
    });
  }

  openUploadDialog(credentialType: CredentialType): void {
    const dialogRef = this.dialog.open(MyProfileUploadDialogComponent, {
      width: '500px', maxWidth: '95vw',
      data: {
        credentialType,
        agencyPublicId: this.authService.agencyPublicId(),
        employeePublicId: this.authService.employeePublicId()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProfile();
      }
    });
  }

  openSignDialog(contract: Contract): void {
    const ref = this.dialog.open(ContractSignDialogComponent, {
      width: '750px', maxWidth: '95vw',
      data: { contract }
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadContracts();
    });
  }

  getContractStatusIcon(status: string): string {
    switch (status) {
      case 'DRAFT': return 'edit_note';
      case 'SENT': return 'send';
      case 'SIGNED': return 'check_circle';
      case 'REVOKED': return 'cancel';
      case 'EXPIRED': return 'schedule';
      default: return 'description';
    }
  }

  downloadContractPdf(contract: Contract): void {
    this.contractService.downloadPdf(contract.publicId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = contract.title + '.pdf';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open(this.transloco.translate('myProfile.profile.errorDownloadingPdf'), 'OK', { duration: 3000 })
    });
  }
}
