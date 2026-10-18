import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoraService } from './cora.service';
import { environment } from '../../../environments/environment';
import { CoraChatResponse } from '../models/cora.model';

function makeResponse(): CoraChatResponse {
  return {
    reply: 'You have 9 active employees.',
    model: 'claude-haiku-4-5-20251001',
    inputTokens: 320,
    outputTokens: 90,
    costCents: 1,
    toolsUsed: ['get_dashboard_summary']
  };
}

describe('CoraService', () => {
  let service: CoraService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CoraService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('chat: POST con agencyPublicId en query y message/language/history en el body', () => {
    let result: CoraChatResponse | undefined;
    const history = [{ role: 'user' as const, content: 'hola' }];

    service.chat('ag-1', 'How many employees?', 'en', history).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/cora/chat?agencyPublicId=ag-1`);
    expect(req.request.method).toBe('POST');
    expect(req.request.url).toBe(`${environment.apiUrl}/cora/chat`);
    expect(req.request.body).toEqual({
      message: 'How many employees?',
      language: 'en',
      history
    });
    req.flush(makeResponse());

    expect(result?.reply).toBe('You have 9 active employees.');
    expect(result?.toolsUsed).toEqual(['get_dashboard_summary']);
  });

  it('chat: una agencia distinta viaja en el query param', () => {
    service.chat('ag-2', 'hi', 'es', []).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cora/chat?agencyPublicId=ag-2`);
    req.flush(makeResponse());
  });

  it('sendReport: POST con agencyPublicId y el cuerpo del informe', () => {
    service.sendReport('ag-1', { recipientType: 'self', subject: 'S', body: 'B' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/cora/send-report?agencyPublicId=ag-1`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ recipientType: 'self', subject: 'S', body: 'B' });
    req.flush(null);
  });
});
