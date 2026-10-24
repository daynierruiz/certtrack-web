import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgencyBriefingSettingsRequest, AgencyContactSettingsRequest, AgencyResponse, AgencyUpsertRequest } from '../models/agency.model';

@Injectable({ providedIn: 'root' })
export class AgencyService {
  private readonly apiUrl = `${environment.apiUrl}/agencies`;

  constructor(private http: HttpClient) {}

  getOwn(): Observable<AgencyResponse> {
    return this.http.get<AgencyResponse>(this.apiUrl);
  }

  update(publicId: string, request: AgencyUpsertRequest): Observable<AgencyResponse> {
    return this.http.put<AgencyResponse>(`${this.apiUrl}/${publicId}`, request);
  }

  /** Upload/replace the agency branding logo (OWNER only). */
  uploadLogo(publicId: string, file: File): Observable<void> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<void>(`${this.apiUrl}/${publicId}/logo`, fd);
  }

  /** Public URL that serves the agency logo bytes (cache-busting optional). */
  logoUrl(publicId: string, bust?: number): string {
    const base = `${this.apiUrl}/${publicId}/logo`;
    return bust ? `${base}?v=${bust}` : base;
  }

  updateBriefingSettings(publicId: string,
                         request: AgencyBriefingSettingsRequest): Observable<AgencyResponse> {
    return this.http.patch<AgencyResponse>(`${this.apiUrl}/${publicId}/briefing-settings`, request);
  }

  updateContactEmail(publicId: string,
                     request: AgencyContactSettingsRequest): Observable<AgencyResponse> {
    return this.http.patch<AgencyResponse>(`${this.apiUrl}/${publicId}/contact-email`, request);
  }
}
