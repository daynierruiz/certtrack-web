import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from './language.service';

const LANG_KEY = 'cr_lang';

describe('LanguageService', () => {
  let translocoSpy: jasmine.SpyObj<TranslocoService>;
  let originalDocLang: string;

  beforeEach(() => {
    localStorage.clear();
    originalDocLang = document.documentElement.lang;
    translocoSpy = jasmine.createSpyObj<TranslocoService>('TranslocoService', ['setActiveLang']);
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: translocoSpy }
      ]
    });
  });

  afterEach(() => {
    restoreNavigatorLanguage();
    document.documentElement.lang = originalDocLang;
    localStorage.clear();
  });

  /** Shadows navigator.language on the instance (prototype stays intact). */
  function mockNavigatorLanguage(lang: string): void {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      get: () => lang
    });
  }

  function restoreNavigatorLanguage(): void {
    delete (navigator as { language?: string }).language;
  }

  /** Lazy inject so tests can seed localStorage/navigator BEFORE construction. */
  function service(): LanguageService {
    return TestBed.inject(LanguageService);
  }

  describe('init() resolution order: localStorage -> navigator -> en', () => {
    it('uses the stored language when present', () => {
      localStorage.setItem(LANG_KEY, 'es');
      mockNavigatorLanguage('en-US');

      const svc = service();
      svc.init();

      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('es');
      expect(svc.activeLang()).toBe('es');
      expect(document.documentElement.lang).toBe('es');
    });

    it('ignores an invalid stored value and falls back to the browser language', () => {
      localStorage.setItem(LANG_KEY, 'fr');
      mockNavigatorLanguage('es-ES');

      const svc = service();
      svc.init();

      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('es');
      expect(svc.activeLang()).toBe('es');
    });

    it('resolves es from a regional Spanish browser language (es-MX)', () => {
      mockNavigatorLanguage('es-MX');

      const svc = service();
      svc.init();

      expect(svc.activeLang()).toBe('es');
    });

    it('resolves en from an English browser language', () => {
      mockNavigatorLanguage('en-US');

      const svc = service();
      svc.init();

      expect(svc.activeLang()).toBe('en');
    });

    it('defaults to en for unsupported browser languages', () => {
      mockNavigatorLanguage('fr-FR');

      const svc = service();
      svc.init();

      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('en');
      expect(svc.activeLang()).toBe('en');
    });

    it('init() does not persist the resolved language to localStorage', () => {
      mockNavigatorLanguage('es-ES');

      service().init();

      expect(localStorage.getItem(LANG_KEY)).toBeNull();
    });
  });

  describe('use()', () => {
    it('persists, updates the signal, Transloco and the html lang attribute', () => {
      const svc = service();

      svc.use('es');

      expect(localStorage.getItem(LANG_KEY)).toBe('es');
      expect(svc.activeLang()).toBe('es');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('es');
      expect(document.documentElement.lang).toBe('es');
    });

    it('with persist=false applies the language without writing to localStorage', () => {
      const svc = service();

      svc.use('es', false);

      expect(localStorage.getItem(LANG_KEY)).toBeNull();
      expect(svc.activeLang()).toBe('es');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('es');
    });

    it('switching back to en overwrites the stored value', () => {
      const svc = service();
      svc.use('es');
      svc.use('en');

      expect(localStorage.getItem(LANG_KEY)).toBe('en');
      expect(svc.activeLang()).toBe('en');
    });
  });

  describe('options', () => {
    it('exposes exactly the two supported languages', () => {
      expect(service().options).toEqual([
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' }
      ]);
    });
  });
});
