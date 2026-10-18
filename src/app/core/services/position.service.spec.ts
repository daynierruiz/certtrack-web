import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PositionService } from './position.service';
import { environment } from '../../../environments/environment';
import {
  EmployeeEligibilityResponse,
  PositionEligibilitySummary,
  PositionResponse,
  PositionUpsertRequest
} from '../models/position.model';
import { Page } from '../models/page.model';

const BASE = `${environment.apiUrl}/positions`;

function makePosition(publicId = 'pos-1'): PositionResponse {
  return {
    publicId,
    agencyPublicId: 'ag-1',
    code: 'HHA',
    name: 'Home Health Aide',
    description: null,
    isActive: true,
    requirements: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };
}

function pageOf<T>(content: T[]): Page<T> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 50,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0
  };
}

describe('PositionService', () => {
  let service: PositionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PositionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('la baseUrl usa environment.apiUrl (fix de baseUrl)', () => {
    service.getById('pos-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/positions/pos-1`);
    expect(req.request.url.startsWith(environment.apiUrl)).toBeTrue();
    expect(req.request.method).toBe('GET');
    req.flush(makePosition());
  });

  it('getAll: GET con agencyPublicId y tamaño por defecto 50', () => {
    let result: Page<PositionResponse> | undefined;
    service.getAll('ag-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}?agencyPublicId=ag-1&page=0&size=50`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf([makePosition()]));
    expect(result?.content[0].code).toBe('HHA');
  });

  it('getAll: respeta page y size personalizados', () => {
    service.getAll('ag-1', 0, 200).subscribe();
    const req = httpMock.expectOne(`${BASE}?agencyPublicId=ag-1&page=0&size=200`);
    req.flush(pageOf<PositionResponse>([]));
  });

  it('create: POST con requirements en el cuerpo', () => {
    const request: PositionUpsertRequest = {
      agencyPublicId: 'ag-1',
      code: 'RN',
      name: 'Registered Nurse',
      isActive: true,
      requirements: [{ credentialTypePublicId: 'ct-1', isMandatory: true }]
    };
    service.create(request).subscribe();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(makePosition());
  });

  it('update: PUT a /{publicId}', () => {
    const request: PositionUpsertRequest = {
      agencyPublicId: 'ag-1',
      code: 'HHA',
      name: 'Home Health Aide',
      isActive: false,
      requirements: []
    };
    service.update('pos-1', request).subscribe();

    const req = httpMock.expectOne(`${BASE}/pos-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(makePosition());
  });

  it('delete: DELETE a /{publicId}', () => {
    service.delete('pos-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/pos-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('assignEmployee: POST a /{id}/employees con el empleado', () => {
    service.assignEmployee('pos-1', { employeePublicId: 'emp-1' }).subscribe();

    const req = httpMock.expectOne(`${BASE}/pos-1/employees`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ employeePublicId: 'emp-1' });
    req.flush(null);
  });

  it('unassignEmployee: DELETE a /{id}/employees/{employeeId}', () => {
    service.unassignEmployee('pos-1', 'emp-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/pos-1/employees/emp-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getPositionEligibility: GET a /{id}/eligibility', () => {
    let result: PositionEligibilitySummary | undefined;
    service.getPositionEligibility('pos-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}/pos-1/eligibility`);
    expect(req.request.method).toBe('GET');
    req.flush({
      positionPublicId: 'pos-1', positionName: 'HHA', totalAssigned: 3,
      fullyEligible: 1, partiallyEligible: 1, notEligible: 1, employees: []
    } satisfies PositionEligibilitySummary);

    expect(result?.totalAssigned).toBe(3);
  });

  it('getEmployeeEligibility: GET a /employee/{id}/eligibility', () => {
    let result: EmployeeEligibilityResponse[] | undefined;
    service.getEmployeeEligibility('emp-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}/employee/emp-1/eligibility`);
    expect(req.request.method).toBe('GET');
    req.flush([{
      employeePublicId: 'emp-1', employeeName: 'Ana Diaz',
      positionPublicId: 'pos-1', positionName: 'HHA', status: 'ELIGIBLE',
      totalMandatory: 1, metMandatory: 1, totalOptional: 0, metOptional: 0,
      percentComplete: 100, requirements: []
    } satisfies EmployeeEligibilityResponse]);

    expect(result?.length).toBe(1);
    expect(result?.[0].status).toBe('ELIGIBLE');
  });
});
