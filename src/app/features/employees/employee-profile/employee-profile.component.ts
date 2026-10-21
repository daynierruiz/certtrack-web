import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { forkJoin } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { EmployeeService, EmployeeAccount } from '../../../core/services/employee.service';
import { CredentialService } from '../../../core/services/credential.service';
import { PositionService } from '../../../core/services/position.service';
import { DocumentService } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models/employee.model';
import {
  Credential,
  CredentialType,
  CredentialCategory,
  CREDENTIAL_CATEGORY_LABELS,
  CREDENTIAL_CATEGORY_ICONS,
  CREDENTIAL_CATEGORY_ORDER
} from '../../../core/models/credential.model';
import { EmployeeEligibilityResponse, RequirementStatusResponse } from '../../../core/models/position.model';
import { DocumentResponse } from '../../../core/models/document.model';
import { EmployeeFormDialogComponent } from '../employee-form-dialog/employee-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog.component';
import { SetPasswordDialogComponent } from './set-password-dialog.component';
import { ContractService } from '../../../core/services/contract.service';
import { Contract } from '../../../core/models/contract.model';
import { ContractGenerateDialogComponent } from '../../contracts/contract-generate-dialog/contract-generate-dialog.component';
import { ContractSignDialogComponent } from '../../contracts/contract-sign-dialog/contract-sign-dialog.component';
import { CredentialFormDialogComponent } from '../../credentials/credential-form-dialog/credential-form-dialog.component';
import { CredentialReviewDialogComponent } from '../../credentials/credential-review-dialog/credential-review-dialog.component';
import { HiringRoadmapComponent } from '../hiring-roadmap/hiring-roadmap.component';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDividerModule, MatTabsModule, MatMenuModule,
    MatDialogModule, MatSnackBarModule,
    HiringRoadmapComponent,
    TranslocoModule
  ],
  template: `
    @if (loading) {
      <div class="loading-container"><mat-spinner diameter="48"></mat-spinner></div>
    } @else if (employee) {
      <div class="profile-page">

        <!-- Back button + Actions -->
        <div class="top-bar">
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> {{ 'employeeProfile.backToEmployees' | transloco }}
          </button>
          <div class="top-bar-actions">
            <button mat-stroked-button (click)="editEmployee()">
              <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
            </button>
            <button mat-stroked-button [matMenuTriggerFor]="moreMenu"
                    [matTooltip]="'employeeProfile.moreActions' | transloco">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #moreMenu="matMenu">
              @if (account?.userPublicId) {
                @if (!account!.isActive || account!.isLocked) {
                  <button mat-menu-item (click)="toggleAccount(true)">
                    <mat-icon color="primary">check_circle</mat-icon>
                    <span>{{ 'employeeProfile.menu.activateAccount' | transloco }}</span>
                  </button>
                } @else {
                  <button mat-menu-item (click)="toggleAccount(false)">
                    <mat-icon color="warn">block</mat-icon>
                    <span>{{ 'employeeProfile.menu.deactivateAccount' | transloco }}</span>
                  </button>
                }
                <button mat-menu-item (click)="resetEmployeePassword()">
                  <mat-icon>lock_reset</mat-icon>
                  <span>{{ 'employeeProfile.menu.resetPassword' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="setEmployeePassword()">
                  <mat-icon>password</mat-icon>
                  <span>{{ 'employeeProfile.menu.setPassword' | transloco }}</span>
                </button>
                <mat-divider></mat-divider>
              } @else if (accountNotFound) {
                <button mat-menu-item disabled>
                  <mat-icon>person_off</mat-icon>
                  <span>{{ 'employeeProfile.menu.noAccountLinked' | transloco }}</span>
                </button>
                <mat-divider></mat-divider>
              }
              <button mat-menu-item (click)="goBack()">
                <mat-icon>arrow_back</mat-icon>
                <span>{{ 'employeeProfile.backToEmployees' | transloco }}</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Header Card -->
        <mat-card class="header-card">
          <div class="header-content">
            <div class="avatar" [class]="'avatar-' + employee.status.toLowerCase()">
              <mat-icon>person</mat-icon>
            </div>
            <div class="header-info">
              <h1>{{ employee.lastName }}, {{ employee.firstName }}</h1>
              <div class="header-meta">
                @if (employee.employeeCode) {
                  <span class="meta-chip code">{{ employee.employeeCode }}</span>
                }
                <span class="meta-chip status" [class]="'status-' + employee.status.toLowerCase()">
                  {{ 'employeeProfile.empStatus.' + employee.status | transloco }}
                </span>
                @if (account?.isLocked) {
                  <span class="meta-chip account-issue">
                    <mat-icon>lock</mat-icon> {{ 'employeeProfile.accountLocked' | transloco }}
                  </span>
                } @else if (account && !account.isActive) {
                  <span class="meta-chip account-issue">
                    <mat-icon>person_off</mat-icon> {{ 'employeeProfile.accountDeactivated' | transloco }}
                  </span>
                }
              </div>
              <div class="header-details">
                @if (employee.email) {
                  <span class="detail-item">
                    <mat-icon>email</mat-icon> {{ employee.email }}
                  </span>
                }
                @if (employee.phone) {
                  <span class="detail-item">
                    <mat-icon>phone</mat-icon> {{ employee.phone }}
                  </span>
                }
                @if (employee.address) {
                  <span class="detail-item" [matTooltip]="formatFullAddress(employee.address)">
                    <mat-icon>location_on</mat-icon>
                    {{ employee.address.city }}, {{ employee.address.state }} {{ employee.address.postalCode }}
                  </span>
                }
                @if (employee.hireDate) {
                  <span class="detail-item">
                    <mat-icon>event</mat-icon> {{ 'employeeProfile.hired' | transloco }}: {{ employee.hireDate }}
                  </span>
                }
                @if (account?.lastLoginAt) {
                  <span class="detail-item">
                    <mat-icon>login</mat-icon> {{ 'employeeProfile.lastLogin' | transloco }}: {{ account!.lastLoginAt | date:'short' }}
                  </span>
                }
                @if (employee.externalId) {
                  <span class="detail-item">
                    <mat-icon>tag</mat-icon> {{ 'employeeProfile.external' | transloco }}: {{ employee.externalId }}
                  </span>
                }
              </div>
              @if (employee.notes) {
                <p class="notes">{{ employee.notes }}</p>
              }
            </div>
          </div>
        </mat-card>

        <!-- Hiring Roadmap (visible while not ACTIVE) -->
        <app-hiring-roadmap
          [employee]="employee"
          [credentials]="credentials"
          [positionEligibility]="positions"
          [pendingContractsCount]="pendingContractsCount"
          [signedContractsCount]="signedContractsCount"
          [accountLastLoginAt]="account?.lastLoginAt ?? null">
        </app-hiring-roadmap>

        <!-- Stats Row: only meaningful once employee is ACTIVE (during hiring -->
        <!-- the Roadmap above already conveys the relevant counts). -->
        @if (employee.status === 'ACTIVE') {
          <div class="stats-row">
            <div class="stat-card" [class.alert]="expiredCount > 0">
              <div class="stat-value">{{ credentials.length }}</div>
              <div class="stat-label">{{ 'employeeProfile.stats.credentials' | transloco }}</div>
              <mat-icon class="stat-bg-icon">badge</mat-icon>
            </div>
            <div class="stat-card" [class.warn]="expiringSoonCount > 0">
              <div class="stat-value">{{ validCount }}</div>
              <div class="stat-label">{{ 'employeeProfile.stats.valid' | transloco }}</div>
              <mat-icon class="stat-bg-icon">check_circle</mat-icon>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ positions.length }}</div>
              <div class="stat-label">{{ 'employeeProfile.stats.positions' | transloco }}</div>
              <mat-icon class="stat-bg-icon">work</mat-icon>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ totalDocuments }}</div>
              <div class="stat-label">{{ 'employeeProfile.stats.documents' | transloco }}</div>
              <mat-icon class="stat-bg-icon">folder</mat-icon>
            </div>
          </div>
        }

        <!-- Tabs: Credentials / Positions / Documents -->
        <!-- Account actions (activate/deactivate/reset) moved to the top-bar More menu. -->
        <!-- Account status indicator (locked/inactive) lives as a chip in the header. -->
        <mat-tab-group animationDuration="200ms" [selectedIndex]="activeTab"
                       (selectedIndexChange)="activeTab = $event">

          <!-- TAB 1: Credentials -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">badge</mat-icon>
              {{ 'employeeProfile.tabs.credentials' | transloco }}
              @if (expiredCount + pendingCount > 0) {
                <span class="tab-badge">{{ expiredCount + pendingCount }}</span>
              }
            </ng-template>

            <div class="tab-content">
              <div class="tab-actions">
                <button mat-raised-button color="primary"
                        (click)="openAddCredential()"
                        [disabled]="credentialTypes.length === 0">
                  <mat-icon>add</mat-icon> {{ 'employeeProfile.credentials.addCredential' | transloco }}
                </button>
              </div>
              @if (credentials.length === 0) {
                <div class="empty-state">
                  <mat-icon>badge</mat-icon>
                  <p>{{ 'employeeProfile.credentials.empty' | transloco }}</p>
                </div>
              } @else {
                <!-- Attention needed -->
                @if (attentionCredentials.length > 0) {
                  <div class="subsection attention">
                    <h3><mat-icon>warning</mat-icon> {{ 'employeeProfile.credentials.needsAttention' | transloco }}</h3>
                    <div class="credential-list">
                      @for (cred of attentionCredentials; track cred.publicId) {
                        <div class="credential-card" [class]="'cred-border-' + cred.status.toLowerCase()"
                             (click)="toggleCredential(cred.publicId)">
                          <div class="cred-row">
                            <div class="cred-info">
                              <span class="cred-name">{{ getTypeName(cred.credentialTypePublicId) }}</span>
                              <span class="cred-meta">
                                @if (cred.issuer) { {{ cred.issuer }} &middot; }
                                @if (cred.expirationDate) { {{ 'employeeProfile.credentials.expires' | transloco }}: {{ cred.expirationDate }} }
                                @if (cred.credentialNumber) { &middot; #{{ cred.credentialNumber }} }
                              </span>
                            </div>
                            <span class="cred-status" [class]="'cred-' + cred.status.toLowerCase()">
                              {{ 'employeeProfile.credStatus.' + cred.status | transloco }}
                            </span>
                            <mat-icon class="expand-icon">
                              {{ expandedCredential === cred.publicId ? 'expand_less' : 'expand_more' }}
                            </mat-icon>
                          </div>
                          @if (expandedCredential === cred.publicId) {
                            <div class="cred-detail" (click)="$event.stopPropagation()">
                              <div class="detail-grid">
                                <div class="detail-field">
                                  <span class="field-label">{{ 'employeeProfile.credentials.issueDate' | transloco }}</span>
                                  <span class="field-value">{{ cred.issueDate || ('employeeProfile.na' | transloco) }}</span>
                                </div>
                                <div class="detail-field">
                                  <span class="field-label">{{ 'employeeProfile.credentials.expiration' | transloco }}</span>
                                  <span class="field-value">{{ cred.expirationDate || ('employeeProfile.credentials.noExpiration' | transloco) }}</span>
                                </div>
                                <div class="detail-field">
                                  <span class="field-label">{{ 'employeeProfile.credentials.credentialNumber' | transloco }}</span>
                                  <span class="field-value">{{ cred.credentialNumber || ('employeeProfile.na' | transloco) }}</span>
                                </div>
                                <div class="detail-field">
                                  <span class="field-label">{{ 'employeeProfile.credentials.issuer' | transloco }}</span>
                                  <span class="field-value">{{ cred.issuer || ('employeeProfile.na' | transloco) }}</span>
                                </div>
                              </div>
                              @if (cred.notes) {
                                <p class="cred-notes"><strong>{{ 'common.notes' | transloco }}:</strong> {{ cred.notes }}</p>
                              }
                              @if (cred.reviewNotes) {
                                <p class="cred-notes review"><strong>{{ 'employeeProfile.credentials.reviewNotes' | transloco }}:</strong> {{ cred.reviewNotes }}</p>
                              }
                              <div class="cred-actions">
                                <button mat-stroked-button
                                        (click)="openEditCredential(cred); $event.stopPropagation()">
                                  <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
                                </button>
                                @if (cred.status === 'PENDING_REVIEW') {
                                  <button mat-raised-button color="primary"
                                          (click)="openCredentialReview(cred); $event.stopPropagation()">
                                    <mat-icon>rate_review</mat-icon> {{ 'employeeProfile.credentials.reviewApproveReject' | transloco }}
                                  </button>
                                } @else if (cred.status !== 'SUPERSEDED') {
                                  <button mat-stroked-button color="primary"
                                          (click)="reopenCredential(cred); $event.stopPropagation()">
                                    <mat-icon>restart_alt</mat-icon> {{ 'employeeProfile.credentials.reopenForReview' | transloco }}
                                  </button>
                                }
                                <button mat-stroked-button color="warn"
                                        (click)="deleteCredential(cred); $event.stopPropagation()">
                                  <mat-icon>delete</mat-icon> {{ 'employeeProfile.credentials.deleteCredential' | transloco }}
                                </button>
                              </div>
                              <!-- Documents for this credential -->
                              @if (hasDocuments(cred.publicId)) {
                                <div class="doc-list">
                                  <span class="doc-list-label">{{ 'employeeProfile.documents.attached' | transloco }}</span>
                                  @for (doc of getDocsForCredential(cred.publicId); track doc.publicId) {
                                    <div class="doc-item">
                                      <mat-icon class="doc-icon">{{ getFileIcon(doc.contentType) }}</mat-icon>
                                      <span class="doc-name">{{ doc.originalFilename }}</span>
                                      <span class="doc-size">{{ formatSize(doc.sizeBytes) }}</span>
                                      <span class="doc-by" [matTooltip]="'credentials.reviewDialog.uploadedBy' | transloco: { name: doc.uploadedByName || ('common.unknown' | transloco) }">
                                        · {{ doc.uploadedByName || ('common.unknown' | transloco) }} · {{ doc.createdAt | date:'shortDate' }}
                                      </span>
                                      <button mat-icon-button [matTooltip]="'common.view' | transloco"
                                              (click)="viewDocument(doc); $event.stopPropagation()">
                                        <mat-icon>open_in_new</mat-icon>
                                      </button>
                                      <button mat-icon-button [matTooltip]="'common.download' | transloco"
                                              (click)="downloadDocument(doc); $event.stopPropagation()">
                                        <mat-icon>download</mat-icon>
                                      </button>
                                      <button mat-icon-button [matTooltip]="'common.delete' | transloco" color="warn"
                                              (click)="deleteDocument(doc); $event.stopPropagation()">
                                        <mat-icon>delete</mat-icon>
                                      </button>
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- All credentials, grouped by category -->
                @for (group of credentialsByCategory(); track group.category) {
                <div class="subsection">
                  <h3 class="collapsible" (click)="toggleCategory(group.category)">
                    <mat-icon>{{ categoryIcon(group.category) }}</mat-icon>
                    {{ categoryLabel(group.category) }}
                    <span class="cat-count">{{ group.credentials.length }}</span>
                    <mat-icon class="cat-chevron">{{ isCategoryCollapsed(group.category) ? 'expand_more' : 'expand_less' }}</mat-icon>
                  </h3>
                  @if (!isCategoryCollapsed(group.category)) {
                  <div class="credential-list">
                    @for (cred of group.credentials; track cred.publicId) {
                      <div class="credential-card" [class]="'cred-border-' + cred.status.toLowerCase()"
                           (click)="toggleCredential(cred.publicId)">
                        <div class="cred-row">
                          <div class="cred-info">
                            <span class="cred-name">{{ getTypeName(cred.credentialTypePublicId) }}</span>
                            <span class="cred-meta">
                              @if (cred.issuer) { {{ cred.issuer }} &middot; }
                              @if (cred.expirationDate) { {{ 'employeeProfile.credentials.expires' | transloco }}: {{ cred.expirationDate }} }
                            </span>
                          </div>
                          <span class="cred-status" [class]="'cred-' + cred.status.toLowerCase()">
                            {{ 'employeeProfile.credStatus.' + cred.status | transloco }}
                          </span>
                          <mat-icon class="expand-icon">
                            {{ expandedCredential === cred.publicId ? 'expand_less' : 'expand_more' }}
                          </mat-icon>
                        </div>
                        @if (expandedCredential === cred.publicId) {
                          <div class="cred-detail" (click)="$event.stopPropagation()">
                            <div class="detail-grid">
                              <div class="detail-field">
                                <span class="field-label">{{ 'employeeProfile.credentials.issueDate' | transloco }}</span>
                                <span class="field-value">{{ cred.issueDate || ('employeeProfile.na' | transloco) }}</span>
                              </div>
                              <div class="detail-field">
                                <span class="field-label">{{ 'employeeProfile.credentials.expiration' | transloco }}</span>
                                <span class="field-value">{{ cred.expirationDate || ('employeeProfile.credentials.noExpiration' | transloco) }}</span>
                              </div>
                              <div class="detail-field">
                                <span class="field-label">{{ 'employeeProfile.credentials.credentialNumber' | transloco }}</span>
                                <span class="field-value">{{ cred.credentialNumber || ('employeeProfile.na' | transloco) }}</span>
                              </div>
                              <div class="detail-field">
                                <span class="field-label">{{ 'employeeProfile.credentials.issuer' | transloco }}</span>
                                <span class="field-value">{{ cred.issuer || ('employeeProfile.na' | transloco) }}</span>
                              </div>
                            </div>
                            @if (cred.notes) {
                              <p class="cred-notes"><strong>{{ 'common.notes' | transloco }}:</strong> {{ cred.notes }}</p>
                            }
                            @if (cred.reviewNotes) {
                              <p class="cred-notes review"><strong>{{ 'employeeProfile.credentials.reviewNotes' | transloco }}:</strong> {{ cred.reviewNotes }}</p>
                            }
                            <div class="cred-actions">
                              <button mat-stroked-button
                                      (click)="openEditCredential(cred); $event.stopPropagation()">
                                <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
                              </button>
                              @if (cred.status === 'PENDING_REVIEW') {
                                <button mat-raised-button color="primary"
                                        (click)="openCredentialReview(cred); $event.stopPropagation()">
                                  <mat-icon>rate_review</mat-icon> {{ 'employeeProfile.credentials.reviewApproveReject' | transloco }}
                                </button>
                              } @else if (cred.status !== 'SUPERSEDED') {
                                <button mat-stroked-button color="primary"
                                        (click)="reopenCredential(cred); $event.stopPropagation()">
                                  <mat-icon>restart_alt</mat-icon> {{ 'employeeProfile.credentials.reopenForReview' | transloco }}
                                </button>
                              }
                              <button mat-stroked-button color="warn"
                                      (click)="deleteCredential(cred); $event.stopPropagation()">
                                <mat-icon>delete</mat-icon> {{ 'employeeProfile.credentials.deleteCredential' | transloco }}
                              </button>
                            </div>
                            @if (hasDocuments(cred.publicId)) {
                              <div class="doc-list">
                                <span class="doc-list-label">{{ 'employeeProfile.documents.attached' | transloco }}</span>
                                @for (doc of getDocsForCredential(cred.publicId); track doc.publicId) {
                                  <div class="doc-item">
                                    <mat-icon class="doc-icon">{{ getFileIcon(doc.contentType) }}</mat-icon>
                                    <span class="doc-name">{{ doc.originalFilename }}</span>
                                    <span class="doc-size">{{ formatSize(doc.sizeBytes) }}</span>
                                      <span class="doc-by" [matTooltip]="'credentials.reviewDialog.uploadedBy' | transloco: { name: doc.uploadedByName || ('common.unknown' | transloco) }">
                                        · {{ doc.uploadedByName || ('common.unknown' | transloco) }} · {{ doc.createdAt | date:'shortDate' }}
                                      </span>
                                    <button mat-icon-button [matTooltip]="'common.view' | transloco"
                                            (click)="viewDocument(doc); $event.stopPropagation()">
                                      <mat-icon>open_in_new</mat-icon>
                                    </button>
                                    <button mat-icon-button [matTooltip]="'common.download' | transloco"
                                            (click)="downloadDocument(doc); $event.stopPropagation()">
                                      <mat-icon>download</mat-icon>
                                    </button>
                                    <button mat-icon-button [matTooltip]="'common.delete' | transloco" color="warn"
                                            (click)="deleteDocument(doc); $event.stopPropagation()">
                                      <mat-icon>delete</mat-icon>
                                    </button>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                  }
                </div>
                }

                <!-- History: replaced / archived credentials (retained on record) -->
                @if (historyCredentials.length > 0) {
                  <div class="subsection">
                    <h3 class="collapsible" (click)="historyOpen = !historyOpen">
                      <mat-icon>history</mat-icon>
                      {{ 'employeeProfile.credentials.history' | transloco }}
                      <span class="cat-count">{{ historyCredentials.length }}</span>
                      <mat-icon class="cat-chevron">{{ historyOpen ? 'expand_less' : 'expand_more' }}</mat-icon>
                    </h3>
                    @if (historyOpen) {
                      <div class="credential-list">
                        @for (cred of historyCredentials; track cred.publicId) {
                          <div class="credential-card cred-border-superseded">
                            <div class="cred-row">
                              <div class="cred-info">
                                <span class="cred-name">{{ getTypeName(cred.credentialTypePublicId) }}</span>
                                <span class="cred-meta">
                                  @if (cred.issuer) { {{ cred.issuer }} &middot; }
                                  @if (cred.issueDate) { {{ 'employeeProfile.credentials.issued' | transloco }}: {{ cred.issueDate }} }
                                  @if (cred.expirationDate) { &middot; {{ 'employeeProfile.credentials.expired' | transloco }}: {{ cred.expirationDate }} }
                                </span>
                              </div>
                              <span class="cred-status cred-superseded">{{ 'employeeProfile.credStatus.' + cred.status | transloco }}</span>
                            </div>
                            @if (hasDocuments(cred.publicId)) {
                              <div class="doc-list">
                                <span class="doc-list-label">{{ 'employeeProfile.documents.attached' | transloco }}</span>
                                @for (doc of getDocsForCredential(cred.publicId); track doc.publicId) {
                                  <div class="doc-item">
                                    <mat-icon class="doc-icon">{{ getFileIcon(doc.contentType) }}</mat-icon>
                                    <span class="doc-name">{{ doc.originalFilename }}</span>
                                    <span class="doc-size">{{ formatSize(doc.sizeBytes) }}</span>
                                      <span class="doc-by" [matTooltip]="'credentials.reviewDialog.uploadedBy' | transloco: { name: doc.uploadedByName || ('common.unknown' | transloco) }">
                                        · {{ doc.uploadedByName || ('common.unknown' | transloco) }} · {{ doc.createdAt | date:'shortDate' }}
                                      </span>
                                    <button mat-icon-button [matTooltip]="'common.view' | transloco" (click)="viewDocument(doc)">
                                      <mat-icon>open_in_new</mat-icon>
                                    </button>
                                    <button mat-icon-button [matTooltip]="'common.download' | transloco" (click)="downloadDocument(doc)">
                                      <mat-icon>download</mat-icon>
                                    </button>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </mat-tab>

          <!-- TAB 2: Positions & Eligibility -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">work</mat-icon>
              {{ 'employeeProfile.tabs.positions' | transloco }}
            </ng-template>

            <div class="tab-content">
              @if (positions.length === 0) {
                <div class="empty-state">
                  <mat-icon>work_off</mat-icon>
                  <p>{{ 'employeeProfile.positions.empty' | transloco }}</p>
                </div>
              } @else {
                @for (pos of positions; track pos.positionPublicId) {
                  <mat-card class="position-card">
                    <div class="pos-header">
                      <div class="pos-info">
                        <h3>{{ pos.positionName }}</h3>
                        <span class="pos-progress-text">
                          {{ 'employeeProfile.positions.mandatoryMet' | transloco: { met: pos.metMandatory, total: pos.totalMandatory } }}
                        </span>
                      </div>
                      <span class="elig-chip" [class]="'elig-' + pos.status.toLowerCase()">
                        {{ 'employeeProfile.eligStatus.' + pos.status | transloco }}
                      </span>
                    </div>
                    <mat-progress-bar mode="determinate" [value]="pos.percentComplete"
                      [color]="pos.percentComplete === 100 ? 'primary' : 'warn'">
                    </mat-progress-bar>
                    <div class="pos-reqs">
                      @for (req of getMandatoryReqs(pos); track req.credentialTypeCode) {
                        <span class="req-tag" [class.met]="req.met" [class.unmet]="!req.met">
                          <mat-icon>{{ req.met ? 'check_circle' : 'cancel' }}</mat-icon>
                          {{ req.credentialTypeName }}
                        </span>
                      }
                    </div>
                    @if (getOptionalReqs(pos).length > 0) {
                      <div class="optional-label">{{ 'common.optional' | transloco }}</div>
                      <div class="pos-reqs">
                        @for (req of getOptionalReqs(pos); track req.credentialTypeCode) {
                          <span class="req-tag optional" [class.met]="req.met">
                            <mat-icon>{{ req.met ? 'check_circle' : 'remove_circle_outline' }}</mat-icon>
                            {{ req.credentialTypeName }}
                          </span>
                        }
                      </div>
                    }
                  </mat-card>
                }
              }
            </div>
          </mat-tab>

          <!-- TAB 3: Documents -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">folder</mat-icon>
              {{ 'employeeProfile.tabs.documents' | transloco }}
            </ng-template>

            <div class="tab-content">
              @if (allDocuments.length === 0) {
                <div class="empty-state">
                  <mat-icon>folder_open</mat-icon>
                  <p>{{ 'employeeProfile.documents.empty' | transloco }}</p>
                </div>
              } @else {
                @for (group of documentGroups(); track group.typeName) {
                  <div class="doc-type-group">
                    <h3 class="doc-type-head">
                      <mat-icon>folder</mat-icon>
                      {{ group.typeName }}
                    </h3>
                    @for (yg of group.years; track yg.year) {
                      <div class="doc-year-group">
                        <span class="doc-year-label">{{ yg.year }}</span>
                        <div class="doc-grid">
                          @for (doc of yg.docs; track doc.publicId) {
                            <div class="doc-card">
                              <mat-icon class="doc-card-icon">{{ getFileIcon(doc.contentType) }}</mat-icon>
                              <div class="doc-card-info">
                                <span class="doc-card-name" [matTooltip]="doc.originalFilename">
                                  {{ doc.originalFilename }}
                                </span>
                                <span class="doc-card-meta">
                                  {{ formatSize(doc.sizeBytes) }} &middot; {{ doc.createdAt | date:'mediumDate' }}
                                </span>
                              </div>
                              <button mat-icon-button [matTooltip]="'common.view' | transloco" (click)="viewDocument(doc)">
                                <mat-icon>open_in_new</mat-icon>
                              </button>
                              <button mat-icon-button [matTooltip]="'common.download' | transloco" (click)="downloadDocument(doc)">
                                <mat-icon>download</mat-icon>
                              </button>
                              <button mat-icon-button [matTooltip]="'common.delete' | transloco" color="warn" (click)="deleteDocument(doc)">
                                <mat-icon>delete</mat-icon>
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </mat-tab>

          <!-- TAB 4: Contracts -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">description</mat-icon>
              {{ 'employeeProfile.tabs.contracts' | transloco }}
              @if (pendingContractsCount > 0) {
                <span class="tab-badge" style="background: #f57c00;">{{ pendingContractsCount }}</span>
              }
            </ng-template>

            <div class="tab-content">
              <div class="contracts-header">
                <button mat-raised-button color="primary" (click)="generateContract()">
                  <mat-icon>add</mat-icon> {{ 'employeeProfile.contracts.generate' | transloco }}
                </button>
              </div>

              @if (contracts.length === 0) {
                <div class="empty-state">
                  <mat-icon>description</mat-icon>
                  <p>{{ 'employeeProfile.contracts.empty' | transloco }}</p>
                </div>
              } @else {
                @for (yg of contractGroups(); track yg.year) {
                <div class="doc-year-group">
                  <span class="doc-year-label">{{ yg.year }}</span>
                  <div class="credential-list">
                  @for (c of yg.contracts; track c.publicId) {
                    <div class="credential-card" [class]="'cred-border-' + c.status.toLowerCase()">
                      <div class="cred-row">
                        <div class="cred-info">
                          <span class="cred-name">{{ c.title }}</span>
                          <span class="cred-meta">
                            @if (c.effectiveDate) { {{ 'employeeProfile.contracts.effective' | transloco }}: {{ c.effectiveDate | date:'mediumDate' }} &middot; }
                            {{ 'employeeProfile.contracts.created' | transloco }}: {{ c.createdAt | date:'mediumDate' }}
                            @if (c.signedAt) { &middot; {{ 'employeeProfile.contracts.fullySigned' | transloco }}: {{ c.signedAt | date:'mediumDate' }} }
                          </span>
                          @if (c.status === 'SENT' || c.status === 'SIGNED') {
                            <span class="sign-progress">
                              <span class="sign-party" [class.signed]="c.employeeSigned">
                                <mat-icon>{{ c.employeeSigned ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> {{ 'employeeProfile.contracts.contractor' | transloco }}
                              </span>
                              <span class="sign-party" [class.signed]="c.employerSigned">
                                <mat-icon>{{ c.employerSigned ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon> {{ 'employeeProfile.contracts.agency' | transloco }}
                              </span>
                            </span>
                          }
                        </div>
                        <span class="cred-status" [class]="'contract-' + c.status.toLowerCase()">
                          <mat-icon class="status-icon">{{ getContractStatusIcon(c.status) }}</mat-icon>
                          {{ 'employeeProfile.contractStatus.' + c.status | transloco }}
                        </span>
                        <div class="contract-actions">
                          <button mat-icon-button [matTooltip]="'common.view' | transloco" (click)="viewContractPdf(c)">
                            <mat-icon>open_in_new</mat-icon>
                          </button>
                          <button mat-icon-button [matTooltip]="'employeeProfile.contracts.downloadPdf' | transloco" (click)="downloadContractPdf(c)">
                            <mat-icon>download</mat-icon>
                          </button>
                          @if (c.status === 'SENT' && !c.employerSigned) {
                            <button mat-icon-button [matTooltip]="'employeeProfile.contracts.signAsAgency' | transloco" color="primary" (click)="signAsEmployer(c)">
                              <mat-icon>draw</mat-icon>
                            </button>
                          }
                          @if (c.status === 'DRAFT') {
                            <button mat-icon-button [matTooltip]="'employeeProfile.contracts.sendToEmployee' | transloco" (click)="sendContract(c)" color="primary">
                              <mat-icon>send</mat-icon>
                            </button>
                          }
                          @if (c.status === 'DRAFT' || c.status === 'SENT') {
                            <button mat-icon-button [matTooltip]="'employeeProfile.contracts.revoke' | transloco" color="warn" (click)="revokeContract(c)">
                              <mat-icon>cancel</mat-icon>
                            </button>
                          }
                          @if (c.status === 'DRAFT') {
                            <button mat-icon-button [matTooltip]="'common.delete' | transloco" color="warn" (click)="deleteContract(c)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
                </div>
                }
              }
            </div>
          </mat-tab>
        </mat-tab-group>

      </div>
    } @else {
      <div class="error-state">
        <mat-icon>error_outline</mat-icon>
        <h2>{{ 'employeeProfile.notFound' | transloco }}</h2>
        <button mat-raised-button color="primary" (click)="goBack()">{{ 'employeeProfile.backToEmployees' | transloco }}</button>
      </div>
    }
  `,
  styles: [`
    .loading-container, .error-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 64px; color: #666;
    }
    .error-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: #d32f2f; margin-bottom: 16px; }
    .profile-page { max-width: 960px; margin: 0 auto; }

    /* Top bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .top-bar-actions { display: flex; gap: 8px; }

    /* Header card */
    .header-card { margin-bottom: 20px; }
    .header-content { display: flex; gap: 20px; padding: 8px; }
    .avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #1565c0, #0d47a1);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .avatar mat-icon { font-size: 36px; width: 36px; height: 36px; color: white; }
    .avatar-applicant { background: linear-gradient(135deg, #1565c0, #42a5f5); }
    .avatar-onboarding { background: linear-gradient(135deg, #7b1fa2, #ab47bc); }
    .avatar-active { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
    .avatar-inactive { background: linear-gradient(135deg, #e65100, #ff9800); }
    .avatar-terminated { background: linear-gradient(135deg, #616161, #9e9e9e); }
    .header-info { flex: 1; min-width: 0; }
    .header-info h1 { margin: 0 0 6px; font-size: 22px; color: #1a237e; }
    .header-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .meta-chip {
      padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
    }
    .meta-chip.code { background: #f0f0f0; color: #555; }
    .status-active { background: #e8f5e9; color: #2e7d32; }
    .status-applicant { background: #e3f2fd; color: #1565c0; }
    .status-onboarding { background: #f3e5f5; color: #7b1fa2; }
    .status-inactive { background: #fff3e0; color: #e65100; }
    .status-terminated { background: #eeeeee; color: #616161; }
    .meta-chip.account-issue {
      background: #ffebee;
      color: #c62828;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-chip.account-issue mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .header-details { display: flex; flex-wrap: wrap; gap: 16px; }
    .detail-item {
      display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555;
    }
    .detail-item mat-icon { font-size: 16px; width: 16px; height: 16px; color: #999; }
    .notes { font-size: 13px; color: #666; margin: 8px 0 0; font-style: italic; }

    /* Stats row */
    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 12px; margin-bottom: 20px;
    }
    .stat-card {
      background: white; border-radius: 10px; padding: 16px;
      text-align: center; position: relative; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border-left: 3px solid #1565c0;
    }
    .stat-card.warn { border-left-color: #f57c00; }
    .stat-card.alert { border-left-color: #d32f2f; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1a237e; }
    .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-bg-icon {
      position: absolute; right: 8px; bottom: 4px;
      font-size: 40px; width: 40px; height: 40px; color: rgba(0,0,0,0.04);
    }

    /* Tabs */
    .tab-icon { margin-right: 6px; font-size: 18px; width: 18px; height: 18px; }
    .tab-badge {
      margin-left: 6px; background: #d32f2f; color: white;
      border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 600;
    }
    .tab-content { padding: 16px 0; }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 48px 16px; color: #999;
    }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }

    /* Credentials */
    .tab-actions { display: flex; justify-content: flex-end; padding: 8px 0 16px; }
    .cred-actions { margin: 12px 0; display: flex; gap: 8px; flex-wrap: wrap; }
    .subsection { margin-bottom: 24px; }
    .subsection h3 {
      display: flex; align-items: center; gap: 6px;
      font-size: 15px; font-weight: 600; color: #333; margin: 0 0 10px;
    }
    .subsection h3 mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .subsection.attention h3 { color: #e65100; }
    .cat-count {
      margin-left: 6px;
      padding: 1px 8px;
      border-radius: 10px;
      background: #e0e0e0;
      color: #555;
      font-size: 11px;
      font-weight: 500;
    }
    .subsection.attention h3 mat-icon { color: #e65100; }
    .subsection h3.collapsible { cursor: pointer; user-select: none; }
    .cat-chevron { margin-left: auto; color: #999; }
    .cred-border-superseded { border-left: 3px solid #9e9e9e; opacity: 0.85; }
    .cred-superseded { color: #757575; font-size: 11px; font-weight: 600; }
    .sign-progress { display: flex; gap: 12px; margin-top: 4px; font-size: 11px; color: #999; }
    .sign-progress .sign-party { display: inline-flex; align-items: center; gap: 3px; }
    .sign-progress .sign-party mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .sign-progress .sign-party.signed { color: #2e7d32; }
    .credential-list { display: flex; flex-direction: column; gap: 6px; }
    .credential-card {
      border: 1px solid #e8e8e8; border-radius: 8px; cursor: pointer;
      transition: box-shadow 0.15s; border-left: 3px solid #eee;
    }
    .credential-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
    .cred-border-valid { border-left-color: #4caf50; }
    .cred-border-expiring_soon { border-left-color: #ff9800; }
    .cred-border-critical { border-left-color: #f44336; }
    .cred-border-expired { border-left-color: #9e9e9e; }
    .cred-border-pending_review { border-left-color: #2196f3; }
    .cred-row {
      display: flex; align-items: center; padding: 10px 12px; gap: 10px;
    }
    .cred-info { flex: 1; min-width: 0; }
    .cred-name { font-weight: 500; font-size: 14px; display: block; }
    .cred-meta { font-size: 12px; color: #888; display: block; margin-top: 2px; }
    .cred-status {
      padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; white-space: nowrap;
    }
    .cred-valid { background: #e8f5e9; color: #2e7d32; }
    .cred-expiring_soon { background: #fff3e0; color: #f57c00; }
    .cred-critical { background: #fbe9e7; color: #d32f2f; }
    .cred-expired { background: #ffebee; color: #b71c1c; }
    .cred-pending_review { background: #e3f2fd; color: #1565c0; }
    .cred-superseded { background: #f5f5f5; color: #9e9e9e; }
    .expand-icon { color: #bbb; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .cred-detail {
      padding: 10px 16px 14px; background: #fafafa; border-top: 1px solid #eee;
    }
    .detail-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;
    }
    .field-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.3px; display: block; }
    .field-value { font-size: 13px; font-weight: 500; color: #333; }
    .cred-notes { font-size: 12px; color: #666; margin: 6px 0; }
    .cred-notes.review { color: #1565c0; }

    /* Document items (inside credential) */
    .doc-list { margin-top: 8px; }
    .doc-list-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.3px; }
    .doc-item {
      display: flex; align-items: center; gap: 8px; padding: 4px 0;
    }
    .doc-icon { font-size: 18px; width: 18px; height: 18px; color: #666; }
    .doc-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-size { font-size: 11px; color: #999; }
    .doc-by { font-size: 11px; color: #9aa4b2; white-space: nowrap; flex: 0 0 auto; }
    @media (max-width: 600px) { .doc-by { display: none; } }

    /* Positions */
    .position-card { margin-bottom: 12px; padding: 16px !important; }
    .pos-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .pos-info h3 { margin: 0; font-size: 15px; color: #333; }
    .pos-progress-text { font-size: 12px; color: #999; }
    .elig-chip {
      padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap;
    }
    .elig-eligible { background: #e8f5e9; color: #2e7d32; }
    .elig-partially_eligible { background: #fff3e0; color: #e65100; }
    .elig-not_eligible { background: #ffebee; color: #c62828; }
    .pos-reqs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .req-tag {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 10px; border-radius: 12px; font-size: 12px;
    }
    .req-tag mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .req-tag.met { background: #e8f5e9; color: #2e7d32; }
    .req-tag.unmet { background: #ffebee; color: #c62828; }
    .req-tag.optional { background: #f5f5f5; color: #888; border: 1px dashed #ccc; }
    .req-tag.optional.met { background: #e8f5e9; color: #2e7d32; border: 1px dashed #4caf50; }
    .optional-label {
      font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px;
      margin-top: 8px; margin-bottom: 4px;
    }

    /* Documents grid */
    .doc-type-group { margin-bottom: 20px; }
    .doc-type-head {
      display: flex; align-items: center; gap: 6px;
      font-size: 15px; font-weight: 600; color: #333; margin: 0 0 8px;
    }
    .doc-type-head mat-icon { font-size: 18px; width: 18px; height: 18px; color: #1565c0; }
    .doc-year-group { margin: 0 0 10px 6px; }
    .doc-year-label {
      display: inline-block; font-size: 12px; font-weight: 600; color: #607d8b;
      background: #eceff1; padding: 1px 8px; border-radius: 8px; margin-bottom: 6px;
    }
    .doc-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;
    }
    .doc-card {
      display: flex; align-items: center; gap: 10px;
      padding: 12px; border-radius: 8px; background: white;
      border: 1px solid #e8e8e8; transition: box-shadow 0.15s;
    }
    .doc-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
    .doc-card-icon { font-size: 28px; width: 28px; height: 28px; color: #1565c0; flex-shrink: 0; }
    .doc-card-info { flex: 1; min-width: 0; }
    .doc-card-name {
      font-size: 13px; font-weight: 500; display: block;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .doc-card-meta { font-size: 11px; color: #999; }
    .doc-card-cred { font-size: 11px; color: #1565c0; display: block; }

    /* Account card */
    .account-card {
      margin-bottom: 20px; border-left: 3px solid #4caf50;
    }
    .account-card.account-inactive { border-left-color: #ff9800; }
    .account-card.account-locked { border-left-color: #d32f2f; }
    .account-card.account-none { border-left-color: #bdbdbd; }
    .account-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px; gap: 16px; flex-wrap: wrap;
    }
    .account-info {
      display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;
    }
    .account-icon {
      font-size: 28px; width: 28px; height: 28px;
    }
    .account-icon.active { color: #4caf50; }
    .account-icon.inactive { color: #ff9800; }
    .account-icon.locked { color: #d32f2f; }
    .account-status-label {
      font-weight: 600; font-size: 14px; display: block; color: #333;
    }
    .account-meta {
      font-size: 12px; color: #888; display: block; margin-top: 2px;
    }
    .account-actions {
      display: flex; gap: 8px; flex-shrink: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-content { flex-direction: column; align-items: center; text-align: center; }
      .header-details { justify-content: center; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .detail-grid { grid-template-columns: 1fr; }
      .doc-grid { grid-template-columns: 1fr; }
      .pos-header { flex-direction: column; gap: 6px; }
      .account-row { flex-direction: column; align-items: flex-start; }
      .account-actions { width: 100%; }
      .account-actions button { flex: 1; }
    }
    /* Contract styles */
    .contracts-header { margin-bottom: 16px; }
    .contract-actions { display: flex; gap: 2px; }
    .status-icon { font-size: 13px !important; width: 13px !important; height: 13px !important; vertical-align: middle; margin-right: 2px; }
    .contract-draft { background: #e3f2fd; color: #1565c0; }
    .contract-sent { background: #fff3e0; color: #e65100; }
    .contract-signed { background: #e8f5e9; color: #2e7d32; }
    .contract-revoked { background: #eeeeee; color: #616161; }
    .contract-expired { background: #ffebee; color: #c62828; }
    .cred-border-draft { border-left-color: #2196f3; }
    .cred-border-sent { border-left-color: #ff9800; }
    .cred-border-signed { border-left-color: #4caf50; }
    .cred-border-revoked { border-left-color: #9e9e9e; }

    @media (max-width: 480px) {
      .profile-page { margin: 0; }
      .stats-row { gap: 8px; }
      .stat-value { font-size: 22px; }
      .top-bar { flex-direction: column; gap: 8px; }
      .header-info h1 { font-size: 18px; }
      .cred-row { flex-wrap: wrap; }
    }
  `]
})
export class EmployeeProfileComponent implements OnInit {
  employee: Employee | null = null;
  credentials: Credential[] = [];
  positions: EmployeeEligibilityResponse[] = [];
  allDocuments: DocumentResponse[] = [];
  contracts: Contract[] = [];
  credDocMap: Record<string, DocumentResponse[]> = {};
  credTypeNames: Record<string, string> = {};
  credentialTypes: CredentialType[] = [];
  account: EmployeeAccount | null = null;
  accountNotFound = false;
  loading = true;
  activeTab = 0;
  expandedCredential: string | null = null;
  collapsedCategories = new Set<string>();
  historyOpen = false;

  get validCount(): number {
    return this.credentials.filter(c => c.status === 'VALID').length;
  }
  get expiredCount(): number {
    return this.credentials.filter(c => c.status === 'EXPIRED' || c.status === 'CRITICAL').length;
  }
  get expiringSoonCount(): number {
    return this.credentials.filter(c => c.status === 'EXPIRING_SOON').length;
  }
  get pendingCount(): number {
    return this.credentials.filter(c => c.status === 'PENDING_REVIEW').length;
  }
  get totalDocuments(): number {
    return this.allDocuments.length;
  }
  get pendingContractsCount(): number {
    return this.contracts.filter(c => c.status === 'SENT').length;
  }
  get signedContractsCount(): number {
    return this.contracts.filter(c => c.status === 'SIGNED').length;
  }
  get attentionCredentials(): Credential[] {
    return this.credentials.filter(c => this.isAttention(c));
  }
  private isAttention(c: Credential): boolean {
    return c.status === 'EXPIRED' || c.status === 'CRITICAL' || c.status === 'PENDING_REVIEW';
  }
  /** Replaced/archived credentials kept on record (most recent expiry first). */
  get historyCredentials(): Credential[] {
    return this.credentials
      .filter(c => c.status === 'SUPERSEDED')
      .sort((a, b) =>
        (b.expirationDate || b.issueDate || '').localeCompare(a.expirationDate || a.issueDate || ''));
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private credentialService: CredentialService,
    private positionService: PositionService,
    private documentService: DocumentService,
    private contractService: ContractService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    const publicId = this.route.snapshot.paramMap.get('publicId');
    if (publicId) {
      this.loadEmployee(publicId);
    }
  }

  loadEmployee(publicId: string): void {
    this.loading = true;
    const agencyId = this.authService.agencyPublicId();

    forkJoin({
      employee: this.employeeService.getById(publicId),
      credentials: this.credentialService.getByEmployee(publicId, 0, 500),
      positions: this.positionService.getEmployeeEligibility(publicId),
      credTypes: this.credentialService.getTypes(agencyId)
    }).subscribe({
      next: ({ employee, credentials, positions, credTypes }) => {
        this.employee = employee;
        this.credentials = credentials.content;
        this.positions = positions;
        this.credentialTypes = credTypes;

        // Build credential type name map
        for (const ct of credTypes) {
          this.credTypeNames[ct.publicId] = ct.name;
        }

        // Credential categories load collapsed by default (click a header to expand).
        this.collapsedCategories = new Set(this.credentialsByCategory().map(g => g.category));

        // Load documents for each credential
        this.loadDocuments();
        this.loadContracts(publicId);
        this.loadAccount(publicId);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.employee = null;
      }
    });
  }

  private loadDocuments(): void {
    if (this.credentials.length === 0) return;

    const docRequests: Record<string, ReturnType<typeof this.documentService.getByCredential>> = {};
    for (const cred of this.credentials) {
      docRequests[cred.publicId] = this.documentService.getByCredential(cred.publicId);
    }

    forkJoin(docRequests).subscribe({
      next: (results) => {
        const allDocs: DocumentResponse[] = [];
        for (const [credId, docs] of Object.entries(results)) {
          this.credDocMap[credId] = docs;
          allDocs.push(...docs);
        }
        this.allDocuments = allDocs;
      }
    });
  }

  hasDocuments(credentialPublicId: string): boolean {
    const docs = this.credDocMap[credentialPublicId];
    return !!docs && docs.length > 0;
  }

  getDocsForCredential(credentialPublicId: string): DocumentResponse[] {
    return this.credDocMap[credentialPublicId] || [];
  }

  getTypeName(publicId: string): string {
    return this.credTypeNames[publicId] || publicId.substring(0, 8) + '...';
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getMandatoryReqs(pos: EmployeeEligibilityResponse): RequirementStatusResponse[] {
    return pos.requirements.filter(r => r.isMandatory);
  }

  getOptionalReqs(pos: EmployeeEligibilityResponse): RequirementStatusResponse[] {
    return pos.requirements.filter(r => !r.isMandatory);
  }

  formatEligStatus(status: string): string {
    switch (status) {
      case 'ELIGIBLE': return 'Ready';
      case 'PARTIALLY_ELIGIBLE': return 'At Risk';
      case 'NOT_ELIGIBLE': return 'Blocked';
      default: return status;
    }
  }

  categoryLabel(cat: CredentialCategory): string {
    return CREDENTIAL_CATEGORY_LABELS[cat] ?? cat;
  }

  categoryIcon(cat: CredentialCategory): string {
    return CREDENTIAL_CATEGORY_ICONS[cat] ?? 'folder';
  }

  /** Returns credentials grouped by category, in canonical display order. */
  credentialsByCategory(): { category: CredentialCategory; credentials: Credential[] }[] {
    const byCat = new Map<CredentialCategory, Credential[]>();
    for (const cred of this.credentials) {
      // Attention creds show in "Needs Attention"; superseded creds show in
      // "History" — skip both so the active category lists stay clean.
      if (this.isAttention(cred) || cred.status === 'SUPERSEDED') continue;
      const type = this.credentialTypes.find(t => t.publicId === cred.credentialTypePublicId);
      const cat = type?.category ?? 'OTHER';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(cred);
    }
    return CREDENTIAL_CATEGORY_ORDER
      .filter(cat => byCat.has(cat))
      .map(category => ({ category, credentials: byCat.get(category)! }));
  }

  toggleCategory(cat: string): void {
    if (this.collapsedCategories.has(cat)) this.collapsedCategories.delete(cat);
    else this.collapsedCategories.add(cat);
  }

  isCategoryCollapsed(cat: string): boolean {
    return this.collapsedCategories.has(cat);
  }

  /**
   * Documents grouped by credential type, then by year (newest first).
   * Year comes from the credential's issue date (the "year emitted"), falling
   * back to the document upload date. Documents not tied to a credential are
   * grouped under "Other documents".
   */
  documentGroups(): { typeName: string; years: { year: string; docs: DocumentResponse[] }[] }[] {
    const byType = new Map<string, Map<string, DocumentResponse[]>>();
    for (const doc of this.allDocuments) {
      const cred = this.credentials.find(c => c.publicId === doc.credentialPublicId);
      const typeName = cred ? this.getTypeName(cred.credentialTypePublicId) : this.transloco.translate('employeeProfile.documents.otherDocuments');
      const year = this.docYear(doc, cred);
      if (!byType.has(typeName)) byType.set(typeName, new Map());
      const yearMap = byType.get(typeName)!;
      if (!yearMap.has(year)) yearMap.set(year, []);
      yearMap.get(year)!.push(doc);
    }
    return [...byType.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([typeName, yearMap]) => ({
        typeName,
        years: [...yearMap.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([year, docs]) => ({
            year,
            docs: [...docs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          }))
      }));
  }

  private docYear(doc: DocumentResponse, cred?: Credential): string {
    const src = cred?.issueDate || cred?.expirationDate || doc.createdAt;
    const y = src ? new Date(src).getFullYear() : NaN;
    return Number.isNaN(y) ? this.transloco.translate('employeeProfile.documents.undated') : String(y);
  }

  /** Contracts grouped by year of effective date (fallback: signed/created), newest first. */
  contractGroups(): { year: string; contracts: Contract[] }[] {
    const byYear = new Map<string, Contract[]>();
    for (const c of this.contracts) {
      const src = c.effectiveDate || c.signedAt || c.createdAt;
      const y = src ? new Date(src).getFullYear() : NaN;
      const year = Number.isNaN(y) ? this.transloco.translate('employeeProfile.documents.undated') : String(y);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(c);
    }
    return [...byYear.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, contracts]) => ({ year, contracts }));
  }

  openAddCredential(): void {
    if (!this.employee) return;
    const dialogRef = this.dialog.open(CredentialFormDialogComponent, {
      width: '550px', maxWidth: '95vw',
      data: {
        agencyPublicId: this.authService.agencyPublicId(),
        credentialTypes: this.credentialTypes,
        employees: [this.employee]
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadEmployee(this.employee!.publicId);
    });
  }

  openEditCredential(credential: Credential): void {
    if (!this.employee) return;
    const dialogRef = this.dialog.open(CredentialFormDialogComponent, {
      width: '550px', maxWidth: '95vw',
      data: {
        credential,
        agencyPublicId: this.authService.agencyPublicId(),
        credentialTypes: this.credentialTypes,
        employees: [this.employee]
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadEmployee(this.employee!.publicId);
    });
  }

  reopenCredential(credential: Credential): void {
    this.credentialService.reopenReview(credential.publicId).subscribe({
      next: () => {
        this.snackBar.open(this.transloco.translate('employeeProfile.credentials.reopenedOk'), 'OK', { duration: 3000 });
        if (this.employee) this.loadEmployee(this.employee.publicId);
      },
      error: (err) => this.snackBar.open(err.error?.message || this.transloco.translate('employeeProfile.credentials.reopenError'), 'OK', { duration: 5000 })
    });
  }

  deleteCredential(credential: Credential): void {
    const data: ConfirmDialogData = {
      title: this.transloco.translate('employeeProfile.credentials.deleteTitle'),
      message: this.transloco.translate('employeeProfile.credentials.deleteMessage', {
        type: this.getTypeName(credential.credentialTypePublicId)
      }),
      confirmText: this.transloco.translate('common.delete'),
      color: 'warn',
      icon: 'delete'
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '420px', maxWidth: '95vw', data });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.credentialService.delete(credential.publicId).subscribe({
        next: () => {
          this.snackBar.open(this.transloco.translate('employeeProfile.credentials.deleteOk'), 'OK', { duration: 3000 });
          if (this.employee) this.loadEmployee(this.employee.publicId);
        },
        error: (err) => this.snackBar.open(
          err.error?.message || this.transloco.translate('employeeProfile.credentials.deleteError'),
          'OK', { duration: 5000 })
      });
    });
  }

  openCredentialReview(credential: Credential): void {
    const docs = this.getDocsForCredential(credential.publicId);
    const dialogRef = this.dialog.open(CredentialReviewDialogComponent, {
      width: '700px', maxWidth: '95vw',
      data: {
        credential,
        documents: docs,
        employeeName: this.employee ? `${this.employee.lastName}, ${this.employee.firstName}` : '',
        typeName: this.getTypeName(credential.credentialTypePublicId)
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && this.employee) this.loadEmployee(this.employee.publicId);
    });
  }

  formatFullAddress(addr: NonNullable<Employee['address']>): string {
    const parts = [
      addr.addressLine1,
      addr.addressLine2,
      `${addr.city}, ${addr.state} ${addr.postalCode}`,
      addr.country
    ].filter(Boolean);
    return parts.join(' · ');
  }

  toggleCredential(publicId: string): void {
    this.expandedCredential = this.expandedCredential === publicId ? null : publicId;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  getFileIcon(contentType: string): string {
    if (contentType?.startsWith('image/')) return 'image';
    if (contentType?.includes('pdf')) return 'picture_as_pdf';
    return 'insert_drive_file';
  }

  downloadDocument(doc: DocumentResponse): void {
    this.documentService.downloadAsBlob(doc.publicId).subscribe({
      next: (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalFilename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open(this.transloco.translate('employeeProfile.documents.downloadError'), this.transloco.translate('common.close'), { duration: 3000 })
    });
  }

  /** Opens the document inline in a new tab (view without forcing a download). */
  viewDocument(doc: DocumentResponse): void {
    this.documentService.downloadAsBlob(doc.publicId).subscribe({
      next: (url) => window.open(url, '_blank'),
      error: () => this.snackBar.open(this.transloco.translate('employeeProfile.documents.openError'), this.transloco.translate('common.close'), { duration: 3000 })
    });
  }

  deleteDocument(doc: DocumentResponse): void {
    const data: ConfirmDialogData = {
      title: this.transloco.translate('employeeProfile.documents.deleteTitle'),
      message: this.transloco.translate('employeeProfile.documents.deleteMessage', { name: doc.originalFilename }),
      confirmText: this.transloco.translate('common.delete'),
      color: 'warn',
      icon: 'delete'
    };
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '400px', maxWidth: '95vw', data });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.documentService.delete(doc.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('employeeProfile.documents.deleteOk'), 'OK', { duration: 3000 });
            this.loadDocuments();
          },
          error: () => this.snackBar.open(this.transloco.translate('employeeProfile.documents.deleteError'), 'OK', { duration: 4000 })
        });
      }
    });
  }

  editEmployee(): void {
    if (!this.employee) return;
    const ref = this.dialog.open(EmployeeFormDialogComponent, {
      width: '500px', maxWidth: '95vw',
      data: { employee: this.employee, agencyPublicId: this.authService.agencyPublicId() }
    });
    ref.afterClosed().subscribe(result => {
      if (result && this.employee) {
        this.loadEmployee(this.employee.publicId);
      }
    });
  }

  private loadAccount(employeePublicId: string): void {
    this.employeeService.getAccount(employeePublicId).subscribe({
      next: (acc) => {
        if (acc.userPublicId) {
          this.account = acc;
          this.accountNotFound = false;
        } else {
          this.account = null;
          this.accountNotFound = true;
        }
      },
      error: () => {
        this.account = null;
        this.accountNotFound = true;
      }
    });
  }

  toggleAccount(active: boolean): void {
    if (!this.employee || !this.account) return;
    const action = active ? 'activate' : 'deactivate';
    const data: ConfirmDialogData = active
      ? {
          title: this.transloco.translate('employeeProfile.account.activateTitle'),
          message: this.transloco.translate('employeeProfile.account.activateMessage', { firstName: this.employee.firstName, lastName: this.employee.lastName }),
          confirmText: this.transloco.translate('employeeProfile.account.activate'),
          icon: 'check_circle',
          color: 'primary'
        }
      : {
          title: this.transloco.translate('employeeProfile.account.deactivateTitle'),
          message: this.transloco.translate('employeeProfile.account.deactivateMessage', { firstName: this.employee.firstName, lastName: this.employee.lastName }),
          confirmText: this.transloco.translate('employeeProfile.account.deactivate'),
          icon: 'block',
          color: 'warn'
        };

    this.dialog.open(ConfirmDialogComponent, { width: '420px', maxWidth: '95vw', data })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed || !this.employee) return;
        this.employeeService.setAccountActive(this.employee.publicId, active).subscribe({
          next: (acc) => {
            this.account = acc;
            this.snackBar.open(
              active
                ? this.transloco.translate('employeeProfile.account.activatedOk')
                : this.transloco.translate('employeeProfile.account.deactivatedOk'),
              this.transloco.translate('common.close'),
              { duration: 3000 }
            );
          },
          error: () => this.snackBar.open(
            active
              ? this.transloco.translate('employeeProfile.account.activateError')
              : this.transloco.translate('employeeProfile.account.deactivateError'),
            this.transloco.translate('common.close'),
            { duration: 3000 }
          )
        });
      });
  }

  resetEmployeePassword(): void {
    if (!this.employee) return;
    const data: ConfirmDialogData = {
      title: this.transloco.translate('employeeProfile.account.resetPasswordTitle'),
      message: this.transloco.translate('employeeProfile.account.resetPasswordMessage', { firstName: this.employee.firstName, lastName: this.employee.lastName }),
      confirmText: this.transloco.translate('employeeProfile.account.resetPasswordConfirm'),
      icon: 'lock_reset',
      color: 'warn'
    };

    this.dialog.open(ConfirmDialogComponent, { width: '420px', maxWidth: '95vw', data })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed || !this.employee) return;
        this.employeeService.resetPassword(this.employee.publicId).subscribe({
          next: () => {
            this.snackBar.open(
              this.transloco.translate('employeeProfile.account.resetPasswordOk'),
              this.transloco.translate('common.close'),
              { duration: 5000 }
            );
          },
          error: () => this.snackBar.open(this.transloco.translate('employeeProfile.account.resetPasswordError'), this.transloco.translate('common.close'), { duration: 3000 })
        });
      });
  }

  setEmployeePassword(): void {
    if (!this.employee) return;
    this.dialog.open(SetPasswordDialogComponent, {
      width: '420px', maxWidth: '95vw',
      data: { firstName: this.employee.firstName, lastName: this.employee.lastName }
    }).afterClosed().subscribe((newPassword: string | undefined) => {
      if (!newPassword || !this.employee) return;
      this.employeeService.setPassword(this.employee.publicId, newPassword).subscribe({
        next: () => this.snackBar.open(
          this.transloco.translate('employeeProfile.account.setPasswordOk'),
          this.transloco.translate('common.close'), { duration: 5000 }),
        error: (err) => this.snackBar.open(
          err?.error?.message ?? this.transloco.translate('employeeProfile.account.setPasswordError'),
          this.transloco.translate('common.close'), { duration: 4000 })
      });
    });
  }

  private loadContracts(employeePublicId: string): void {
    this.contractService.getByEmployee(employeePublicId, 0, 500).subscribe({
      next: page => this.contracts = page.content,
      error: () => {}
    });
  }

  /** Agency-side (employer) e-signature, using the same canvas dialog as the employee. */
  signAsEmployer(contract: Contract): void {
    const ref = this.dialog.open(ContractSignDialogComponent, {
      width: '700px', maxWidth: '95vw',
      data: { contract }
    });
    ref.afterClosed().subscribe(result => {
      if (result && this.employee) this.loadContracts(this.employee.publicId);
    });
  }

  generateContract(): void {
    if (!this.employee) return;
    const ref = this.dialog.open(ContractGenerateDialogComponent, {
      width: '700px', maxWidth: '95vw',
      data: {
        employeePublicId: this.employee.publicId,
        employeeName: this.employee.lastName + ', ' + this.employee.firstName,
        agencyPublicId: this.authService.agencyPublicId()
      }
    });
    ref.afterClosed().subscribe(result => {
      if (result && this.employee) this.loadContracts(this.employee.publicId);
    });
  }

  sendContract(contract: Contract): void {
    this.contractService.send(contract.publicId).subscribe({
      next: () => {
        this.snackBar.open(this.transloco.translate('employeeProfile.contracts.sentOk'), 'OK', { duration: 3000 });
        if (this.employee) this.loadContracts(this.employee.publicId);
      },
      error: () => this.snackBar.open(this.transloco.translate('employeeProfile.contracts.sendError'), 'OK', { duration: 3000 })
    });
  }

  revokeContract(contract: Contract): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px', maxWidth: '95vw',
      data: {
        title: this.transloco.translate('employeeProfile.contracts.revokeTitle'),
        message: this.transloco.translate('employeeProfile.contracts.revokeMessage', { title: contract.title }),
        confirmText: this.transloco.translate('employeeProfile.contracts.revoke'),
        icon: 'cancel',
        color: 'warn'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.contractService.revoke(contract.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('employeeProfile.contracts.revokedOk'), 'OK', { duration: 3000 });
            if (this.employee) this.loadContracts(this.employee.publicId);
          },
          error: () => this.snackBar.open(this.transloco.translate('employeeProfile.contracts.revokeError'), 'OK', { duration: 3000 })
        });
      }
    });
  }

  deleteContract(contract: Contract): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px', maxWidth: '95vw',
      data: {
        title: this.transloco.translate('employeeProfile.contracts.deleteTitle'),
        message: this.transloco.translate('employeeProfile.contracts.deleteMessage', { title: contract.title }),
        confirmText: this.transloco.translate('common.delete'),
        icon: 'delete'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.contractService.delete(contract.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('employeeProfile.contracts.deletedOk'), 'OK', { duration: 3000 });
            if (this.employee) this.loadContracts(this.employee.publicId);
          },
          error: () => this.snackBar.open(this.transloco.translate('employeeProfile.contracts.deleteError'), 'OK', { duration: 3000 })
        });
      }
    });
  }

  /** Opens the contract PDF inline in a new tab (no forced download). */
  viewContractPdf(contract: Contract): void {
    this.contractService.downloadPdf(contract.publicId).subscribe({
      next: blob => window.open(URL.createObjectURL(blob), '_blank'),
      error: () => this.snackBar.open(this.transloco.translate('employeeProfile.contracts.openError'), 'OK', { duration: 3000 })
    });
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
      error: () => this.snackBar.open(this.transloco.translate('employeeProfile.contracts.downloadError'), 'OK', { duration: 3000 })
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

  goBack(): void {
    this.router.navigate(['/employees']);
  }
}
