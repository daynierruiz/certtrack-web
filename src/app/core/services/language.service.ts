import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type AppLang = 'en' | 'es';

const LANG_KEY = 'cr_lang';

export interface LanguageOption {
  code: AppLang;
  label: string;
}

/**
 * Single source of truth for the active UI language.
 *
 * Resolution order on startup: localStorage -> browser language -> 'en'.
 * The chosen language is persisted to localStorage (frontend-only, no backend
 * column). Switching is instant because Transloco re-renders on lang change.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);

  readonly options: LanguageOption[] = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' }
  ];

  /** Reactive active language for templates (e.g. highlighting the menu item). */
  readonly activeLang = signal<AppLang>('en');

  /** Called once at app bootstrap (AppComponent) to apply the resolved language. */
  init(): void {
    this.use(this.resolveInitialLang(), false);
  }

  use(lang: AppLang, persist = true): void {
    this.transloco.setActiveLang(lang);
    this.activeLang.set(lang);
    document.documentElement.lang = lang;
    if (persist) {
      localStorage.setItem(LANG_KEY, lang);
    }
  }

  private resolveInitialLang(): AppLang {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'es') {
      return stored;
    }
    const browser = (navigator.language || 'en').toLowerCase();
    return browser.startsWith('es') ? 'es' : 'en';
  }
}
