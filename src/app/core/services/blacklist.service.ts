import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BlacklistEntry, BlacklistEntryRequest } from '../models/blacklist.model';
import { Page } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class BlacklistService {
  private readonly apiUrl = `${environment.apiUrl}/blacklist`;

  constructor(private http: HttpClient) {}

  list(page = 0, size = 50): Observable<Page<BlacklistEntry>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<BlacklistEntry>>(this.apiUrl, { params });
  }

  create(request: BlacklistEntryRequest): Observable<BlacklistEntry> {
    return this.http.post<BlacklistEntry>(this.apiUrl, request);
  }

  addFromEmployee(employeePublicId: string, reason: string): Observable<BlacklistEntry> {
    return this.http.post<BlacklistEntry>(`${this.apiUrl}/from-employee/${employeePublicId}`, { reason });
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
  }

  /** Blacklist matches for an employee/applicant (for the profile warning banner). */
  matches(employeePublicId: string): Observable<BlacklistEntry[]> {
    const params = new HttpParams().set('employeePublicId', employeePublicId);
    return this.http.get<BlacklistEntry[]>(`${this.apiUrl}/matches`, { params });
  }
}
