import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentResponse, AiExtractionResponse } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  upload(file: File, agencyPublicId: string, credentialPublicId?: string, employeePublicId?: string): Observable<DocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agencyPublicId', agencyPublicId);
    if (credentialPublicId) formData.append('credentialPublicId', credentialPublicId);
    if (employeePublicId) formData.append('employeePublicId', employeePublicId);
    return this.http.post<DocumentResponse>(this.apiUrl, formData);
  }

  getByCredential(credentialPublicId: string): Observable<DocumentResponse[]> {
    return this.http.get<DocumentResponse[]>(`${this.apiUrl}/by-credential/${credentialPublicId}`);
  }

  downloadAsBlob(publicId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/${publicId}/download`, { responseType: 'blob' }).pipe(
      map(blob => URL.createObjectURL(blob))
    );
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
  }

  /** Rotate a stored JPEG/PNG document (degrees clockwise: 90/180/270). Persisted server-side. */
  rotate(publicId: string, degrees: number = 90): Observable<DocumentResponse> {
    return this.http.post<DocumentResponse>(
      `${this.apiUrl}/${publicId}/rotate`, {}, { params: { degrees: String(degrees) } });
  }

  extractData(files: File[], credentialTypeName: string): Observable<AiExtractionResponse> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('credentialTypeName', credentialTypeName);
    return this.http.post<AiExtractionResponse>(`${environment.apiUrl}/ai/extract`, formData);
  }
}
