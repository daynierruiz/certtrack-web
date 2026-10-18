import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AgentService } from '../../core/services/agent.service';
import { AuthService } from '../../core/services/auth.service';
import { RiskScore } from '../../core/models/risk-score.model';

/**
 * Full caregiver risk list (the dashboard card shows only the top 5). Lists
 * every scored active/onboarding caregiver, highest risk first.
 */
@Component({
  selector: 'app-risk-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, TranslocoModule,
    MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  template: `
    <div class="risk-page">
      <div class="risk-head">
        <a mat-button routerLink="/dashboard"><mat-icon>arrow_back</mat-icon> {{ 'nav.dashboard' | transloco }}</a>
        <h1>{{ 'risk.title' | transloco }}</h1>
      </div>

      @if (loading) {
        <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (scores.length === 0) {
        <mat-card class="empty"><mat-icon>verified</mat-icon> {{ 'risk.empty' | transloco }}</mat-card>
      } @else {
        <mat-card>
          <div class="risk-list">
            @for (r of scores; track r.employeePublicId) {
              <div class="risk-row clickable" (click)="goToEmployee(r.employeePublicId)"
                   [matTooltip]="tooltip(r)" matTooltipClass="risk-factors-tooltip">
                <span class="risk-chip" [class]="'level-' + r.level">{{ r.score }}</span>
                <div class="risk-info">
                  <div class="risk-name">
                    {{ r.employeeName }}
                    <span class="risk-level-tag" [class]="'level-' + r.level">{{ ('dashboard.riskCaregivers.level' + r.level) | transloco }}</span>
                  </div>
                  <div class="risk-reason">{{ r.factors[0]?.description }}</div>
                </div>
                <mat-icon class="risk-arrow">chevron_right</mat-icon>
              </div>
            }
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .risk-page { max-width: 760px; margin: 0 auto; padding: 16px; }
    .risk-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .risk-head h1 { font-size: 20px; margin: 0; }
    .loading-container { display: flex; justify-content: center; padding: 48px; }
    .empty { display: flex; align-items: center; gap: 10px; padding: 24px; color: #2e7d32; }
    .risk-list { display: flex; flex-direction: column; gap: 6px; }
    .risk-row { display: flex; align-items: center; gap: 12px; padding: 10px 6px; border-bottom: 1px solid #f0f0f0; }
    .risk-row.clickable { cursor: pointer; }
    .risk-row.clickable:hover { background: #f5f5f5; }
    .risk-chip {
      min-width: 34px; height: 34px; border-radius: 17px; display: flex; align-items: center;
      justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex: 0 0 auto;
    }
    .risk-chip.level-RED { background: #c62828; }
    .risk-chip.level-ORANGE { background: #ef6c00; }
    .risk-chip.level-YELLOW { background: #f9a825; color: #333; }
    .risk-chip.level-GREEN { background: #2e7d32; }
    .risk-info { flex: 1; min-width: 0; }
    .risk-name { font-weight: 600; font-size: 14px; color: #333; }
    .risk-level-tag {
      font-size: 11px; font-weight: 600; margin-left: 6px; padding: 1px 7px;
      border-radius: 10px; color: #fff; vertical-align: middle;
    }
    .risk-level-tag.level-RED { background: #c62828; }
    .risk-level-tag.level-ORANGE { background: #ef6c00; }
    .risk-level-tag.level-YELLOW { background: #f9a825; color: #333; }
    .risk-level-tag.level-GREEN { background: #2e7d32; }
    .risk-reason { font-size: 13px; color: #777; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .risk-arrow { color: #ccc; }
  `]
})
export class RiskListComponent implements OnInit {
  private agentService = inject(AgentService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  scores: RiskScore[] = [];
  loading = true;

  ngOnInit(): void {
    this.agentService.listRiskScores(this.authService.agencyPublicId()).subscribe({
      next: scores => {
        this.scores = scores;
        this.loading = false;
      },
      error: () => {
        this.scores = [];
        this.loading = false;
      }
    });
  }

  goToEmployee(publicId: string): void {
    this.router.navigate(['/employees', publicId]);
  }

  tooltip(r: RiskScore): string {
    if (!r.factors?.length) {
      return '';
    }
    return r.factors.map(f => `• ${f.description} (+${f.points})`).join('\n');
  }
}
