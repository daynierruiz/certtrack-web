import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContractService } from './contract.service';
import { environment } from '../../../environments/environment';
import { Contract, ContractGenerateRequest, ContractSignRequest } from '../models/contract.model';
import { Page } from '../models/page.model';

const BASE = `${environment.apiUrl}/contracts`;
const MY_PROFILE = `${environment.apiUrl}/my-profile`;

function makeContract(publicId = 'c-1'): Contract {
  return {
    publicId,
    agencyPublicId: 'ag-1',
    employeePublicId: 'emp-1',
    employeeName: 'Ana Diaz',
    templatePublicId: 't-1',
    title: 'Employment Agreement',
    status: 'DRAFT',
    documentHash: null,
    sentAt: null,
    signedAt: null,
    expiresAt: null,
    effectiveDate: null,
    employeeSigned: false,
    employerSigned: false,
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

describe('ContractService', () => {
  let service: ContractService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ContractService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('generate: POST a /contracts/generate con el request completo', () => {
    const request: ContractGenerateRequest = {
      agencyPublicId: 'ag-1',
      employeePublicId: 'emp-1',
      templatePublicIds: ['t-1', 't-2'],
      title: 'Employment Agreement',
      effectiveDate: '2026-01-15',
      payRate: '18.50',
      payUnit: 'per hour'
    };
    let result: Contract | undefined;
    service.generate(request).subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(makeContract());
    expect(result?.status).toBe('DRAFT');
  });

  it('send: POST a /{id}/send con cuerpo vacío', () => {
    service.send('c-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/c-1/send`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(makeContract());
  });

  it('revoke: POST a /{id}/revoke', () => {
    service.revoke('c-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/c-1/revoke`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(makeContract());
  });

  it('delete: DELETE a /{id}', () => {
    service.delete('c-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/c-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('sign: POST a /{id}/sign con firma y consentimiento', () => {
    const request: ContractSignRequest = {
      signatureBase64: 'data:image/png;base64,AAA',
      consentText: 'Acepto firmar electrónicamente'
    };
    service.sign('c-1', request).subscribe();

    const req = httpMock.expectOne(`${BASE}/c-1/sign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(makeContract());
  });

  it('getAll: GET con agencyPublicId y paginación', () => {
    service.getAll('ag-1', 1, 10).subscribe();
    const req = httpMock.expectOne(`${BASE}?agencyPublicId=ag-1&page=1&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf<Contract>([]));
  });

  it('getByEmployee: GET a /by-employee/{id} con solo page y size', () => {
    service.getByEmployee('emp-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/by-employee/emp-1?page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf<Contract>([]));
  });

  it('getById: GET a /{id}', () => {
    service.getById('c-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/c-1`);
    expect(req.request.method).toBe('GET');
    req.flush(makeContract());
  });

  it('previewHtml: GET con responseType text y devuelve el HTML crudo', () => {
    let result: string | undefined;
    service.previewHtml('c-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}/c-1/preview-html`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('text');
    req.flush('<h1>Contrato</h1>');

    expect(result).toBe('<h1>Contrato</h1>');
  });

  it('downloadPdf: GET con responseType blob', () => {
    let result: Blob | undefined;
    service.downloadPdf('c-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${BASE}/c-1/download`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));

    expect(result instanceof Blob).toBeTrue();
    expect(result?.type).toBe('application/pdf');
  });

  it('getMyContracts: GET al endpoint de my-profile con paginación', () => {
    service.getMyContracts(2, 5).subscribe();
    const req = httpMock.expectOne(`${MY_PROFILE}/contracts?page=2&size=5`);
    expect(req.request.method).toBe('GET');
    req.flush(pageOf<Contract>([]));
  });

  it('getMyPendingContracts: GET a /my-profile/contracts/pending', () => {
    let result: Contract[] | undefined;
    service.getMyPendingContracts().subscribe(r => result = r);

    const req = httpMock.expectOne(`${MY_PROFILE}/contracts/pending`);
    expect(req.request.method).toBe('GET');
    req.flush([makeContract()]);
    expect(result?.length).toBe(1);
  });
});
