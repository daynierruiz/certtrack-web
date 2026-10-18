import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { PositionService } from '../../../core/services/position.service';
import { Employee } from '../../../core/models/employee.model';
import { PositionResponse } from '../../../core/models/position.model';
import { LANGUAGE_OPTIONS, LanguageCode } from '../../../core/models/applicant.model';
import { EmployeeFormDialogComponent } from '../employee-form-dialog/employee-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDialogModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatMenuModule, MatTooltipModule, MatDividerModule,
    TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'employees.list.title' | transloco }}</h2>
      <button mat-raised-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> {{ 'employees.list.addEmployee' | transloco }}
      </button>
    </div>

    <mat-card>
      <div class="filters-bar">
        <div class="filters-top">
          <mat-form-field appearance="outline" class="filter-search">
            <mat-label>{{ 'common.search' | transloco }}</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput
                   [(ngModel)]="filterState.search"
                   (ngModelChange)="applyFilters()"
                   [placeholder]="'employees.list.searchPlaceholder' | transloco">
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-positions">
            <mat-label>{{ 'employees.list.positionFilter' | transloco }}</mat-label>
            <mat-icon matPrefix>work</mat-icon>
            <mat-select multiple
                        [(value)]="filterState.positionPublicIds"
                        (selectionChange)="applyFilters()">
              @for (p of availablePositions; track p.publicId) {
                <mat-option [value]="p.publicId">{{ p.name }} ({{ p.code }})</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-stroked-button class="filter-toggle"
                  (click)="advancedFiltersOpen = !advancedFiltersOpen">
            <mat-icon>tune</mat-icon>
            {{ 'employees.list.filters' | transloco }}
            @if (activeAdvancedCount > 0) {
              <span class="filter-badge">{{ activeAdvancedCount }}</span>
            }
          </button>
        </div>

        @if (advancedFiltersOpen) {
          <div class="filters-advanced">
            <mat-form-field appearance="outline" class="filter-languages">
              <mat-label>{{ 'employees.list.languages' | transloco }}</mat-label>
              <mat-select multiple
                          [(value)]="filterState.languages"
                          (selectionChange)="applyFilters()">
                @for (lang of languageOptions; track lang.value) {
                  <mat-option [value]="lang.value">{{ 'spokenLanguages.' + lang.value | transloco }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-state">
              <mat-label>{{ 'employees.list.stateFilter' | transloco }}</mat-label>
              <input matInput
                     [(ngModel)]="filterState.state"
                     (ngModelChange)="onStateChange($event)"
                     maxlength="2"
                     placeholder="FL">
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-city">
              <mat-label>{{ 'employees.list.cityFilter' | transloco }}</mat-label>
              <input matInput
                     [(ngModel)]="filterState.city"
                     (ngModelChange)="applyFilters()">
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-zip">
              <mat-label>{{ 'employees.list.zipFilter' | transloco }}</mat-label>
              <input matInput
                     [(ngModel)]="filterState.postalCode"
                     (ngModelChange)="applyFilters()"
                     maxlength="10">
            </mat-form-field>

            @if (hasActiveFilters()) {
              <button mat-stroked-button class="filter-clear" (click)="clearFilters()">
                <mat-icon>clear</mat-icon> {{ 'employees.list.clearFilters' | transloco }}
              </button>
            }
          </div>
        }
      </div>

      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        @if (isMobile) {
        <!-- Mobile: stacked cards instead of a horizontally-scrolling table -->
        <div class="card-list">
          @for (row of pagedData; track row.publicId) {
            <div class="entity-card" (click)="viewProfile(row)">
              <div class="entity-card-top">
                <a class="name-link"
                   [routerLink]="['/employees', row.publicId]"
                   (click)="$event.stopPropagation()">
                  <strong>{{ row.lastName }}, {{ row.firstName }}</strong>
                </a>
                <span class="status-chip" [class]="'status-' + row.status">
                  {{ 'employees.status.' + row.status | transloco }}
                </span>
              </div>
              @if (row.email) {
                <div class="entity-card-line"><mat-icon>email</mat-icon> {{ row.email }}</div>
              }
              @if (row.phone) {
                <div class="entity-card-line"><mat-icon>phone</mat-icon> {{ row.phone }}</div>
              }
              @if (row.address) {
                <div class="entity-card-line">
                  <mat-icon>location_on</mat-icon> {{ row.address.city }}, {{ row.address.state }}
                </div>
              }
              @if (row.languages.length) {
                <mat-chip-set class="entity-card-langs">
                  @for (lang of row.languages; track lang) {
                    <mat-chip>{{ 'spokenLanguages.' + lang | transloco }}</mat-chip>
                  }
                </mat-chip-set>
              }
              <div class="entity-card-actions">
                <button mat-icon-button
                        [matMenuTriggerFor]="cardMenu"
                        [matMenuTriggerData]="{ row: row }"
                        (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>

        <mat-menu #cardMenu="matMenu">
          <ng-template matMenuContent let-row="row">
            <button mat-menu-item (click)="viewProfile(row)">
              <mat-icon>visibility</mat-icon> {{ 'employees.list.viewProfile' | transloco }}
            </button>
            <button mat-menu-item (click)="openForm(row)">
              <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="onDelete(row)">
              <mat-icon color="warn">delete</mat-icon> {{ 'common.delete' | transloco }}
            </button>
          </ng-template>
        </mat-menu>
      } @else {
        <div class="table-scroll">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.name' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <div class="cell-main name-link" (click)="viewProfile(row); $event.stopPropagation()">
                <strong>{{ row.lastName }}, {{ row.firstName }}</strong>
              </div>
              @if (isMobile && row.email) {
                <div class="cell-sub">{{ row.email }}</div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.email' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.email || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.phone' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.phone || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="languages">
            <th mat-header-cell *matHeaderCellDef>{{ 'employees.list.languages' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.languages?.length) {
                <mat-chip-set>
                  @for (lang of row.languages; track lang) {
                    <mat-chip>{{ 'spokenLanguages.' + lang | transloco }}</mat-chip>
                  }
                </mat-chip-set>
              } @else {
                <span class="muted">-</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="address">
            <th mat-header-cell *matHeaderCellDef>{{ 'employees.list.addressCol' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.address) {
                <div class="addr-line">{{ row.address.city }}, {{ row.address.state }}</div>
                <div class="addr-sub">{{ row.address.postalCode }}</div>
              } @else {
                <span class="muted">-</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.status' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [class]="'status-' + row.status">
                {{ 'employees.status.' + row.status | transloco }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="hireDate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'employees.list.hireDate' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.hireDate || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              <button mat-icon-button
                      [matTooltip]="'employees.list.viewProfile' | transloco"
                      (click)="viewProfile(row); $event.stopPropagation()">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button [matMenuTriggerFor]="rowMenu"
                      [matTooltip]="'employees.list.moreActions' | transloco"
                      (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #rowMenu="matMenu">
                <button mat-menu-item (click)="viewProfile(row)">
                  <mat-icon>visibility</mat-icon> {{ 'employees.list.viewProfile' | transloco }}
                </button>
                <button mat-menu-item (click)="openForm(row)">
                  <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="onDelete(row)">
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
            <mat-icon>people_outline</mat-icon>
            <p>{{ 'employees.list.noEmployees' | transloco }}</p>
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
    .filters-bar { padding: 16px 16px 0; }
    .filters-top { display: flex; gap: 12px; align-items: flex-start; }
    .filter-search { flex: 1 1 auto; min-width: 0; }
    .filter-positions { flex: 0 1 260px; min-width: 200px; }
    .filter-toggle { height: 56px; flex-shrink: 0; white-space: nowrap; }
    @media (max-width: 768px) {
      .filters-top { flex-wrap: wrap; }
      .filter-positions { flex: 1 1 100%; }
    }
    .filter-badge {
      margin-left: 6px; background: #1565c0; color: white;
      border-radius: 10px; padding: 1px 7px; font-size: 11px; font-weight: 600;
    }
    .filters-advanced {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .filter-languages { flex: 0 1 220px; }
    .filter-state { flex: 0 1 90px; }
    .filter-city { flex: 0 1 160px; }
    .filter-zip { flex: 0 1 110px; }
    .filter-clear { height: 56px; margin-bottom: 1.34375em; }
    .addr-line { font-size: 13px; }
    .addr-sub { font-size: 12px; color: #757575; }
    .muted { color: #bbb; }
    mat-chip-set { gap: 4px; }
    .mat-mdc-chip { font-size: 11px; min-height: 22px; }
    .full-width { width: 100%; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .status-chip {
      padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
    }
    .status-ACTIVE { background: #e8f5e9; color: #2e7d32; }
    .status-APPLICANT { background: #e3f2fd; color: #1565c0; }
    .status-ONBOARDING { background: #f3e5f5; color: #7b1fa2; }
    .status-INACTIVE { background: #fff3e0; color: #e65100; }
    .status-TERMINATED { background: #eeeeee; color: #616161; }
    .empty-state {
      text-align: center; padding: 48px; color: #999;
    }
    .empty-state mat-icon {
      font-size: 48px; width: 48px; height: 48px; color: #ccc;
    }
    .cell-sub { font-size: 12px; color: #888; line-height: 1.3; }
    .name-link { cursor: pointer; color: #1565c0; }
    .name-link:hover { text-decoration: underline; }
    .actions-cell { white-space: nowrap; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    /* Mobile card list */
    .card-list { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .entity-card {
      position: relative;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
    }
    .entity-card:active { background: #fafafa; }
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
    .entity-card-langs { margin-top: 8px; }
    .entity-card-actions { position: absolute; top: 8px; right: 6px; }
    @media (max-width: 768px) {
      .page-header { flex-direction: column; align-items: stretch; gap: 8px; }
      .page-header button { width: 100%; }
      /* Stack all filters full-width so nothing overflows the viewport */
      .filters-bar { padding: 12px 12px 0; }
      .filters-advanced { gap: 8px; }
      .filters-advanced > * {
        flex: 1 1 100% !important;
        min-width: 0 !important;
        width: 100%;
      }
      .filter-clear { height: auto; margin-bottom: 8px; }
    }
  `]
})
export class EmployeeListComponent implements OnInit {
  dataSource = new MatTableDataSource<Employee>();
  loading = true;
  totalElements = 0;
  pageSize = 20;
  pageIndex = 0;
  isMobile = false;
  advancedFiltersOpen = true;
  displayedColumns = ['name', 'languages', 'address', 'status', 'hireDate', 'actions'];

  readonly languageOptions = LANGUAGE_OPTIONS;
  availablePositions: PositionResponse[] = [];

  filterState = {
    search: '',
    positionPublicIds: [] as string[],
    languages: [] as LanguageCode[],
    state: '',
    city: '',
    postalCode: ''
  };

  private readonly desktopColumns = ['name', 'languages', 'address', 'status', 'hireDate', 'actions'];
  private readonly mobileColumns = ['name', 'status', 'actions'];

  // Language display labels are translated in the template via the
  // 'spokenLanguages.<CODE>' Transloco key.

  hasActiveFilters(): boolean {
    return !!(this.filterState.search
      || this.filterState.positionPublicIds.length
      || this.filterState.languages.length
      || this.filterState.state
      || this.filterState.city
      || this.filterState.postalCode);
  }

  /** Current page slice of filtered data — used by the mobile card view. */
  get pagedData(): Employee[] {
    const data = this.dataSource.filteredData;
    const paginator = this.dataSource.paginator;
    if (!paginator) return data;
    const start = paginator.pageIndex * paginator.pageSize;
    return data.slice(start, start + paginator.pageSize);
  }

  /** Count of active ADVANCED filters (excludes the always-visible search). */
  get activeAdvancedCount(): number {
    let n = 0;
    if (this.filterState.languages.length) n++;
    if (this.filterState.state) n++;
    if (this.filterState.city) n++;
    if (this.filterState.postalCode) n++;
    return n;
  }

  onStateChange(value: string): void {
    this.filterState.state = (value || '').toUpperCase();
    this.applyFilters();
  }

  applyFilters(): void {
    this.dataSource.filter = JSON.stringify(this.filterState);
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  clearFilters(): void {
    this.filterState = {
      search: '',
      positionPublicIds: [],
      languages: [],
      state: '',
      city: '',
      postalCode: ''
    };
    this.applyFilters();
  }

  @ViewChild(MatSort) set sort(s: MatSort) {
    if (s) this.dataSource.sort = s;
  }
  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    if (p) this.dataSource.paginator = p;
  }

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService,
    private positionService: PositionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private route: ActivatedRoute,
    private router: Router,
    private transloco: TranslocoService
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
      this.displayedColumns = result.matches ? this.mobileColumns : this.desktopColumns;
      // Advanced filters open by default on desktop, collapsed on mobile to save space.
      this.advancedFiltersOpen = !result.matches;
    });
  }

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name': return `${item.lastName} ${item.firstName}`.toLowerCase();
        case 'email': return item.email?.toLowerCase() || '';
        case 'phone': return item.phone || '';
        case 'status': return item.status;
        case 'hireDate': return item.hireDate || '';
        default: return '';
      }
    };
    this.dataSource.filterPredicate = (data, filter) => {
      const f = JSON.parse(filter) as typeof this.filterState;

      if (f.search) {
        const haystack = `${data.firstName} ${data.lastName} ${data.email ?? ''} ${data.phone ?? ''} ${data.status}`
          .toLowerCase();
        if (!haystack.includes(f.search.toLowerCase())) return false;
      }

      if (f.positionPublicIds && f.positionPublicIds.length > 0) {
        const empPositionIds = (data.positions ?? []).map(p => p.publicId);
        if (!f.positionPublicIds.some((id: string) => empPositionIds.includes(id))) return false;
      }

      if (f.languages.length > 0) {
        const empLangs = data.languages ?? [];
        if (!f.languages.some(lang => empLangs.includes(lang))) return false;
      }

      if (f.state) {
        if ((data.address?.state ?? '').toUpperCase() !== f.state.toUpperCase()) return false;
      }

      if (f.city) {
        const empCity = (data.address?.city ?? '').toLowerCase();
        if (!empCity.includes(f.city.toLowerCase())) return false;
      }

      if (f.postalCode) {
        const empZip = data.address?.postalCode ?? '';
        if (!empZip.startsWith(f.postalCode)) return false;
      }

      return true;
    };
    // Initialize filter so MatTableDataSource picks up the predicate.
    this.applyFilters();
    this.loadData();
    this.loadPositions();
  }

  private loadPositions(): void {
    const agencyId = this.authService.agencyPublicId();
    this.positionService.getAll(agencyId, 0, 200).subscribe({
      next: page => {
        // Active first, then by name for a stable dropdown order.
        this.availablePositions = page.content
          .slice()
          .sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
      }
    });
  }

  loadData(): void {
    this.loading = true;
    const agencyId = this.authService.agencyPublicId();
    this.employeeService.getAll(agencyId, 0, 10000).subscribe({
      next: page => {
        // Employees screen shows hired staff only — applicants/onboarding live on
        // the Applicants screen, so exclude the hiring pipeline here.
        const staff = page.content.filter(
          e => e.status !== 'APPLICANT' && e.status !== 'ONBOARDING');
        this.dataSource.data = staff;
        this.loading = false;
        this.checkSelectedParam(staff);
      },
      error: () => { this.loading = false; }
    });
  }

  private checkSelectedParam(employees: Employee[]): void {
    const selectedId = this.route.snapshot.queryParamMap.get('selected');
    if (!selectedId) return;
    const employee = employees.find(e => e.publicId === selectedId);
    if (employee) {
      setTimeout(() => this.viewProfile(employee));
    }
  }

  viewProfile(employee: Employee): void {
    this.router.navigate(['/employees', employee.publicId]);
  }

  openForm(employee?: Employee): void {
    const dialogRef = this.dialog.open(EmployeeFormDialogComponent, {
      width: '500px', maxWidth: '95vw',
      data: { employee, agencyPublicId: this.authService.agencyPublicId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  onDelete(employee: Employee): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px', maxWidth: '95vw',
      data: {
        title: this.transloco.translate('employees.list.deleteTitle'),
        message: this.transloco.translate('employees.list.deleteMessage', {
          firstName: employee.firstName,
          lastName: employee.lastName
        }),
        confirmText: this.transloco.translate('common.delete'),
        icon: 'person_remove'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.employeeService.delete(employee.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('employees.list.deletedOk'), 'OK', { duration: 3000 });
            this.loadData();
          },
          error: () => this.snackBar.open(this.transloco.translate('employees.list.deleteError'), 'OK', { duration: 3000 })
        });
      }
    });
  }
}
