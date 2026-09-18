import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Credential, CredentialType, CredentialUpsertRequest } from '../models/credential.model';
import { DocumentResponse } from '../models/document.model';
import { EmployeeEligibilityResponse } from '../models/position.model';
import { EmployeeAddress, EmployeeAddressUpdateRequest } from '../models/address.model';

export interface MyProfileResponse {
  employee: {
    publicId: string;
    agencyPublicId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employeeCode: string;
    hireDate: string | null;
    status: string;
    address: EmployeeAddress | null;
  };
  credentials: Credential[];
  expiringSoon: Credential[];
  missingCredentialTypes: CredentialType[];
  missingOptionalTypes: CredentialType[];
  allCredentialTypes: CredentialType[];
  totalRequired: number;
  totalCompleted: number;
  positionEligibility: EmployeeEligibilityResponse[];
}

@Injectable({ providedIn: 'root' })
export class MyProfileService {
  private readonly apiUrl = `${environment.apiUrl}/my-profile`;

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<MyProfileResponse> {
    return this.http.get<MyProfileResponse>(this.apiUrl);
  }

  submitCredential(request: CredentialUpsertRequest): Observable<Credential> {
    return this.http.post<Credential>(`${this.apiUrl}/credentials`, request);
  }

  uploadDocument(file: File, credentialPublicId?: string): Observable<DocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (credentialPublicId) {
      formData.append('credentialPublicId', credentialPublicId);
    }
    return this.http.post<DocumentResponse>(`${this.apiUrl}/documents`, formData);
  }

  updateAddress(request: EmployeeAddressUpdateRequest): Observable<EmployeeAddress> {
    return this.http.put<EmployeeAddress>(`${this.apiUrl}/address`, request);
  }
}
