import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContractTemplate, ContractTemplateCreateRequest, ContractTemplateUpdateRequest } from '../models/contract.model';
import { Page } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class ContractTemplateService {
  private readonly apiUrl = `${environment.apiUrl}/contract-templates`;

  constructor(private http: HttpClient) {}

  getAll(agencyPublicId: string, page = 0, size = 20): Observable<Page<ContractTemplate>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<ContractTemplate>>(this.apiUrl, { params });
  }

  getActive(agencyPublicId: string, page = 0, size = 100): Observable<Page<ContractTemplate>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<ContractTemplate>>(`${this.apiUrl}/active`, { params });
  }

  getById(publicId: string): Observable<ContractTemplate> {
    return this.http.get<ContractTemplate>(`${this.apiUrl}/${publicId}`);
  }

  create(request: ContractTemplateCreateRequest): Observable<ContractTemplate> {
    return this.http.post<ContractTemplate>(this.apiUrl, request);
  }

  update(publicId: string, request: ContractTemplateUpdateRequest): Observable<ContractTemplate> {
    return this.http.put<ContractTemplate>(`${this.apiUrl}/${publicId}`, request);
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
  }
}
