import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Credential, CredentialReviewRequest, CredentialUpsertRequest, CredentialType } from '../models/credential.model';
import { Page } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class CredentialService {
  private readonly apiUrl = `${environment.apiUrl}/credentials`;
  private readonly typesUrl = `${environment.apiUrl}/credential-types`;

  constructor(private http: HttpClient) {}

  getAll(agencyPublicId: string, page = 0, size = 20): Observable<Page<Credential>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<Credential>>(this.apiUrl, { params });
  }

  getById(publicId: string): Observable<Credential> {
    return this.http.get<Credential>(`${this.apiUrl}/${publicId}`);
  }

  getExpired(agencyPublicId: string, page = 0, size = 20): Observable<Page<Credential>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<Credential>>(`${this.apiUrl}/expired`, { params });
  }

  create(request: CredentialUpsertRequest): Observable<Credential> {
    return this.http.post<Credential>(this.apiUrl, request);
  }

  update(publicId: string, request: CredentialUpsertRequest): Observable<Credential> {
    return this.http.put<Credential>(`${this.apiUrl}/${publicId}`, request);
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
  }

  getPendingReview(agencyPublicId: string, page = 0, size = 20): Observable<Page<Credential>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<Credential>>(`${this.apiUrl}/pending-review`, { params });
  }

  getByEmployee(employeePublicId: string, page = 0, size = 20): Observable<Page<Credential>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Credential>>(`${this.apiUrl}/by-employee/${employeePublicId}`, { params });
  }

  review(publicId: string, request: CredentialReviewRequest): Observable<Credential> {
    return this.http.patch<Credential>(`${this.apiUrl}/${publicId}/review`, request);
  }

  reopenReview(publicId: string): Observable<Credential> {
    return this.http.post<Credential>(`${this.apiUrl}/${publicId}/reopen-review`, {});
  }

  getTypes(agencyPublicId: string): Observable<CredentialType[]> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.get<CredentialType[]>(this.typesUrl, { params });
  }
}
