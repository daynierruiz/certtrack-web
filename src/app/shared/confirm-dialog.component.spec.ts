import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

function getTranslocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: {
      en: {
        common: {
          cancel: 'Cancel',
          delete: 'Delete'
        }
      }
    },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
      missingHandler: {
        logMissingKey: false,
        useFallbackTranslation: false,
        allowEmpty: true
      }
    },
    preloadLangs: true
  });
}

describe('ConfirmDialogComponent', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;

  function createDialog(data: ConfirmDialogData): ComponentFixture<ConfirmDialogComponent> {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ConfirmDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, getTranslocoTesting()],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  function buttons(fixture: ComponentFixture<ConfirmDialogComponent>): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    );
  }

  it('renderiza el título y el mensaje inyectados', () => {
    const fixture = createDialog({ title: 'Eliminar empleado', message: '¿Seguro que deseas continuar?' });
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('h2')?.textContent).toContain('Eliminar empleado');
    expect(host.querySelector('mat-dialog-content p')?.textContent)
      .toContain('¿Seguro que deseas continuar?');
  });

  it('usa los textos de botón personalizados cuando se proveen', () => {
    const fixture = createDialog({
      title: 'T', message: 'M', confirmText: 'Sí, borrar', cancelText: 'No'
    });
    const [cancelBtn, confirmBtn] = buttons(fixture);

    expect(cancelBtn.textContent).toContain('No');
    expect(confirmBtn.textContent).toContain('Sí, borrar');
  });

  it('usa los textos por defecto traducidos cuando no se proveen', () => {
    const fixture = createDialog({ title: 'T', message: 'M' });
    const [cancelBtn, confirmBtn] = buttons(fixture);

    expect(cancelBtn.textContent).toContain('Cancel');
    expect(confirmBtn.textContent).toContain('Delete');
  });

  it('muestra el icono por defecto "warning" y el personalizado cuando se indica', () => {
    const fixtureDefault = createDialog({ title: 'T', message: 'M' });
    const iconDefault = (fixtureDefault.nativeElement as HTMLElement)
      .querySelector('.confirm-icon mat-icon');
    expect(iconDefault?.textContent).toContain('warning');

    TestBed.resetTestingModule();
    const fixtureCustom = createDialog({ title: 'T', message: 'M', icon: 'person_remove' });
    const iconCustom = (fixtureCustom.nativeElement as HTMLElement)
      .querySelector('.confirm-icon mat-icon');
    expect(iconCustom?.textContent).toContain('person_remove');
  });

  it('el botón de cancelar cierra con false', () => {
    const fixture = createDialog({ title: 'T', message: 'M' });
    const [cancelBtn] = buttons(fixture);

    cancelBtn.click();

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('el botón de confirmar cierra con true', () => {
    const fixture = createDialog({ title: 'T', message: 'M' });
    const [, confirmBtn] = buttons(fixture);

    confirmBtn.click();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
