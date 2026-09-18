import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ContractTemplateService } from '../../../core/services/contract-template.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContractTemplate } from '../../../core/models/contract.model';
import { ContractTemplateFormDialogComponent } from '../contract-template-form-dialog/contract-template-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';

@Component({
  selector: 'app-contract-template-list',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule,
    MatIconModule, MatCardModule, MatChipsModule, MatDialogModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatMenuModule, MatTooltipModule,
    TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h2>{{ 'contracts.templateList.title' | transloco }}</h2>
      <button mat-raised-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> {{ 'contracts.templateList.newTemplate' | transloco }}
      </button>
    </div>

    <mat-card>
      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <div class="table-scroll">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.name' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <div class="cell-main">{{ row.name }}</div>
              @if (row.description) {
                <div class="cell-sub">{{ row.description }}</div>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="isActive">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.status' | transloco }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [class.active]="row.isActive" [class.inactive]="!row.isActive">
                <mat-icon class="status-icon">{{ row.isActive ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ row.isActive ? ('common.active' | transloco) : ('common.inactive' | transloco) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'contracts.templateList.created' | transloco }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button [matTooltip]="'common.edit' | transloco" (click)="openForm(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button [matMenuTriggerFor]="rowMenu" [matTooltip]="'contracts.templateList.moreActions' | transloco">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #rowMenu="matMenu">
                <button mat-menu-item (click)="openForm(row)">
                  <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
                </button>
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

        @if (dataSource.data.length === 0) {
          <div class="empty-state">
            <mat-icon>description</mat-icon>
            <p>{{ 'contracts.templateList.emptyState' | transloco }}</p>
          </div>
        }

        <mat-paginator [pageSize]="20" [pageSizeOptions]="[10, 20, 50]" showFirstLastButtons>
        </mat-paginator>
      }
    </mat-card>
  `,
  styles: [`
    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .page-header h2 { margin: 0; }
    .full-width { width: 100%; }
    .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
    }
    .status-icon { font-size: 13px !important; width: 13px !important; height: 13px !important; }
    .status-chip.active { background: #e8f5e9; color: #2e7d32; }
    .status-chip.inactive { background: #eeeeee; color: #616161; }
    .empty-state {
      text-align: center; padding: 48px; color: #999;
    }
    .empty-state mat-icon {
      font-size: 48px; width: 48px; height: 48px; color: #ccc;
    }
    .cell-main { font-weight: 500; }
    .cell-sub { font-size: 12px; color: #888; margin-top: 2px; }
    @media (max-width: 768px) {
      .page-header { flex-direction: column; align-items: stretch; gap: 8px; }
      .page-header button { width: 100%; }
    }
  `]
})
export class ContractTemplateListComponent implements OnInit {
  dataSource = new MatTableDataSource<ContractTemplate>();
  loading = true;
  displayedColumns = ['name', 'isActive', 'createdAt', 'actions'];

  @ViewChild(MatSort) set sort(s: MatSort) {
    if (s) this.dataSource.sort = s;
  }
  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    if (p) this.dataSource.paginator = p;
  }

  constructor(
    private templateService: ContractTemplateService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private breakpointObserver: BreakpointObserver,
    private transloco: TranslocoService
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.displayedColumns = result.matches
        ? ['name', 'isActive', 'actions']
        : ['name', 'isActive', 'createdAt', 'actions'];
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const agencyId = this.authService.agencyPublicId();
    this.templateService.getAll(agencyId, 0, 1000).subscribe({
      next: page => {
        this.dataSource.data = page.content;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openForm(template?: ContractTemplate): void {
    const ref = this.dialog.open(ContractTemplateFormDialogComponent, {
      width: '650px', maxWidth: '95vw',
      data: {
        template,
        agencyPublicId: this.authService.agencyPublicId()
      }
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  onDelete(template: ContractTemplate): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px', maxWidth: '95vw',
      data: {
        title: this.transloco.translate('contracts.templateList.deleteTitle'),
        message: this.transloco.translate('contracts.templateList.deleteMessage', { name: template.name }),
        confirmText: this.transloco.translate('common.delete'),
        icon: 'delete'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.templateService.delete(template.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('contracts.templateList.deleteSuccess'), 'OK', { duration: 3000 });
            this.loadData();
          },
          error: () => this.snackBar.open(this.transloco.translate('contracts.templateList.deleteError'), 'OK', { duration: 3000 })
        });
      }
    });
  }
}
