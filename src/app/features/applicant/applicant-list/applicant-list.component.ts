import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ApplicantService } from '../../../core/services/applicant.service';
import {
  ApplicantResponse,
  LANGUAGE_OPTIONS,
  LanguageCode
} from '../../../core/models/applicant.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';

@Component({
  selector: 'app-applicant-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatTableModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatCardModule, MatProgressSpinnerModule, MatDialogModule,
    MatSnackBarModule, MatTooltipModule,
    TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'applicant.list.title' | transloco }}</h1>
      <p class="subtitle">{{ 'applicant.list.subtitle' | transloco }}</p>
    </div>

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
    } @else if (isMobile) {
      <!-- Mobile: stacked cards -->
      <div class="card-list">
        @for (row of applicants; track row.publicId) {
          <div class="entity-card">
            <div class="entity-card-top">
              <a class="name-link" [routerLink]="['/employees', row.publicId]">
                <strong>{{ row.lastName }}, {{ row.firstName }}</strong>
              </a>
              <span class="status-chip" [class]="'status-' + row.status.toLowerCase()">{{ statusLabel(row.status) }}</span>
            </div>
            @if (row.email) {
              <div class="entity-card-line"><mat-icon>email</mat-icon> {{ row.email }}</div>
            }
            <div class="entity-card-line"><mat-icon>work</mat-icon> {{ row.positionName }}</div>
            @if (row.schoolName) {
              <div class="entity-card-line"><mat-icon>school</mat-icon> {{ row.schoolName }}</div>
            }
            @if (row.languages.length || row.languageOther) {
              <mat-chip-set class="entity-card-langs">
                @for (lang of row.languages; track lang) {
                  <mat-chip>{{ 'spokenLanguages.' + lang | transloco }}</mat-chip>
                }
                @if (row.languageOther) { <mat-chip>{{ row.languageOther }}</mat-chip> }
              </mat-chip-set>
            }
            <div class="entity-card-line"><mat-icon>event</mat-icon> {{ 'applicant.list.applied' | transloco }}: {{ row.applicationDate | date:'mediumDate' }}</div>
            <div class="card-cta">
              @if (row.status === 'APPLICANT') {
                <button mat-stroked-button color="primary" (click)="onApprove(row)">
                  <mat-icon>check_circle</mat-icon> {{ 'applicant.list.approveBtn' | transloco }}
                </button>
                <button mat-stroked-button color="warn" (click)="onReject(row)">
                  <mat-icon>cancel</mat-icon> {{ 'applicant.list.rejectBtn' | transloco }}
                </button>
              } @else if (row.status === 'ONBOARDING') {
                <button mat-raised-button color="primary" (click)="onActivate(row)">
                  <mat-icon>verified_user</mat-icon> {{ 'applicant.list.hireBtn' | transloco }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <mat-card>
        <div class="table-scroll">
        <table mat-table [dataSource]="applicants" class="full-width">

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
            <td mat-cell *matCellDef="let row">
              @if (row.status === 'APPLICANT') {
                <button mat-icon-button color="primary"
                        [matTooltip]="'applicant.list.approveBtn' | transloco"
                        (click)="onApprove(row)">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <button mat-icon-button color="warn"
                        [matTooltip]="'applicant.list.rejectBtn' | transloco"
                        (click)="onReject(row)">
                  <mat-icon>cancel</mat-icon>
                </button>
              } @else if (row.status === 'ONBOARDING') {
                <button mat-raised-button color="primary"
                        class="hire-btn"
                        (click)="onActivate(row)">
                  <mat-icon>verified_user</mat-icon>
                  {{ 'applicant.list.hireBtn' | transloco }}
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        </div>
      </mat-card>
    }
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
    }
    .page-header h1 {
      margin: 0;
      font-size: 24px;
      color: #1a237e;
    }
    .subtitle {
      color: #666;
      margin: 4px 0 0;
    }
    .full-width { width: 100%; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .loading-center {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #999;
    }
    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }
    .empty-state h3 {
      color: #666;
    }
    .applicant-name {
      font-weight: 500;
    }
    .applicant-email {
      font-size: 12px;
      color: #666;
    }
    .status-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-applicant {
      background: #e3f2fd;
      color: #1565c0;
    }
    .status-onboarding {
      background: #fff3e0;
      color: #e65100;
    }
    .hire-btn {
      font-size: 12px;
      line-height: 32px;
      padding: 0 12px;
    }
    .hire-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }
    @media (max-width: 768px) {
      .mat-column-phone,
      .mat-column-date,
      .mat-column-languages,
      .mat-column-school {
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
    .name-link { cursor: pointer; color: #1565c0; text-decoration: none; }
    .name-link:hover { text-decoration: underline; }
    .entity-card-top .name-link { font-size: 15px; }
    .entity-card-line {
      display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; margin-top: 2px;
    }
    .entity-card-line mat-icon { font-size: 15px; width: 15px; height: 15px; color: #999; }
    .entity-card-langs { margin-top: 8px; }
    .card-cta { display: flex; gap: 8px; margin-top: 12px; }
    .card-cta button { flex: 1; }
  `]
})
export class ApplicantListComponent implements OnInit {
  applicants: ApplicantResponse[] = [];
  loading = true;
  isMobile = false;
  displayedColumns = ['name', 'position', 'languages', 'school', 'phone', 'date', 'status', 'actions'];

  private readonly statusMap: Record<string, string> = {
    APPLICANT: 'applicant.list.status.APPLICANT',
    ONBOARDING: 'applicant.list.status.ONBOARDING',
    ACTIVE: 'applicant.list.status.ACTIVE',
    REJECTED: 'applicant.list.status.REJECTED'
  };

  // Language display labels are translated in the template via the
  // 'spokenLanguages.<CODE>' Transloco key.

  statusLabel(status: string): string {
    const key = this.statusMap[status];
    return key ? this.transloco.translate(key) : status;
  }

  constructor(
    private applicantService: ApplicantService,
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
  }

  loadApplicants(): void {
    this.loading = true;
    this.applicantService.listApplicants().subscribe({
      next: (data) => {
        this.applicants = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
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
}
