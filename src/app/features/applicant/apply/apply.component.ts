import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ApplicantService } from '../../../core/services/applicant.service';
import { LanguageService } from '../../../core/services/language.service';
import { GeoapifyService } from '../../../core/services/geoapify.service';
import { GeoapifyFeature } from '../../../core/models/address.model';
import {
  LANGUAGE_OPTIONS,
  LanguageCode,
  PublicAgencyInfo,
  PublicPositionResponse
} from '../../../core/models/applicant.model';

@Component({
  selector: 'app-apply',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatAutocompleteModule, TranslocoModule
  ],
  template: `
    <div class="apply-container">
      <mat-card class="apply-card">
        <div class="lang-switch">
          @for (opt of languageService.options; track opt.code) {
            <button mat-button type="button" class="lang-btn"
                    [class.active]="languageService.activeLang() === opt.code"
                    (click)="languageService.use(opt.code)">
              {{ opt.label }}
            </button>
          }
        </div>
        @if (!submitted) {
          <mat-card-header>
            <mat-card-title>
              <div class="logo">
                <img src="assets/logo.png" alt="CareReady" class="logo-img">
              </div>
            </mat-card-title>
            <mat-card-subtitle>{{ 'applicant.apply.subtitle' | transloco }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            @if (loadingAgency) {
              <div class="loading-center">
                <mat-spinner diameter="40"></mat-spinner>
              </div>
            } @else if (agencyError) {
              <div class="error-message">
                {{ agencyError }}
              </div>
            } @else if (loadingPositions) {
              <div class="loading-center">
                <mat-spinner diameter="40"></mat-spinner>
              </div>
            } @else if (positions.length === 0) {
              <div class="error-message">
                {{ 'applicant.apply.noPositions' | transloco }}
              </div>
            } @else {
              @if (agencyInfo) {
                <div class="agency-banner">
                  <mat-icon>business</mat-icon>
                  <div>
                    <span class="agency-banner-label">{{ 'applicant.apply.applyingTo' | transloco }}</span>
                    <strong>{{ agencyInfo.name }}</strong>
                  </div>
                </div>
              }
              <form (ngSubmit)="onSubmit()" #applyForm="ngForm">
                <!-- Honeypot: hidden from real users; bots that auto-fill all inputs get silently rejected. -->
                <input type="text" name="website" [(ngModel)]="website"
                       class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'applicant.apply.firstName' | transloco }}</mat-label>
                    <input matInput [(ngModel)]="firstName" name="firstName" required maxlength="100">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'applicant.apply.lastName' | transloco }}</mat-label>
                    <input matInput [(ngModel)]="lastName" name="lastName" required maxlength="100">
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'common.email' | transloco }}</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="email" required email maxlength="191">
                  <mat-icon matSuffix>email</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'applicant.apply.phoneOptional' | transloco }}</mat-label>
                  <input matInput type="tel" [(ngModel)]="phone" name="phone" maxlength="30">
                  <mat-icon matSuffix>phone</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'applicant.apply.position' | transloco }}</mat-label>
                  <mat-select [(ngModel)]="positionPublicId" name="position" required>
                    @for (pos of positions; track pos.publicId) {
                      <mat-option [value]="pos.publicId">
                        {{ pos.name }}
                        @if (pos.description) {
                          <span class="position-desc"> - {{ pos.description }}</span>
                        }
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'applicant.apply.languages' | transloco }}</mat-label>
                  <mat-select [(ngModel)]="languages" name="languages" multiple required>
                    @for (lang of languageOptions; track lang.value) {
                      <mat-option [value]="lang.value">{{ 'spokenLanguages.' + lang.value | transloco }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>{{ 'applicant.apply.languagesHint' | transloco }}</mat-hint>
                </mat-form-field>

                @if (isOtherSelected()) {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'applicant.apply.otherLanguage' | transloco }}</mat-label>
                    <input matInput [(ngModel)]="languageOther" name="languageOther"
                           required maxlength="100">
                  </mat-form-field>
                }

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'applicant.apply.school' | transloco }}</mat-label>
                  <input matInput [(ngModel)]="schoolName" name="schoolName"
                         required maxlength="255"
                         [placeholder]="'applicant.apply.schoolPlaceholder' | transloco">
                  <mat-icon matSuffix>school</mat-icon>
                  <mat-hint>{{ 'applicant.apply.schoolHint' | transloco }}</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'applicant.apply.address' | transloco }}</mat-label>
                  <input matInput
                         name="addressSearch"
                         [matAutocomplete]="addrAuto"
                         [(ngModel)]="addressSearchText"
                         (ngModelChange)="onAddressSearchChange($event)"
                         [placeholder]="'applicant.apply.addressPlaceholder' | transloco"
                         autocomplete="off"
                         required>
                  <mat-icon matSuffix>home</mat-icon>
                  @if (addressSearching) {
                    <mat-spinner matSuffix diameter="20"></mat-spinner>
                  }
                  <mat-hint>{{ 'applicant.apply.addressHint' | transloco }}</mat-hint>
                </mat-form-field>

                <mat-autocomplete #addrAuto="matAutocomplete"
                                  [displayWith]="displayAddress"
                                  (optionSelected)="onAddressSelect($event)">
                  @for (feature of addressSuggestions; track feature.properties.place_id) {
                    <mat-option [value]="feature">
                      <div class="suggestion">
                        <strong>{{ feature.properties.address_line1 }}</strong>
                        <span class="suggestion-line2">{{ feature.properties.address_line2 }}</span>
                      </div>
                    </mat-option>
                  }
                </mat-autocomplete>

                @if (selectedAddress) {
                  <div class="selected-preview">
                    <mat-icon class="verified-icon">check_circle</mat-icon>
                    <div>
                      <strong>{{ selectedAddress.properties.address_line1 }}</strong><br>
                      {{ selectedAddress.properties.address_line2 }}
                    </div>
                  </div>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'applicant.apply.aptSuite' | transloco }}</mat-label>
                    <input matInput [(ngModel)]="addressLine2" name="addressLine2" maxlength="200">
                  </mat-form-field>
                }

                @if (errorMessage) {
                  <div class="error-message">{{ errorMessage }}</div>
                }

                <button mat-raised-button color="primary" type="submit"
                        class="full-width submit-btn"
                        [disabled]="loading || !applyForm.valid || !selectedAddress">
                  @if (loading) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ 'applicant.apply.submitBtn' | transloco }}
                  }
                </button>
              </form>
            }
          </mat-card-content>
        } @else {
          <mat-card-content>
            <div class="success-container">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <h2>{{ 'applicant.apply.successTitle' | transloco }}</h2>
              <p>{{ 'applicant.apply.successThankYou' | transloco: { name: firstName } }}</p>
              <p class="sub-text">
                {{ 'applicant.apply.successInfo' | transloco }}
              </p>
            </div>
          </mat-card-content>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .apply-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
      padding: 24px;
    }
    .apply-card {
      width: min(520px, 95vw);
      padding: 32px;
    }
    .lang-switch {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin: -8px -8px 4px 0;
    }
    .lang-btn {
      min-width: 0;
      padding: 0 10px;
      line-height: 30px;
      color: #5c6bc0;
      font-size: 13px;
    }
    .lang-btn.active {
      color: #1a237e;
      font-weight: 700;
      text-decoration: underline;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      font-weight: 600;
      color: #1a237e;
    }
    .logo-img { max-width: 250px; height: auto; }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .form-row mat-form-field { flex: 1; }
    .full-width { width: 100%; }
    .submit-btn {
      margin-top: 16px;
      height: 48px;
      font-size: 16px;
    }
    .error-message {
      color: #d32f2f;
      font-size: 14px;
      margin-bottom: 8px;
      text-align: center;
    }
    .loading-center {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .position-desc {
      color: #666;
      font-size: 12px;
    }
    .agency-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #e8eaf6;
      border-radius: 8px;
      margin-bottom: 24px;
      color: #1a237e;
    }
    .agency-banner mat-icon {
      color: #3949ab;
    }
    .agency-banner-label {
      display: block;
      font-size: 12px;
      color: #5c6bc0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .agency-banner strong {
      font-size: 16px;
      color: #1a237e;
    }
    mat-card-header { margin-bottom: 24px; }
    .success-container {
      text-align: center;
      padding: 24px 0;
    }
    .success-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #4caf50;
    }
    .success-container h2 {
      color: #1a237e;
      margin: 16px 0 8px;
    }
    .sub-text {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .suggestion { display: flex; flex-direction: column; line-height: 1.3; }
    .suggestion-line2 { font-size: 12px; color: #666; }
    .hp-field {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
    .selected-preview {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #e8f5e9;
      border-radius: 4px;
      margin-bottom: 16px;
      align-items: center;
    }
    .verified-icon {
      color: #4caf50;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    @media (max-width: 480px) {
      .form-row { flex-direction: column; gap: 0; }
      .apply-card { padding: 20px; }
    }
  `]
})
export class ApplyComponent implements OnInit {
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  positionPublicId = '';
  agencySlug = '';
  applyLinkKey = '';
  agencyInfo: PublicAgencyInfo | null = null;
  languages: LanguageCode[] = [];
  languageOther = '';
  schoolName = '';

  readonly languageOptions = LANGUAGE_OPTIONS;

  positions: PublicPositionResponse[] = [];
  loadingAgency = true;
  agencyError = '';
  loadingPositions = false;
  loading = false;
  submitted = false;
  errorMessage = '';

  // Honeypot — must stay empty. Bound to hidden input.
  website = '';

  // Address autocomplete state (same pattern as AddressCardComponent)
  addressSearchText = '';
  addressLine2 = '';
  addressSuggestions: GeoapifyFeature[] = [];
  selectedAddress: GeoapifyFeature | null = null;
  addressSearching = false;
  private readonly addressSearch$ = new Subject<string>();

  isOtherSelected(): boolean {
    return this.languages.includes('OTHER');
  }

  constructor(
    private applicantService: ApplicantService,
    public languageService: LanguageService,
    private geoapify: GeoapifyService,
    private route: ActivatedRoute,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.applyLinkKey = this.route.snapshot.paramMap.get('key') || '';
    this.agencySlug = this.route.snapshot.queryParams['agency'] || '';

    this.addressSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(text => {
        this.addressSearching = true;
        return this.geoapify.autocomplete(text);
      })
    ).subscribe(features => {
      this.addressSuggestions = features;
      this.addressSearching = false;
    });

    this.applicantService.getAgencyInfo({
      key: this.applyLinkKey || undefined,
      slug: this.agencySlug || undefined
    }).subscribe({
      next: (info) => {
        this.agencyInfo = info;
        this.agencySlug = info.slug;
        this.loadingAgency = false;
        this.loadPositions();
      },
      error: (err) => {
        this.loadingAgency = false;
        this.agencyError = err.error?.message
          || this.transloco.translate('applicant.apply.invalidLink');
      }
    });
  }

  onAddressSearchChange(value: string | GeoapifyFeature): void {
    if (typeof value !== 'string') return;
    if (this.selectedAddress && value === this.displayAddress(this.selectedAddress)) {
      return;
    }
    this.selectedAddress = null;
    this.addressSearch$.next(value);
  }

  onAddressSelect(event: MatAutocompleteSelectedEvent): void {
    this.selectedAddress = event.option.value as GeoapifyFeature;
  }

  displayAddress = (feature: GeoapifyFeature | string): string => {
    if (typeof feature === 'string') return feature;
    return feature?.properties?.formatted ?? '';
  };

  private loadPositions(): void {
    this.loadingPositions = true;
    this.applicantService.getPositions(this.agencySlug).subscribe({
      next: (positions) => {
        this.positions = positions;
        this.loadingPositions = false;
      },
      error: () => {
        this.loadingPositions = false;
      }
    });
  }

  onSubmit(): void {
    if (!this.selectedAddress) {
      this.errorMessage = this.transloco.translate('applicant.apply.addressRequired');
      return;
    }
    const p = this.selectedAddress.properties;
    if (!p.city || !p.state_code || !p.postcode || !p.country_code) {
      this.errorMessage = this.transloco.translate('applicant.apply.addressIncomplete');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.applicantService.register({
      agencySlug: this.agencySlug,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone || undefined,
      positionPublicId: this.positionPublicId,
      languages: this.languages,
      languageOther: this.isOtherSelected() ? this.languageOther.trim() : undefined,
      schoolName: this.schoolName.trim(),
      address: {
        addressLine1: p.address_line1,
        addressLine2: this.addressLine2?.trim() || undefined,
        city: p.city,
        state: p.state_code.toUpperCase(),
        postalCode: p.postcode,
        country: p.country_code.toUpperCase(),
        latitude: p.lat,
        longitude: p.lon,
        placeId: p.place_id
      },
      website: this.website
    }).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || this.transloco.translate('applicant.apply.submitError');
      }
    });
  }
}
