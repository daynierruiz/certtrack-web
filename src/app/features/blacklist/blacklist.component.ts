import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { BlacklistService } from '../../core/services/blacklist.service';
import { BlacklistEntry } from '../../core/models/blacklist.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-blacklist',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule, TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'blacklist.title' | transloco }}</h1>
      <p class="subtitle">{{ 'blacklist.subtitle' | transloco }}</p>
    </div>

    <!-- Add entry -->
    <mat-card class="add-card">
      <mat-card-content>
        <form #addForm="ngForm" (ngSubmit)="add(addForm)">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'common.firstName' | transloco }}</mat-label>
              <input matInput [(ngModel)]="newEntry.firstName" name="firstName" required maxlength="100">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'common.lastName' | transloco }}</mat-label>
              <input matInput [(ngModel)]="newEntry.lastName" name="lastName" required maxlength="100">
            </mat-form-field>
          </div>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'common.email' | transloco }}</mat-label>
              <input matInput type="email" [(ngModel)]="newEntry.email" name="email" email maxlength="191">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'common.phone' | transloco }}</mat-label>
              <input matInput type="tel" [(ngModel)]="newEntry.phone" name="phone" maxlength="30">
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'blacklist.reason' | transloco }}</mat-label>
            <textarea matInput [(ngModel)]="newEntry.reason" name="reason" rows="2" maxlength="2000"></textarea>
          </mat-form-field>
          <button mat-raised-button color="warn" type="submit" [disabled]="saving || !addForm.valid">
            <mat-icon>block</mat-icon> {{ 'blacklist.add' | transloco }}
          </button>
        </form>
      </mat-card-content>
    </mat-card>

    @if (loading) {
      <div class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (entries.length === 0) {
      <mat-card class="empty-card"><mat-card-content>
        <div class="empty-state"><mat-icon>block</mat-icon><p>{{ 'blacklist.empty' | transloco }}</p></div>
      </mat-card-content></mat-card>
    } @else {
      <mat-card>
        <div class="table-scroll">
          <table mat-table [dataSource]="entries" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | transloco }}</th>
              <td mat-cell *matCellDef="let r"><strong>{{ r.lastName }}, {{ r.firstName }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="contact">
              <th mat-header-cell *matHeaderCellDef>{{ 'blacklist.contact' | transloco }}</th>
              <td mat-cell *matCellDef="let r">
                <div>{{ r.email || '—' }}</div>
                <div class="muted">{{ r.phone || '' }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="reason">
              <th mat-header-cell *matHeaderCellDef>{{ 'blacklist.reason' | transloco }}</th>
              <td mat-cell *matCellDef="let r">{{ r.reason || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="added">
              <th mat-header-cell *matHeaderCellDef>{{ 'blacklist.added_col' | transloco }}</th>
              <td mat-cell *matCellDef="let r">
                <div>{{ r.createdAt | date:'mediumDate' }}</div>
                <div class="muted">{{ r.addedByName }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r" class="actions-cell">
                <button mat-icon-button color="primary" [matTooltip]="'blacklist.remove' | transloco" (click)="remove(r)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>
      </mat-card>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 16px; }
    .page-header h1 { margin: 0; font-size: 24px; color: #1a237e; }
    .subtitle { color: #666; margin: 4px 0 0; }
    .add-card { margin-bottom: 20px; }
    .form-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .form-row mat-form-field { flex: 1 1 220px; }
    .full-width { width: 100%; }
    .table-scroll { width: 100%; overflow-x: auto; }
    .full-width.mat-mdc-table, table.full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .empty-state { text-align: center; padding: 40px; color: #999; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .muted { font-size: 12px; color: #888; }
    .actions-cell { text-align: right; }
  `]
})
export class BlacklistComponent implements OnInit {
  entries: BlacklistEntry[] = [];
  loading = true;
  saving = false;
  cols = ['name', 'contact', 'reason', 'added', 'actions'];
  newEntry = { firstName: '', lastName: '', email: '', phone: '', reason: '' };

  constructor(
    private blacklistService: BlacklistService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.blacklistService.list(0, 500).subscribe({
      next: page => { this.entries = page.content; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  add(form: { resetForm: () => void }): void {
    this.saving = true;
    this.blacklistService.create({
      firstName: this.newEntry.firstName.trim(),
      lastName: this.newEntry.lastName.trim(),
      email: this.newEntry.email.trim() || undefined,
      phone: this.newEntry.phone.trim() || undefined,
      reason: this.newEntry.reason.trim() || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.newEntry = { firstName: '', lastName: '', email: '', phone: '', reason: '' };
        form.resetForm();
        this.snackBar.open(this.transloco.translate('blacklist.added'), 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.transloco.translate('blacklist.addError'), 'OK', { duration: 5000 });
      }
    });
  }

  remove(entry: BlacklistEntry): void {
    const data: ConfirmDialogData = {
      title: this.transloco.translate('blacklist.removeTitle'),
      message: this.transloco.translate('blacklist.removeMessage', { name: `${entry.firstName} ${entry.lastName}` }),
      confirmText: this.transloco.translate('blacklist.remove'),
      color: 'warn',
      icon: 'delete'
    };
    this.dialog.open(ConfirmDialogComponent, { width: '420px', maxWidth: '95vw', data })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) return;
        this.blacklistService.delete(entry.publicId).subscribe({
          next: () => {
            this.snackBar.open(this.transloco.translate('blacklist.removedOk'), 'OK', { duration: 3000 });
            this.load();
          },
          error: () => this.snackBar.open(this.transloco.translate('blacklist.removeError'), 'OK', { duration: 4000 })
        });
      });
  }
}
