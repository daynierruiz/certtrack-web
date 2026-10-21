import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule } from '@jsverse/transloco';
import { Subscription, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { InboxNotification, NotificationInboxService } from '../../core/services/notification-inbox.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatBadgeModule,
    MatMenuModule, MatTooltipModule, TranslocoModule
  ],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="bellMenu"
            (menuOpened)="loadInbox()"
            [matTooltip]="'notifications.title' | transloco"
            [attr.aria-label]="'notifications.title' | transloco">
      <mat-icon [matBadge]="unread > 0 ? (unread > 99 ? '99+' : unread) : null"
                matBadgeColor="warn" matBadgeSize="small"
                [matBadgeHidden]="unread === 0">notifications</mat-icon>
    </button>

    <mat-menu #bellMenu="matMenu" class="bell-menu">
      <div class="bell-header" mat-menu-item disabled>
        <span>{{ 'notifications.title' | transloco }}</span>
      </div>

      @if (items.length === 0) {
        <div class="bell-empty" mat-menu-item disabled>
          {{ 'notifications.empty' | transloco }}
        </div>
      } @else {
        @for (n of items; track n.publicId) {
          <button mat-menu-item class="bell-item" [class.unread]="!n.readAt"
                  (click)="onOpen(n); $event.stopPropagation()">
            <span class="bell-dot" [class.show]="!n.readAt"></span>
            <div class="bell-item-body">
              <div class="bell-subject">{{ n.subject || ('notifications.untitled' | transloco) }}</div>
              <div class="bell-date">{{ n.createdAt | date:'short' }}</div>
            </div>
          </button>
        }
      }
    </mat-menu>
  `,
  styles: [`
    .bell-header { font-weight: 600; opacity: 0.8; }
    .bell-empty { color: #888; font-style: italic; }
    .bell-item { height: auto; line-height: 1.3; padding-top: 8px; padding-bottom: 8px; }
    .bell-item-body { display: flex; flex-direction: column; gap: 2px; white-space: normal; }
    .bell-subject { font-size: 13px; }
    .bell-date { font-size: 11px; color: #888; }
    .bell-item.unread .bell-subject { font-weight: 600; }
    .bell-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      margin-right: 8px; background: transparent;
    }
    .bell-dot.show { background: #d32f2f; }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  unread = 0;
  items: InboxNotification[] = [];
  private sub?: Subscription;

  constructor(private inbox: NotificationInboxService) {}

  ngOnInit(): void {
    // Poll the unread count every 60s (plus an immediate first tick). Errors are
    // swallowed so a transient failure never breaks the toolbar.
    this.sub = interval(60_000).pipe(
      startWith(0),
      switchMap(() => this.inbox.unreadCount().pipe(catchError(() => of({ unread: this.unread })))),
    ).subscribe(res => this.unread = res.unread);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadInbox(): void {
    this.inbox.getInbox().subscribe({
      next: items => this.items = items,
      error: () => { /* ignore */ }
    });
  }

  onOpen(n: InboxNotification): void {
    if (n.readAt) {
      return;
    }
    this.inbox.markRead(n.publicId).subscribe({
      next: () => {
        n.readAt = new Date().toISOString();
        this.unread = Math.max(0, this.unread - 1);
      },
      error: () => { /* ignore */ }
    });
  }
}
