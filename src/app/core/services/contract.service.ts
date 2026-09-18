import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contract, ContractGenerateRequest, ContractSignRequest } from '../models/contract.model';
import { Page } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly apiUrl = `${environment.apiUrl}/contracts`;
  private readonly myProfileUrl = `${environment.apiUrl}/my-profile`;

  constructor(private http: HttpClient) {}

  generate(request: ContractGenerateRequest): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/generate`, request);
  }

  send(publicId: string): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/${publicId}/send`, {});
  }

  revoke(publicId: string): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/${publicId}/revoke`, {});
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
  }

  sign(publicId: string, request: ContractSignRequest): Observable<Contract> {
    return this.http.post<Contract>(`${this.apiUrl}/${publicId}/sign`, request);
  }

  getAll(agencyPublicId: string, page = 0, size = 20): Observable<Page<Contract>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<Contract>>(this.apiUrl, { params });
  }

  getByEmployee(employeePublicId: string, page = 0, size = 20): Observable<Page<Contract>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Contract>>(`${this.apiUrl}/by-employee/${employeePublicId}`, { params });
  }

  getById(publicId: string): Observable<Contract> {
    return this.http.get<Contract>(`${this.apiUrl}/${publicId}`);
  }

  previewHtml(publicId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/${publicId}/preview-html`, { responseType: 'text' });
  }

  downloadPdf(publicId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${publicId}/download`, { responseType: 'blob' });
  }

  getMyContracts(page = 0, size = 20): Observable<Page<Contract>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Contract>>(`${this.myProfileUrl}/contracts`, { params });
  }

  getMyPendingContracts(): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.myProfileUrl}/contracts/pending`);
  }
}
