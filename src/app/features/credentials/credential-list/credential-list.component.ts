import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CredentialService } from '../../../core/services/credential.service';
import { AuthService } from '../../../core/services/auth.service';
import { Credential, CredentialType } from '../../../core/models/credential.model';
import { Employee } from '../../../core/models/employee.model';
import { EmployeeService } from '../../../core/services/employee.service';
import { CredentialFormDialogComponent } from '../credential-form-dialog/credential-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';

@Component({
  selector: 'app-credential-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule,
    MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatChipsModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatMenuModule, MatTooltipModule, TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'credentials.list.title' | transloco }}</h2>
      <button mat-raised-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> {{ 'credentials.list.addCredential' | transloco }}
      </button>
    </div>

    <mat-card>
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>{{ 'credentials.list.searchLabel' | transloco }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput #searchInput (keyup)="applyFilter($event)" [placeholder]="'credentials.list.searchPlaceholder' | transloco">
        </mat-form-field>
        <div class="filter-chips">
          <mat-chip-listbox [value]="activeStatusFilter" (change)="onStatusFilter($event.value)">
            <mat-chip-option value="">{{ 'credentials.list.filterAll' | transloco: { count: totalCount } }}</mat-chip-option>
            <mat-chip-option value="attention" class="chip-attention">{{ 'credentials.list.filterAttention' | transloco: { count: attentionCount } }}</mat-chip-option>
            <mat-chip-option value="VALID" class="chip-valid">{{ 'credentials.list.filterValid' | transloco: { count: validCount } }}</mat-chip-option>
            <mat-chip-option value="EXPIRING_SOON" class="chip-expiring">{{ 'credentials.list.filterExpiring' | transloco: { count: expiringCount } }}</mat-chip-option>
            <mat-chip-option value="PENDING_REVIEW" class="chip-pending">{{ 'credentials.list.filterPending' | transloco: { count: pendingCount } }}</mat-chip-option>
          </mat-chip-listbox>
        </div>
      </div>

      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        @if (isMobile) {
        <!-- Mobile: stacked cards -->
        <div class="card-list">
          @for (row of pagedData; track row.publicId) {
            <div class="entity-card">
              <div class="entity-card-top">
                <a class="name-link"
                   [routerLink]="['/employees', row.employeePublicId]">
                  <strong>{{ getEmployeeName(row.employeePublicId) }}</strong>
                </a>
                <span class="status-chip" [class]="'status-' + row.status">
                  <mat-icon class="status-icon">{{ getStatusIcon(row.status) }}</mat-icon>
                  {{ formatStatus(row.status) }}
                </span>
              </div>
              <div class="entity-card-line"><mat-icon>badge</mat-icon> {{ getTypeName(row.credentialTypePublicId) }}</div>
              @if (getEmployeeStatus(row.employeePublicId); as st) {
                @if (st !== 'ACTIVE') {
                  <div class="entity-card-line"><mat-icon>person</mat-icon> <span class="emp-badge emp-{{ st }}">{{ formatEmpStatus(st) }}</span></div>
                }
              }
              @if (row.issuer) {
                <div class="entity-card-line"><mat-icon>business</mat-icon> {{ row.issuer }}</div>
              }
              @if (row.expirationDate) {
                <div class="entity-card-line"><mat-icon>event</mat-icon> {{ 'credentials.list.expires' | transloco }}: {{ row.expirationDate }}</div>
              }
              <div class="entity-card-actions">
                <button mat-icon-button
                        [matMenuTriggerFor]="cardMenu"
                        [matMenuTriggerData]="{ row: row }">
                  <mat-icon>more_vert</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>

        <mat-menu #cardMenu="matMenu">
          <ng-template matMenuContent let-row="row">
            <button mat-menu-item (click)="openForm(row)">
              <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
            </button>
            <button mat-menu-item (click)="onDelete(row)">
              <mat-icon color="warn">delete</mat-icon> {{ 'common.delete' | transloco }}
            </button>
          </ng-template>
        </mat-menu>
        } @else {
        <div class="table-scroll">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'credentials.list.colEmployee' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <a class="cell-main name-link"
                 [routerLink]="['/employees', row.employeePublicId]"
                 (click)="$event.stopPropagation()">
                <strong>{{ getEmployeeName(row.employeePublicId) }}</strong>
              </a>
              @if (getEmployeeStatus(row.employeePublicId); as st) {
                @if (st !== 'ACTIVE') {
                  <span class="emp-badge emp-{{ st }}" [matTooltip]="('credentials.list.employeeStatusTooltip' | transloco) + formatEmpStatus(st)">{{ formatEmpStatus(st) }}</span>
                }
              }
              @if (isMobile) {
                <div class="cell-sub">{{ getTypeName(row.credentialTypePublicId) }}</div>
                @if (row.expirationDate) {
                  <div class="cell-sub">{{ 'credentials.list.expShort' | transloco }}: {{ row.expirationDate }}</div>
                }
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.type' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ getTypeName(row.credentialTypePublicId) }}</td>
          </ng-container>

          <ng-container matColumnDef="issuer">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'credentials.list.colIssuer' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.issuer || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="issueDate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'credentials.list.colIssued' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.issueDate || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="expirationDate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'credentials.list.colExpires' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.expirationDate || 'N/A' }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.status' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [class]="'status-' + row.status">
                <mat-icon class="status-icon">{{ getStatusIcon(row.status) }}</mat-icon>
                {{ formatStatus(row.status) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="openForm(row)" [matTooltip]="'common.edit' | transloco">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button [matMenuTriggerFor]="rowMenu" [matTooltip]="'credentials.list.moreActions' | transloco">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #rowMenu="matMenu">
                <button mat-menu-item (click)="openForm(row)">
                  <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
                </button>
                <button mat-menu-item (click)="onDelete(row)" class="menu-delete">
                  <mat-icon color="warn">delete</mat-icon> {{ 'common.delete' | transloco }}
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
        </div>
        }

        @if (dataSource.filteredData.length === 0) {
          <div class="empty-state">
            <mat-icon>badge</mat-icon>
            <p>{{ 'credentials.list.noCredentials' | transloco }}</p>
          </div>
        }

        <mat-paginator
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          showFirstLastButtons>
        </mat-paginator>
      }
    </mat-card>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .page-header h2 { margin: 0; }
    .filter-bar { padding: 16px 16px 0; }
    .search-field { width: 100%; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    /* Mobile card list */
    .card-list { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .entity-card {
      position: relative;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .entity-card-top {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; margin-bottom: 6px; padding-right: 36px;
    }
    .entity-card-top .name-link { font-size: 15px; }
    .entity-card-line {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: #555; margin-top: 2px;
    }
    .entity-card-line mat-icon {
      font-size: 15px; width: 15px; height: 15px; color: #999;
    }
    .entity-card-actions { position: absolute; top: 8px; right: 6px; }
    .filter-chips { margin-bottom: 8px; }
    .chip-attention { --mdc-chip-elevated-container-color: #ffebee; }
    .chip-valid { --mdc-chip-elevated-container-color: #e8f5e9; }
    .chip-expiring { --mdc-chip-elevated-container-color: #fff3e0; }
    .chip-pending { --mdc-chip-elevated-container-color: #e3f2fd; }
    .full-width { width: 100%; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
      white-space: nowrap;
    }
    .status-icon { font-size: 13px !important; width: 13px !important; height: 13px !important; }
    .status-VALID { background: #e8f5e9; color: #2e7d32; }
    .status-EXPIRING_SOON { background: #fff3e0; color: #e65100; }
    .status-CRITICAL { background: #ffebee; color: #c62828; }
    .status-EXPIRED { background: #eeeeee; color: #616161; }
    .status-PENDING_REVIEW { background: #e3f2fd; color: #1565c0; }
    .status-SUPERSEDED { background: #f5f5f5; color: #9e9e9e; }
    .status-REJECTED { background: #fce4ec; color: #ad1457; }
    .emp-badge {
      display: inline-block; margin-left: 8px; padding: 1px 8px;
      border-radius: 10px; font-size: 11px; font-weight: 600;
      vertical-align: middle; white-space: nowrap;
    }
    .emp-ONBOARDING { background: #e3f2fd; color: #1565c0; }
    .emp-APPLICANT { background: #ede7f6; color: #5e35b1; }
    .emp-INACTIVE { background: #eeeeee; color: #616161; }
    .emp-TERMINATED { background: #ffebee; color: #c62828; }
    .empty-state {
      text-align: center; padding: 48px; color: #999;
    }
    .empty-state mat-icon {
      font-size: 48px; width: 48px; height: 48px; color: #ccc;
    }
    .cell-main { font-weight: 500; }
    .cell-sub { font-size: 12px; color: #888; line-height: 1.3; }
    .name-link {
      cursor: pointer;
      color: #1565c0;
      text-decoration: none;
      display: inline-block;
    }
    .name-link:hover { text-decoration: underline; }
    @media (max-width: 768px) {
      .page-header { flex-direction: column; align-items: stretch; gap: 8px; }
      .page-header button { width: 100%; }
      .filter-chips { overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }
    }
  `]
})
export class CredentialListComponent implements OnInit {
  dataSource = new MatTableDataSource<Credential>();
  credentialTypes: CredentialType[] = [];
  employees: Employee[] = [];
  loading = true;
  pageSize = 20;
  activeStatusFilter = '';
  isMobile = false;
  displayedColumns = ['employee', 'type', 'issuer', 'issueDate', 'expirationDate', 'status', 'actions'];

  private readonly desktopColumns = ['employee', 'type', 'issuer', 'issueDate', 'expirationDate', 'status', 'actions'];
  private readonly mobileColumns = ['employee', 'status', 'actions'];

  @ViewChild(MatSort) set sort(s: MatSort) {
    if (s) this.dataSource.sort = s;
  }
  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    if (p) this.dataSource.paginator = p;
  }

  /** Current page slice of filtered data — used by the mobile card view. */
  get pagedData(): Credential[] {
    const data = this.dataSource.filteredData;
    const paginator = this.dataSource.paginator;
    if (!paginator) return data;
    const start = paginator.pageIndex * paginator.pageSize;
    return data.slice(start, start + paginator.pageSize);
  }

  constructor(
    private credentialService: CredentialService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private route: ActivatedRoute,
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
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'employee': return this.getEmployeeName(item.employeePublicId).toLowerCase();
        case 'type': return this.getTypeName(item.credentialTypePublicId).toLowerCase();
        case 'issuer': return item.issuer?.toLowerCase() || '';
        case 'issueDate': return item.issueDate || '';
        case 'expirationDate': return item.expirationDate || '';
        case 'status': return item.status;
        default: return '';
      }
    };
    this.dataSource.filterPredicate = (data, filter) => {
      const parsed = JSON.parse(filter);
      const search = parsed.search || '';
      const status = parsed.status || '';

      // Status filter
      if (status === 'attention') {
        if (data.status !== 'CRITICAL' && data.status !== 'EXPIRED') return false;
      } else if (status) {
        if (data.status !== status) return false;
      }

      // Text search
      if (search) {
        const empName = this.getEmployeeName(data.employeePublicId).toLowerCase();
        const typeName = this.getTypeName(data.credentialTypePublicId).toLowerCase();
        return `${empName} ${typeName} ${data.issuer} ${data.status} ${data.credentialNumber}`
          .toLowerCase().includes(search);
      }

      return true;
    };

    // Read query param for pre-filter
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        this.activeStatusFilter = params['filter'];
        this.applyFilters();
      }
    });

    this.loadTypes();
    this.loadEmployees();
    this.loadData();
  }

  loadTypes(): void {
    const agencyId = this.authService.agencyPublicId();
    this.credentialService.getTypes(agencyId).subscribe({
      next: types => this.credentialTypes = types,
      error: () => {}
    });
  }

  loadEmployees(): void {
    const agencyId = this.authService.agencyPublicId();
    this.employeeService.getAll(agencyId, 0, 1000).subscribe({
      next: page => this.employees = page.content,
      error: () => {}
    });
  }

  loadData(): void {
    this.loading = true;
    const agencyId = this.authService.agencyPublicId();
    this.credentialService.getAll(agencyId, 0, 10000).subscribe({
      next: page => {
        this.dataSource.data = page.content;
        this.loading = false;
        if (this.activeStatusFilter) {
          this.applyFilters();
        }
      },
      error: () => { this.loading = false; }
    });
  }

  get totalCount(): number { return this.dataSource.data.length; }
  get attentionCount(): number {
    return this.dataSource.data.filter(d => d.status === 'CRITICAL' || d.status === 'EXPIRED').length;
  }
  get validCount(): number {
    return this.dataSource.data.filter(d => d.status === 'VALID').length;
  }
  get expiringCount(): number {
    return this.dataSource.data.filter(d => d.status === 'EXPIRING_SOON').length;
  }
  get pendingCount(): number {
    return this.dataSource.data.filter(d => d.status === 'PENDING_REVIEW').length;
  }

  searchText = '';

  applyFilter(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.applyFilters();
  }

  onStatusFilter(value: string): void {
    this.activeStatusFilter = value;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.searchText,
      status: this.activeStatusFilter
    });
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getEmployeeName(publicId: string): string {
    const emp = this.employees.find(e => e.publicId === publicId);
    return emp ? `${emp.lastName}, ${emp.firstName}` : publicId;
  }

  getEmployeeStatus(publicId: string): string | null {
    return this.employees.find(e => e.publicId === publicId)?.status ?? null;
  }

  formatEmpStatus(status: string): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  getTypeName(typePublicId: string): string {
    return this.credentialTypes.find(t => t.publicId === typePublicId)?.name || typePublicId;
  }

  formatStatus(status: string): string {
    const key = `credentials.status.${status}`;
    const translated = this.transloco.translate(key);
    return translated !== key ? translated : status.replace(/_/g, ' ');
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'VALID': return 'check_circle';
      case 'EXPIRING_SOON': return 'schedule';
      case 'CRITICAL': return 'error';
      case 'EXPIRED': return 'cancel';
      case 'PENDING_REVIEW': return 'hourglass_top';
      case 'SUPERSEDED': return 'history';
      case 'REJECTED': return 'block';
      default: return 'info';
    }
  }

  openForm(credential?: Credential): void {
    const dialogRef = this.dialog.open(CredentialFormDialogComponent, {
      width: '550px', maxWidth: '95vw',
      data: {
        credential,
        agencyPublicId: this.authService.agencyPublicId(),
        credentialTypes: this.credentialTypes,
        employees: this.employees
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  onDelete(credential: Credential): void {
    const typeName = this.getTypeName(credential.credentialTypePublicId);
    const empName = this.getEmployeeName(credential.employeePublicId);
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px', maxWidth: '95vw',
      data: {
        title: this.transloco.translate('credentials.list.deleteTitle'),
        message: this.transloco.translate('credentials.list.deleteMessage', { type: typeName, name: empName }),
        confirmText: this.transloco.translate('common.delete'),
        icon: 'delete'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.credentialService.delete(credential.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('credentials.list.deletedOk'), 'OK', { duration: 3000 });
            this.loadData();
          },
          error: () => this.snackBar.open(this.transloco.translate('credentials.list.deleteError'), 'OK', { duration: 3000 })
        });
      }
    });
  }
}
