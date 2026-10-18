import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import {
  PositionResponse,
  PositionUpsertRequest,
  PositionEligibilitySummary,
  EmployeeEligibilityResponse,
  EmployeeAssignmentRequest
} from '../models/position.model';

@Injectable({ providedIn: 'root' })
export class PositionService {
  private readonly baseUrl = `${environment.apiUrl}/positions`;

  constructor(private http: HttpClient) {}

  getAll(agencyPublicId: string, page = 0, size = 50): Observable<Page<PositionResponse>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<PositionResponse>>(this.baseUrl, { params });
  }

  getById(publicId: string): Observable<PositionResponse> {
    return this.http.get<PositionResponse>(`${this.baseUrl}/${publicId}`);
  }

  create(request: PositionUpsertRequest): Observable<PositionResponse> {
    return this.http.post<PositionResponse>(this.baseUrl, request);
  }

  update(publicId: string, request: PositionUpsertRequest): Observable<PositionResponse> {
    return this.http.put<PositionResponse>(`${this.baseUrl}/${publicId}`, request);
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${publicId}`);
  }

  assignEmployee(positionPublicId: string, request: EmployeeAssignmentRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${positionPublicId}/employees`, request);
  }

  unassignEmployee(positionPublicId: string, employeePublicId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${positionPublicId}/employees/${employeePublicId}`);
  }

  getPositionEligibility(publicId: string): Observable<PositionEligibilitySummary> {
    return this.http.get<PositionEligibilitySummary>(`${this.baseUrl}/${publicId}/eligibility`);
  }

  getEmployeeEligibility(employeePublicId: string): Observable<EmployeeEligibilityResponse[]> {
    return this.http.get<EmployeeEligibilityResponse[]>(`${this.baseUrl}/employee/${employeePublicId}/eligibility`);
  }
}
