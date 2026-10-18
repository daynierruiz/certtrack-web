import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreakpointObserver } from '@angular/cdk/layout';
import { TranslocoService } from '@jsverse/transloco';
import { EmployeeListComponent } from './employee-list.component';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { PositionService } from '../../../core/services/position.service';
import { Employee, EmployeePositionRef } from '../../../core/models/employee.model';
import { PositionResponse } from '../../../core/models/position.model';
import { LanguageCode } from '../../../core/models/applicant.model';
import { EmployeeAddress } from '../../../core/models/address.model';
import { Page } from '../../../core/models/page.model';

interface FilterState {
  search: string;
  positionPublicIds: string[];
  languages: LanguageCode[];
  state: string;
  city: string;
  postalCode: string;
}

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

function posRef(publicId: string): EmployeePositionRef {
  return { publicId, code: publicId.toUpperCase(), name: `Pos ${publicId}` };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    publicId: 'emp-1',
    agencyPublicId: 'ag-1',
    firstName: 'Ana',
    lastName: 'Diaz',
    email: 'ana@test.com',
    phone: '305-555-1234',
    employeeCode: null,
    externalId: null,
    hireDate: '2026-01-15',
    terminationDate: null,
    status: 'ACTIVE',
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

function filterJson(overrides: Partial<FilterState> = {}): string {
  const base: FilterState = {
    search: '',
    positionPublicIds: [],
    languages: [],
    state: '',
    city: '',
    postalCode: ''
  };
  return JSON.stringify({ ...base, ...overrides });
}

describe('EmployeeListComponent', () => {
  let employeeService: jasmine.SpyObj<EmployeeService>;
  let router: jasmine.SpyObj<Router>;

  function createComponent(
    opts: { employees?: Employee[]; isMobile?: boolean } = {}
  ): EmployeeListComponent {
    employeeService = jasmine.createSpyObj<EmployeeService>('EmployeeService', ['getAll', 'delete']);
    employeeService.getAll.and.returnValue(of(pageOf(opts.employees ?? [])));
    const positionService = jasmine.createSpyObj<PositionService>('PositionService', ['getAll']);
    positionService.getAll.and.returnValue(of(pageOf<PositionResponse>([])));
    const authService = { agencyPublicId: () => 'ag-1' } as unknown as AuthService;
    const breakpointObserver = {
      observe: () => of({ matches: opts.isMobile ?? false, breakpoints: {} })
    } as unknown as BreakpointObserver;
    const route = {
      snapshot: { queryParamMap: { get: () => null } }
    } as unknown as ActivatedRoute;
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const transloco = { translate: (key: string) => key } as unknown as TranslocoService;

    return new EmployeeListComponent(
      employeeService,
      authService,
      positionService,
      {} as MatDialog,
      {} as MatSnackBar,
      breakpointObserver,
      route,
      router,
      transloco
    );
  }

  function predicateOf(component: EmployeeListComponent) {
    component.ngOnInit();
    return component.dataSource.filterPredicate;
  }

  describe('filterPredicate — búsqueda de texto (RF-22)', () => {
    it('busca por nombre sin distinguir mayúsculas', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ firstName: 'Ana', lastName: 'Diaz' });

      expect(predicate(emp, filterJson({ search: 'ana' }))).toBeTrue();
      expect(predicate(emp, filterJson({ search: 'DIAZ' }))).toBeTrue();
      expect(predicate(emp, filterJson({ search: 'pedro' }))).toBeFalse();
    });

    it('busca sobre nombre completo, email, teléfono y estado', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({
        firstName: 'Ana', lastName: 'Diaz',
        email: 'ana.diaz@care.com', phone: '305-555-1234', status: 'ONBOARDING'
      });

      expect(predicate(emp, filterJson({ search: 'ana diaz' }))).toBeTrue();
      expect(predicate(emp, filterJson({ search: 'care.com' }))).toBeTrue();
      expect(predicate(emp, filterJson({ search: '555-1234' }))).toBeTrue();
      expect(predicate(emp, filterJson({ search: 'onboarding' }))).toBeTrue();
    });

    it('tolera email y teléfono nulos', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ email: null, phone: null });

      expect(predicate(emp, filterJson({ search: 'ana' }))).toBeTrue();
      expect(predicate(emp, filterJson({ search: '@' }))).toBeFalse();
    });

    it('los acentos NO se normalizan: "José" solo coincide escribiendo el acento', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ firstName: 'José' });

      // Comportamiento actual del código: toLowerCase sin quitar diacríticos
      expect(predicate(emp, filterJson({ search: 'josé' }))).toBeTrue();
      expect(predicate(emp, filterJson({ search: 'jose' }))).toBeFalse();
    });
  });

  describe('filterPredicate — filtros de posición, idioma y dirección (RF-22)', () => {
    it('posición: pasa si el empleado tiene ALGUNA de las posiciones filtradas', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ positions: [posRef('p1'), posRef('p2')] });

      expect(predicate(emp, filterJson({ positionPublicIds: ['p2'] }))).toBeTrue();
      expect(predicate(emp, filterJson({ positionPublicIds: ['p9', 'p1'] }))).toBeTrue();
      expect(predicate(emp, filterJson({ positionPublicIds: ['p9'] }))).toBeFalse();
    });

    it('posición: empleado sin posiciones no pasa el filtro de posición', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ positions: undefined });

      expect(predicate(emp, filterJson({ positionPublicIds: ['p1'] }))).toBeFalse();
    });

    it('idiomas: OR entre los seleccionados', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ languages: ['SPANISH', 'HAITIAN_CREOLE'] });

      expect(predicate(emp, filterJson({ languages: ['SPANISH'] }))).toBeTrue();
      expect(predicate(emp, filterJson({ languages: ['ENGLISH', 'HAITIAN_CREOLE'] }))).toBeTrue();
      expect(predicate(emp, filterJson({ languages: ['ENGLISH'] }))).toBeFalse();
    });

    it('estado (dirección): igualdad exacta sin distinguir mayúsculas', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ address: makeAddress({ state: 'FL' }) });

      expect(predicate(emp, filterJson({ state: 'fl' }))).toBeTrue();
      expect(predicate(emp, filterJson({ state: 'FL' }))).toBeTrue();
      expect(predicate(emp, filterJson({ state: 'F' }))).toBeFalse();
      expect(predicate(emp, filterJson({ state: 'NY' }))).toBeFalse();
    });

    it('estado: empleado sin dirección no pasa el filtro de estado', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ address: null });

      expect(predicate(emp, filterJson({ state: 'FL' }))).toBeFalse();
    });

    it('ciudad: substring sin distinguir mayúsculas', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ address: makeAddress({ city: 'Miami Beach' }) });

      expect(predicate(emp, filterJson({ city: 'miami' }))).toBeTrue();
      expect(predicate(emp, filterJson({ city: 'BEACH' }))).toBeTrue();
      expect(predicate(emp, filterJson({ city: 'orlando' }))).toBeFalse();
    });

    it('código postal: por prefijo (startsWith)', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({ address: makeAddress({ postalCode: '33101' }) });

      expect(predicate(emp, filterJson({ postalCode: '331' }))).toBeTrue();
      expect(predicate(emp, filterJson({ postalCode: '33101' }))).toBeTrue();
      expect(predicate(emp, filterJson({ postalCode: '101' }))).toBeFalse();
    });
  });

  describe('filtrado combinado (AND entre criterios)', () => {
    it('exige que TODOS los criterios activos se cumplan a la vez', () => {
      const predicate = predicateOf(createComponent());
      const emp = makeEmployee({
        firstName: 'Ana',
        languages: ['SPANISH'],
        positions: [posRef('p1')],
        address: makeAddress({ state: 'FL', city: 'Miami', postalCode: '33101' })
      });

      const allMatch = filterJson({
        search: 'ana',
        positionPublicIds: ['p1'],
        languages: ['SPANISH'],
        state: 'FL',
        city: 'mia',
        postalCode: '33'
      });
      expect(predicate(emp, allMatch)).toBeTrue();

      const oneFails = filterJson({
        search: 'ana',
        positionPublicIds: ['p1'],
        languages: ['ENGLISH'], // no coincide
        state: 'FL'
      });
      expect(predicate(emp, oneFails)).toBeFalse();
    });

    it('applyFilters aplica el estado del filtro sobre el dataSource', () => {
      const component = createComponent();
      component.ngOnInit();
      component.dataSource.data = [
        makeEmployee({ publicId: 'e1', firstName: 'Ana' }),
        makeEmployee({ publicId: 'e2', firstName: 'Pedro' })
      ];

      component.filterState.search = 'pedro';
      component.applyFilters();

      expect(component.dataSource.filteredData.map(e => e.publicId)).toEqual(['e2']);
    });
  });

  describe('estado de filtros y utilidades', () => {
    it('onStateChange normaliza a mayúsculas y aplica el filtro', () => {
      const component = createComponent();
      component.ngOnInit();

      component.onStateChange('fl');
      expect(component.filterState.state).toBe('FL');

      component.onStateChange('');
      expect(component.filterState.state).toBe('');
    });

    it('clearFilters restablece todos los criterios', () => {
      const component = createComponent();
      component.ngOnInit();
      component.filterState = {
        search: 'x', positionPublicIds: ['p1'], languages: ['SPANISH'],
        state: 'FL', city: 'Miami', postalCode: '331'
      };

      component.clearFilters();

      expect(component.hasActiveFilters()).toBeFalse();
      expect(component.filterState.search).toBe('');
      expect(component.filterState.positionPublicIds).toEqual([]);
    });

    it('hasActiveFilters detecta cualquier criterio activo', () => {
      const component = createComponent();
      expect(component.hasActiveFilters()).toBeFalse();

      component.filterState.postalCode = '331';
      expect(component.hasActiveFilters()).toBeTrue();
    });

    it('activeAdvancedCount cuenta solo idiomas/estado/ciudad/CP (no búsqueda ni posición)', () => {
      const component = createComponent();
      component.filterState.search = 'ana';
      component.filterState.positionPublicIds = ['p1'];
      expect(component.activeAdvancedCount).toBe(0);

      component.filterState.languages = ['SPANISH'];
      component.filterState.state = 'FL';
      component.filterState.city = 'Miami';
      component.filterState.postalCode = '331';
      expect(component.activeAdvancedCount).toBe(4);
    });

    it('sortingDataAccessor ordena por "apellido nombre" en minúsculas', () => {
      const component = createComponent();
      component.ngOnInit();
      const emp = makeEmployee({ firstName: 'Ana', lastName: 'Diaz' });

      expect(component.dataSource.sortingDataAccessor(emp, 'name')).toBe('diaz ana');
      expect(component.dataSource.sortingDataAccessor(emp, 'hireDate')).toBe('2026-01-15');
    });
  });

  describe('layout responsive y navegación', () => {
    it('desktop: columnas completas y filtros avanzados abiertos', () => {
      const component = createComponent({ isMobile: false });
      expect(component.isMobile).toBeFalse();
      expect(component.displayedColumns).toEqual(['name', 'languages', 'address', 'status', 'hireDate', 'actions']);
      expect(component.advancedFiltersOpen).toBeTrue();
    });

    it('móvil: columnas reducidas y filtros avanzados colapsados', () => {
      const component = createComponent({ isMobile: true });
      expect(component.isMobile).toBeTrue();
      expect(component.displayedColumns).toEqual(['name', 'status', 'actions']);
      expect(component.advancedFiltersOpen).toBeFalse();
    });

    it('carga datos con la agencia del usuario y navega al perfil', () => {
      const emp = makeEmployee({ publicId: 'emp-7' });
      const component = createComponent({ employees: [emp] });
      component.ngOnInit();

      expect(employeeService.getAll).toHaveBeenCalledWith('ag-1', 0, 10000);
      expect(component.dataSource.data).toEqual([emp]);
      expect(component.loading).toBeFalse();

      component.viewProfile(emp);
      expect(router.navigate).toHaveBeenCalledWith(['/employees', 'emp-7']);
    });

    it('excluye solicitantes (APPLICANT/ONBOARDING) del listado de empleados', () => {
      const active = makeEmployee({ publicId: 'e-active', status: 'ACTIVE' });
      const applicant = makeEmployee({ publicId: 'e-app', status: 'APPLICANT' });
      const onboarding = makeEmployee({ publicId: 'e-onb', status: 'ONBOARDING' });
      const component = createComponent({ employees: [active, applicant, onboarding] });
      component.ngOnInit();

      expect(component.dataSource.data.map(e => e.publicId)).toEqual(['e-active']);
    });
  });
});
