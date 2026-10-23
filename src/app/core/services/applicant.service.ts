import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApplicantRegisterRequest,
  ApplicantRegistrationResult,
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
  register(request: ApplicantRegisterRequest): Observable<ApplicantRegistrationResult> {
    return this.http.post<ApplicantRegistrationResult>(`${this.apiUrl}/register`, request);
  }

  /** Public: attach a document to the just-submitted application (token-gated). */
  uploadApplicationDocument(
    token: string, credentialTypePublicId: string, file: File,
    issueDate?: string, expirationDate?: string
  ): Observable<void> {
    const fd = new FormData();
    fd.append('token', token);
    fd.append('credentialTypePublicId', credentialTypePublicId);
    fd.append('file', file);
    if (issueDate) fd.append('issueDate', issueDate);
    if (expirationDate) fd.append('expirationDate', expirationDate);
    return this.http.post<void>(`${this.apiUrl}/documents`, fd);
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

  /** Rejected/terminated pre-hire people, so they can be re-hired (F-5). */
  listRejected(): Observable<ApplicantResponse[]> {
    return this.http.get<ApplicantResponse[]>(`${this.apiUrl}/rejected`);
  }

  approve(employeePublicId: string): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.apiUrl}/${employeePublicId}/approve`, {});
  }

  reject(employeePublicId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${employeePublicId}/reject`, {});
  }

  /** Re-hire a previously TERMINATED person: re-enters ONBOARDING, reactivates login. */
  rehire(employeePublicId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${employeePublicId}/rehire`, {});
  }

  activate(employeePublicId: string): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.apiUrl}/${employeePublicId}/activate`, {});
  }

  resendSetup(employeePublicId: string): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.apiUrl}/${employeePublicId}/resend-setup`, {});
  }
}
