import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgencyBriefingSettingsRequest, AgencyResponse } from '../models/agency.model';

@Injectable({ providedIn: 'root' })
export class AgencyService {
  private readonly apiUrl = `${environment.apiUrl}/agencies`;

  constructor(private http: HttpClient) {}

  getOwn(): Observable<AgencyResponse> {
    return this.http.get<AgencyResponse>(this.apiUrl);
  }

  updateBriefingSettings(publicId: string,
                         request: AgencyBriefingSettingsRequest): Observable<AgencyResponse> {
    return this.http.patch<AgencyResponse>(`${this.apiUrl}/${publicId}/briefing-settings`, request);
  }
}
