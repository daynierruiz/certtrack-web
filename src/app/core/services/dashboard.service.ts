import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardResponse } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboard(agencyPublicId: string): Observable<DashboardResponse> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.get<DashboardResponse>(this.apiUrl, { params });
  }
}
