import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicantService } from './applicant.service';
import { environment } from '../../../environments/environment';
import {
  ApplicantRegisterRequest,
  ApplicantResponse,
  SetupPasswordRequest
} from '../models/applicant.model';
import { AuthResponse } from '../models/auth.model';

const BASE = `${environment.apiUrl}/applicants`;
const AUTH = `${environment.apiUrl}/auth`;

function makeApplicant(publicId = 'emp-1'): ApplicantResponse {
  return {
    publicId,
    firstName: 'Ana',
    lastName: 'Diaz',
    email: 'ana@test.com',
    phone: null,
    positionName: 'HHA',
    positionPublicId: 'pos-1',
    status: 'APPLICANT',
    applicationDate: '2026-09-01',
    createdAt: '2026-09-01T00:00:00Z',
    languages: ['SPANISH'],
    languageOther: null,
    schoolName: 'Care School'
  };
}

describe('ApplicantService', () => {
  let service: ApplicantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApplicantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('register: POST público a /applicants/register con el formulario completo', () => {
    const request: ApplicantRegisterRequest = {
      agencySlug: 'care-agency',
      firstName: 'Ana',
      lastName: 'Diaz',
      email: 'ana@test.com',
      positionPublicId: 'pos-1',
      languages: ['SPANISH'],
      schoolName: 'Care School',
      address: {
        addressLine1: '123 Main St', city: 'Miami', state: 'FL',
        postalCode: '33101', country: 'US', latitude: 25.77, longitude: -80.19,
        placeId: 'place-1'
      }
    };
    let result: ApplicantResponse | undefined;
    service.register(request).subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(makeApplicant());
    expect(result?.status).toBe('APPLICANT');
  });

  it('getPositions: sin slug no envía query params', () => {
    service.getPositions().subscribe();
    const req = httpMock.expectOne(`${BASE}/positions`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('getPositions: con slug lo envía como agencySlug', () => {
    service.getPositions('care-agency').subscribe();
    const req = httpMock.expectOne(`${BASE}/positions?agencySlug=care-agency`);
    expect(req.request.method).toBe('GET');
    req.flush([{ publicId: 'pos-1', name: 'HHA', description: null }]);
  });

  it('getAgencyInfo: envía key o slug según lo que se pase', () => {
    service.getAgencyInfo({ key: 'K-1' }).subscribe();
    const byKey = httpMock.expectOne(`${BASE}/agency-info?key=K-1`);
    expect(byKey.request.method).toBe('GET');
    byKey.flush({ name: 'Care Agency', slug: 'care-agency' });

    service.getAgencyInfo({ slug: 'care-agency' }).subscribe();
    const bySlug = httpMock.expectOne(`${BASE}/agency-info?slug=care-agency`);
    bySlug.flush({ name: 'Care Agency', slug: 'care-agency' });
  });

  it('validateSetupToken: GET con el token como query param', () => {
    service.validateSetupToken('tok-123').subscribe();
    const req = httpMock.expectOne(`${BASE}/setup-token?token=tok-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ email: 'ana@test.com', valid: true });
  });

  it('setupPassword: POST al endpoint de auth (no al de applicants)', () => {
    const request: SetupPasswordRequest = { token: 'tok-123', password: 'NuevaClave1!' };
    let result: AuthResponse | undefined;
    service.setupPassword(request).subscribe(r => result = r);

    const req = httpMock.expectOne(`${AUTH}/setup-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({
      accessToken: 'at', refreshToken: 'rt', expiresIn: 3600,
      userPublicId: 'u-1', agencyPublicId: 'ag-1', role: 'EMPLOYEE'
    } satisfies AuthResponse);

    expect(result?.role).toBe('EMPLOYEE');
  });

  it('listApplicants: GET al listado admin', () => {
    let result: ApplicantResponse[] | undefined;
    service.listApplicants().subscribe(r => result = r);

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush([makeApplicant()]);
    expect(result?.length).toBe(1);
  });

  it('approve: POST a /{id}/approve con cuerpo vacío', () => {
    service.approve('emp-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/emp-1/approve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(makeApplicant());
  });

  it('reject: POST a /{id}/reject', () => {
    service.reject('emp-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/emp-1/reject`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('activate: POST a /{id}/activate', () => {
    service.activate('emp-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/emp-1/activate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(makeApplicant());
  });

  it('resendSetup: POST a /{id}/resend-setup con cuerpo vacío', () => {
    service.resendSetup('emp-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/emp-1/resend-setup`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(makeApplicant());
  });
});
