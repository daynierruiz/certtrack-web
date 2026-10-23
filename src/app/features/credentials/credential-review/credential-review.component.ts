import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CredentialService } from '../../../core/services/credential.service';
import { DocumentService } from '../../../core/services/document.service';
import { AuthService } from '../../../core/services/auth.service';
import { Credential, CredentialType } from '../../../core/models/credential.model';
import { Employee } from '../../../core/models/employee.model';
import { EmployeeService } from '../../../core/services/employee.service';
import { CredentialReviewDialogComponent } from '../credential-review-dialog/credential-review-dialog.component';

@Component({
  selector: 'app-credential-review',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatButtonModule,
    MatIconModule, MatCardModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDialogModule,
    MatProgressSpinnerModule, MatPaginatorModule, MatSnackBarModule, TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'credentials.review.title' | transloco }}</h2>
      <span class="badge">{{ 'credentials.review.pendingBadge' | transloco: { count: credentials.length } }}</span>
    </div>

    <mat-card class="filters-bar">
      <div class="filters-top">
        <mat-form-field appearance="outline" class="filter-search" subscriptSizing="dynamic">
          <mat-label>{{ 'credentials.review.searchLabel' | transloco }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="search" (ngModelChange)="applyFilters()"
                 [placeholder]="'credentials.review.searchPlaceholder' | transloco">
          @if (search) {
            <button matSuffix mat-icon-button (click)="search=''; applyFilters()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-type" subscriptSizing="dynamic">
          <mat-label>{{ 'common.type' | transloco }}</mat-label>
          <mat-select [(ngModel)]="typeFilter" (ngModelChange)="applyFilters()">
            <mat-option value="">{{ 'credentials.review.filterAllTypes' | transloco }}</mat-option>
            @for (t of credentialTypes; track t.publicId) {
              <mat-option [value]="t.publicId">{{ t.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </mat-card>

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
      } @else if (filtered.length === 0) {
        <div class="empty-state">
          <mat-icon>filter_alt_off</mat-icon>
          <p>{{ 'credentials.review.noMatches' | transloco }}</p>
        </div>
      } @else if (isMobile) {
        <!-- Mobile: stacked cards -->
        <div class="card-list">
          @for (row of paged; track row.publicId) {
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
        <table mat-table [dataSource]="paged" class="full-width">
          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef>{{ 'credentials.list.colEmployee' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <div class="cell-main">
                <a class="name-link" [routerLink]="['/employees', row.employeePublicId]">
                  <strong>{{ getEmployeeName(row.employeePublicId) }}</strong>
                </a>
              </div>
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
              <button mat-raised-button color="primary" (click)="openReview(row)">
                <mat-icon>rate_review</mat-icon> {{ 'credentials.review.reviewBtn' | transloco }}
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        </div>
      }

      @if (!loading && filtered.length > 0) {
        <mat-paginator [length]="filtered.length"
                       [pageSize]="pageSize" [pageIndex]="pageIndex"
                       [pageSizeOptions]="[10, 25, 50]"
                       (page)="onPage($event)"></mat-paginator>
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
    .filters-bar { margin-bottom: 16px; padding: 12px 16px; }
    .filters-top { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .filter-search { flex: 1 1 260px; min-width: 200px; }
    .filter-type { flex: 0 1 240px; min-width: 180px; }
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
  filtered: Credential[] = [];
  credentialTypes: CredentialType[] = [];
  employees: Employee[] = [];
  loading = true;
  isMobile = false;
  displayedColumns = ['employee', 'type', 'issuer', 'submitted', 'actions'];

  // Client-side pagination over the filtered list (the full queue is loaded up
  // front so search/type filters still span everything).
  paged: Credential[] = [];
  pageIndex = 0;
  pageSize = 25;

  // Filters
  search = '';
  typeFilter = '';

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
      next: page => {
        this.employees = page.content;
        // Names may have arrived after the credentials — re-apply so search works.
        this.applyFilters();
      }
    });
  }

  loadData(): void {
    this.loading = true;
    const agencyId = this.authService.agencyPublicId();
    // Load the full pending-review queue so search/type filters span everything,
    // consistent with the Employees/Applicants screens (client-side filtering).
    this.credentialService.getPendingReview(agencyId, 0, 5000).subscribe({
      next: page => {
        this.credentials = page.content;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = this.credentials.filter(c => {
      if (this.typeFilter && c.credentialTypePublicId !== this.typeFilter) {
        return false;
      }
      if (q) {
        const hay = [
          this.getEmployeeName(c.employeePublicId),
          this.getTypeName(c.credentialTypePublicId),
          c.issuer
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    });
    // Filter/search changed → back to the first page, then recompute the slice.
    this.pageIndex = 0;
    this.updatePaged();
  }

  private updatePaged(): void {
    const start = this.pageIndex * this.pageSize;
    this.paged = this.filtered.slice(start, start + this.pageSize);
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaged();
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
      next: (docs) => this.openReviewDialog(credential, docs),
      error: () => this.openReviewDialog(credential, [])
    });
  }

  private openReviewDialog(credential: Credential, documents: any[]): void {
    const dialogRef = this.dialog.open(CredentialReviewDialogComponent, {
      width: '700px', maxWidth: '95vw',
      data: {
        credential,
        documents,
        employeeName: this.getEmployeeName(credential.employeePublicId),
        typeName: this.getTypeName(credential.credentialTypePublicId)
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }
}
