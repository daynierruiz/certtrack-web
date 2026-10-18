import { TranslocoService } from '@jsverse/transloco';
import { HiringRoadmapComponent } from './hiring-roadmap.component';
import { Employee } from '../../../core/models/employee.model';
import { Credential, CredentialStatus } from '../../../core/models/credential.model';
import {
  EmployeeEligibilityResponse,
  RequirementStatusResponse
} from '../../../core/models/position.model';
import { EmployeeAddress } from '../../../core/models/address.model';

interface TranslateCall {
  key: string;
  params?: unknown;
}

const STEP_IDS = [
  'apply', 'approve', 'account', 'address',
  'docs-submit', 'docs-verify', 'contracts', 'hired'
];

function makeAddress(overrides: Partial<EmployeeAddress> = {}): EmployeeAddress {
  return {
    addressLine1: '123 Main St',
    addressLine2: null,
    city: 'Miami',
    state: 'FL',
    postalCode: '33101',
    country: 'US',
    latitude: 25.77,
    longitude: -80.19,
    validatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    publicId: 'emp-1',
    agencyPublicId: 'ag-1',
    firstName: 'Ana',
    lastName: 'Diaz',
    email: 'ana@test.com',
    phone: '555-1234',
    employeeCode: null,
    externalId: null,
    hireDate: null,
    terminationDate: null,
    status: 'APPLICANT',
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    address: null,
    languages: ['ENGLISH'],
    languageOther: null,
    schoolName: null,
    ...overrides
  };
}

function makeCredential(status: CredentialStatus, publicId = 'cred-1'): Credential {
  return {
    publicId,
    agencyPublicId: 'ag-1',
    employeePublicId: 'emp-1',
    credentialTypePublicId: 'ct-1',
    issueDate: null,
    expirationDate: null,
    status,
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

function makeRequirement(overrides: Partial<RequirementStatusResponse> = {}): RequirementStatusResponse {
  return {
    credentialTypePublicId: 'ct-1',
    credentialTypeName: 'CPR',
    credentialTypeCode: 'CPR',
    isMandatory: true,
    met: false,
    credentialStatus: null,
    credentialPublicId: null,
    ...overrides
  };
}

function makeEligibility(overrides: Partial<EmployeeEligibilityResponse> = {}): EmployeeEligibilityResponse {
  return {
    employeePublicId: 'emp-1',
    employeeName: 'Ana Diaz',
    positionPublicId: 'pos-1',
    positionName: 'HHA',
    status: 'NOT_ELIGIBLE',
    totalMandatory: 1,
    metMandatory: 0,
    totalOptional: 0,
    metOptional: 0,
    percentComplete: 0,
    requirements: [],
    ...overrides
  };
}

describe('HiringRoadmapComponent', () => {
  let component: HiringRoadmapComponent;
  let translateCalls: TranslateCall[];

  beforeEach(() => {
    translateCalls = [];
    const translocoStub = {
      translate: (key: string, params?: unknown): string => {
        translateCalls.push({ key, params });
        return key;
      }
    } as unknown as TranslocoService;
    component = new HiringRoadmapComponent(translocoStub);
  });

  function stepById(id: string) {
    const step = component.steps.find(s => s.id === id);
    if (!step) {
      throw new Error(`Step ${id} not found`);
    }
    return step;
  }

  describe('visibilidad por estado del empleado', () => {
    it('sin empleado: oculta el roadmap y no genera pasos', () => {
      component.employee = null;
      component.ngOnChanges();

      expect(component.visible).toBeFalse();
      expect(component.steps).toEqual([]);
    });

    it('empleado ACTIVE: oculta el roadmap y limpia currentStep', () => {
      component.employee = makeEmployee({ status: 'ACTIVE' });
      component.ngOnChanges();

      expect(component.visible).toBeFalse();
      expect(component.steps).toEqual([]);
      expect(component.currentStep).toBeNull();
    });

    it('APPLICANT, ONBOARDING, INACTIVE y TERMINATED muestran el roadmap', () => {
      for (const status of ['APPLICANT', 'ONBOARDING', 'INACTIVE', 'TERMINATED'] as const) {
        component.employee = makeEmployee({ status });
        component.ngOnChanges();
        expect(component.visible).withContext(status).toBeTrue();
        expect(component.steps.length).withContext(status).toBe(8);
      }
    });
  });

  describe('los 8 pasos y el paso current', () => {
    it('genera los 8 pasos en orden fijo', () => {
      component.employee = makeEmployee();
      component.ngOnChanges();

      expect(component.steps.map(s => s.id)).toEqual(STEP_IDS);
    });

    it('APPLICANT recién llegado: solo "apply" done y "approve" es el paso current', () => {
      component.employee = makeEmployee({ status: 'APPLICANT' });
      component.ngOnChanges();

      expect(stepById('apply').done).toBeTrue();
      expect(stepById('approve').done).toBeFalse();
      expect(stepById('approve').current).toBeTrue();
      expect(component.completedCount).toBe(1);
      expect(component.currentStep?.id).toBe('approve');
      expect(component.steps.filter(s => s.current).length).toBe(1);
    });

    it('ONBOARDING sin login: "approve" done y current pasa a "account"', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.accountLastLoginAt = null;
      component.ngOnChanges();

      expect(stepById('approve').done).toBeTrue();
      expect(stepById('account').done).toBeFalse();
      expect(component.currentStep?.id).toBe('account');
    });

    it('con login registrado: "account" done y current pasa a "address"', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.accountLastLoginAt = '2026-02-01T10:00:00Z';
      component.ngOnChanges();

      expect(stepById('account').done).toBeTrue();
      expect(component.currentStep?.id).toBe('address');
    });

    it('con dirección: "address" done y current pasa a "docs-submit"', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING', address: makeAddress() });
      component.accountLastLoginAt = '2026-02-01T10:00:00Z';
      component.ngOnChanges();

      expect(stepById('address').done).toBeTrue();
      expect(component.currentStep?.id).toBe('docs-submit');
    });

    it('todo completo salvo contratación: current es "hired" y completedCount 7', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING', address: makeAddress() });
      component.accountLastLoginAt = '2026-02-01T10:00:00Z';
      component.positionEligibility = [
        makeEligibility({ requirements: [makeRequirement({ met: true })] })
      ];
      component.credentials = [makeCredential('VALID')];
      component.signedContractsCount = 1;
      component.pendingContractsCount = 0;
      component.ngOnChanges();

      expect(component.completedCount).toBe(7);
      expect(component.currentStep?.id).toBe('hired');
      // "hired" solo se marca done con status ACTIVE (y entonces el roadmap se oculta)
      expect(stepById('hired').done).toBeFalse();
    });
  });

  describe('docs-submit / countMissingMandatory (dedup con Set)', () => {
    it('sin posiciones asignadas: docs-submit NO está done aunque falten 0 credenciales', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.positionEligibility = [];
      component.ngOnChanges();

      expect(stepById('docs-submit').done).toBeFalse();
    });

    it('mandatory no cumplido cuenta como faltante; opcional no cumplido NO cuenta', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.positionEligibility = [
        makeEligibility({
          requirements: [
            makeRequirement({ credentialTypePublicId: 'ct-1', isMandatory: true, met: false }),
            makeRequirement({ credentialTypePublicId: 'ct-2', isMandatory: false, met: false }),
            makeRequirement({ credentialTypePublicId: 'ct-3', isMandatory: true, met: true })
          ]
        })
      ];
      component.ngOnChanges();

      expect(stepById('docs-submit').done).toBeFalse();
      const call = translateCalls.find(c => c.key === 'employees.roadmap.steps.docsSubmit.descMissing');
      expect(call).toBeDefined();
      expect(call!.params).toEqual({ count: 1 });
    });

    it('la misma credencial faltante en dos posiciones cuenta UNA sola vez (Set)', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.positionEligibility = [
        makeEligibility({
          positionPublicId: 'pos-1',
          requirements: [makeRequirement({ credentialTypePublicId: 'ct-1', met: false })]
        }),
        makeEligibility({
          positionPublicId: 'pos-2',
          requirements: [
            makeRequirement({ credentialTypePublicId: 'ct-1', met: false }),
            makeRequirement({ credentialTypePublicId: 'ct-9', met: false })
          ]
        })
      ];
      component.ngOnChanges();

      const call = translateCalls.find(c => c.key === 'employees.roadmap.steps.docsSubmit.descMissing');
      expect(call!.params).toEqual({ count: 2 });
    });

    it('todos los mandatory cumplidos con posiciones asignadas: docs-submit done', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.positionEligibility = [
        makeEligibility({ requirements: [makeRequirement({ met: true })] })
      ];
      component.ngOnChanges();

      expect(stepById('docs-submit').done).toBeTrue();
    });
  });

  describe('docs-verify (credenciales en revisión)', () => {
    it('con credenciales PENDING_REVIEW no está done y reporta el conteo', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.positionEligibility = [
        makeEligibility({ requirements: [makeRequirement({ met: true })] })
      ];
      component.credentials = [
        makeCredential('PENDING_REVIEW', 'cred-1'),
        makeCredential('PENDING_REVIEW', 'cred-2'),
        makeCredential('VALID', 'cred-3')
      ];
      component.ngOnChanges();

      expect(stepById('docs-verify').done).toBeFalse();
      const call = translateCalls.find(c => c.key === 'employees.roadmap.steps.docsVerify.descPending');
      expect(call!.params).toEqual({ count: 2 });
    });

    it('sin credenciales cargadas no está done aunque no haya pendientes', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.positionEligibility = [
        makeEligibility({ requirements: [makeRequirement({ met: true })] })
      ];
      component.credentials = [];
      component.ngOnChanges();

      expect(stepById('docs-verify').done).toBeFalse();
    });

    it('todo verificado (0 faltantes, 0 pendientes, >0 credenciales): done', () => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
      component.positionEligibility = [
        makeEligibility({ requirements: [makeRequirement({ met: true })] })
      ];
      component.credentials = [makeCredential('VALID')];
      component.ngOnChanges();

      expect(stepById('docs-verify').done).toBeTrue();
    });
  });

  describe('contracts', () => {
    beforeEach(() => {
      component.employee = makeEmployee({ status: 'ONBOARDING' });
    });

    it('con contratos pendientes no está done', () => {
      component.pendingContractsCount = 2;
      component.signedContractsCount = 1;
      component.ngOnChanges();

      expect(stepById('contracts').done).toBeFalse();
      const call = translateCalls.find(c => c.key === 'employees.roadmap.steps.contracts.descPending');
      expect(call!.params).toEqual({ count: 2 });
    });

    it('firmados > 0 y 0 pendientes: done', () => {
      component.pendingContractsCount = 0;
      component.signedContractsCount = 3;
      component.ngOnChanges();

      expect(stepById('contracts').done).toBeTrue();
      const call = translateCalls.find(c => c.key === 'employees.roadmap.steps.contracts.descSigned');
      expect(call!.params).toEqual({ count: 3 });
    });

    it('sin contratos: no está done', () => {
      component.pendingContractsCount = 0;
      component.signedContractsCount = 0;
      component.ngOnChanges();

      expect(stepById('contracts').done).toBeFalse();
      expect(translateCalls.some(c => c.key === 'employees.roadmap.steps.contracts.descNone')).toBeTrue();
    });
  });

  describe('selección y labels', () => {
    beforeEach(() => {
      component.employee = makeEmployee({ status: 'APPLICANT' });
      component.ngOnChanges();
    });

    it('displayStep devuelve el seleccionado y, si no hay, el current', () => {
      expect(component.displayStep?.id).toBe('approve');

      const applyStep = component.steps[0];
      component.selectStep(applyStep);
      expect(component.displayStep).toBe(applyStep);
    });

    it('ngOnChanges resetea la selección', () => {
      component.selectStep(component.steps[0]);
      component.ngOnChanges();

      expect(component.selectedStep).toBeNull();
    });

    it('stepLabel distingue done / current / resto', () => {
      const done = component.steps[0];     // apply
      const current = component.steps[1];  // approve
      const future = component.steps[2];   // account

      expect(component.stepLabel(done)).toBe('employees.roadmap.labelDone');
      expect(component.stepLabel(current)).toBe('employees.roadmap.labelNext');
      expect(component.stepLabel(future)).toBe('employees.roadmap.labelStep');
    });
  });
});
