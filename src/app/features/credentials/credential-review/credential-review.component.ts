import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CredentialService } from '../../../core/services/credential.service';
import { DocumentService } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { Credential, CredentialType } from '../../../core/models/credential.model';
import { Employee } from '../../../core/models/employee.model';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentResponse } from '../../../core/models/document.model';
import { CredentialReviewDialogComponent } from '../credential-review-dialog/credential-review-dialog.component';

@Component({
  selector: 'app-credential-review',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatCardModule, MatChipsModule, MatDialogModule,
    MatProgressSpinnerModule, MatSnackBarModule, TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'credentials.review.title' | transloco }}</h2>
      <span class="badge">{{ 'credentials.review.pendingBadge' | transloco: { count: totalElements } }}</span>
    </div>

    <mat-card>
      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (credentials.length === 0) {
        <div class="empty-state">
          <mat-icon>check_circle</mat-icon>
          <p>{{ 'credentials.review.allCaughtUp' | transloco }}</p>
        </div>
      } @else if (isMobile) {
        <!-- Mobile: stacked cards -->
        <div class="card-list">
          @for (row of credentials; track row.publicId) {
            <div class="entity-card">
              <div class="entity-card-top">
                <a class="name-link" [routerLink]="['/employees', row.employeePublicId]">
                  <strong>{{ getEmployeeName(row.employeePublicId) }}</strong>
                </a>
                <span class="status-chip status-pending">{{ 'credentials.status.PENDING_REVIEW' | transloco }}</span>
              </div>
              <div class="entity-card-line"><mat-icon>badge</mat-icon> {{ getTypeName(row.credentialTypePublicId) }}</div>
              @if (row.issuer) {
                <div class="entity-card-line"><mat-icon>business</mat-icon> {{ row.issuer }}</div>
              }
              <div class="entity-card-line"><mat-icon>event</mat-icon> {{ 'credentials.review.submitted' | transloco }}: {{ row.createdAt | date:'mediumDate' }}</div>
              <div class="card-cta">
                <button mat-raised-button color="primary" (click)="openReview(row)">
                  <mat-icon>rate_review</mat-icon> {{ 'credentials.review.reviewBtn' | transloco }}
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="table-scroll">
        <table mat-table [dataSource]="credentials" class="full-width">
          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef>{{ 'credentials.list.colEmployee' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <div class="cell-main">
                <a class="name-link" [routerLink]="['/employees', row.employeePublicId]">
                  <strong>{{ getEmployeeName(row.employeePublicId) }}</strong>
                </a>
              </div>
              @if (isMobile) {
                <div class="cell-sub">{{ getTypeName(row.credentialTypePublicId) }}</div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.type' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ getTypeName(row.credentialTypePublicId) }}</td>
          </ng-container>

          <ng-container matColumnDef="issuer">
            <th mat-header-cell *matHeaderCellDef>{{ 'credentials.list.colIssuer' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.issuer || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="submitted">
            <th mat-header-cell *matHeaderCellDef>{{ 'credentials.review.submitted' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              @if (isMobile) {
                <button mat-icon-button color="primary" (click)="openReview(row)">
                  <mat-icon>rate_review</mat-icon>
                </button>
              } @else {
                <button mat-raised-button color="primary" (click)="openReview(row)">
                  <mat-icon>rate_review</mat-icon> {{ 'credentials.review.reviewBtn' | transloco }}
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        </div>

        <mat-paginator
          [length]="totalElements"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
          showFirstLastButtons>
        </mat-paginator>
      }
    </mat-card>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .page-header h2 { margin: 0; }
    .badge {
      background: #e3f2fd; color: #1565c0; padding: 4px 12px;
      border-radius: 12px; font-size: 13px; font-weight: 500;
    }
    .full-width { width: 100%; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .empty-state {
      text-align: center; padding: 48px; color: #999;
    }
    .empty-state mat-icon {
      font-size: 48px; width: 48px; height: 48px; color: #4caf50;
    }
    .cell-main { font-weight: 500; }
    .cell-sub { font-size: 12px; color: #888; line-height: 1.3; }
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
    .status-chip.status-pending {
      background: #e3f2fd; color: #1565c0; padding: 2px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 500;
    }
    .card-cta { display: flex; margin-top: 12px; }
    .card-cta button { flex: 1; }
    @media (max-width: 768px) {
      .page-header { flex-wrap: wrap; }
    }
  `]
})
export class CredentialReviewComponent implements OnInit {
  credentials: Credential[] = [];
  credentialTypes: CredentialType[] = [];
  employees: Employee[] = [];
  loading = true;
  totalElements = 0;
  pageSize = 20;
  pageIndex = 0;
  isMobile = false;
  displayedColumns = ['employee', 'type', 'issuer', 'submitted', 'actions'];

  private readonly desktopColumns = ['employee', 'type', 'issuer', 'submitted', 'actions'];
  private readonly mobileColumns = ['employee', 'actions'];

  constructor(
    private credentialService: CredentialService,
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
      this.displayedColumns = result.matches ? this.mobileColumns : this.desktopColumns;
    });
  }

  ngOnInit(): void {
    this.loadTypes();
    this.loadEmployees();
    this.loadData();
  }

  loadTypes(): void {
    const agencyId = this.authService.agencyPublicId();
    this.credentialService.getTypes(agencyId).subscribe({
      next: types => this.credentialTypes = types
    });
  }

  loadEmployees(): void {
    const agencyId = this.authService.agencyPublicId();
    this.employeeService.getAll(agencyId, 0, 1000).subscribe({
      next: page => this.employees = page.content
    });
  }

  loadData(): void {
    this.loading = true;
    const agencyId = this.authService.agencyPublicId();
    this.credentialService.getPendingReview(agencyId, this.pageIndex, this.pageSize).subscribe({
      next: page => {
        this.credentials = page.content;
        this.totalElements = page.totalElements;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  getEmployeeName(publicId: string): string {
    const emp = this.employees.find(e => e.publicId === publicId);
    return emp ? `${emp.lastName}, ${emp.firstName}` : publicId;
  }

  getTypeName(typePublicId: string): string {
    return this.credentialTypes.find(t => t.publicId === typePublicId)?.name || typePublicId;
  }

  openReview(credential: Credential): void {
    this.documentService.getByCredential(credential.publicId).subscribe({
      next: (docs) => {
        const dialogRef = this.dialog.open(CredentialReviewDialogComponent, {
          width: '700px', maxWidth: '95vw',
          data: {
            credential,
            documents: docs,
            employeeName: this.getEmployeeName(credential.employeePublicId),
            typeName: this.getTypeName(credential.credentialTypePublicId)
          }
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result) this.loadData();
        });
      },
      error: () => {
        const dialogRef = this.dialog.open(CredentialReviewDialogComponent, {
          width: '700px', maxWidth: '95vw',
          data: {
            credential,
            documents: [],
            employeeName: this.getEmployeeName(credential.employeePublicId),
            typeName: this.getTypeName(credential.credentialTypePublicId)
          }
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result) this.loadData();
        });
      }
    });
  }
}
