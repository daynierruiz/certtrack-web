import { of, throwError } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatOptionSelectionChange } from '@angular/material/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { ContractGenerateDialogComponent } from './contract-generate-dialog.component';
import { ContractTemplateService } from '../../../core/services/contract-template.service';
import { ContractService } from '../../../core/services/contract.service';
import { PositionService } from '../../../core/services/position.service';
import {
  Contract,
  ContractTemplate,
  ContractTemplatePositionRef
} from '../../../core/models/contract.model';
import { EmployeeEligibilityResponse } from '../../../core/models/position.model';
import { Page } from '../../../core/models/page.model';

const SENTINEL_PREFIX = '__SELECT_ALL__:';

function pageOf<T>(content: T[]): Page<T> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: content.length,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0
  };
}

function posRef(publicId: string, name: string): ContractTemplatePositionRef {
  return { publicId, code: publicId.toUpperCase(), name };
}

function makeTemplate(
  publicId: string,
  name: string,
  positions?: ContractTemplatePositionRef[]
): ContractTemplate {
  return {
    publicId,
    agencyPublicId: 'ag-1',
    name,
    description: null,
    htmlBody: '<p>body</p>',
    isActive: true,
    positions,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };
}

function makeEligibility(
  positionPublicId: string,
  positionName: string
): EmployeeEligibilityResponse {
  return {
    employeePublicId: 'emp-1',
    employeeName: 'Ana Diaz',
    positionPublicId,
    positionName,
    status: 'ELIGIBLE',
    totalMandatory: 0,
    metMandatory: 0,
    totalOptional: 0,
    metOptional: 0,
    percentComplete: 100,
    requirements: []
  };
}

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    publicId: 'c-1',
    agencyPublicId: 'ag-1',
    employeePublicId: 'emp-1',
    employeeName: 'Ana Diaz',
    templatePublicId: null,
    title: 'Employment Agreement - Ana Diaz',
    status: 'DRAFT',
    documentHash: null,
    sentAt: null,
    signedAt: null,
    expiresAt: null,
    effectiveDate: null,
    employeeSigned: false,
    employerSigned: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  };
}

describe('ContractGenerateDialogComponent', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<ContractGenerateDialogComponent>>;
  let templateService: jasmine.SpyObj<ContractTemplateService>;
  let contractService: jasmine.SpyObj<ContractService>;
  let positionService: jasmine.SpyObj<PositionService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function createComponent(
    templates: ContractTemplate[],
    positions: EmployeeEligibilityResponse[],
    options: { failTemplates?: boolean } = {}
  ): ContractGenerateDialogComponent {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ContractGenerateDialogComponent>>('MatDialogRef', ['close']);
    templateService = jasmine.createSpyObj<ContractTemplateService>('ContractTemplateService', ['getActive']);
    if (options.failTemplates) {
      templateService.getActive.and.returnValue(throwError(() => new Error('boom')));
    } else {
      templateService.getActive.and.returnValue(of(pageOf(templates)));
    }
    contractService = jasmine.createSpyObj<ContractService>(
      'ContractService', ['generate', 'previewHtml', 'send', 'downloadPdf']
    );
    positionService = jasmine.createSpyObj<PositionService>('PositionService', ['getEmployeeEligibility']);
    positionService.getEmployeeEligibility.and.returnValue(of(positions));
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const sanitizer = {
      bypassSecurityTrustHtml: (html: string) => html
    } as unknown as DomSanitizer;
    const transloco = {
      translate: (key: string) => key
    } as unknown as TranslocoService;

    const component = new ContractGenerateDialogComponent(
      dialogRef,
      { employeePublicId: 'emp-1', employeeName: 'Ana Diaz', agencyPublicId: 'ag-1' },
      templateService,
      contractService,
      positionService,
      sanitizer,
      snackBar,
      transloco
    );
    component.ngOnInit();
    return component;
  }

  function selectionEvent(): { event: MatOptionSelectionChange; deselect: jasmine.Spy } {
    const deselect = jasmine.createSpy('deselect');
    const event = { isUserInput: true, source: { deselect } } as unknown as MatOptionSelectionChange;
    return { event, deselect };
  }

  it('inicializa el título por defecto con el nombre del empleado', () => {
    const component = createComponent([], []);
    expect(component.title).toBe('Employment Agreement - Ana Diaz');
  });

  it('carga plantillas y posiciones en ngOnInit y apaga el loading', () => {
    const component = createComponent([makeTemplate('t-1', 'NDA')], [makeEligibility('p1', 'HHA')]);
    expect(templateService.getActive).toHaveBeenCalledWith('ag-1');
    expect(positionService.getEmployeeEligibility).toHaveBeenCalledWith('emp-1');
    expect(component.loadingTemplates).toBeFalse();
  });

  it('apaga el loading si la carga inicial falla', () => {
    const component = createComponent([], [], { failTemplates: true });
    expect(component.loadingTemplates).toBeFalse();
    expect(component.templateGroups).toEqual([]);
  });

  describe('buildTemplateGroups (via ngOnInit)', () => {
    it('fallback legacy: empleado sin posiciones ve TODAS las plantillas en un único grupo', () => {
      const tA = makeTemplate('t-a', 'A', [posRef('p1', 'HHA')]);
      const tB = makeTemplate('t-b', 'B');
      const component = createComponent([tA, tB], []);

      expect(component.templateGroups.length).toBe(1);
      expect(component.templateGroups[0].label).toBe('contracts.generate.allTemplatesGroup');
      expect(component.templateGroups[0].positionPublicId).toBeUndefined();
      expect(component.templateGroups[0].templates).toEqual([tA, tB]);
    });

    it('agrupa por posición del empleado, de-duplica entre grupos y añade grupo universal al final', () => {
      const tA = makeTemplate('t-a', 'Solo P1', [posRef('p1', 'HHA')]);
      const tB = makeTemplate('t-b', 'P1 y P2', [posRef('p1', 'HHA'), posRef('p2', 'RN')]);
      const tC = makeTemplate('t-c', 'Solo P2', [posRef('p2', 'RN')]);
      const tD = makeTemplate('t-d', 'Universal vacio', []);
      const tE = makeTemplate('t-e', 'Universal undefined', undefined);
      const tF = makeTemplate('t-f', 'Otra posicion', [posRef('p3', 'LPN')]);
      const component = createComponent(
        [tA, tB, tC, tD, tE, tF],
        [makeEligibility('p1', 'HHA'), makeEligibility('p2', 'RN')]
      );

      expect(component.templateGroups.length).toBe(3);

      const [g1, g2, g3] = component.templateGroups;
      expect(g1.label).toBe('HHA');
      expect(g1.positionPublicId).toBe('p1');
      expect(g1.templates.map(t => t.publicId)).toEqual(['t-a', 't-b']);

      // t-b ya quedó asignada al grupo de p1 — no se repite en p2
      expect(g2.label).toBe('RN');
      expect(g2.templates.map(t => t.publicId)).toEqual(['t-c']);

      expect(g3.label).toBe('contracts.generate.universalGroup');
      expect(g3.positionPublicId).toBeUndefined();
      expect(g3.templates.map(t => t.publicId)).toEqual(['t-d', 't-e']);

      // t-f (posición que el empleado no tiene) no aparece en ningún grupo
      const allIds = component.templateGroups.flatMap(g => g.templates.map(t => t.publicId));
      expect(allIds).not.toContain('t-f');
    });

    it('omite grupos de posiciones sin plantillas visibles', () => {
      const tA = makeTemplate('t-a', 'Solo P1', [posRef('p1', 'HHA')]);
      const component = createComponent(
        [tA],
        [makeEligibility('p1', 'HHA'), makeEligibility('p2', 'RN')]
      );

      expect(component.templateGroups.length).toBe(1);
      expect(component.templateGroups[0].label).toBe('HHA');
    });

    it('no añade grupo universal si no hay plantillas sin posición', () => {
      const tA = makeTemplate('t-a', 'Solo P1', [posRef('p1', 'HHA')]);
      const component = createComponent([tA], [makeEligibility('p1', 'HHA')]);

      expect(component.templateGroups.some(g => g.label === 'contracts.generate.universalGroup')).toBeFalse();
    });

    it('oculta por completo plantillas de posiciones ajenas (sin fallback) cuando el empleado sí tiene posiciones', () => {
      const tF = makeTemplate('t-f', 'Otra posicion', [posRef('p3', 'LPN')]);
      const component = createComponent([tF], [makeEligibility('p1', 'HHA')]);

      expect(component.templateGroups).toEqual([]);
    });
  });

  describe('selección por grupo (sentinel y select-all)', () => {
    const tA = makeTemplate('t-a', 'A', [posRef('p1', 'HHA')]);
    const tB = makeTemplate('t-b', 'B', [posRef('p1', 'HHA')]);
    const tD = makeTemplate('t-d', 'Universal', []);

    function createWithGroup() {
      const component = createComponent([tA, tB, tD], [makeEligibility('p1', 'HHA')]);
      const group = component.templateGroups[0]; // HHA: t-a, t-b
      return { component, group };
    }

    it('groupSentinel usa el prefijo reservado + label', () => {
      const { component, group } = createWithGroup();
      expect(component.groupSentinel(group)).toBe(SENTINEL_PREFIX + 'HHA');
    });

    it('groupCheckIcon refleja ninguno/alguno/todos seleccionados', () => {
      const { component, group } = createWithGroup();

      expect(component.groupCheckIcon(group)).toBe('check_box_outline_blank');

      component.selectedTemplateIds = ['t-a'];
      expect(component.groupCheckIcon(group)).toBe('indeterminate_check_box');

      component.selectedTemplateIds = ['t-a', 't-b'];
      expect(component.groupCheckIcon(group)).toBe('check_box');
    });

    it('ignora eventos que no son interacción del usuario', () => {
      const { component, group } = createWithGroup();
      const deselect = jasmine.createSpy('deselect');
      const event = { isUserInput: false, source: { deselect } } as unknown as MatOptionSelectionChange;

      component.handleSelectAll(event, group);

      expect(deselect).not.toHaveBeenCalled();
      expect(component.selectedTemplateIds).toEqual([]);
    });

    it('selecciona todo el grupo, deselecciona el sentinel y nunca lo guarda', () => {
      const { component, group } = createWithGroup();
      const { event, deselect } = selectionEvent();

      component.handleSelectAll(event, group);

      expect(deselect).toHaveBeenCalled();
      expect(component.selectedTemplateIds.sort()).toEqual(['t-a', 't-b']);
      expect(component.selectedTemplateIds.some(id => id.startsWith(SENTINEL_PREFIX))).toBeFalse();
    });

    it('con selección parcial completa el grupo sin duplicar ids', () => {
      const { component, group } = createWithGroup();
      component.selectedTemplateIds = ['t-a', 't-d'];
      const { event } = selectionEvent();

      component.handleSelectAll(event, group);

      expect(component.selectedTemplateIds.sort()).toEqual(['t-a', 't-b', 't-d']);
    });

    it('con todo el grupo seleccionado lo deselecciona sin tocar otras selecciones', () => {
      const { component, group } = createWithGroup();
      component.selectedTemplateIds = ['t-a', 't-b', 't-d'];
      const { event } = selectionEvent();

      component.handleSelectAll(event, group);

      expect(component.selectedTemplateIds).toEqual(['t-d']);
    });
  });

  describe('generate / preview / envío / descarga', () => {
    it('generate limpia sentinels, formatea la fecha local y omite campos vacíos', () => {
      const component = createComponent([makeTemplate('t-a', 'A', [])], [makeEligibility('p1', 'HHA')]);
      contractService.generate.and.returnValue(of(makeContract()));
      contractService.previewHtml.and.returnValue(of('<p>hola</p>'));

      component.selectedTemplateIds = ['t-a', SENTINEL_PREFIX + 'HHA'];
      component.effectiveDate = new Date(2026, 0, 15);
      component.position = '';
      component.payRate = '18.50';

      component.generate();

      const req = contractService.generate.calls.mostRecent().args[0];
      expect(req.templatePublicIds).toEqual(['t-a']);
      expect(req.effectiveDate).toBe('2026-01-15');
      expect(req.position).toBeUndefined();
      expect(req.payUnit).toBeUndefined();
      expect(req.payRate).toBe('18.50');
      expect(req.agencyPublicId).toBe('ag-1');
      expect(req.employeePublicId).toBe('emp-1');
    });

    it('generate OK guarda el contrato, carga el preview sanitizado y apaga generating', () => {
      const component = createComponent([], [makeEligibility('p1', 'HHA')]);
      const contract = makeContract();
      contractService.generate.and.returnValue(of(contract));
      contractService.previewHtml.and.returnValue(of('<p>hola</p>'));

      component.generate();

      expect(component.generatedContract).toBe(contract);
      expect(contractService.previewHtml).toHaveBeenCalledWith('c-1');
      expect(component.previewHtml as unknown as string).toBe('<p>hola</p>');
      expect(component.generating).toBeFalse();
    });

    it('generate con error apaga generating y muestra snackbar', () => {
      const component = createComponent([], [makeEligibility('p1', 'HHA')]);
      contractService.generate.and.returnValue(throwError(() => new Error('fail')));

      component.generate();

      expect(component.generating).toBeFalse();
      expect(component.generatedContract).toBeNull();
      expect(snackBar.open).toHaveBeenCalledWith('contracts.generate.generateError', 'OK', { duration: 3000 });
    });

    it('sendToEmployee OK cierra el diálogo con true', () => {
      const component = createComponent([], []);
      component.generatedContract = makeContract();
      contractService.send.and.returnValue(of(makeContract({ status: 'SENT' })));

      component.sendToEmployee();

      expect(contractService.send).toHaveBeenCalledWith('c-1');
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('sendToEmployee con error no cierra y apaga sending', () => {
      const component = createComponent([], []);
      component.generatedContract = makeContract();
      contractService.send.and.returnValue(throwError(() => new Error('fail')));

      component.sendToEmployee();

      expect(component.sending).toBeFalse();
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('contracts.generate.sendError', 'OK', { duration: 3000 });
    });

    it('sendToEmployee sin contrato generado no hace nada', () => {
      const component = createComponent([], []);
      component.sendToEmployee();
      expect(contractService.send).not.toHaveBeenCalled();
    });

    it('downloadPdf descarga el blob con el nombre del contrato', () => {
      const component = createComponent([], []);
      component.generatedContract = makeContract();
      contractService.downloadPdf.and.returnValue(of(new Blob(['pdf'])));

      const anchor = document.createElement('a');
      const clickSpy = spyOn(anchor, 'click');
      spyOn(document, 'createElement').and.returnValue(anchor);
      spyOn(URL, 'createObjectURL').and.returnValue('blob:fake-url');
      const revokeSpy = spyOn(URL, 'revokeObjectURL');

      component.downloadPdf();

      expect(contractService.downloadPdf).toHaveBeenCalledWith('c-1');
      expect(anchor.download).toBe('Employment Agreement - Ana Diaz.pdf');
      expect(anchor.href).toContain('blob:fake-url');
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalledWith('blob:fake-url');
    });

    it('downloadPdf sin contrato generado no llama al servicio', () => {
      const component = createComponent([], []);
      component.downloadPdf();
      expect(contractService.downloadPdf).not.toHaveBeenCalled();
    });
  });
});
