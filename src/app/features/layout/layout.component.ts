import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { LanguageService } from '../../core/services/language.service';
import { CoraChatComponent } from '../cora/cora-chat.component';
import { NotificationBellComponent } from './notification-bell.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, RouterModule, RouterOutlet,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    TranslocoModule, CoraChatComponent, NotificationBellComponent
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav #sidenav
                   [mode]="isMobile ? 'over' : 'side'"
                   [opened]="!isMobile"
                   class="app-sidenav">
        <div class="sidenav-header">
          <img src="assets/logo.png" alt="CareReady" class="sidenav-logo">
        </div>

        <mat-nav-list>
          @if (!authService.isEmployee()) {
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>{{ 'nav.dashboard' | transloco }}</span>
            </a>
            <a mat-list-item routerLink="/employees" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>people</mat-icon>
              <span matListItemTitle>{{ 'nav.employees' | transloco }}</span>
            </a>
            <a mat-list-item routerLink="/credentials" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>badge</mat-icon>
              <span matListItemTitle>{{ 'nav.credentials' | transloco }}</span>
              @if (badgeAttention > 0) {
                <span class="nav-badge warn">{{ badgeAttention }}</span>
              }
            </a>
            <a mat-list-item routerLink="/positions" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>work</mat-icon>
              <span matListItemTitle>{{ 'nav.positions' | transloco }}</span>
            </a>
            <a mat-list-item routerLink="/review" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>rate_review</mat-icon>
              <span matListItemTitle>{{ 'nav.pendingReview' | transloco }}</span>
              @if (badgePendingReview > 0) {
                <span class="nav-badge primary">{{ badgePendingReview }}</span>
              }
            </a>
            <a mat-list-item routerLink="/applicants" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>person_add</mat-icon>
              <span matListItemTitle>{{ 'nav.applicants' | transloco }}</span>
              @if (badgeApplicants > 0) {
                <span class="nav-badge accent">{{ badgeApplicants }}</span>
              }
            </a>
            <a mat-list-item routerLink="/map" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>map</mat-icon>
              <span matListItemTitle>{{ 'nav.map' | transloco }}</span>
            </a>
            @if (authService.isAdmin()) {
              <a mat-list-item routerLink="/blacklist" routerLinkActive="active-link"
                 (click)="isMobile && sidenav.close()">
                <mat-icon matListItemIcon>block</mat-icon>
                <span matListItemTitle>{{ 'nav.blacklist' | transloco }}</span>
              </a>
            }
            <a mat-list-item routerLink="/contract-templates" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>description</mat-icon>
              <span matListItemTitle>{{ 'nav.contractTemplates' | transloco }}</span>
            </a>
            <a mat-list-item routerLink="/reports" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>fact_check</mat-icon>
              <span matListItemTitle>{{ 'nav.reports' | transloco }}</span>
            </a>
            @if (agentEnabled) {
              <a mat-list-item routerLink="/settings/agent" routerLinkActive="active-link"
                 (click)="isMobile && sidenav.close()">
                <mat-icon matListItemIcon>smart_toy</mat-icon>
                <span matListItemTitle>{{ 'nav.agentSettings' | transloco }}</span>
              </a>
            }
          }
          @if (authService.isEmployee()) {
            <a mat-list-item routerLink="/my-profile" routerLinkActive="active-link"
               (click)="isMobile && sidenav.close()">
              <mat-icon matListItemIcon>person</mat-icon>
              <span matListItemTitle>{{ 'nav.myProfile' | transloco }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="content-host">
        <mat-toolbar color="primary" class="app-toolbar">
          <button mat-icon-button (click)="sidenav.toggle()" *ngIf="isMobile">
            <mat-icon>menu</mat-icon>
          </button>

          <span class="toolbar-spacer"></span>

          <span class="agency-name">{{ authService.user()?.agencyName }}</span>

          <button mat-icon-button [matMenuTriggerFor]="langMenu"
                  [attr.aria-label]="'language.label' | transloco">
            <mat-icon>language</mat-icon>
          </button>
          <mat-menu #langMenu="matMenu">
            @for (opt of languageService.options; track opt.code) {
              <button mat-menu-item (click)="languageService.use(opt.code)">
                <mat-icon>{{ languageService.activeLang() === opt.code ? 'check' : '' }}</mat-icon>
                <span>{{ opt.label }}</span>
              </button>
            }
          </mat-menu>

          <app-notification-bell></app-notification-bell>

          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="user-menu-header" mat-menu-item disabled>
              <div class="user-name">{{ authService.user()?.fullName }}</div>
              <div class="user-email">{{ authService.user()?.email }}</div>
              <div class="user-role">{{ 'roles.' + (authService.user()?.role || '') | transloco }}</div>
            </div>
            <mat-divider></mat-divider>
            <a mat-menu-item routerLink="/account">
              <mat-icon>manage_accounts</mat-icon>
              <span>{{ 'nav.myAccount' | transloco }}</span>
            </a>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>{{ 'nav.signOut' | transloco }}</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <main class="main-content">
          <router-outlet></router-outlet>
        </main>

        @if (coraEnabled && authService.isAdmin()) {
          <app-cora-chat></app-cora-chat>
        }
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      height: 100dvh;
    }
    .app-sidenav {
      width: 250px;
      background: #fafafa;
    }
    .sidenav-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 16px 8px;
      font-size: 20px;
      font-weight: 600;
      color: #004d40;
    }
    .sidenav-logo {
      max-width: 180px;
      height: auto;
    }
    .active-link {
      background: rgba(0, 121, 107, 0.08) !important;
      color: #00796b;
    }
    .nav-badge {
      margin-left: auto; padding: 1px 7px; border-radius: 10px;
      font-size: 11px; font-weight: 600; line-height: 18px;
    }
    .nav-badge.warn { background: #ffebee; color: #c62828; }
    .nav-badge.primary { background: #e3f2fd; color: #1565c0; }
    .nav-badge.accent { background: #fff3e0; color: #e65100; }
    /* The content host is a flex column: the toolbar is a fixed-height row and
       only .main-content scrolls. This guarantees the toolbar (and the mobile
       menu button it holds) can never scroll out of view. */
    .content-host {
      display: flex !important;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .app-toolbar {
      flex: 0 0 auto;
      z-index: 100;
    }
    .toolbar-spacer {
      flex: 1;
    }
    .agency-name {
      font-size: 14px;
      margin-right: 8px;
      opacity: 0.9;
    }
    .main-content {
      padding: 24px;
      background: #f5f5f5;
      flex: 1 1 auto;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      /* Safety net: no child may force the whole page to scroll sideways.
         Tables that are genuinely wide use their own .table-scroll wrapper. */
      overflow-x: hidden;
      max-width: 100%;
      box-sizing: border-box;
    }
    @media (max-width: 600px) {
      .main-content { padding: 12px; }
      .app-sidenav { width: 220px; }
      .agency-name { display: none; }
    }
    .user-menu-header {
      line-height: 1.4;
      opacity: 1 !important;
    }
    .user-name {
      font-weight: 500;
    }
    .user-email {
      font-size: 12px;
      color: #666;
    }
    .user-role {
      font-size: 11px;
      color: #00796b;
      font-weight: 500;
    }
  `]
})
export class LayoutComponent {
  isMobile = false;
  badgeAttention = 0;
  badgePendingReview = 0;
  badgeApplicants = 0;
  readonly agentEnabled = environment.agentEnabled;
  readonly coraEnabled = environment.coraEnabled;

  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    private dashboardService: DashboardService,
    private breakpointObserver: BreakpointObserver
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
    });
    this.loadBadges();
  }

  private loadBadges(): void {
    const agencyId = this.authService.agencyPublicId();
    if (!agencyId || this.authService.isEmployee()) return;

    this.dashboardService.getDashboard(agencyId).subscribe({
      next: data => {
        this.badgeAttention = data.credentials.expired + data.credentials.critical;
        this.badgePendingReview = data.credentials.pendingReview;
        this.badgeApplicants = data.employees.applicants;
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
