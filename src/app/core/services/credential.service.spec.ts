import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CredentialService } from './credential.service';
import { environment } from '../../../environments/environment';
import {
  Credential,
  CredentialReviewRequest,
  CredentialType,
  CredentialUpsertRequest
} from '../models/credential.model';
import { Page } from '../models/page.model';

const BASE = `${environment.apiUrl}/credentials`;
const TYPES = `${environment.apiUrl}/credential-types`;

function makeCredential(publicId = 'cred-1'): Credential {
  return {
    publicId,
    agencyPublicId: 'ag-1',
    employeePublicId: 'emp-1',
    credentialTypePublicId: 'ct-1',
    issueDate: '2026-01-01',
    expirationDate: '2027-01-01',
    status: 'VALID',
    statusComputedAt: null,
    issuer: null,
    credentialNumber: null,
    notes: null,
    reviewNotes: null,
    verifiedByUserPublicId: null,
    verifiedAt: null,
    lastNotificationSentAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };
}

function pageOf<T>(content: T[]): Page<T> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 20,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0
  };
}

describe('CredentialService', () => {
  let service: CredentialService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CredentialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll: GET con agencyPublicId y paginación por defecto', () => {
    let result: Page<Credential> | undefined;
    service.getAll('ag-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}?agencyPublicId=ag-1&page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf([makeCredential()]));
    expect(result?.content[0].status).toBe('VALID');
  });

  it('getById: GET a /{publicId}', () => {
    service.getById('cred-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/cred-1`);
    expect(req.request.method).toBe('GET');
    req.flush(makeCredential());
  });

  it('getExpired: GET a /expired con paginación', () => {
    service.getExpired('ag-1', 1, 10).subscribe();
    const req = httpMock.expectOne(`${BASE}/expired?agencyPublicId=ag-1&page=1&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf<Credential>([]));
  });

  it('getPendingReview: GET a /pending-review con paginación', () => {
    service.getPendingReview('ag-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/pending-review?agencyPublicId=ag-1&page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf<Credential>([]));
  });

  it('getByEmployee: GET a /by-employee/{id} con solo page y size', () => {
    service.getByEmployee('emp-1', 0, 5).subscribe();
    const req = httpMock.expectOne(`${BASE}/by-employee/emp-1?page=0&size=5`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf<Credential>([]));
  });

  it('create: POST con el cuerpo del upsert', () => {
    const request: CredentialUpsertRequest = {
      agencyPublicId: 'ag-1',
      employeePublicId: 'emp-1',
      credentialTypePublicId: 'ct-1',
      expirationDate: '2027-01-01'
    };
    service.create(request).subscribe();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(makeCredential());
  });

  it('update: PUT a /{publicId} con el cuerpo', () => {
    const request: CredentialUpsertRequest = {
      agencyPublicId: 'ag-1',
      employeePublicId: 'emp-1',
      credentialTypePublicId: 'ct-1'
    };
    service.update('cred-1', request).subscribe();

    const req = httpMock.expectOne(`${BASE}/cred-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(makeCredential());
  });

  it('delete: DELETE a /{publicId}', () => {
    service.delete('cred-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/cred-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('review: PATCH a /{publicId}/review con la decisión', () => {
    const request: CredentialReviewRequest = { approved: false, reviewNotes: 'Documento ilegible' };
    service.review('cred-1', request).subscribe();

    const req = httpMock.expectOne(`${BASE}/cred-1/review`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(request);
    req.flush(makeCredential());
  });

  it('reopenReview: POST a /{publicId}/reopen-review con cuerpo vacío', () => {
    service.reopenReview('cred-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/cred-1/reopen-review`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(makeCredential());
  });

  it('getTypes: GET a /credential-types con agencyPublicId', () => {
    let result: CredentialType[] | undefined;
    service.getTypes('ag-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${TYPES}?agencyPublicId=ag-1`);
    expect(req.request.method).toBe('GET');
    req.flush([{
      publicId: 'ct-1', agencyPublicId: 'ag-1', code: 'CPR', name: 'CPR Card',
      description: null, defaultValidityMonths: 24, renewalWarningDays: 30,
      criticalWarningDays: 7, requiresDocument: true, isActive: true,
      category: 'CERTIFICATION',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
    } satisfies CredentialType]);

    expect(result?.length).toBe(1);
    expect(result?.[0].category).toBe('CERTIFICATION');
  });
});
