import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApplicantService } from '../../../core/services/applicant.service';
import { AuthService } from '../../../core/services/auth.service';
import { PositionService } from '../../../core/services/position.service';
import { PositionResponse } from '../../../core/models/position.model';
import { ApplicantResponse } from '../../../core/models/applicant.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';

@Component({
  selector: 'app-applicant-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatMenuModule, MatDividerModule, MatProgressSpinnerModule, MatDialogModule,
    MatSnackBarModule, MatTooltipModule,
    TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'applicant.list.title' | transloco }}</h1>
      <p class="subtitle">{{ 'applicant.list.subtitle' | transloco }}</p>
    </div>

    <mat-card class="filters-bar">
      <div class="filters-top">
        <mat-form-field appearance="outline" class="filter-search" subscriptSizing="dynamic">
          <mat-label>{{ 'applicant.list.searchLabel' | transloco }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="search" (ngModelChange)="applyFilters()"
                 [placeholder]="'applicant.list.searchPlaceholder' | transloco">
          @if (search) {
            <button matSuffix mat-icon-button (click)="search=''; applyFilters()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-status" subscriptSizing="dynamic">
          <mat-label>{{ 'common.status' | transloco }}</mat-label>
          <mat-select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
            <mat-option value="ALL">{{ 'applicant.list.filterAll' | transloco }}</mat-option>
            <mat-option value="APPLICANT">{{ 'applicant.list.status.APPLICANT' | transloco }}</mat-option>
            <mat-option value="ONBOARDING">{{ 'applicant.list.status.ONBOARDING' | transloco }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-position" subscriptSizing="dynamic">
          <mat-label>{{ 'applicant.list.colPosition' | transloco }}</mat-label>
          <mat-select [(ngModel)]="positionFilter" (ngModelChange)="applyFilters()">
            <mat-option value="">{{ 'applicant.list.filterAllPositions' | transloco }}</mat-option>
            @for (pos of positions; track pos.publicId) {
              <mat-option [value]="pos.publicId">{{ pos.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </mat-card>

    @if (loading) {
      <div class="loading-center">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (applicants.length === 0) {
      <mat-card class="empty-card">
        <mat-card-content>
          <div class="empty-state">
            <mat-icon>person_search</mat-icon>
            <h3>{{ 'applicant.list.emptyTitle' | transloco }}</h3>
            <p>{{ 'applicant.list.emptyMessage' | transloco }}</p>
          </div>
        </mat-card-content>
      </mat-card>
    } @else if (filtered.length === 0) {
      <mat-card class="empty-card">
        <mat-card-content>
          <div class="empty-state">
            <mat-icon>filter_alt_off</mat-icon>
            <h3>{{ 'applicant.list.noMatches' | transloco }}</h3>
          </div>
        </mat-card-content>
      </mat-card>
    } @else if (isMobile) {
      <!-- Mobile: stacked cards -->
      <div class="card-list">
        @for (row of filtered; track row.publicId) {
          <div class="entity-card">
            <div class="entity-card-top">
              <a class="name-link" [routerLink]="['/employees', row.publicId]">
                <strong>{{ row.lastName }}, {{ row.firstName }}</strong>
              </a>
              <div class="top-right">
                <span class="status-chip" [class]="'status-' + row.status.toLowerCase()">{{ statusLabel(row.status) }}</span>
                <button mat-icon-button [matMenuTriggerFor]="rowMenu"
                        [matTooltip]="'common.actions' | transloco">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #rowMenu="matMenu">
                  <ng-container *ngTemplateOutlet="menuItems; context: { row: row }"></ng-container>
                </mat-menu>
              </div>
            </div>
            @if (row.email) {
              <div class="entity-card-line"><mat-icon>email</mat-icon> {{ row.email }}</div>
            }
            <div class="entity-card-line"><mat-icon>work</mat-icon> {{ row.positionName }}</div>
            @if (row.schoolName) {
              <div class="entity-card-line"><mat-icon>school</mat-icon> {{ row.schoolName }}</div>
            }
            <div class="entity-card-line"><mat-icon>event</mat-icon> {{ 'applicant.list.applied' | transloco }}: {{ row.applicationDate | date:'mediumDate' }}</div>
          </div>
        }
      </div>
    } @else {
      <mat-card>
        <div class="table-scroll">
        <table mat-table [dataSource]="filtered" class="full-width">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <a class="name-link" [routerLink]="['/employees', row.publicId]">
                <strong>{{ row.lastName }}, {{ row.firstName }}</strong>
              </a>
              <div class="applicant-email">{{ row.email }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="position">
            <th mat-header-cell *matHeaderCellDef>{{ 'applicant.list.colPosition' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.positionName }}</td>
          </ng-container>

          <ng-container matColumnDef="languages">
            <th mat-header-cell *matHeaderCellDef>{{ 'applicant.list.colLanguages' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <mat-chip-set>
                @for (lang of row.languages; track lang) {
                  <mat-chip>{{ 'spokenLanguages.' + lang | transloco }}</mat-chip>
                }
                @if (row.languageOther) {
                  <mat-chip>{{ row.languageOther }}</mat-chip>
                }
              </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="school">
            <th mat-header-cell *matHeaderCellDef>{{ 'applicant.list.colSchool' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.schoolName || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.phone' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.phone || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>{{ 'applicant.list.colApplied' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.applicationDate | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [class]="'status-' + row.status.toLowerCase()">
                {{ statusLabel(row.status) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | transloco }}</th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              <button mat-icon-button [matMenuTriggerFor]="rowMenu"
                      [matTooltip]="'common.actions' | transloco">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #rowMenu="matMenu">
                <ng-container *ngTemplateOutlet="menuItems; context: { row: row }"></ng-container>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        </div>
      </mat-card>
    }

    <!-- Shared action menu (desktop + mobile), context-aware by status -->
    <ng-template #menuItems let-row="row">
      <a mat-menu-item [routerLink]="['/employees', row.publicId]">
        <mat-icon>visibility</mat-icon> {{ 'applicant.list.viewProfile' | transloco }}
      </a>
      @if (row.status === 'APPLICANT') {
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="onApprove(row)">
          <mat-icon color="primary">check_circle</mat-icon> {{ 'applicant.list.approveBtn' | transloco }}
        </button>
        <button mat-menu-item (click)="onReject(row)">
          <mat-icon color="warn">cancel</mat-icon> {{ 'applicant.list.rejectBtn' | transloco }}
        </button>
      } @else if (row.status === 'ONBOARDING') {
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="onActivate(row)">
          <mat-icon color="primary">verified_user</mat-icon> {{ 'applicant.list.hireBtn' | transloco }}
        </button>
        <button mat-menu-item (click)="onResend(row)">
          <mat-icon>forward_to_inbox</mat-icon> {{ 'applicant.list.resendBtn' | transloco }}
        </button>
        <button mat-menu-item (click)="onReject(row)">
          <mat-icon color="warn">cancel</mat-icon> {{ 'applicant.list.removeBtn' | transloco }}
        </button>
      }
    </ng-template>
  `,
  styles: [`
    .page-header { margin-bottom: 16px; }
    .page-header h1 { margin: 0; font-size: 24px; color: #1a237e; }
    .subtitle { color: #666; margin: 4px 0 0; }
    .filters-bar { margin-bottom: 16px; padding: 12px 16px; }
    .filters-top { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .filter-search { flex: 1 1 260px; min-width: 200px; }
    .filter-status { flex: 0 1 180px; min-width: 140px; }
    .filter-position { flex: 0 1 240px; min-width: 180px; }
    .full-width { width: 100%; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .loading-center { display: flex; justify-content: center; padding: 48px 0; }
    .empty-state { text-align: center; padding: 48px 24px; color: #999; }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; }
    .empty-state h3 { color: #666; }
    .applicant-email { font-size: 12px; color: #666; }
    .actions-cell { white-space: nowrap; text-align: right; }
    .status-chip {
      display: inline-block; padding: 4px 12px; border-radius: 16px;
      font-size: 12px; font-weight: 500;
    }
    .status-applicant { background: #e3f2fd; color: #1565c0; }
    .status-onboarding { background: #fff3e0; color: #e65100; }
    @media (max-width: 768px) {
      .mat-column-phone, .mat-column-date, .mat-column-languages, .mat-column-school {
        display: none;
      }
    }
    mat-chip-set { gap: 4px; }
    .mat-mdc-chip { font-size: 11px; min-height: 22px; }
    .card-list { display: flex; flex-direction: column; gap: 10px; }
    .entity-card {
      background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 12px 14px;
    }
    .entity-card-top {
      display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;
    }
    .top-right { display: flex; align-items: center; gap: 4px; }
    .name-link { cursor: pointer; color: #1565c0; text-decoration: none; }
    .name-link:hover { text-decoration: underline; }
    .entity-card-top .name-link { font-size: 15px; }
    .entity-card-line {
      display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; margin-top: 2px;
    }
    .entity-card-line mat-icon { font-size: 15px; width: 15px; height: 15px; color: #999; }
  `]
})
export class ApplicantListComponent implements OnInit {
  applicants: ApplicantResponse[] = [];
  filtered: ApplicantResponse[] = [];
  positions: PositionResponse[] = [];
  loading = true;
  isMobile = false;
  displayedColumns = ['name', 'position', 'languages', 'school', 'phone', 'date', 'status', 'actions'];

  // Filters
  search = '';
  statusFilter: 'ALL' | 'APPLICANT' | 'ONBOARDING' = 'ALL';
  positionFilter = '';

  private readonly statusMap: Record<string, string> = {
    APPLICANT: 'applicant.list.status.APPLICANT',
    ONBOARDING: 'applicant.list.status.ONBOARDING',
    ACTIVE: 'applicant.list.status.ACTIVE',
    REJECTED: 'applicant.list.status.REJECTED'
  };

  statusLabel(status: string): string {
    const key = this.statusMap[status];
    return key ? this.transloco.translate(key) : status;
  }

  constructor(
    private applicantService: ApplicantService,
    private positionService: PositionService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private transloco: TranslocoService
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
    });
  }

  ngOnInit(): void {
    this.loadApplicants();
    this.loadPositions();
  }

  private loadPositions(): void {
    const agencyId = this.authService.agencyPublicId();
    this.positionService.getAll(agencyId, 0, 200).subscribe({
      next: page => { this.positions = page.content; },
      error: () => { this.positions = []; }
    });
  }

  loadApplicants(): void {
    this.loading = true;
    this.applicantService.listApplicants().subscribe({
      next: (data) => {
        this.applicants = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = this.applicants.filter(a => {
      if (this.statusFilter !== 'ALL' && a.status !== this.statusFilter) {
        return false;
      }
      if (this.positionFilter && a.positionPublicId !== this.positionFilter) {
        return false;
      }
      if (q) {
        const hay = [a.firstName, a.lastName, a.email, a.schoolName, a.positionName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  onApprove(applicant: ApplicantResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '95vw',
      data: {
        title: this.transloco.translate('applicant.list.approveDialog.title'),
        message: this.transloco.translate('applicant.list.approveDialog.message', {
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          position: applicant.positionName
        }),
        confirmText: this.transloco.translate('applicant.list.approveBtn'),
        icon: 'check_circle',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.applicantService.approve(applicant.publicId).subscribe({
        next: (updated) => {
          const idx = this.applicants.findIndex(a => a.publicId === applicant.publicId);
          if (idx >= 0) this.applicants[idx] = updated;
          this.applicants = [...this.applicants];
          this.applyFilters();
          this.snackBar.open(
            this.transloco.translate('applicant.list.approvedSnack', {
              firstName: applicant.firstName,
              email: applicant.email
            }),
            'OK', { duration: 5000 }
          );
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || this.transloco.translate('applicant.list.approveError'), 'OK', { duration: 5000 });
        }
      });
    });
  }

  onReject(applicant: ApplicantResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '95vw',
      data: {
        title: this.transloco.translate('applicant.list.rejectDialog.title'),
        message: this.transloco.translate('applicant.list.rejectDialog.message', {
          firstName: applicant.firstName,
          lastName: applicant.lastName
        }),
        confirmText: this.transloco.translate('applicant.list.rejectBtn'),
        icon: 'cancel',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.applicantService.reject(applicant.publicId).subscribe({
        next: () => {
          this.applicants = this.applicants.filter(a => a.publicId !== applicant.publicId);
          this.applyFilters();
          this.snackBar.open(this.transloco.translate('applicant.list.rejectedSnack'), 'OK', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || this.transloco.translate('applicant.list.rejectError'), 'OK', { duration: 5000 });
        }
      });
    });
  }

  onActivate(applicant: ApplicantResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '95vw',
      data: {
        title: this.transloco.translate('applicant.list.hireDialog.title'),
        message: this.transloco.translate('applicant.list.hireDialog.message', {
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          position: applicant.positionName
        }),
        confirmText: this.transloco.translate('applicant.list.hireBtn'),
        icon: 'verified_user',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.applicantService.activate(applicant.publicId).subscribe({
        next: () => {
          this.applicants = this.applicants.filter(a => a.publicId !== applicant.publicId);
          this.applyFilters();
          this.snackBar.open(
            this.transloco.translate('applicant.list.hiredSnack', {
              firstName: applicant.firstName,
              lastName: applicant.lastName
            }),
            'OK', { duration: 3000 }
          );
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || this.transloco.translate('applicant.list.hireError'), 'OK', { duration: 5000 });
        }
      });
    });
  }

  onResend(applicant: ApplicantResponse): void {
    this.applicantService.resendSetup(applicant.publicId).subscribe({
      next: () => {
        this.snackBar.open(
          this.transloco.translate('applicant.list.resendSnack', { email: applicant.email }),
          'OK', { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.transloco.translate('applicant.list.resendError'), 'OK', { duration: 5000 });
      }
    });
  }
}
