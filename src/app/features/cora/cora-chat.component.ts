import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { CoraService } from '../../core/services/cora.service';
import { LanguageService } from '../../core/services/language.service';
import { VoiceService } from '../../core/services/voice.service';
import { CoraEmailOffer, CoraTurn } from '../../core/models/cora.model';

/**
 * "Cora" — floating admin assistant widget. Read-only v1: asks the backend
 * (which uses Claude tool-use over agency-scoped query services) and shows the
 * reply. Rendered only for admins (see LayoutComponent gating).
 */
@Component({
  selector: 'app-cora-chat',
  standalone: true,
  imports: [
    FormsModule,
    TranslocoModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <button
      mat-fab
      class="cora-fab"
      [class.is-open]="open"
      type="button"
      (click)="toggle()"
      [attr.aria-label]="'cora.toggle' | transloco">
      @if (open) {
        <mat-icon>close</mat-icon>
      } @else {
        <!-- "Cora" avatar: friendly screen-faced assistant, on-brand blue + teal. -->
        <svg class="cora-avatar" viewBox="0 0 48 48" width="30" height="30" aria-hidden="true">
          <!-- antenna with teal tip -->
          <line x1="24" y1="12.5" x2="24" y2="7" stroke="#fff" stroke-width="2" stroke-linecap="round" />
          <circle cx="24" cy="5" r="2.4" fill="#fff" />
          <circle cx="24" cy="5" r="1.2" fill="#14b8a6" />
          <!-- ears -->
          <rect x="5.5" y="21" width="3" height="6" rx="1.5" fill="#fff" opacity="0.9" />
          <rect x="39.5" y="21" width="3" height="6" rx="1.5" fill="#fff" opacity="0.9" />
          <!-- head -->
          <rect x="8" y="12.5" width="32" height="24" rx="11" fill="#fff" />
          <!-- inset screen (depth) -->
          <rect x="12.5" y="16.5" width="23" height="15.5" rx="7.5" fill="#e8f0fc" stroke="#cfe0f5" stroke-width="0.8" />
          <path d="M16 19 q8 -2.5 16 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.6" />
          <!-- soft teal cheeks -->
          <circle cx="15.5" cy="27.5" r="1.6" fill="#14b8a6" opacity="0.22" />
          <circle cx="32.5" cy="27.5" r="1.6" fill="#14b8a6" opacity="0.22" />
          <!-- eyes -->
          <circle cx="19.5" cy="23.8" r="2.7" fill="#2563eb" />
          <circle cx="28.5" cy="23.8" r="2.7" fill="#2563eb" />
          <circle cx="20.5" cy="22.9" r="0.85" fill="#fff" />
          <circle cx="29.5" cy="22.9" r="0.85" fill="#fff" />
          <!-- smile -->
          <path d="M19 27.4 Q24 30.8 29 27.4" stroke="#14b8a6" stroke-width="2" fill="none" stroke-linecap="round" />
        </svg>
      }
    </button>

    @if (open) {
      <mat-card class="cora-panel" [class.expanded]="expanded" role="dialog" [attr.aria-label]="'cora.title' | transloco">
        <div class="cora-header">
          <svg class="cora-avatar-sm" viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">
            <line x1="24" y1="12.5" x2="24" y2="7" stroke="#fff" stroke-width="2" stroke-linecap="round" />
            <circle cx="24" cy="5" r="2.4" fill="#fff" />
            <circle cx="24" cy="5" r="1.2" fill="#14b8a6" />
            <rect x="5.5" y="21" width="3" height="6" rx="1.5" fill="#fff" opacity="0.9" />
            <rect x="39.5" y="21" width="3" height="6" rx="1.5" fill="#fff" opacity="0.9" />
            <rect x="8" y="12.5" width="32" height="24" rx="11" fill="#fff" />
            <rect x="12.5" y="16.5" width="23" height="15.5" rx="7.5" fill="#e8f0fc" stroke="#cfe0f5" stroke-width="0.8" />
            <path d="M16 19 q8 -2.5 16 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.6" />
            <circle cx="15.5" cy="27.5" r="1.6" fill="#14b8a6" opacity="0.22" />
            <circle cx="32.5" cy="27.5" r="1.6" fill="#14b8a6" opacity="0.22" />
            <circle cx="19.5" cy="23.8" r="2.7" fill="#2563eb" />
            <circle cx="28.5" cy="23.8" r="2.7" fill="#2563eb" />
            <circle cx="20.5" cy="22.9" r="0.85" fill="#fff" />
            <circle cx="29.5" cy="22.9" r="0.85" fill="#fff" />
            <path d="M19 27.4 Q24 30.8 29 27.4" stroke="#14b8a6" stroke-width="2" fill="none" stroke-linecap="round" />
          </svg>
          <span class="cora-title">{{ 'cora.title' | transloco }}</span>
          <span class="cora-header-spacer"></span>
          @if (synthesisSupported) {
            <button
              mat-icon-button
              type="button"
              class="cora-header-btn"
              (click)="toggleVoice()"
              [attr.aria-label]="(voiceEnabled ? 'cora.voiceOff' : 'cora.voiceOn') | transloco">
              <mat-icon>{{ voiceEnabled ? 'volume_up' : 'volume_off' }}</mat-icon>
            </button>
          }
          <button
            mat-icon-button
            type="button"
            class="cora-header-btn cora-expand-btn"
            (click)="toggleExpand()"
            [attr.aria-label]="(expanded ? 'cora.collapse' : 'cora.expand') | transloco">
            <mat-icon>{{ expanded ? 'close_fullscreen' : 'open_in_full' }}</mat-icon>
          </button>
          <button
            mat-icon-button
            type="button"
            class="cora-header-btn"
            (click)="toggle()"
            [attr.aria-label]="'cora.close' | transloco">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="cora-messages">
          @if (messages.length === 0) {
            <div class="cora-welcome">{{ 'cora.welcome' | transloco }}</div>
          }
          @for (m of messages; track $index) {
            <div class="cora-msg" [class.user]="m.role === 'user'" [class.assistant]="m.role === 'assistant'">
              @if (m.role === 'assistant') {
                <!-- Renders Markdown tables as real HTML tables; all cell/text content is
                     HTML-escaped by renderMessage() and the result is further sanitized by
                     Angular's [innerHTML] (no bypassSecurityTrust), so it is XSS-safe. -->
                <div class="cora-md" [innerHTML]="renderMessage(m.content)"></div>
              } @else {
                {{ m.content }}
              }
            </div>
            @if (m.role === 'assistant' && m.content.trim()) {
              <div class="cora-msg-actions">
                <button mat-button type="button" class="cora-export-btn"
                        [disabled]="exportingIndex === $index"
                        (click)="exportPdf(m, $index)"
                        [attr.aria-label]="'cora.exportPdf' | transloco">
                  <mat-icon>picture_as_pdf</mat-icon>{{ 'cora.pdf' | transloco }}
                </button>
                @if (isTabular(m.content)) {
                  <button mat-button type="button" class="cora-export-btn"
                          [disabled]="exportingIndex === $index"
                          (click)="exportExcel(m, $index)"
                          [attr.aria-label]="'cora.exportExcel' | transloco">
                    <mat-icon>table_view</mat-icon>{{ 'cora.excel' | transloco }}
                  </button>
                }
              </div>
            }
          }
          @if (loading) {
            <div class="cora-msg assistant thinking">
              <mat-progress-spinner mode="indeterminate" diameter="18"></mat-progress-spinner>
              <span>{{ 'cora.thinking' | transloco }}</span>
            </div>
          }
          @if (error) {
            <div class="cora-error">{{ error }}</div>
          }
        </div>

        @if (pendingEmail) {
          <div class="cora-email-confirm">
            <div class="cora-email-text">
              <mat-icon>mail</mat-icon>
              <span>{{ 'cora.emailConfirm' | transloco }} <strong>{{ recipientLabel() }}</strong></span>
            </div>
            <div class="cora-email-preview">{{ emailPreview() }}</div>
            <div class="cora-email-actions">
              <button mat-button type="button" [disabled]="emailSending" (click)="cancelSendReport()">
                {{ 'cora.cancel' | transloco }}
              </button>
              <button mat-flat-button color="primary" type="button"
                      [disabled]="emailSending" (click)="confirmSendReport()">
                {{ 'cora.sendEmail' | transloco }}
              </button>
            </div>
          </div>
        }

        <form class="cora-input" (ngSubmit)="send()">
          @if (recognitionSupported) {
            <button
              mat-icon-button
              type="button"
              class="cora-mic"
              [class.listening]="listening"
              [disabled]="loading"
              (click)="toggleMic()"
              [attr.aria-label]="(listening ? 'cora.listening' : 'cora.mic') | transloco">
              <mat-icon>{{ listening ? 'mic' : 'mic_none' }}</mat-icon>
            </button>
          }
          <input
            matInput
            name="draft"
            [(ngModel)]="draft"
            (ngModelChange)="onDraftChange()"
            (keydown)="onKeydown()"
            [disabled]="loading"
            [placeholder]="(listening ? 'cora.listening' : 'cora.placeholder') | transloco"
            autocomplete="off" />
          <button
            mat-icon-button
            color="primary"
            type="submit"
            [disabled]="loading || !draft.trim()"
            [attr.aria-label]="'cora.send' | transloco">
            <mat-icon>send</mat-icon>
          </button>
        </form>

        <div class="cora-disclaimer">{{ 'cora.disclaimer' | transloco }}</div>
      </mat-card>
    }
  `,
  styles: [`
    .cora-fab {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1000;
      background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%) !important;
      color: #fff !important;
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.42) !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      animation: cora-breathe 4s ease-in-out infinite;
    }
    .cora-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 8px 22px rgba(37, 99, 235, 0.5) !important;
    }
    .cora-fab.is-open {
      animation: none;
      background: linear-gradient(135deg, #6b6f80 0%, #8a8fa3 100%) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
    }
    .cora-avatar { display: block; }
    .cora-avatar-sm { flex: 0 0 auto; }
    @keyframes cora-breathe {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-3px) scale(1.04); }
    }
    @media (prefers-reduced-motion: reduce) {
      .cora-fab { animation: none; transition: none; }
      .cora-fab:hover { transform: none; }
    }
    .cora-panel {
      position: fixed;
      right: 24px;
      bottom: 96px;
      z-index: 1000;
      width: 440px;
      max-width: calc(100vw - 48px);
      height: 600px;
      max-height: calc(100vh - 128px);
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      transition: width 0.18s ease, height 0.18s ease;
    }
    /* Desktop "expanded" size — toggled from the header. Caps keep it on-screen. */
    .cora-panel.expanded {
      width: 760px;
      height: calc(100vh - 128px);
    }
    /* Mobile: use (nearly) the full screen so the chat is comfortable to read/type. */
    @media (max-width: 600px) {
      .cora-fab { right: 16px; bottom: 16px; }
      .cora-panel, .cora-panel.expanded {
        right: 0;
        left: 0;
        bottom: 0;
        top: 0;
        width: 100vw;
        max-width: 100vw;
        height: 100dvh;
        max-height: 100dvh;
        border-radius: 0;
      }
      /* On mobile the panel is already full-screen, so the expand toggle is pointless. */
      .cora-expand-btn { display: none; }
      .cora-messages { padding: 14px; }
      .cora-msg { max-width: 92%; font-size: 16px; }  /* 16px avoids iOS input zoom */
      .cora-input input { font-size: 16px; }
    }
    .cora-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%);
      color: #fff;
    }
    .cora-title { font-weight: 500; font-size: 16px; }
    .cora-messages {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #fafafa;
    }
    .cora-welcome { color: #777; font-size: 15px; text-align: center; margin: auto; line-height: 1.5; }
    .cora-msg {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 15px;
      line-height: 1.5;
      white-space: pre-wrap;
      max-width: 88%;
    }
    .cora-msg.user { align-self: flex-end; background: #2563eb; color: #fff; border-bottom-right-radius: 2px; }
    .cora-msg.assistant { align-self: flex-start; background: #fff; border: 1px solid #e0e0e0; border-bottom-left-radius: 2px; }
    .cora-msg.thinking { display: flex; align-items: center; gap: 8px; color: #777; }
    .cora-error { color: #c62828; font-size: 13px; padding: 4px 8px; }
    .cora-msg-actions { align-self: flex-start; display: flex; gap: 4px; margin: -2px 0 2px 2px; }
    .cora-export-btn {
      min-width: 0 !important; line-height: 28px !important; height: 28px !important;
      padding: 0 8px !important; font-size: 12px !important; color: #2563eb !important;
    }
    .cora-export-btn mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      margin-right: 3px; vertical-align: middle;
    }
    /* Assistant replies render as HTML (tables + escaped text). Override the bubble's
       pre-wrap since line breaks come from <br>. */
    .cora-md { white-space: normal; }
    .cora-table {
      border-collapse: collapse;
      width: 100%;
      margin: 4px 0;
      font-size: 13px;
      display: block;
      overflow-x: auto;
    }
    .cora-table th, .cora-table td {
      border: 1px solid #d9e0ea;
      padding: 5px 8px;
      text-align: left;
      white-space: nowrap;
    }
    .cora-table th { background: #eef4ff; font-weight: 600; color: #1f2430; }
    .cora-table tbody tr:nth-child(even) { background: #fafbfd; }
    .cora-input {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px;
      border-top: 1px solid #e0e0e0;
    }
    .cora-input input {
      flex: 1 1 auto;
      border: 1px solid #ccc;
      border-radius: 20px;
      padding: 10px 16px;
      font-size: 15px;
      outline: none;
    }
    .cora-input input:focus { border-color: #2563eb; }
    .cora-header-spacer { flex: 1 1 auto; }
    .cora-header-btn { color: #fff; }
    .cora-mic.listening { color: #e53935; }
    .cora-mic.listening mat-icon { animation: cora-mic-pulse 1s ease-in-out infinite; }
    @keyframes cora-mic-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.25); opacity: 0.6; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cora-mic.listening mat-icon { animation: none; }
    }
    .cora-email-confirm {
      border-top: 1px solid #e0e0e0;
      background: #eef4ff;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cora-email-text { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1f2430; }
    .cora-email-text mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; }
    .cora-email-preview {
      font-size: 12px; color: #555; background: #fff; border: 1px solid #d6e0f5;
      border-radius: 8px; padding: 8px 10px; max-height: 96px; overflow-y: auto;
      white-space: pre-wrap; line-height: 1.4;
    }
    .cora-email-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .cora-disclaimer {
      font-size: 11px;
      color: #999;
      text-align: center;
      padding: 0 12px 8px;
    }
  `]
})
export class CoraChatComponent implements OnDestroy {
  private coraService = inject(CoraService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private voiceService = inject(VoiceService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);

  open = false;
  expanded = false;            // desktop: larger panel (toggled from the header)
  exportingIndex: number | null = null; // index of the reply currently rendering to PDF
  // Cache of rendered reply HTML keyed by raw content, so [innerHTML] returns a stable
  // reference (no re-parse/re-sanitize every change-detection cycle).
  private renderCache = new Map<string, string>();
  loading = false;
  draft = '';
  error: string | null = null;
  messages: CoraTurn[] = [];

  listening = false;
  voiceEnabled = true; // two-way voice: speak replies by default (toggle in header)
  // True while the user is in a hands-free voice conversation: after Cora
  // finishes speaking, the mic re-opens automatically for the next question.
  private voiceConversation = false;
  // True while Cora is speaking a reply. Used for barge-in: the user can start
  // talking to interrupt, which cancels the speech and captures the new question.
  private speaking = false;
  // Cora's language override: null = follow the app language; set when the user
  // asks Cora (in chat/voice) to switch. Drives recognition, TTS and replies.
  private coraLangOverride: 'en' | 'es' | null = null;
  // Auto-send after a pause once the user stops typing/dictating. Supports iOS
  // keyboard dictation (which types text but gives no "done" signal).
  readonly autoSendDelayMs = 1800;
  private autoSendTimer: ReturnType<typeof setTimeout> | null = null;
  // Auto-send is for DICTATION only (which fires no keydown). Any physical key
  // press suppresses it for a while so typing + pausing never sends on its own.
  private suppressAutoSendUntil = 0;
  // Pending email-report confirmation (set when Cora offers to email a report).
  pendingEmail: CoraEmailOffer | null = null;
  private pendingReportBody = '';
  emailSending = false;
  readonly recognitionSupported = this.voiceService.isRecognitionSupported();
  readonly synthesisSupported = this.voiceService.isSynthesisSupported();

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      // iOS: unlock audio within this tap so Cora's replies can be spoken.
      this.voiceService.unlockSpeech();
    }
    if (!this.open) {
      // Closing the panel ends any mic/voice in progress.
      this.voiceConversation = false;
      this.speaking = false;
      this.clearAutoSend();
      this.stopListening();
      this.voiceService.cancelSpeech();
    }
  }

  /** Desktop only: toggle the panel between normal and enlarged size. */
  toggleExpand(): void {
    this.expanded = !this.expanded;
  }

  /** Export one Cora reply to a PDF (rendered server-side) and download it immediately. */
  exportPdf(m: CoraTurn, index: number): void {
    const agencyId = this.authService.agencyPublicId();
    if (!agencyId || this.exportingIndex !== null) {
      return;
    }
    this.exportingIndex = index;
    const title = this.transloco.translate('cora.exportTitle');
    this.coraService.exportPdf(agencyId, title, m.content).subscribe({
      next: blob => {
        this.downloadBlob(blob, `cora-${this.timestamp()}.pdf`);
        this.exportingIndex = null;
      },
      error: () => {
        this.error = this.transloco.translate('cora.exportError');
        this.exportingIndex = null;
      }
    });
  }

  /** Export a tabular reply to a styled .xlsx (rendered server-side) and download it. */
  exportExcel(m: CoraTurn, index: number): void {
    const agencyId = this.authService.agencyPublicId();
    if (!agencyId || this.exportingIndex !== null) {
      return;
    }
    this.exportingIndex = index;
    const title = this.transloco.translate('cora.exportTitle');
    this.coraService.exportXlsx(agencyId, title, m.content).subscribe({
      next: blob => {
        this.downloadBlob(blob, `cora-${this.timestamp()}.xlsx`);
        this.exportingIndex = null;
      },
      error: () => {
        this.error = this.transloco.translate('cora.exportError');
        this.exportingIndex = null;
      }
    });
  }

  /** True when a reply looks like a Markdown table (so an Excel export is meaningful). */
  isTabular(content: string): boolean {
    const rows = (content ?? '').split('\n').filter(l => /\|/.test(l) && l.trim().length > 1);
    const hasSeparator = rows.some(l => /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(l));
    return rows.length >= 2 && hasSeparator;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    // Revoke on the next tick so the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private timestamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  }

  /**
   * Render an assistant reply to safe HTML: Markdown tables become real <table>s, other
   * lines are HTML-escaped text with <br> line breaks. All content is escaped here and the
   * output is still run through Angular's [innerHTML] sanitizer, so it is XSS-safe (we never
   * use bypassSecurityTrust). Cached by content for a stable binding reference.
   */
  renderMessage(content: string): string {
    const key = content ?? '';
    const cached = this.renderCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const html = this.contentToHtml(key);
    this.renderCache.set(key, html);
    return html;
  }

  private contentToHtml(content: string): string {
    const lines = content.split('\n');
    const parts: string[] = [];
    let i = 0;
    while (i < lines.length) {
      if (this.isTableRow(lines[i])) {
        const block: string[] = [];
        while (i < lines.length && this.isTableRow(lines[i])) { block.push(lines[i]); i++; }
        // Only render as a table if it has a header + separator; otherwise treat as text.
        if (block.length >= 2 && block.some(l => this.isSeparatorRow(l))) {
          parts.push(this.tableBlockToHtml(block));
        } else {
          parts.push(block.map(l => this.escapeHtml(l)).join('<br>') + '<br>');
        }
      } else {
        parts.push(this.escapeHtml(lines[i]) + '<br>');
        i++;
      }
    }
    return parts.join('');
  }

  private isTableRow(line: string): boolean {
    return line != null && line.includes('|') && line.trim().length > 1;
  }

  private isSeparatorRow(line: string): boolean {
    return /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(line);
  }

  private splitRow(line: string): string[] {
    let cells = line.trim();
    if (cells.startsWith('|')) { cells = cells.slice(1); }
    if (cells.endsWith('|')) { cells = cells.slice(0, -1); }
    return cells.split('|').map(c => c.trim());
  }

  private tableBlockToHtml(block: string[]): string {
    const rows = block.filter(l => !this.isSeparatorRow(l)).map(l => this.splitRow(l));
    if (rows.length === 0) {
      return '';
    }
    const header = rows[0];
    const body = rows.slice(1);
    const thead = '<thead><tr>' + header.map(c => `<th>${this.escapeHtml(c)}</th>`).join('') + '</tr></thead>';
    const tbody = '<tbody>' + body.map(r =>
      '<tr>' + r.map(c => `<td>${this.escapeHtml(c)}</td>`).join('') + '</tr>').join('') + '</tbody>';
    return `<table class="cora-table">${thead}${tbody}</table>`;
  }

  private escapeHtml(s: string): string {
    return (s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Strip Markdown-table syntax so TTS reads "col, col" instead of pipes and dashes. */
  private toSpeech(text: string): string {
    return (text ?? '')
      .split('\n')
      .filter(l => !this.isSeparatorRow(l))
      .map(l => l.includes('|')
        ? l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').replace(/\s*\|\s*/g, ', ').trim()
        : l)
      .join('\n')
      .trim();
  }

  toggleVoice(): void {
    this.voiceService.unlockSpeech(); // iOS audio unlock on tap
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled) {
      this.speaking = false;
      this.voiceService.cancelSpeech();
    }
  }

  toggleMic(): void {
    if (this.listening) {
      // User taps the mic while listening → end the hands-free conversation.
      this.voiceConversation = false;
      this.speaking = false;
      this.voiceService.cancelSpeech();
      this.stopListening();
      return;
    }
    this.voiceConversation = true;
    this.beginListening(false);
  }

  /**
   * @param bargeIn when true the mic opens WHILE Cora is still speaking, so the
   *                user can interrupt; the first words heard cancel her speech.
   *                When false it's a normal listen (and stops any speech first).
   */
  private beginListening(bargeIn: boolean): void {
    if (!this.recognitionSupported || this.loading || this.listening) {
      return;
    }
    this.error = null;
    if (!bargeIn) {
      this.voiceService.cancelSpeech(); // don't let Cora talk over the user
    }
    this.listening = true;
    this.voiceService.startListening(this.recognitionLang(), {
      onResult: (transcript, isFinal) => {
        // Barge-in: the moment the user says something while Cora is talking,
        // stop her so she doesn't talk over the new question.
        if (this.speaking && transcript.trim()) {
          this.speaking = false;
          this.voiceService.cancelSpeech();
        }
        this.draft = transcript;
        if (isFinal) {
          this.listening = false;
          this.handleFinalTranscript(transcript);
        }
      },
      onError: errorCode => {
        this.listening = false;
        this.voiceConversation = false;
        this.error = this.transloco.translate(
          errorCode === 'not-allowed' ? 'cora.micDenied' : 'cora.micError');
      },
      onEnd: () => {
        this.listening = false;
        // Keep the mic open across a long reply so the user can still barge in.
        if (this.speaking && this.voiceConversation && this.open) {
          this.beginListening(true);
        }
      }
    });
  }

  private stopListening(): void {
    if (this.listening) {
      this.voiceService.stopListening();
      this.listening = false;
    }
  }

  /**
   * A final voice transcript. If an email confirmation is pending, a yes/no
   * utterance confirms or cancels the send instead of being sent as a question.
   */
  private handleFinalTranscript(text: string): void {
    if (this.pendingEmail) {
      if (this.isAffirmative(text)) {
        this.draft = '';
        this.confirmSendReport();
        return;
      }
      if (this.isNegative(text)) {
        this.draft = '';
        this.cancelSendReport();
        return;
      }
      // Anything else: abandon the pending offer and treat it as a new question.
      this.pendingEmail = null;
      this.pendingReportBody = '';
    }
    this.send();
  }

  private isAffirmative(text: string): boolean {
    const t = text.trim().toLowerCase().replace(/[.!¡¿?,]/g, '');
    return ['si', 'sí', 'yes', 'ok', 'okay', 'dale', 'confirmar', 'confirmo', 'confirm',
      'enviar', 'envíalo', 'envialo', 'send', 'correcto', 'adelante', 'hazlo']
      .some(w => t === w || t.startsWith(w + ' '));
  }

  private isNegative(text: string): boolean {
    const t = text.trim().toLowerCase().replace(/[.!¡¿?,]/g, '');
    return ['no', 'cancelar', 'cancela', 'cancel', 'mejor no', 'detente', 'stop', 'espera']
      .some(w => t === w || t.startsWith(w + ' '));
  }

  /**
   * Called on every field change (typing or iOS dictation). Debounces an
   * auto-send so the user doesn't have to tap send after dictating. Never fires
   * while the in-app mic is listening (that flow sends on its own final result)
   * — and only field input (not programmatic draft updates) triggers it.
   */
  /** A physical key press → the user is typing, not dictating. Suppress auto-send. */
  onKeydown(): void {
    this.clearAutoSend();
    this.suppressAutoSendUntil = Date.now() + 4000;
  }

  onDraftChange(): void {
    this.clearAutoSend();
    if (this.listening || this.loading || !this.draft.trim()) {
      return;
    }
    // Skip when the user just typed — only dictation (no keydown) should auto-send.
    if (Date.now() < this.suppressAutoSendUntil) {
      return;
    }
    this.autoSendTimer = setTimeout(() => {
      this.autoSendTimer = null;
      if (!this.listening && !this.loading && this.draft.trim()) {
        this.send();
      }
    }, this.autoSendDelayMs);
  }

  ngOnDestroy(): void {
    // Tear down timers, speech recognition and TTS so a logout/layout destroy can't
    // leave a running recognizer or an in-flight utterance alive.
    this.clearAutoSend();
    this.stopListening();
    this.voiceService.cancelSpeech();
  }

  private clearAutoSend(): void {
    if (this.autoSendTimer) {
      clearTimeout(this.autoSendTimer);
      this.autoSendTimer = null;
    }
  }

  send(): void {
    this.clearAutoSend();
    const text = this.draft.trim();
    if (!text || this.loading) {
      return;
    }
    this.voiceService.unlockSpeech(); // iOS: typing + tapping send is a gesture too
    this.error = null;
    // History is every turn BEFORE this new user message (backend is stateless).
    const history = [...this.messages];
    this.messages.push({ role: 'user', content: text });
    this.draft = '';
    this.loading = true;

    const agencyPublicId = this.authService.agencyPublicId();
    const language = this.effectiveLang();

    this.coraService.chat(agencyPublicId, text, language, history).subscribe({
      next: response => {
        this.messages.push({ role: 'assistant', content: response.reply });
        this.loading = false;
        // Honor an in-chat language switch BEFORE speaking, so this reply is
        // voiced in the new language and future turns listen in it too.
        if (response.language === 'en' || response.language === 'es') {
          this.coraLangOverride = response.language;
        }
        // Cora asked the UI to navigate to a menu page (Angular route guards
        // still enforce access).
        if (response.navigateTo) {
          this.router.navigate([response.navigateTo]);
        }
        // Cora prepared an email — show the confirmation card. Use the explicit
        // body if Cora provided one (dictated message), else the reply (report).
        if (response.emailOffer) {
          this.pendingEmail = response.emailOffer;
          this.pendingReportBody = response.emailOffer.body ?? response.reply;
        }
        const continueConversation = this.voiceConversation && this.open && this.recognitionSupported;
        if (this.voiceEnabled && this.synthesisSupported) {
          this.speaking = true;
          this.voiceService.speak(this.toSpeech(response.reply), this.recognitionLang(), () => {
            this.speaking = false;
            // When Cora finishes (and the user didn't barge in), open the mic
            // for the next question in a hands-free conversation.
            if (continueConversation && !this.listening) {
              this.beginListening(false);
            }
          });
          // Listen WHILE she speaks so the user can interrupt by talking.
          if (continueConversation) {
            this.beginListening(true);
          }
        } else if (continueConversation) {
          this.beginListening(false);
        }
      },
      error: err => {
        this.loading = false;
        this.voiceConversation = false;
        this.error = err?.error?.message ?? this.transloco.translate('cora.error');
      }
    });
  }

  /** Address shown in the email confirmation card. */
  recipientLabel(): string {
    if (this.pendingEmail?.recipientType === 'employee') {
      return this.pendingEmail.recipientName
        ? `${this.pendingEmail.recipientName} (${this.pendingEmail.email})`
        : (this.pendingEmail.email ?? '');
    }
    return this.authService.user()?.email ?? this.transloco.translate('cora.yourEmail');
  }

  /** Short preview of what will be emailed, shown in the confirmation card. */
  emailPreview(): string {
    const body = this.pendingReportBody ?? '';
    return body.length > 200 ? body.slice(0, 200).trimEnd() + '…' : body;
  }

  cancelSendReport(): void {
    this.pendingEmail = null;
    this.pendingReportBody = '';
  }

  confirmSendReport(): void {
    if (!this.pendingEmail || this.emailSending) {
      return;
    }
    this.emailSending = true;
    this.error = null;
    const offer = this.pendingEmail;
    const to = this.recipientLabel(); // capture before clearing
    this.coraService.sendReport(this.authService.agencyPublicId(), {
      recipientType: offer.recipientType,
      employeePublicId: offer.employeePublicId,
      subject: offer.subject,
      body: this.pendingReportBody
    }).subscribe({
      next: () => {
        this.emailSending = false;
        this.pendingEmail = null;
        this.pendingReportBody = '';
        this.messages.push({
          role: 'assistant',
          content: this.transloco.translate('cora.emailSent', { to })
        });
      },
      error: err => {
        this.emailSending = false;
        this.error = err?.error?.message ?? this.transloco.translate('cora.emailError');
      }
    });
  }

  /** Cora's effective language: an in-chat override wins, else the app language. */
  private effectiveLang(): 'en' | 'es' {
    return this.coraLangOverride ?? (this.languageService.activeLang() === 'es' ? 'es' : 'en');
  }

  /** Maps the effective language to a BCP-47 tag for the Web Speech API. */
  private recognitionLang(): string {
    return this.effectiveLang() === 'es' ? 'es-ES' : 'en-US';
  }
}
