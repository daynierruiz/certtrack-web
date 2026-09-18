import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentBriefingResponse } from '../models/agency.model';
import { RiskScore } from '../models/risk-score.model';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly apiUrl = `${environment.apiUrl}/agent`;

  constructor(private http: HttpClient) {}

  previewDailyBriefing(agencyPublicId: string): Observable<AgentBriefingResponse> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.post<AgentBriefingResponse>(`${this.apiUrl}/daily-briefing/preview`, null, { params });
  }

  sendDailyBriefingNow(agencyPublicId: string): Observable<AgentBriefingResponse> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.post<AgentBriefingResponse>(`${this.apiUrl}/daily-briefing/send`, null, { params });
  }

  listRiskScores(agencyPublicId: string): Observable<RiskScore[]> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.get<RiskScore[]>(`${this.apiUrl}/risk-scores`, { params });
  }
}
