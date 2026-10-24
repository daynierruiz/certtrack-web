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
  PublicPositionResponse,
  RequiredCredentialType
} from '../../../core/models/applicant.model';
import { prepareFileForUpload } from '../../../core/utils/file-prep.util';

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
                @if (agencyLogoUrl) {
                  <img [src]="agencyLogoUrl" [alt]="agencyInfo?.name || ''" class="logo-img agency-logo">
                  <div class="powered-by">{{ 'branding.poweredBy' | transloco }}</div>
                } @else {
                  <img src="assets/logo.png" alt="CareReady" class="logo-img">
                }
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
                  <mat-label>{{ 'applicant.apply.phone' | transloco }}</mat-label>
                  <input matInput type="tel" [(ngModel)]="phone" name="phone" required maxlength="30">
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

                <mat-form-field appearance="outline" class="full-width has-hint" subscriptSizing="dynamic">
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

                <mat-form-field appearance="outline" class="full-width has-hint" subscriptSizing="dynamic">
                  <mat-label>{{ 'applicant.apply.school' | transloco }}</mat-label>
                  <input matInput [(ngModel)]="schoolName" name="schoolName"
                         required maxlength="255"
                         [placeholder]="'applicant.apply.schoolPlaceholder' | transloco">
                  <mat-icon matSuffix>school</mat-icon>
                  <mat-hint>{{ 'applicant.apply.schoolHint' | transloco }}</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width has-hint" subscriptSizing="dynamic">
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
        } @else if (showDocsStep) {
          <mat-card-content>
            <div class="docs-step">
              <mat-icon class="success-icon">cloud_upload</mat-icon>
              <h2>{{ 'applicant.apply.docsTitle' | transloco }}</h2>
              <p class="sub-text">{{ 'applicant.apply.docsSubtitle' | transloco }}</p>

              <div class="doc-list">
                @for (entry of docEntries; track entry.type.publicId) {
                  <div class="doc-card" [class.is-done]="entry.done">
                    <div class="doc-card-head">
                      <div class="doc-info">
                        <span class="doc-name">{{ entry.type.name }}</span>
                        @if (entry.type.mandatory) {
                          <span class="doc-req">{{ 'applicant.apply.docRequired' | transloco }}</span>
                        } @else {
                          <span class="doc-opt">{{ 'applicant.apply.docOptional' | transloco }}</span>
                        }
                      </div>
                      @if (entry.done) {
                        <span class="doc-done"><mat-icon>check_circle</mat-icon> {{ 'applicant.apply.docSaved' | transloco }}</span>
                      }
                    </div>

                    @if (!entry.done) {
                      <button mat-stroked-button color="primary" type="button" class="doc-file-btn"
                              (click)="pickFileFor(entry, docInput)" [disabled]="entry.extracting || entry.saving">
                        <mat-icon>{{ canCapture ? 'photo_camera' : 'upload' }}</mat-icon>
                        {{ (entry.file ? 'applicant.apply.docChangeFile' : 'applicant.apply.docPickFile') | transloco }}
                      </button>
                      @if (entry.fileName) {
                        <div class="doc-file-name"><mat-icon>description</mat-icon> {{ entry.fileName }}</div>
                      }

                      @if (entry.extracting) {
                        <div class="doc-extracting">
                          <mat-spinner diameter="18"></mat-spinner>
                          <span>{{ 'applicant.apply.docExtracting' | transloco }}</span>
                        </div>
                      } @else if (entry.aiFilled) {
                        <div class="doc-ai-note">
                          <mat-icon>auto_awesome</mat-icon>
                          <span>{{ 'applicant.apply.docAiFilled' | transloco }}</span>
                        </div>
                      }

                      <div class="doc-fields">
                        <mat-form-field appearance="outline" subscriptSizing="dynamic">
                          <mat-label>{{ 'applicant.apply.docIssueDate' | transloco }}</mat-label>
                          <input matInput type="date" [(ngModel)]="entry.issueDate"
                                 [ngModelOptions]="{ standalone: true }">
                        </mat-form-field>
                        <mat-form-field appearance="outline" subscriptSizing="dynamic">
                          <mat-label>{{ 'applicant.apply.docExpirationDate' | transloco }}</mat-label>
                          <input matInput type="date" [(ngModel)]="entry.expirationDate"
                                 [ngModelOptions]="{ standalone: true }">
                        </mat-form-field>
                        <mat-form-field appearance="outline" subscriptSizing="dynamic">
                          <mat-label>{{ 'applicant.apply.docIssuer' | transloco }}</mat-label>
                          <input matInput [(ngModel)]="entry.issuer" maxlength="150"
                                 [ngModelOptions]="{ standalone: true }">
                        </mat-form-field>
                        <mat-form-field appearance="outline" subscriptSizing="dynamic">
                          <mat-label>{{ 'applicant.apply.docCredentialNumber' | transloco }}</mat-label>
                          <input matInput [(ngModel)]="entry.credentialNumber" maxlength="100"
                                 [ngModelOptions]="{ standalone: true }">
                        </mat-form-field>
                      </div>

                      @if (entry.error) {
                        <div class="error-message">{{ entry.error }}</div>
                      }

                      <button mat-raised-button color="primary" type="button" class="full-width doc-save-btn"
                              (click)="saveEntry(entry)"
                              [disabled]="entry.saving || entry.extracting || !entry.file">
                        @if (entry.saving) {
                          <mat-spinner diameter="20"></mat-spinner>
                        } @else {
                          {{ 'applicant.apply.docSave' | transloco }}
                        }
                      </button>
                    }
                  </div>
                }
              </div>

              <input #docInput type="file" accept="image/*,application/pdf" hidden
                     [attr.capture]="canCapture ? 'environment' : null"
                     (change)="onDocFileSelected($event)">

              <button mat-raised-button color="primary" class="full-width docs-finish-btn" (click)="finishDocs()">
                {{ 'applicant.apply.docsFinish' | transloco }}
              </button>
              <p class="sub-text skip-note">{{ 'applicant.apply.docsSkipNote' | transloco }}</p>
            </div>
          </mat-card-content>
        } @else {
          <mat-card-content>
            <div class="success-container">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <h2>{{ 'applicant.apply.successTitle' | transloco }}</h2>
              <p>{{ 'applicant.apply.successThankYou' | transloco: { name: firstName } }}</p>

              <!-- Make it clear the process is NOT finished: they must wait for
                   approval, then they'll get a link to create their account and
                   upload their documents. -->
              <div class="next-step">
                <div class="next-step-label">
                  <mat-icon>schedule</mat-icon>
                  <strong>{{ 'applicant.apply.nextStepTitle' | transloco }}</strong>
                </div>
                <p class="sub-text">{{ 'applicant.apply.nextStepInfo' | transloco }}</p>
              </div>
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
    .agency-logo { max-height: 90px; max-width: 260px; object-fit: contain; }
    .powered-by { font-size: 11px; color: #90a4ae; margin-top: 4px; letter-spacing: 0.3px; }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .form-row mat-form-field { flex: 1; }
    .full-width { width: 100%; }
    /* Fields that show a hint use subscriptSizing="dynamic", which drops the
       reserved subscript space — so the hint (often two lines on mobile) sits
       flush against the next field's floating label and looks cramped. Give them
       a clear gap below so the hint always breathes above the next field. */
    .full-width.has-hint { margin-bottom: 18px; }
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
    .docs-step { text-align: center; padding: 8px 0; }
    .docs-step h2 { color: #1a237e; margin: 12px 0 4px; }
    .docs-step .success-icon { color: #1565c0; }
    .doc-list { display: flex; flex-direction: column; gap: 10px; margin: 18px 0; text-align: left; }
    .doc-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 14px; border: 1px solid #e0e0e0; border-radius: 10px;
    }
    .doc-info { display: flex; flex-direction: column; gap: 2px; }
    .doc-name { font-weight: 500; }
    .doc-req { font-size: 11px; color: #c62828; }
    .doc-opt { font-size: 11px; color: #888; }
    .doc-done { display: inline-flex; align-items: center; gap: 4px; color: #2e7d32; font-size: 13px; }
    .doc-done mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .doc-card {
      border: 1px solid #e0e0e0; border-radius: 12px; padding: 14px 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .doc-card.is-done { background: #f1f8f2; border-color: #c8e6c9; }
    .doc-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .doc-file-btn { align-self: flex-start; }
    .doc-file-name {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 13px; color: #555; word-break: break-all;
    }
    .doc-file-name mat-icon { font-size: 18px; width: 18px; height: 18px; color: #888; }
    .doc-extracting, .doc-ai-note {
      display: inline-flex; align-items: center; gap: 8px; font-size: 13px;
    }
    .doc-extracting { color: #1565c0; }
    .doc-ai-note { color: #6a1b9a; }
    .doc-ai-note mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .doc-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; margin-top: 2px; }
    .doc-save-btn { margin-top: 2px; }
    .docs-finish-btn { margin-top: 18px; }
    @media (max-width: 480px) {
      .doc-fields { grid-template-columns: 1fr; }
    }
    .skip-note { margin-top: 10px; font-size: 12px; }
    .success-container h2 {
      color: #1a237e;
      margin: 16px 0 8px;
    }
    .sub-text {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .next-step {
      margin-top: 16px; padding: 16px; border: 1px solid #bbdefb; border-radius: 10px;
      background: #eef4ff; text-align: left;
    }
    .next-step-label { display: flex; align-items: center; gap: 8px; color: #1565c0; margin-bottom: 6px; }
    .next-step button { margin-top: 8px; width: 100%; }
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
      .form-row { flex-direction: column; gap: 4px; }
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

  // Post-submit credential step: one credential + document per required type,
  // with AI-assisted field extraction — mirrors the logged-in credential create.
  uploadToken: string | null = null;
  requiredCredentialTypes: RequiredCredentialType[] = [];
  docEntries: DocEntry[] = [];
  pendingEntry: DocEntry | null = null;
  docsDone = false;
  readonly canCapture = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;

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

  /** Agency branding logo URL, or null to fall back to the CareReady logo. */
  get agencyLogoUrl(): string | null {
    return this.agencyInfo?.hasLogo
      ? this.applicantService.agencyLogoUrl(this.agencyInfo.publicId)
      : null;
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
      applyLinkKey: this.applyLinkKey || undefined,
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
      next: (res) => {
        this.loading = false;
        this.submitted = true;
        this.uploadToken = res.uploadToken;
        this.requiredCredentialTypes = res.requiredCredentialTypes || [];
        this.docEntries = this.requiredCredentialTypes.map(type => ({
          type, file: null, fileName: '', extracting: false, saving: false,
          done: false, aiFilled: false, error: null,
          issueDate: '', expirationDate: '', issuer: '', credentialNumber: ''
        }));
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || this.transloco.translate('applicant.apply.submitError');
      }
    });
  }

  get showDocsStep(): boolean {
    return this.submitted && !!this.uploadToken
        && this.docEntries.length > 0 && !this.docsDone;
  }

  pickFileFor(entry: DocEntry, input: HTMLInputElement): void {
    if (entry.saving || entry.extracting) return;
    this.pendingEntry = entry;
    input.value = '';
    input.click();
  }

  onDocFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const entry = this.pendingEntry;
    if (!file || !entry) return;
    entry.error = null;
    prepareFileForUpload(file).then(prepared => {
      entry.file = prepared;
      entry.fileName = prepared.name;
      this.runExtraction(entry);
    }).catch(() => {
      entry.error = this.transloco.translate('applicant.apply.docFileError');
    });
  }

  /** Ask the backend (AI) to read the file and pre-fill the credential fields. */
  private runExtraction(entry: DocEntry): void {
    if (!entry.file || !this.uploadToken) return;
    entry.extracting = true;
    entry.aiFilled = false;
    this.applicantService.extractApplicationData(this.uploadToken, [entry.file], entry.type.name).subscribe({
      next: (res) => {
        entry.extracting = false;
        let filled = false;
        // Only fill empty fields so we never overwrite what the applicant typed.
        if (res.issueDate && !entry.issueDate) { entry.issueDate = res.issueDate; filled = true; }
        if (res.expirationDate && !entry.expirationDate) { entry.expirationDate = res.expirationDate; filled = true; }
        if (res.issuer && !entry.issuer) { entry.issuer = res.issuer; filled = true; }
        if (res.credentialNumber && !entry.credentialNumber) { entry.credentialNumber = res.credentialNumber; filled = true; }
        entry.aiFilled = filled;
      },
      error: () => { entry.extracting = false; /* silent — applicant fills manually */ }
    });
  }

  saveEntry(entry: DocEntry): void {
    if (!entry.file) {
      entry.error = this.transloco.translate('applicant.apply.docFileRequired');
      return;
    }
    if (!this.uploadToken) return;
    entry.saving = true;
    entry.error = null;
    this.applicantService.uploadApplicationDocument(this.uploadToken, entry.type.publicId, entry.file, {
      issueDate: entry.issueDate || undefined,
      expirationDate: entry.expirationDate || undefined,
      issuer: entry.issuer?.trim() || undefined,
      credentialNumber: entry.credentialNumber?.trim() || undefined
    }).subscribe({
      next: () => { entry.saving = false; entry.done = true; },
      error: (err) => {
        entry.saving = false;
        entry.error = err.error?.message || this.transloco.translate('applicant.apply.docSaveError');
      }
    });
  }

  finishDocs(): void {
    this.docsDone = true;
  }
}

/** One required credential the applicant can fill + upload after submitting. */
interface DocEntry {
  type: RequiredCredentialType;
  file: File | null;
  fileName: string;
  extracting: boolean;
  saving: boolean;
  done: boolean;
  aiFilled: boolean;
  error: string | null;
  issueDate: string;
  expirationDate: string;
  issuer: string;
  credentialNumber: string;
}
