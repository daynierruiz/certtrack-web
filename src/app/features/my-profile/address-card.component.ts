import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GeoapifyService } from '../../core/services/geoapify.service';
import { MyProfileService } from '../../core/services/my-profile.service';
import {
  EmployeeAddress,
  EmployeeAddressUpdateRequest,
  GeoapifyFeature
} from '../../core/models/address.model';

@Component({
  selector: 'app-address-card',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatAutocompleteModule,
    MatProgressSpinnerModule, MatSnackBarModule, TranslocoModule
  ],
  template: `
    <mat-card class="address-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>home</mat-icon> {{ 'myProfile.address.title' | transloco }}
        </mat-card-title>
      </mat-card-header>

      <mat-card-content>
        @if (!editing) {
          @if (address) {
            <div class="address-display">
              <div class="address-line">{{ address.addressLine1 }}</div>
              @if (address.addressLine2) {
                <div class="address-line">{{ address.addressLine2 }}</div>
              }
              <div class="address-line">
                {{ address.city }}, {{ address.state }} {{ address.postalCode }}
              </div>
              <div class="address-meta">
                <mat-icon class="verified-icon">verified</mat-icon>
                <span>{{ 'myProfile.address.verifiedOn' | transloco }} {{ address.validatedAt | date:'mediumDate' }}</span>
              </div>
            </div>
          } @else {
            <div class="address-empty">
              <mat-icon>location_off</mat-icon>
              <p>{{ 'myProfile.address.noAddress' | transloco }}</p>
            </div>
          }
        } @else {
          <div class="address-edit">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'myProfile.address.searchLabel' | transloco }}</mat-label>
              <input matInput
                     [matAutocomplete]="auto"
                     [(ngModel)]="searchText"
                     (ngModelChange)="onSearchChange($event)"
                     [placeholder]="'myProfile.address.searchPlaceholder' | transloco"
                     autocomplete="off">
              @if (searching) {
                <mat-spinner matSuffix diameter="20"></mat-spinner>
              }
              <mat-hint>{{ 'myProfile.address.searchHint' | transloco }}</mat-hint>
            </mat-form-field>

            <mat-autocomplete #auto="matAutocomplete"
                              [displayWith]="displaySuggestion"
                              (optionSelected)="onSelect($event)">
              @for (feature of suggestions; track feature.properties.place_id) {
                <mat-option [value]="feature">
                  <div class="suggestion">
                    <strong>{{ feature.properties.address_line1 }}</strong>
                    <span class="suggestion-line2">{{ feature.properties.address_line2 }}</span>
                  </div>
                </mat-option>
              }
            </mat-autocomplete>

            @if (selectedFeature) {
              <div class="selected-preview">
                <mat-icon class="verified-icon">check_circle</mat-icon>
                <div>
                  <strong>{{ selectedFeature.properties.address_line1 }}</strong><br>
                  {{ selectedFeature.properties.address_line2 }}
                </div>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'myProfile.address.aptSuite' | transloco }}</mat-label>
                <input matInput [(ngModel)]="addressLine2" maxlength="200">
              </mat-form-field>
            }
          </div>
        }
      </mat-card-content>

      <mat-card-actions align="end">
        @if (!editing) {
          <button mat-button color="primary" (click)="startEdit()">
            <mat-icon>edit</mat-icon> {{ address ? ('common.edit' | transloco) : ('myProfile.address.addAddress' | transloco) }}
          </button>
        } @else {
          <button mat-button (click)="cancel()">{{ 'common.cancel' | transloco }}</button>
          <button mat-raised-button color="primary"
                  (click)="save()"
                  [disabled]="!selectedFeature || saving">
            @if (saving) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              {{ 'common.save' | transloco }}
            }
          </button>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .address-card { margin-bottom: 16px; }
    mat-card-title { display: flex; align-items: center; gap: 8px; }
    .full-width { width: 100%; }
    .address-line { font-size: 15px; line-height: 1.5; }
    .address-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 13px;
      color: #4caf50;
    }
    .verified-icon { font-size: 18px; width: 18px; height: 18px; color: #4caf50; }
    .address-empty {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #757575;
      padding: 8px 0;
    }
    .address-empty mat-icon { color: #f57c00; }
    .selected-preview {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #e8f5e9;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .suggestion { display: flex; flex-direction: column; line-height: 1.3; }
    .suggestion-line2 { font-size: 12px; color: #666; }
  `]
})
export class AddressCardComponent implements OnInit {
  @Input() address: EmployeeAddress | null = null;
  @Output() addressUpdated = new EventEmitter<EmployeeAddress>();

  editing = false;
  searching = false;
  saving = false;
  searchText = '';
  addressLine2 = '';
  suggestions: GeoapifyFeature[] = [];
  selectedFeature: GeoapifyFeature | null = null;

  private readonly search$ = new Subject<string>();

  constructor(
    private geoapify: GeoapifyService,
    private myProfileService: MyProfileService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(text => {
        this.searching = true;
        return this.geoapify.autocomplete(text);
      })
    ).subscribe(features => {
      this.suggestions = features;
      this.searching = false;
    });
  }

  startEdit(): void {
    this.editing = true;
    this.searchText = '';
    this.addressLine2 = this.address?.addressLine2 ?? '';
    this.selectedFeature = null;
    this.suggestions = [];
  }

  cancel(): void {
    this.editing = false;
    this.selectedFeature = null;
    this.suggestions = [];
  }

  onSearchChange(value: string | GeoapifyFeature): void {
    if (typeof value !== 'string') return;
    // Ignore the post-select echo (autocomplete writes the formatted text back).
    if (this.selectedFeature && value === this.displaySuggestion(this.selectedFeature)) {
      return;
    }
    this.selectedFeature = null;
    this.search$.next(value);
  }

  onSelect(event: MatAutocompleteSelectedEvent): void {
    this.selectedFeature = event.option.value as GeoapifyFeature;
  }

  displaySuggestion = (feature: GeoapifyFeature | string): string => {
    if (typeof feature === 'string') return feature;
    return feature?.properties?.formatted ?? '';
  };

  save(): void {
    if (!this.selectedFeature) return;
    const p = this.selectedFeature.properties;

    if (!p.city || !p.state_code || !p.postcode || !p.country_code) {
      this.snackBar.open(
        this.transloco.translate('myProfile.address.incompleteAddress'),
        'OK', { duration: 5000 }
      );
      return;
    }

    const request: EmployeeAddressUpdateRequest = {
      addressLine1: p.address_line1,
      addressLine2: this.addressLine2?.trim() || undefined,
      city: p.city,
      state: p.state_code.toUpperCase(),
      postalCode: p.postcode,
      country: p.country_code.toUpperCase(),
      latitude: p.lat,
      longitude: p.lon,
      placeId: p.place_id
    };

    this.saving = true;
    this.myProfileService.updateAddress(request).subscribe({
      next: (updated) => {
        this.saving = false;
        this.editing = false;
        this.address = updated;
        this.addressUpdated.emit(updated);
        this.snackBar.open(this.transloco.translate('myProfile.address.addressSaved'), 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(
          err.error?.message || this.transloco.translate('myProfile.address.failedToSave'),
          'OK', { duration: 5000 }
        );
      }
    });
  }
}
