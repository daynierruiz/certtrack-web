import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let service: ToastService;

  beforeEach(() => {
    snackBarSpy = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });
    service = TestBed.inject(ToastService);
  });

  it('success opens with OK action, 4s duration and toast-success variant', () => {
    service.success('Saved');

    expect(snackBarSpy.open).toHaveBeenCalledWith('Saved', 'OK', {
      duration: 4000,
      panelClass: ['app-toast', 'toast-success']
    });
  });

  it('error opens with Close action, 8s duration and toast-error variant', () => {
    service.error('Could not save');

    expect(snackBarSpy.open).toHaveBeenCalledWith('Could not save', 'Close', {
      duration: 8000,
      panelClass: ['app-toast', 'toast-error']
    });
  });

  it('warn opens with OK action, 6s duration and toast-warn variant', () => {
    service.warn('Pick a credential type first');

    expect(snackBarSpy.open).toHaveBeenCalledWith('Pick a credential type first', 'OK', {
      duration: 6000,
      panelClass: ['app-toast', 'toast-warn']
    });
  });

  it('info opens with OK action, 5s duration and toast-info variant', () => {
    service.info('Check your email');

    expect(snackBarSpy.open).toHaveBeenCalledWith('Check your email', 'OK', {
      duration: 5000,
      panelClass: ['app-toast', 'toast-info']
    });
  });

  it('honors custom action and duration overrides', () => {
    service.success('Done', 'Undo', 1500);

    expect(snackBarSpy.open).toHaveBeenCalledWith('Done', 'Undo', {
      duration: 1500,
      panelClass: ['app-toast', 'toast-success']
    });
  });

  it('always layers the base app-toast class before the variant class', () => {
    service.error('x');
    service.info('y');

    const calls = snackBarSpy.open.calls.allArgs();
    for (const [, , config] of calls) {
      expect((config!.panelClass as string[])[0]).toBe('app-toast');
    }
  });
});
