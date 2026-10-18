import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../../core/services/toast.service';
import { AgencyService } from '../../../core/services/agency.service';
import { AgentService } from '../../../core/services/agent.service';
import { AgencyResponse, AgentBriefingResponse } from '../../../core/models/agency.model';

@Component({
  selector: 'app-agent-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslocoModule,
    MatCardModule, MatSlideToggleModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page">
      <h1>{{ 'settings.agent.title' | transloco }}</h1>
      <p class="lead">{{ 'settings.agent.lead' | transloco }}</p>

      @if (loading) {
        <div class="center"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (agency) {
        <mat-card class="card" style="margin-bottom: 16px;">
          <mat-card-content>
            <h3>{{ 'settings.agent.contactTitle' | transloco }}</h3>
            <p class="muted">{{ 'settings.agent.contactHelp' | transloco }}</p>
            <div class="contact-row">
              <mat-form-field appearance="outline" class="contact-field">
                <mat-label>{{ 'settings.agent.contactLabel' | transloco }}</mat-label>
                <input matInput type="email" [(ngModel)]="contactEmail"
                       [placeholder]="'settings.agent.contactPlaceholder' | transloco"
                       autocomplete="email">
              </mat-form-field>
              <button mat-flat-button color="primary"
                      [disabled]="savingContact"
                      (click)="saveContactEmail()">
                @if (savingContact) {
                  <mat-spinner diameter="16" style="display:inline-block; vertical-align: middle; margin-right: 8px;"></mat-spinner>
                }
                {{ 'settings.agent.contactSave' | transloco }}
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="card">
          <mat-card-content>
            <div class="row">
              <div>
                <h3>{{ 'settings.agent.toggleTitle' | transloco }}</h3>
                <p class="muted">{{ 'settings.agent.toggleHelp' | transloco }}</p>
              </div>
              <mat-slide-toggle [(ngModel)]="briefingEnabled" color="primary"
                                (change)="onSettingsChanged()">
              </mat-slide-toggle>
            </div>

            <div class="row" style="margin-top: 24px;">
              <div>
                <h3>{{ 'settings.agent.languageTitle' | transloco }}</h3>
                <p class="muted">{{ 'settings.agent.languageHelp' | transloco }}</p>
              </div>
              <mat-form-field appearance="outline" style="min-width: 140px;">
                <mat-select [(value)]="briefingLanguage" (selectionChange)="onSettingsChanged()">
                  <mat-option value="en">English</mat-option>
                  <mat-option value="es">Español</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="actions">
              <button mat-flat-button color="primary"
                      [disabled]="previewing"
                      (click)="loadPreview()">
                @if (previewing) {
                  <mat-spinner diameter="16" style="display:inline-block; vertical-align: middle; margin-right: 8px;"></mat-spinner>
                } @else {
                  <mat-icon>visibility</mat-icon>
                }
                {{ 'settings.agent.previewBtn' | transloco }}
              </button>
            </div>

            @if (preview) {
              <div class="preview">
                <h4>{{ 'settings.agent.previewHeader' | transloco }}</h4>
                <div class="meta">
                  {{ preview.model }} ·
                  {{ 'settings.agent.tokens' | transloco: { input: preview.inputTokens, output: preview.outputTokens } }} ·
                  {{ 'settings.agent.cost' | transloco: { cents: preview.costCents } }}
                </div>
                <pre>{{ preview.text }}</pre>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 0 auto; padding: 24px; }
    .lead { color: #666; margin-bottom: 24px; }
    .card { padding: 16px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .row h3 { margin: 0 0 4px; font-size: 16px; color: #333; }
    .muted { margin: 0; color: #777; font-size: 13px; }
    .actions { margin-top: 24px; display: flex; gap: 12px; }
    .contact-row { display: flex; align-items: flex-start; gap: 12px; margin-top: 12px; }
    .contact-field { flex: 1; }
    .card h3 { margin: 0 0 4px; font-size: 16px; color: #333; }
    .preview { margin-top: 24px; padding: 16px; background: #f5f7fa; border-radius: 8px; border-left: 4px solid #00796b; }
    .preview h4 { margin: 0 0 6px; color: #004d40; }
    .preview .meta { color: #777; font-size: 12px; margin-bottom: 10px; }
    .preview pre { white-space: pre-wrap; font-family: inherit; margin: 0; color: #333; line-height: 1.5; }
    .center { display:flex; justify-content:center; padding: 48px; }
  `]
})
export class AgentSettingsComponent implements OnInit {
  private agencyService = inject(AgencyService);
  private agentService = inject(AgentService);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  loading = true;
  previewing = false;
  savingContact = false;
  agency: AgencyResponse | null = null;
  contactEmail = '';
  briefingEnabled = false;
  briefingLanguage: 'en' | 'es' = 'en';
  preview: AgentBriefingResponse | null = null;

  ngOnInit(): void {
    this.agencyService.getOwn().subscribe({
      next: a => {
        this.agency = a;
        this.contactEmail = a.contactEmail ?? '';
        this.briefingEnabled = a.briefingEnabled;
        this.briefingLanguage = a.briefingLanguage;
        this.loading = false;
      },
      error: () => { this.loading = false; this.toast.error(this.transloco.translate('settings.agent.loadFailed')); }
    });
  }

  saveContactEmail(): void {
    if (!this.agency) return;
    const trimmed = this.contactEmail.trim();
    this.savingContact = true;
    this.agencyService.updateContactEmail(this.agency.publicId, {
      contactEmail: trimmed.length ? trimmed : null
    }).subscribe({
      next: a => {
        this.agency = a;
        this.contactEmail = a.contactEmail ?? '';
        this.savingContact = false;
        this.toast.success(this.transloco.translate('settings.agent.saveSuccess'));
      },
      error: () => {
        this.savingContact = false;
        this.toast.error(this.transloco.translate('settings.agent.saveFailed'));
      }
    });
  }

  onSettingsChanged(): void {
    if (!this.agency) return;
    this.agencyService.updateBriefingSettings(this.agency.publicId, {
      enabled: this.briefingEnabled,
      language: this.briefingLanguage
    }).subscribe({
      next: a => {
        this.agency = a;
        this.toast.success(this.transloco.translate('settings.agent.saveSuccess'));
      },
      error: () => this.toast.error(this.transloco.translate('settings.agent.saveFailed'))
    });
  }

  loadPreview(): void {
    if (!this.agency) return;
    this.previewing = true;
    this.preview = null;
    this.agentService.previewDailyBriefing(this.agency.publicId).subscribe({
      next: r => { this.preview = r; this.previewing = false; },
      error: err => {
        this.previewing = false;
        this.toast.error(err?.error?.message || this.transloco.translate('settings.agent.previewFailed'));
      }
    });
  }
}
