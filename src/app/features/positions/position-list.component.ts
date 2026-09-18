import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { PositionService } from '../../core/services/position.service';
import { AuthService } from '../../core/services/auth.service';
import { PositionResponse, PositionEligibilitySummary } from '../../core/models/position.model';
import { PositionFormDialogComponent } from './position-form-dialog.component';
import { PositionDetailDialogComponent } from './position-detail-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-position-list',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule, MatMenuModule,
    TranslocoModule
  ],
  template: `
    @if (loading) {
      <div class="loading-container"><mat-spinner></mat-spinner></div>
    } @else {
      <div class="header-row">
        <h2>{{ 'positions.list.title' | transloco }}</h2>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> {{ 'positions.list.newPosition' | transloco }}
        </button>
      </div>

      @if (positions.length === 0) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon>work_off</mat-icon>
            <h3>{{ 'positions.list.emptyTitle' | transloco }}</h3>
            <p>{{ 'positions.list.emptyHint' | transloco }}</p>
            <button mat-raised-button color="primary" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon> {{ 'positions.list.createFirst' | transloco }}
            </button>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="positions-grid">
          @for (pos of positions; track pos.publicId) {
            <mat-card class="position-card" (click)="openDetail(pos)">
              <mat-card-header>
                <mat-card-title>{{ pos.name }}</mat-card-title>
                <mat-card-subtitle>{{ pos.code }} &middot; {{ 'positions.list.requirementsCount' | transloco: { count: pos.requirements.length } }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (eligibilityMap[pos.publicId]; as elig) {
                  <div class="eligibility-stats">
                    <div class="elig-bar">
                      <div class="elig-fill eligible"
                           [style.width.%]="getEligPercent(elig, 'eligible')"></div>
                      <div class="elig-fill partial"
                           [style.width.%]="getEligPercent(elig, 'partial')"></div>
                      <div class="elig-fill not-eligible"
                           [style.width.%]="getEligPercent(elig, 'not')"></div>
                    </div>
                    <div class="elig-legend">
                      <span class="legend-item"><span class="dot eligible"></span> {{ elig.fullyEligible }} {{ 'positions.list.statusReady' | transloco }}</span>
                      <span class="legend-item"><span class="dot partial"></span> {{ elig.partiallyEligible }} {{ 'positions.list.statusAtRisk' | transloco }}</span>
                      <span class="legend-item"><span class="dot not-eligible"></span> {{ elig.notEligible }} {{ 'positions.list.statusBlocked' | transloco }}</span>
                    </div>
                    <div class="assigned-count">{{ 'positions.list.employeesAssigned' | transloco: { count: elig.totalAssigned } }}</div>
                  </div>
                } @else {
                  <div class="no-data">{{ 'positions.list.loadingEligibility' | transloco }}</div>
                }

                <div class="requirements-preview">
                  @for (req of pos.requirements.slice(0, 4); track req.publicId) {
                    <span class="req-chip" [class.mandatory]="req.isMandatory">
                      {{ req.credentialTypeCode }}
                    </span>
                  }
                  @if (pos.requirements.length > 4) {
                    <span class="req-chip more">+{{ pos.requirements.length - 4 }}</span>
                  }
                </div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-button (click)="openEdit(pos, $event)">
                  <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
                </button>
                <button mat-icon-button [matMenuTriggerFor]="posMenu"
                        (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #posMenu="matMenu">
                  <button mat-menu-item (click)="openDetail(pos)">
                    <mat-icon>visibility</mat-icon> {{ 'positions.list.viewEligibility' | transloco }}
                  </button>
                  <button mat-menu-item (click)="openEdit(pos, $event)">
                    <mat-icon>edit</mat-icon> {{ 'common.edit' | transloco }}
                  </button>
                  <button mat-menu-item (click)="deletePosition(pos, $event)">
                    <mat-icon color="warn">delete</mat-icon> {{ 'common.delete' | transloco }}
                  </button>
                </mat-menu>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    }
  `,
  styles: [`
    .loading-container { display: flex; justify-content: center; padding: 64px; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-row h2 { margin: 0; color: #333; }
    .empty-state { text-align: center; padding: 48px; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: #999; }
    .empty-state h3 { margin: 16px 0 8px; }
    .empty-state p { color: #666; margin-bottom: 16px; }
    .positions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }
    .position-card { cursor: pointer; transition: box-shadow 0.2s, transform 0.2s; }
    .position-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-2px); }
    .eligibility-stats { margin: 16px 0 12px; }
    .elig-bar {
      display: flex; height: 10px; border-radius: 5px; overflow: hidden;
      background: #eee; margin-bottom: 8px;
    }
    .elig-fill.eligible { background: #4caf50; }
    .elig-fill.partial { background: #ff9800; }
    .elig-fill.not-eligible { background: #f44336; }
    .elig-legend { display: flex; gap: 12px; font-size: 12px; color: #555; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot.eligible { background: #4caf50; }
    .dot.partial { background: #ff9800; }
    .dot.not-eligible { background: #f44336; }
    .assigned-count { font-size: 12px; color: #999; margin-top: 4px; }
    .no-data { font-size: 13px; color: #999; padding: 8px 0; }
    .requirements-preview { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
    .req-chip {
      padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;
      background: #e8f5e9; color: #2e7d32;
    }
    .req-chip.mandatory { background: #e3f2fd; color: #1565c0; }
    .req-chip.more { background: #f5f5f5; color: #999; }
    mat-card-actions { display: flex; justify-content: flex-end; }
    @media (max-width: 768px) {
      .header-row { flex-direction: column; align-items: stretch; gap: 8px; }
      .header-row button { width: 100%; }
      .positions-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .elig-legend { font-size: 11px; gap: 8px; }
    }
  `]
})
export class PositionListComponent implements OnInit {
  positions: PositionResponse[] = [];
  eligibilityMap: Record<string, PositionEligibilitySummary> = {};
  loading = true;

  constructor(
    private positionService: PositionService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadPositions();
  }

  loadPositions(): void {
    const agencyId = this.authService.agencyPublicId();
    if (!agencyId) return;

    this.positionService.getAll(agencyId).subscribe({
      next: page => {
        this.positions = page.content;
        this.loading = false;
        this.positions.forEach(p => this.loadEligibility(p.publicId));
      },
      error: () => { this.loading = false; }
    });
  }

  loadEligibility(publicId: string): void {
    this.positionService.getPositionEligibility(publicId).subscribe({
      next: summary => { this.eligibilityMap[publicId] = summary; }
    });
  }

  getEligPercent(elig: PositionEligibilitySummary, type: string): number {
    if (elig.totalAssigned === 0) return 0;
    const val = type === 'eligible' ? elig.fullyEligible
              : type === 'partial' ? elig.partiallyEligible
              : elig.notEligible;
    return (val / elig.totalAssigned) * 100;
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(PositionFormDialogComponent, {
      width: '600px', maxWidth: '95vw',
      data: { agencyPublicId: this.authService.agencyPublicId() }
    });
    ref.afterClosed().subscribe(result => { if (result) this.loadPositions(); });
  }

  openEdit(pos: PositionResponse, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(PositionFormDialogComponent, {
      width: '600px', maxWidth: '95vw',
      data: { agencyPublicId: this.authService.agencyPublicId(), position: pos }
    });
    ref.afterClosed().subscribe(result => { if (result) this.loadPositions(); });
  }

  openDetail(pos: PositionResponse): void {
    this.dialog.open(PositionDetailDialogComponent, {
      width: '800px', maxWidth: '95vw', maxHeight: '90vh',
      data: {
        positionPublicId: pos.publicId,
        agencyPublicId: this.authService.agencyPublicId(),
        positionName: pos.name,
        positionCode: pos.code,
        requirements: pos.requirements
      }
    });
  }

  deletePosition(pos: PositionResponse, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px', maxWidth: '95vw',
      data: {
        title: this.transloco.translate('positions.list.deleteTitle'),
        message: this.transloco.translate('positions.list.deleteMessage', { name: pos.name }),
        confirmText: this.transloco.translate('common.delete'),
        icon: 'delete'
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.positionService.delete(pos.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('positions.list.deleteSuccess'), 'OK', { duration: 3000 });
            this.loadPositions();
          },
          error: () => this.snackBar.open(this.transloco.translate('positions.list.deleteError'), 'Close', { duration: 5000 })
        });
      }
    });
  }
}
