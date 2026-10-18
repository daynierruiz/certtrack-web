import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee, EmployeeMapPoint, EmployeeUpsertRequest } from '../models/employee.model';
import { Page } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly apiUrl = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  getAll(agencyPublicId: string, page = 0, size = 20): Observable<Page<Employee>> {
    const params = new HttpParams()
      .set('agencyPublicId', agencyPublicId)
      .set('page', page)
      .set('size', size)
      .set('sort', 'lastName,asc');
    return this.http.get<Page<Employee>>(this.apiUrl, { params });
  }

  getById(publicId: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${publicId}`);
  }

  /**
   * Minimized data for the map (audit M7): only located, non-TERMINATED employees with
   * coarse address (city/state/coords) — no street/PII. Returns a plain array, not a Page.
   */
  getMapPoints(agencyPublicId: string): Observable<EmployeeMapPoint[]> {
    const params = new HttpParams().set('agencyPublicId', agencyPublicId);
    return this.http.get<EmployeeMapPoint[]>(`${this.apiUrl}/map`, { params });
  }

  create(request: EmployeeUpsertRequest): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, request);
  }

  update(publicId: string, request: EmployeeUpsertRequest): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${publicId}`, request);
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
  }

  getAccount(employeePublicId: string): Observable<EmployeeAccount> {
    return this.http.get<EmployeeAccount>(`${this.apiUrl}/${employeePublicId}/account`);
  }

  setAccountActive(employeePublicId: string, active: boolean): Observable<EmployeeAccount> {
    return this.http.patch<EmployeeAccount>(
      `${this.apiUrl}/${employeePublicId}/account/activate`,
      null,
      { params: { active: active.toString() } }
    );
  }

  resetPassword(employeePublicId: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${employeePublicId}/account/reset-password`, {}
    );
  }
}

export interface EmployeeAccount {
  userPublicId: string | null;
  email: string | null;
  role: string | null;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
}
