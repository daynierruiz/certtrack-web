import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Downloads audit-ready compliance reports (PDF/CSV) from /api/reports. */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  compliancePdf(agencyPublicId: string): Observable<Blob> {
    return this.download('compliance.pdf', agencyPublicId);
  }

  complianceCsv(agencyPublicId: string): Observable<Blob> {
    return this.download('compliance.csv', agencyPublicId);
  }

  private download(file: string, agencyPublicId: string): Observable<Blob> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.get(`${this.apiUrl}/${file}`, { params, responseType: 'blob' });
  }
}
