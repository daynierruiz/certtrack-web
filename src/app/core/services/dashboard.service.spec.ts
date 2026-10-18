import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../../environments/environment';
import { DashboardResponse } from '../models/dashboard.model';

function makeDashboard(): DashboardResponse {
  return {
    agencyPublicId: 'ag-1',
    employees: { total: 10, active: 6, inactive: 1, terminated: 1, applicants: 1, onboarding: 1 },
    credentials: { total: 40, valid: 30, expiringSoon: 4, critical: 2, expired: 3, pendingReview: 1 },
    complianceRate: 87.5,
    upcomingExpirations: [{
      credentialPublicId: 'cred-1',
      employeeName: 'Ana Diaz',
      credentialTypeName: 'CPR Card',
      expirationDate: '2026-11-01',
      status: 'EXPIRING_SOON',
      daysUntilExpiry: 23
    }],
    positionEligibility: []
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getDashboard: GET sobre environment.apiUrl con agencyPublicId', () => {
    let result: DashboardResponse | undefined;
    service.getDashboard('ag-1').subscribe(r => result = r);

    const req = httpMock.expectOne(`${environment.apiUrl}/dashboard?agencyPublicId=ag-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toBe(`${environment.apiUrl}/dashboard`);
    req.flush(makeDashboard());

    expect(result?.complianceRate).toBe(87.5);
    expect(result?.employees.total).toBe(10);
    expect(result?.upcomingExpirations[0].daysUntilExpiry).toBe(23);
  });

  it('getDashboard: una agencia distinta viaja en el query param', () => {
    service.getDashboard('ag-2').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/dashboard?agencyPublicId=ag-2`);
    req.flush(makeDashboard());
  });
});
