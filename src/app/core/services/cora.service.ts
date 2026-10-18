import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoraChatResponse, CoraSendReportRequest, CoraTurn } from '../models/cora.model';

@Injectable({ providedIn: 'root' })
export class CoraService {
  private readonly apiUrl = `${environment.apiUrl}/cora`;

  constructor(private http: HttpClient) {}

  /** Ask Cora a question. `history` carries the prior turns (backend is stateless). */
  chat(agencyPublicId: string, message: string, language: string, history: CoraTurn[]): Observable<CoraChatResponse> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.post<CoraChatResponse>(
      `${this.apiUrl}/chat`,
      { message, language, history },
      { params }
    );
  }

  /** Send a prepared report by email (after the user confirmed in the UI). */
  sendReport(agencyPublicId: string, request: CoraSendReportRequest): Observable<void> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.post<void>(`${this.apiUrl}/send-report`, request, { params });
  }

  /** Render a Cora reply / summary to a PDF (backend PdfGenerationService). Returns the bytes. */
  exportPdf(agencyPublicId: string, title: string, content: string): Observable<Blob> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.post(`${this.apiUrl}/export/pdf`, { title, content },
      { params, responseType: 'blob' });
  }

  /** Render a Cora reply's table(s) to a styled .xlsx (backend Apache POI). Returns the bytes. */
  exportXlsx(agencyPublicId: string, title: string, content: string): Observable<Blob> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.post(`${this.apiUrl}/export/xlsx`, { title, content },
      { params, responseType: 'blob' });
  }
}
