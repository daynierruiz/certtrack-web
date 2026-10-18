import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { EmployeeService } from '../../../core/services/employee.service';
import { GeoapifyService } from '../../../core/services/geoapify.service';
import { PositionService } from '../../../core/services/position.service';
import { Employee, EmployeeUpsertRequest } from '../../../core/models/employee.model';
import { LANGUAGE_OPTIONS, LanguageCode } from '../../../core/models/applicant.model';
import { GeoapifyFeature } from '../../../core/models/address.model';
import { PositionResponse } from '../../../core/models/position.model';
import { toLocalIsoDate } from '../../../core/utils/date.util';

@Component({
  selector: 'app-employee-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule,
    MatAutocompleteModule, MatProgressSpinnerModule, MatDividerModule,
    MatSnackBarModule,
    TranslocoModule
  ],
  template: `
    <h2 mat-dialog-title>{{ (isEdit ? 'employees.form.titleEdit' : 'employees.form.titleAdd') | transloco }}</h2>
    <mat-dialog-content>
      <form #form="ngForm">

        <h3 class="section-title">{{ 'employees.form.sectionPersonal' | transloco }}</h3>
        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'employees.form.firstName' | transloco }}</mat-label>
            <input matInput [(ngModel)]="model.firstName" name="firstName" required maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'employees.form.lastName' | transloco }}</mat-label>
            <input matInput [(ngModel)]="model.lastName" name="lastName" required maxlength="100">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'common.email' | transloco }}</mat-label>
            <input matInput type="email" [(ngModel)]="model.email" name="email" maxlength="191">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'common.phone' | transloco }}</mat-label>
            <input matInput [(ngModel)]="model.phone" name="phone" maxlength="30">
          </mat-form-field>
        </div>

        <h3 class="section-title">{{ 'employees.form.sectionEmployment' | transloco }}</h3>
        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'common.status' | transloco }}</mat-label>
            <mat-select [(ngModel)]="model.status" name="status" required>
              <mat-option value="ACTIVE">{{ 'employees.status.ACTIVE' | transloco }}</mat-option>
              <mat-option value="ONBOARDING">{{ 'employees.status.ONBOARDING' | transloco }}</mat-option>
              <mat-option value="INACTIVE">{{ 'employees.status.INACTIVE' | transloco }}</mat-option>
              <mat-option value="TERMINATED">{{ 'employees.status.TERMINATED' | transloco }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'employees.form.employeeCode' | transloco }}</mat-label>
            <input matInput [(ngModel)]="model.employeeCode" name="employeeCode" maxlength="50">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'employees.form.hireDate' | transloco }}</mat-label>
            <input matInput [matDatepicker]="hirePicker" [(ngModel)]="hireDate" name="hireDate">
            <mat-datepicker-toggle matIconSuffix [for]="hirePicker"></mat-datepicker-toggle>
            <mat-datepicker #hirePicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'employees.form.externalId' | transloco }}</mat-label>
            <input matInput [(ngModel)]="model.externalId" name="externalId" maxlength="100">
          </mat-form-field>
        </div>

        <h3 class="section-title">{{ 'employees.form.sectionProfile' | transloco }}</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'employees.list.languages' | transloco }}</mat-label>
          <mat-select multiple [(ngModel)]="model.languages" name="languages">
            @for (lang of languageOptions; track lang.value) {
              <mat-option [value]="lang.value">{{ 'spokenLanguages.' + lang.value | transloco }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (isOtherSelected()) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'employees.form.languageOther' | transloco }}</mat-label>
            <input matInput [(ngModel)]="model.languageOther" name="languageOther" maxlength="100">
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'employees.form.schoolName' | transloco }}</mat-label>
          <input matInput [(ngModel)]="model.schoolName" name="schoolName" maxlength="255">
        </mat-form-field>

        <h3 class="section-title">{{ 'employees.form.sectionPositions' | transloco }}</h3>
        @if (loadingPositions) {
          <div class="positions-loading">
            <mat-spinner diameter="20"></mat-spinner>
            <span>{{ 'common.loading' | transloco }}</span>
          </div>
        } @else if (availablePositions.length === 0) {
          <div class="muted">{{ 'employees.form.noPositionsAvailable' | transloco }}</div>
        } @else {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'employees.form.positionsLabel' | transloco }}</mat-label>
            <mat-select multiple [(ngModel)]="selectedPositionIds" name="positions">
              @for (p of availablePositions; track p.publicId) {
                <mat-option [value]="p.publicId">
                  {{ p.name }} ({{ p.code }})@if (!p.isActive) { <span class="muted"> — {{ 'employees.form.positionInactive' | transloco }}</span> }
                </mat-option>
              }
            </mat-select>
            <mat-hint>{{ 'employees.form.positionsHint' | transloco }}</mat-hint>
          </mat-form-field>
        }

        <h3 class="section-title">{{ 'employees.form.sectionAddress' | transloco }}</h3>
        @if (existingAddressDisplay && !changingAddress && !selectedFeature) {
          <div class="current-address">
            <div>
              <div>{{ existingAddressDisplay }}</div>
              <small class="muted">{{ 'employees.form.verifiedOn' | transloco }} {{ data.employee?.address?.validatedAt | date:'mediumDate' }}</small>
            </div>
            <button mat-stroked-button type="button" (click)="changingAddress = true">
              <mat-icon>edit</mat-icon> {{ 'employees.form.changeAddress' | transloco }}
            </button>
          </div>
        } @else {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'employees.form.searchAddress' | transloco }}</mat-label>
            <input matInput
                   [matAutocomplete]="auto"
                   [(ngModel)]="searchText"
                   name="addressSearch"
                   (ngModelChange)="onSearchChange($event)"
                   [placeholder]="'employees.form.searchAddressPlaceholder' | transloco"
                   autocomplete="off">
            @if (searching) {
              <mat-spinner matSuffix diameter="20"></mat-spinner>
            }
            <mat-hint>{{ 'employees.form.addressHint' | transloco }}</mat-hint>
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
              <mat-label>{{ 'employees.form.aptSuite' | transloco }}</mat-label>
              <input matInput [(ngModel)]="addressLine2" name="addressLine2" maxlength="200">
            </mat-form-field>
          }

          @if (existingAddressDisplay && changingAddress) {
            <button mat-button type="button" (click)="cancelAddressChange()">
              {{ 'employees.form.keepCurrentAddress' | transloco }}
            </button>
          }
        }

        <h3 class="section-title">{{ 'common.notes' | transloco }}</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.notes' | transloco }}</mat-label>
          <textarea matInput [(ngModel)]="model.notes" name="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-raised-button color="primary"
              [disabled]="!form.valid || saving"
              (click)="onSave()">
        @if (saving) {
          {{ 'common.saving' | transloco }}
        } @else {
          {{ (isEdit ? 'common.update' : 'common.create') | transloco }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-row { display: flex; gap: 16px; }
    .form-row mat-form-field { flex: 1; }
    .full-width { width: 100%; }
    .section-title {
      margin: 16px 0 12px;
      font-size: 13px;
      font-weight: 600;
      color: #1565c0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    mat-dialog-content { min-width: min(520px, 92vw); max-height: 70vh; padding-top: 20px !important; }
    .current-address {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .muted { color: #757575; font-size: 12px; }
    .selected-preview {
      display: flex; gap: 12px;
      padding: 12px;
      background: #e8f5e9;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .verified-icon { color: #4caf50; }
    .suggestion { display: flex; flex-direction: column; line-height: 1.3; }
    .suggestion-line2 { font-size: 12px; color: #666; }
    .positions-loading { display: flex; gap: 8px; align-items: center; color: #757575; margin-bottom: 12px; }
    @media (max-width: 480px) {
      .form-row { flex-direction: column; gap: 0; }
    }
  `]
})
export class EmployeeFormDialogComponent implements OnInit {
  isEdit: boolean;
  saving = false;
  hireDate: Date | null = null;

  model: EmployeeUpsertRequest;
  readonly languageOptions = LANGUAGE_OPTIONS;

  // Address autocomplete state
  searching = false;
  searchText = '';
  addressLine2 = '';
  suggestions: GeoapifyFeature[] = [];
  selectedFeature: GeoapifyFeature | null = null;
  existingAddressDisplay: string | null = null;
  changingAddress = false;

  // Positions state
  availablePositions: PositionResponse[] = [];
  selectedPositionIds: string[] = [];
  initialPositionIds: string[] = [];
  loadingPositions = true;

  private readonly search$ = new Subject<string>();

  constructor(
    private dialogRef: MatDialogRef<EmployeeFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee?: Employee; agencyPublicId: string },
    private employeeService: EmployeeService,
    private geoapify: GeoapifyService,
    private positionService: PositionService,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService
  ) {
    this.isEdit = !!data.employee;
    const e = data.employee;
    this.model = {
      agencyPublicId: data.agencyPublicId,
      firstName: e?.firstName ?? '',
      lastName: e?.lastName ?? '',
      email: e?.email ?? '',
      phone: e?.phone ?? '',
      employeeCode: e?.employeeCode ?? '',
      externalId: e?.externalId ?? '',
      status: e?.status ?? 'ACTIVE',
      notes: e?.notes ?? '',
      languages: e?.languages ?? [],
      languageOther: e?.languageOther ?? '',
      schoolName: e?.schoolName ?? ''
    };
    if (e?.hireDate) {
      this.hireDate = new Date(e.hireDate + 'T00:00:00');
    }
    if (e?.address) {
      this.addressLine2 = e.address.addressLine2 ?? '';
      this.existingAddressDisplay = this.formatAddress(e.address);
    }
  }

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

    this.loadPositions();
  }

  private loadPositions(): void {
    const employeePublicId = this.data.employee?.publicId;
    forkJoin({
      all: this.positionService.getAll(this.data.agencyPublicId, 0, 200),
      assigned: employeePublicId
        ? this.positionService.getEmployeeEligibility(employeePublicId)
            .pipe(catchError(() => of([])))
        : of([])
    }).subscribe({
      next: ({ all, assigned }) => {
        this.availablePositions = all.content;
        this.initialPositionIds = assigned.map(e => e.positionPublicId);
        this.selectedPositionIds = [...this.initialPositionIds];
        this.loadingPositions = false;
      },
      error: () => {
        this.loadingPositions = false;
      }
    });
  }

  isOtherSelected(): boolean {
    return (this.model.languages ?? []).includes('OTHER' as LanguageCode);
  }

  onSearchChange(value: string | GeoapifyFeature): void {
    if (typeof value !== 'string') return;
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

  cancelAddressChange(): void {
    this.changingAddress = false;
    this.selectedFeature = null;
    this.searchText = '';
    this.suggestions = [];
  }

  onSave(): void {
    this.saving = true;

    const request: EmployeeUpsertRequest = {
      ...this.model,
      hireDate: this.hireDate ? this.formatDate(this.hireDate) : undefined,
      languageOther: this.isOtherSelected() ? this.model.languageOther : undefined
    };

    // Only include address if user picked a new one.
    if (this.selectedFeature) {
      const p = this.selectedFeature.properties;
      if (!p.city || !p.state_code || !p.postcode || !p.country_code) {
        this.saving = false;
        this.snackBar.open(
          this.transloco.translate('employees.form.addressIncomplete'),
          'OK', { duration: 5000 }
        );
        return;
      }
      request.address = {
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
    }

    const obs = this.isEdit
      ? this.employeeService.update(this.data.employee!.publicId, request)
      : this.employeeService.create(request);

    obs.subscribe({
      next: (saved) => {
        this.syncPositions(saved.publicId);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.transloco.translate('employees.form.saveError'), 'OK', { duration: 5000 });
      }
    });
  }

  private syncPositions(employeePublicId: string): void {
    const toAdd = this.selectedPositionIds.filter(id => !this.initialPositionIds.includes(id));
    const toRemove = this.initialPositionIds.filter(id => !this.selectedPositionIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      this.finishSave();
      return;
    }

    const ops = [
      ...toAdd.map(id => this.positionService.assignEmployee(id, { employeePublicId })),
      ...toRemove.map(id => this.positionService.unassignEmployee(id, employeePublicId))
    ];

    forkJoin(ops).subscribe({
      next: () => this.finishSave(),
      error: (err) => {
        this.saving = false;
        this.snackBar.open(
          err.error?.message || this.transloco.translate('employees.form.positionsSaveError'),
          'OK',
          { duration: 6000 }
        );
        this.dialogRef.close(true);
      }
    });
  }

  private finishSave(): void {
    this.snackBar.open(
      this.transloco.translate(this.isEdit ? 'employees.form.updatedOk' : 'employees.form.createdOk'),
      'OK', { duration: 3000 }
    );
    this.dialogRef.close(true);
  }

  private formatDate(date: Date): string {
    return toLocalIsoDate(date);
  }

  private formatAddress(a: NonNullable<Employee['address']>): string {
    const parts = [a.addressLine1, a.addressLine2, `${a.city}, ${a.state} ${a.postalCode}`]
      .filter(Boolean);
    return parts.join(', ');
  }
}
