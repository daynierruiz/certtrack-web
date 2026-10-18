import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeAccount, EmployeeService } from './employee.service';
import { environment } from '../../../environments/environment';
import { Employee, EmployeeUpsertRequest } from '../models/employee.model';
import { Page } from '../models/page.model';

const BASE = `${environment.apiUrl}/employees`;

function makeEmployee(publicId = 'emp-1'): Employee {
  return {
    publicId,
    agencyPublicId: 'ag-1',
    firstName: 'Ana',
    lastName: 'Diaz',
    email: 'ana@test.com',
    phone: null,
    employeeCode: null,
    externalId: null,
    hireDate: null,
    terminationDate: null,
    status: 'ACTIVE',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    address: null,
    languages: ['ENGLISH'],
    languageOther: null,
    schoolName: null
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

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('la baseUrl se construye sobre environment.apiUrl', () => {
    service.getById('emp-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/employees/emp-1`);
    expect(req.request.method).toBe('GET');
    req.flush(makeEmployee());
  });

  it('getAll: GET con agencyPublicId, paginación por defecto y sort fijo', () => {
    let result: Page<Employee> | undefined;
    service.getAll('ag-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}?agencyPublicId=ag-1&page=0&size=20&sort=lastName,asc`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf([makeEmployee()]));

    expect(result?.content.length).toBe(1);
    expect(result?.content[0].publicId).toBe('emp-1');
  });

  it('getAll: respeta page y size personalizados', () => {
    service.getAll('ag-1', 2, 50).subscribe();
    const req = httpMock.expectOne(`${BASE}?agencyPublicId=ag-1&page=2&size=50&sort=lastName,asc`);
    req.flush(pageOf<Employee>([]));
  });

  it('create: POST con el cuerpo completo', () => {
    const request: EmployeeUpsertRequest = {
      agencyPublicId: 'ag-1',
      firstName: 'Ana',
      lastName: 'Diaz',
      status: 'ONBOARDING'
    };
    let result: Employee | undefined;
    service.create(request).subscribe(r => result = r);

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(makeEmployee());
    expect(result?.publicId).toBe('emp-1');
  });

  it('update: PUT a /{publicId} con el cuerpo', () => {
    const request: EmployeeUpsertRequest = {
      agencyPublicId: 'ag-1',
      firstName: 'Ana',
      lastName: 'Diaz',
      status: 'ACTIVE'
    };
    service.update('emp-1', request).subscribe();

    const req = httpMock.expectOne(`${BASE}/emp-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush(makeEmployee());
  });

  it('delete: DELETE a /{publicId}', () => {
    let completed = false;
    service.delete('emp-1').subscribe({ complete: () => completed = true });

    const req = httpMock.expectOne(`${BASE}/emp-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(completed).toBeTrue();
  });

  it('getAccount: GET a /{id}/account y tipa la respuesta', () => {
    let result: EmployeeAccount | undefined;
    service.getAccount('emp-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}/emp-1/account`);
    expect(req.request.method).toBe('GET');
    req.flush({
      userPublicId: 'u-1', email: 'ana@test.com', role: 'EMPLOYEE',
      isActive: true, isLocked: false, lastLoginAt: null
    } satisfies EmployeeAccount);

    expect(result?.isActive).toBeTrue();
    expect(result?.lastLoginAt).toBeNull();
  });

  it('setAccountActive: PATCH con query param active y body null', () => {
    service.setAccountActive('emp-1', true).subscribe();
    const reqTrue = httpMock.expectOne(`${BASE}/emp-1/account/activate?active=true`);
    expect(reqTrue.request.method).toBe('PATCH');
    expect(reqTrue.request.body).toBeNull();
    reqTrue.flush({
      userPublicId: 'u-1', email: null, role: null,
      isActive: true, isLocked: false, lastLoginAt: null
    } satisfies EmployeeAccount);

    service.setAccountActive('emp-1', false).subscribe();
    const reqFalse = httpMock.expectOne(`${BASE}/emp-1/account/activate?active=false`);
    expect(reqFalse.request.method).toBe('PATCH');
    reqFalse.flush({
      userPublicId: 'u-1', email: null, role: null,
      isActive: false, isLocked: false, lastLoginAt: null
    } satisfies EmployeeAccount);
  });

  it('resetPassword: POST a /{id}/account/reset-password con cuerpo vacío', () => {
    service.resetPassword('emp-1').subscribe();

    const req = httpMock.expectOne(`${BASE}/emp-1/account/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });
});
