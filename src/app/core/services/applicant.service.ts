import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApplicantRegisterRequest,
  ApplicantResponse,
  PublicAgencyInfo,
  PublicPositionResponse,
  SetupPasswordRequest,
  SetupTokenResponse
} from '../models/applicant.model';
import { AuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class ApplicantService {
  private readonly apiUrl = `${environment.apiUrl}/applicants`;
  private readonly authUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  // Public endpoints
  register(request: ApplicantRegisterRequest): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.apiUrl}/register`, request);
  }

  getPositions(agencySlug?: string): Observable<PublicPositionResponse[]> {
    const params: Record<string, string> = {};
    if (agencySlug) params['agencySlug'] = agencySlug;
    return this.http.get<PublicPositionResponse[]>(`${this.apiUrl}/positions`, { params });
  }

  getAgencyInfo(params: { key?: string; slug?: string }): Observable<PublicAgencyInfo> {
    const httpParams: Record<string, string> = {};
    if (params.key) httpParams['key'] = params.key;
    if (params.slug) httpParams['slug'] = params.slug;
    return this.http.get<PublicAgencyInfo>(`${this.apiUrl}/agency-info`, { params: httpParams });
  }

  validateSetupToken(token: string): Observable<SetupTokenResponse> {
    return this.http.get<SetupTokenResponse>(`${this.apiUrl}/setup-token`, {
      params: { token }
    });
  }

  setupPassword(request: SetupPasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/setup-password`, request);
  }

  // Admin endpoints
  listApplicants(): Observable<ApplicantResponse[]> {
    return this.http.get<ApplicantResponse[]>(this.apiUrl);
  }

  approve(employeePublicId: string): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.apiUrl}/${employeePublicId}/approve`, {});
  }

  reject(employeePublicId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${employeePublicId}/reject`, {});
  }

  activate(employeePublicId: string): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.apiUrl}/${employeePublicId}/activate`, {});
  }

  resendSetup(employeePublicId: string): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.apiUrl}/${employeePublicId}/resend-setup`, {});
  }
}
