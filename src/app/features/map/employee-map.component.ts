import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment';
import { EmployeeService } from '../../core/services/employee.service';
import { PositionService } from '../../core/services/position.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeMapPoint } from '../../core/models/employee.model';
import { PositionResponse } from '../../core/models/position.model';
import { LANGUAGE_OPTIONS, LanguageCode } from '../../core/models/applicant.model';

type Status = 'ACTIVE' | 'ONBOARDING' | 'APPLICANT' | 'INACTIVE' | 'TERMINATED';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#2563eb',
  ONBOARDING: '#f59e0b',
  APPLICANT: '#14b8a6',
  INACTIVE: '#94a3b8',
  TERMINATED: '#ef4444'
};
const ALL_STATUSES: Status[] = ['ACTIVE', 'ONBOARDING', 'APPLICANT', 'INACTIVE', 'TERMINATED'];

// Service area — South Florida tri-county (Miami-Dade, Broward, Palm Beach).
// A box around the three counties; the map opens framed on this instead of the
// whole country, and markers can only widen it (never zoom tighter than the area).
const SERVICE_AREA_SW: L.LatLngTuple = [25.62, -80.42];
const SERVICE_AREA_NE: L.LatLngTuple = [26.52, -80.06];
const SERVICE_AREA_CENTER: L.LatLngTuple = [26.07, -80.2];
const SERVICE_AREA_ZOOM = 10.5;

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"'/]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#47;' }[c] as string));
}

@Component({
  selector: 'app-employee-map',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, TranslocoModule
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'map.title' | transloco }}</h1>
      <p class="subtitle">{{ 'map.subtitle' | transloco }}</p>
    </div>

    <mat-card class="filters-bar">
      <div class="filters-top">
        <mat-form-field appearance="outline" class="f-search" subscriptSizing="dynamic">
          <mat-label>{{ 'map.searchLabel' | transloco }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="search" (ngModelChange)="applyFilters()"
                 [placeholder]="'map.searchPlaceholder' | transloco">
        </mat-form-field>

        <mat-form-field appearance="outline" class="f-sel" subscriptSizing="dynamic">
          <mat-label>{{ 'common.status' | transloco }}</mat-label>
          <mat-select multiple [(ngModel)]="selStatuses" (ngModelChange)="applyFilters()">
            @for (s of allStatuses; track s) {
              <mat-option [value]="s">{{ 'map.status.' + s | transloco }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="f-sel" subscriptSizing="dynamic">
          <mat-label>{{ 'map.languages' | transloco }}</mat-label>
          <mat-select multiple [(ngModel)]="selLanguages" (ngModelChange)="applyFilters()">
            @for (l of languageOptions; track l.value) {
              <mat-option [value]="l.value">{{ 'spokenLanguages.' + l.value | transloco }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="f-sel" subscriptSizing="dynamic">
          <mat-label>{{ 'map.position' | transloco }}</mat-label>
          <mat-select multiple [(ngModel)]="selPositions" (ngModelChange)="applyFilters()">
            @for (p of positions; track p.publicId) {
              <mat-option [value]="p.publicId">{{ p.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (hasActiveFilters()) {
          <button mat-stroked-button class="f-clear" (click)="clearFilters()">
            <mat-icon>filter_alt_off</mat-icon> {{ 'map.clear' | transloco }}
          </button>
        }
      </div>

      <div class="legend">
        <span class="count">{{ 'map.showing' | transloco: { shown: filtered.length, total: located.length } }}</span>
        @if (noLocation > 0) {
          <span class="count muted" [title]="'map.noLocationHint' | transloco">
            · {{ 'map.noLocation' | transloco: { count: noLocation } }}</span>
        }
        <span class="legend-spacer"></span>
        @for (s of allStatuses; track s) {
          <span class="legend-item">
            <span class="dot" [style.background]="statusColor(s)"></span>{{ 'map.status.' + s | transloco }}
          </span>
        }
      </div>
    </mat-card>

    <div class="map-shell">
      <button mat-mini-fab class="home-btn" type="button"
              [matTooltip]="'map.serviceArea' | transloco" (click)="home()">
        <mat-icon>home</mat-icon>
      </button>
      @if (loading) {
        <div class="map-overlay"><mat-spinner diameter="40"></mat-spinner></div>
      }
      <div #mapEl class="map-canvas"></div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 14px; }
    .page-header h1 { margin: 0; font-size: 24px; color: #1a237e; }
    .subtitle { color: #666; margin: 4px 0 0; }
    .filters-bar { padding: 12px 16px; margin-bottom: 14px; }
    .filters-top { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
    .f-search { flex: 1 1 220px; min-width: 180px; }
    .f-sel { flex: 0 1 190px; min-width: 150px; }
    .f-clear { height: 40px; align-self: center; white-space: nowrap; }
    .legend {
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      margin-top: 10px; padding-top: 10px; border-top: 1px solid #eef1f6;
      font-size: 13px; color: #555;
    }
    .legend-spacer { flex: 1 1 auto; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 11px; height: 11px; border-radius: 50%; box-shadow: 0 0 0 2px #fff, 0 1px 2px rgba(0,0,0,0.25); }
    .count { font-weight: 600; color: #333; }
    .count.muted { font-weight: 400; color: #999; }
    .map-shell { position: relative; }
    .map-canvas {
      height: calc(100vh - 290px); min-height: 420px; width: 100%;
      border-radius: 12px; border: 1px solid #e0e6ef; z-index: 0;
    }
    .map-overlay {
      position: absolute; inset: 0; z-index: 400; display: grid; place-items: center;
      background: rgba(255,255,255,0.6); border-radius: 12px;
    }
    .home-btn {
      position: absolute; top: 12px; right: 12px; z-index: 500;
      background: #fff; color: #2563eb; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    /* Leaflet divIcon marker */
    ::ng-deep .emp-pin {
      display: block; width: 16px; height: 16px; border-radius: 50%;
      box-shadow: 0 0 0 2.5px #fff, 0 1px 4px rgba(0,0,0,0.4);
    }
    ::ng-deep .emp-pop { min-width: 150px; }
    ::ng-deep .emp-pop-name { font-weight: 700; color: #1565c0; cursor: pointer; text-decoration: none; }
    ::ng-deep .emp-pop-name:hover { text-decoration: underline; }
    ::ng-deep .emp-pop-row { font-size: 12.5px; color: #555; margin-top: 2px; }
    ::ng-deep .emp-pop-row.muted { color: #999; }
    @media (max-width: 600px) {
      .map-canvas { height: calc(100vh - 360px); min-height: 340px; }
      .f-sel, .f-search { flex: 1 1 100%; }
    }
  `]
})
export class EmployeeMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  readonly allStatuses = ALL_STATUSES;
  readonly languageOptions = LANGUAGE_OPTIONS;

  positions: PositionResponse[] = [];
  located: EmployeeMapPoint[] = [];   // employees that have coordinates
  filtered: EmployeeMapPoint[] = [];
  noLocation = 0;
  loading = true;

  // Filters — TERMINATED off by default to reduce clutter.
  selStatuses: Status[] = ['ACTIVE', 'ONBOARDING', 'APPLICANT', 'INACTIVE'];
  selLanguages: LanguageCode[] = [];
  selPositions: string[] = [];
  search = '';

  private map?: L.Map;
  private markers = L.layerGroup();
  private fitted = false;

  constructor(
    private employeeService: EmployeeService,
    private positionService: PositionService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone,
    private transloco: TranslocoService
  ) {}

  ngAfterViewInit(): void {
    // Run Leaflet outside Angular — it fires many scroll/move events we don't
    // need change detection for.
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapEl.nativeElement, {
        center: SERVICE_AREA_CENTER,
        zoom: SERVICE_AREA_ZOOM,
        zoomSnap: 0.25  // allow fractional zoom so the area frames tightly
      });
      L.tileLayer(
        `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${environment.geoapifyApiKey}`,
        {
          attribution: '© OpenStreetMap contributors · © Geoapify',
          maxZoom: 20
        }
      ).addTo(this.map);
      this.markers.addTo(this.map);
      // Container may still be sizing on first paint.
      setTimeout(() => this.map?.invalidateSize(), 0);
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private loadData(): void {
    const agencyId = this.authService.agencyPublicId();
    this.positionService.getAll(agencyId, 0, 200).subscribe({
      next: page => { this.positions = page.content; },
      error: () => { this.positions = []; }
    });
    // M7: the map endpoint already returns only located, non-TERMINATED employees with a
    // minimized payload (no street address / PII), so there is no client-side PII to drop.
    this.employeeService.getMapPoints(agencyId).subscribe({
      next: points => {
        this.located = points.filter(e => this.hasCoords(e));
        this.noLocation = 0; // endpoint omits employees without coordinates
        this.loading = false;
        this.applyFilters();
      },
      error: () => { this.loading = false; }
    });
  }

  private hasCoords(e: EmployeeMapPoint): boolean {
    return !!e.address && e.address.latitude != null && e.address.longitude != null;
  }

  statusColor(s: string): string {
    return STATUS_COLORS[s] ?? '#64748b';
  }

  /** Re-frame the map on the service area (the three counties). */
  home(): void {
    this.map?.fitBounds(L.latLngBounds(SERVICE_AREA_SW, SERVICE_AREA_NE), { padding: [12, 12] });
  }

  hasActiveFilters(): boolean {
    return this.search.trim().length > 0
      || this.selLanguages.length > 0
      || this.selPositions.length > 0
      || this.selStatuses.length !== 4
      || !this.selStatuses.every(s => s !== 'TERMINATED');
  }

  clearFilters(): void {
    this.selStatuses = ['ACTIVE', 'ONBOARDING', 'APPLICANT', 'INACTIVE'];
    this.selLanguages = [];
    this.selPositions = [];
    this.search = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = this.located.filter(e => {
      if (this.selStatuses.length && !this.selStatuses.includes(e.status as Status)) {
        return false;
      }
      if (this.selLanguages.length && !(e.languages || []).some(l => this.selLanguages.includes(l))) {
        return false;
      }
      if (this.selPositions.length
          && !(e.positions || []).some(p => this.selPositions.includes(p.publicId))) {
        return false;
      }
      if (q) {
        const hay = `${e.firstName} ${e.lastName} ${e.address?.city ?? ''}`.toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      return true;
    });
    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.map) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.markers.clearLayers();
      for (const e of this.filtered) {
        // Non-null assertion: `filtered` comes from `located`, which hasCoords()-filters
        // out any point whose latitude/longitude is null (the map DTO types them nullable).
        const lat = e.address!.latitude!;
        const lng = e.address!.longitude!;
        const marker = L.marker([lat, lng], { icon: this.iconFor(e.status) });
        marker.bindPopup(this.popupHtml(e));
        marker.on('popupopen', (ev) => {
          const popup = (ev as L.PopupEvent).popup;
          const link = popup.getElement()?.querySelector('.emp-pop-name') as HTMLElement | null;
          if (link) {
            link.onclick = () => this.zone.run(() => this.router.navigate(['/employees', e.publicId]));
          }
        });
        this.markers.addLayer(marker);
      }
      // Frame the FIXED service area ONLY on the first render — deliberately NOT
      // extended by the markers, so a lone out-of-area employee (e.g. someone who
      // moved up north) can't zoom the whole map out to country level. Later filter
      // changes don't move the view at all; the "service area" button re-frames.
      if (!this.fitted) {
        this.home();
        this.fitted = true;
      }
    });
  }

  private iconFor(status: string): L.DivIcon {
    return L.divIcon({
      className: 'emp-pin-wrap',
      html: `<span class="emp-pin" style="background:${this.statusColor(status)}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -9]
    });
  }

  private popupHtml(e: EmployeeMapPoint): string {
    const name = `${esc(e.lastName)}, ${esc(e.firstName)}`;
    const pos = (e.positions || []).map(p => esc(p.name)).join(', ') || '—';
    const city = e.address ? esc(`${e.address.city}, ${e.address.state}`) : '';
    const statusLabel = esc(this.transloco.translate('map.status.' + e.status));
    return `<div class="emp-pop">
      <a class="emp-pop-name" href="javascript:void(0)">${name}</a>
      <div class="emp-pop-row">${statusLabel} · ${pos}</div>
      <div class="emp-pop-row muted">${city}</div>
    </div>`;
  }
}
