import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { ApplyComponent } from './apply.component';
import { ApplicantService } from '../../../core/services/applicant.service';
import { GeoapifyService } from '../../../core/services/geoapify.service';
import { LanguageService } from '../../../core/services/language.service';
import { ApplicantResponse } from '../../../core/models/applicant.model';

function getTranslocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: { en: {} },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
      missingHandler: { logMissingKey: false, useFallbackTranslation: false, allowEmpty: true }
    },
    preloadLangs: true
  });
}

function makeApplicantResponse(): ApplicantResponse {
  return {
    publicId: 'emp-1', firstName: 'Daynier', lastName: 'Ruiz',
    email: 'daynier@gmail.com', phone: null, positionName: 'HHA',
    positionPublicId: 'pos-1', status: 'APPLICANT', applicationDate: '2026-10-12',
    createdAt: '2026-10-12T00:00:00Z', languages: ['ENGLISH'], languageOther: null,
    schoolName: 'Family Care'
  };
}

// Minimal valid Geoapify selection — onSubmit requires city/state/postcode/country.
function validAddress(): any {
  return {
    properties: {
      address_line1: '2701 Regalia Place', city: 'Cooper City', state_code: 'FL',
      postcode: '33026', country_code: 'US', lat: 26.05, lon: -80.29, place_id: 'place-1'
    }
  };
}

describe('ApplyComponent', () => {
  let applicantService: jasmine.SpyObj<ApplicantService>;

  function setup(routeKey: string | null = 'apply-key-xyz'): ApplyComponent {
    applicantService = jasmine.createSpyObj<ApplicantService>(
      'ApplicantService', ['getAgencyInfo', 'getPositions', 'register']);
    // ngOnInit (via detectChanges) resolves the agency banner + positions; stub first.
    applicantService.getAgencyInfo.and.returnValue(of({ name: 'All Care Home Health', slug: 'all-care' }));
    applicantService.getPositions.and.returnValue(of([]));

    const geoapify = jasmine.createSpyObj<GeoapifyService>('GeoapifyService', ['autocomplete']);
    geoapify.autocomplete.and.returnValue(of([]));

    const languageService = { options: [], activeLang: () => 'es', use: () => {} };

    TestBed.configureTestingModule({
      imports: [ApplyComponent, getTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ApplicantService, useValue: applicantService },
        { provide: GeoapifyService, useValue: geoapify },
        { provide: LanguageService, useValue: languageService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(routeKey ? { key: routeKey } : {}),
              queryParams: {}
            }
          }
        }
      ]
    });
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ApplyComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function fillValidForm(component: ApplyComponent): void {
    component.firstName = 'Daynier';
    component.lastName = 'Ruiz';
    component.email = 'daynier@gmail.com';
    component.positionPublicId = 'pos-1';
    component.languages = ['ENGLISH', 'SPANISH'];
    component.schoolName = 'Family Care';
    component.selectedAddress = validAddress();
  }

  it('reads the apply-link key from the route', () => {
    const component = setup('apply-key-xyz');
    expect(component.applyLinkKey).toBe('apply-key-xyz');
  });

  it('onSubmit sends the applyLinkKey so production (require-apply-link-key) accepts the registration', () => {
    const component = setup('apply-key-xyz');
    applicantService.register.and.returnValue(of({ applicant: makeApplicantResponse(), uploadToken: null, requiredCredentialTypes: [] }));
    fillValidForm(component);

    component.onSubmit();

    expect(applicantService.register).toHaveBeenCalledTimes(1);
    const body = applicantService.register.calls.mostRecent().args[0];
    // The regression this guards: the form used to send only agencySlug, which
    // prod rejects with "Invalid apply link." (404).
    expect(body.applyLinkKey).toBe('apply-key-xyz');
    expect(body.agencySlug).toBe('all-care');
  });

  it('onSubmit marks the application as submitted (shows the "wait for approval" screen)', () => {
    const component = setup();
    applicantService.register.and.returnValue(of({ applicant: makeApplicantResponse(), uploadToken: null, requiredCredentialTypes: [] }));
    fillValidForm(component);

    component.onSubmit();

    expect(component.submitted).toBeTrue();
  });

  it('onSubmit does not call register when no address is selected', () => {
    const component = setup();
    fillValidForm(component);
    component.selectedAddress = null;

    component.onSubmit();

    expect(applicantService.register).not.toHaveBeenCalled();
  });
});
