import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';
import { CoraChatComponent } from './cora-chat.component';
import { CoraService } from '../../core/services/cora.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { VoiceService } from '../../core/services/voice.service';
import { CoraChatResponse } from '../../core/models/cora.model';

function getTranslocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: {
      en: {
        cora: {
          title: 'Cora', welcome: 'Hi', placeholder: 'Ask', send: 'Send',
          thinking: 'Thinking...', toggle: 'Open', disclaimer: 'Read-only', error: 'Error'
        }
      }
    },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
      missingHandler: { logMissingKey: false, useFallbackTranslation: false, allowEmpty: true }
    },
    preloadLangs: true
  });
}

function makeResponse(reply: string, navigateTo: string | null = null, language: string | null = null): CoraChatResponse {
  return { reply, model: 'claude-haiku-4-5-20251001', inputTokens: 1, outputTokens: 1, costCents: 1, toolsUsed: [], navigateTo, language };
}

describe('CoraChatComponent', () => {
  let coraService: jasmine.SpyObj<CoraService>;
  let voiceService: jasmine.SpyObj<VoiceService>;
  let navigateSpy: jasmine.Spy;

  function setup(recognitionSupported = true, synthesisSupported = true): CoraChatComponent {
    coraService = jasmine.createSpyObj<CoraService>('CoraService', ['chat', 'sendReport']);
    voiceService = jasmine.createSpyObj<VoiceService>('VoiceService',
      ['isRecognitionSupported', 'isSynthesisSupported', 'startListening', 'stopListening', 'speak', 'cancelSpeech', 'unlockSpeech']);
    voiceService.isRecognitionSupported.and.returnValue(recognitionSupported);
    voiceService.isSynthesisSupported.and.returnValue(synthesisSupported);
    TestBed.configureTestingModule({
      imports: [CoraChatComponent, getTranslocoTesting()],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CoraService, useValue: coraService },
        { provide: AuthService, useValue: { agencyPublicId: () => 'ag-1', user: () => ({ email: 'admin@care.com' }) } },
        { provide: LanguageService, useValue: { activeLang: () => 'en' } },
        { provide: VoiceService, useValue: voiceService }
      ]
    });
    const router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CoraChatComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('toggle abre y cierra el panel', () => {
    const component = setup();
    expect(component.open).toBeFalse();
    component.toggle();
    expect(component.open).toBeTrue();
    component.toggle();
    expect(component.open).toBeFalse();
  });

  it('al abrir Cora desbloquea el audio (iOS)', () => {
    const component = setup();
    component.toggle(); // open
    expect(voiceService.unlockSpeech).toHaveBeenCalled();
  });

  it('auto-enviar: tras una pausa al escribir/dictar envía solo', fakeAsync(() => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('ok')));
    component.draft = 'cuántos empleados';
    component.onDraftChange();

    expect(coraService.chat).not.toHaveBeenCalled(); // aún no, esperando la pausa
    tick(component.autoSendDelayMs);

    expect(coraService.chat).toHaveBeenCalledTimes(1);
  }));

  it('auto-enviar: al TECLEAR (keydown) NO envía solo aunque haya pausa', fakeAsync(() => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('ok')));
    component.onKeydown(); // el usuario presionó una tecla → está escribiendo
    component.draft = 'cuántos empleados';
    component.onDraftChange();

    tick(component.autoSendDelayMs + 500);

    expect(coraService.chat).not.toHaveBeenCalled(); // no se auto-envía al teclear
  }));

  it('auto-enviar: un cambio posterior reinicia el temporizador (no envía a medias)', fakeAsync(() => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('ok')));
    component.draft = 'cuántos';
    component.onDraftChange();
    tick(component.autoSendDelayMs - 500); // casi, pero sigue dictando
    component.draft = 'cuántos empleados activos';
    component.onDraftChange();
    tick(component.autoSendDelayMs - 500);
    expect(coraService.chat).not.toHaveBeenCalled(); // reinició, aún no envía
    tick(500);
    expect(coraService.chat).toHaveBeenCalledTimes(1);
  }));

  it('send con draft vacío no llama al servicio', () => {
    const component = setup();
    component.draft = '   ';
    component.send();
    expect(coraService.chat).not.toHaveBeenCalled();
  });

  it('send: llama al servicio con agencia/idioma e historial vacío, y añade los turnos', () => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('You have 9 active employees.')));
    component.draft = 'How many employees?';

    component.send();

    expect(coraService.chat).toHaveBeenCalledWith('ag-1', 'How many employees?', 'en', []);
    expect(component.messages).toEqual([
      { role: 'user', content: 'How many employees?' },
      { role: 'assistant', content: 'You have 9 active employees.' }
    ]);
    expect(component.loading).toBeFalse();
    expect(component.draft).toBe('');
  });

  it('send: el segundo mensaje envía los turnos previos como historial', () => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('First reply.')));
    component.draft = 'first';
    component.send();

    coraService.chat.and.returnValue(of(makeResponse('Second reply.')));
    component.draft = 'second';
    component.send();

    expect(coraService.chat).toHaveBeenCalledWith('ag-1', 'second', 'en', [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'First reply.' }
    ]);
  });

  it('navegación: cuando la respuesta trae navigateTo, navega a esa ruta', () => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('Te llevo a Empleados.', '/employees')));
    component.draft = 'llévame a empleados';

    component.send();

    expect(navigateSpy).toHaveBeenCalledWith(['/employees']);
  });

  it('cambio de idioma: aplica el idioma devuelto y habla la respuesta en ese idioma', () => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('Claro, ahora hablo español.', null, 'es')));
    component.draft = 'habla en español';

    component.send();

    // La respuesta se pronuncia ya en es-ES (override aplicado antes de hablar).
    expect(voiceService.speak).toHaveBeenCalledWith(
      'Claro, ahora hablo español.', 'es-ES', jasmine.any(Function));
  });

  it('sin navigateTo: no navega', () => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('Tienes 9 empleados.')));
    component.draft = 'cuántos empleados';

    component.send();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('oferta de email: muestra la confirmación y al confirmar envía el informe', () => {
    const component = setup();
    const offer = { recipientType: 'self' as const, subject: 'Resumen' };
    coraService.chat.and.returnValue(of({ ...makeResponse('Aquí está el informe...'), emailOffer: offer }));
    coraService.sendReport.and.returnValue(of(void 0));
    component.draft = 'envíame el resumen por correo';

    component.send();
    expect(component.pendingEmail).toEqual(offer); // tarjeta de confirmación visible

    component.confirmSendReport();

    expect(coraService.sendReport).toHaveBeenCalledWith('ag-1', jasmine.objectContaining({
      recipientType: 'self', subject: 'Resumen', body: 'Aquí está el informe...'
    }));
    expect(component.pendingEmail).toBeNull(); // confirmada y limpiada
  });

  it('confirmación por voz: decir "sí" con una oferta pendiente envía el informe', () => {
    const component = setup();
    component.pendingEmail = { recipientType: 'self', subject: 'S' };
    (component as any).pendingReportBody = 'cuerpo del informe';
    coraService.sendReport.and.returnValue(of(void 0));
    // Simula que el reconocimiento entrega "sí" como resultado final.
    voiceService.startListening.and.callFake((_lang, cb) => cb.onResult('sí', true));

    component.toggleMic();

    expect(coraService.sendReport).toHaveBeenCalled();
    expect(coraService.chat).not.toHaveBeenCalled(); // no se mandó como pregunta
    expect(component.pendingEmail).toBeNull();
  });

  it('confirmación por voz: decir "no" cancela sin enviar', () => {
    const component = setup();
    component.pendingEmail = { recipientType: 'self' };
    voiceService.startListening.and.callFake((_lang, cb) => cb.onResult('no', true));

    component.toggleMic();

    expect(coraService.sendReport).not.toHaveBeenCalled();
    expect(coraService.chat).not.toHaveBeenCalled();
    expect(component.pendingEmail).toBeNull();
  });

  it('oferta a empleado: muestra "Nombre (email)" y envía con recipientType employee', () => {
    const component = setup();
    const offer = {
      recipientType: 'employee' as const, employeePublicId: 'emp-1',
      email: 'ana@care.com', recipientName: 'Ana Diaz', subject: 'Credenciales faltantes'
    };
    coraService.chat.and.returnValue(of({ ...makeResponse('Te faltan: CPR...'), emailOffer: offer }));
    coraService.sendReport.and.returnValue(of(void 0));
    component.draft = 'envíale a Ana lo que le falta';
    component.send();

    expect(component.recipientLabel()).toBe('Ana Diaz (ana@care.com)');

    component.confirmSendReport();

    expect(coraService.sendReport).toHaveBeenCalledWith('ag-1', jasmine.objectContaining({
      recipientType: 'employee', employeePublicId: 'emp-1', body: 'Te faltan: CPR...'
    }));
  });

  it('oferta de email: cancelar descarta sin enviar', () => {
    const component = setup();
    const offer = { recipientType: 'self' as const };
    coraService.chat.and.returnValue(of({ ...makeResponse('informe'), emailOffer: offer }));
    component.draft = 'mándamelo a mí';
    component.send();

    component.cancelSendReport();

    expect(component.pendingEmail).toBeNull();
    expect(coraService.sendReport).not.toHaveBeenCalled();
  });

  it('error del backend: muestra el mensaje y apaga loading', () => {
    const component = setup();
    coraService.chat.and.returnValue(throwError(() => ({ error: { message: 'Daily limit reached.' } })));
    component.draft = 'hola';

    component.send();

    expect(component.error).toBe('Daily limit reached.');
    expect(component.loading).toBeFalse();
  });

  it('voz activada: habla la respuesta tras recibirla', () => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('You have 9 active employees.')));
    component.draft = 'how many?';

    component.send();

    expect(voiceService.speak).toHaveBeenCalledWith(
      'You have 9 active employees.', 'en-US', jasmine.any(Function));
  });

  it('conversación por voz: reabre el micrófono tras responder', () => {
    const component = setup();
    component.open = true;
    coraService.chat.and.returnValue(of(makeResponse('ok')));
    let listenCalls = 0;
    voiceService.startListening.and.callFake((_lang, cb) => {
      listenCalls++;
      if (listenCalls === 1) {
        cb.onResult('cuántos empleados', true); // first cycle produces a final transcript
      }
    });
    // Simulate TTS finishing by invoking the onEnd callback immediately.
    voiceService.speak.and.callFake((_t, _l, onEnd) => onEnd && onEnd());

    component.toggleMic();

    // Initial listen + auto-restart after Cora finishes speaking = 2.
    expect(voiceService.startListening).toHaveBeenCalledTimes(2);
    expect(coraService.chat).toHaveBeenCalledTimes(1);
  });

  it('barge-in: hablar mientras Cora responde cancela su voz', () => {
    const component = setup();
    component.open = true;
    coraService.chat.and.returnValue(of(makeResponse('respuesta larga')));
    let call = 0;
    voiceService.startListening.and.callFake((_lang, cb) => {
      call++;
      if (call === 1) {
        cb.onResult('hola', true); // initial question → triggers send
      } else if (call === 2) {
        cb.onResult('nueva pregunta', false); // user interrupts mid-speech (interim)
      }
    });
    // speak does NOT fire onEnd → Cora is still "speaking" when the user barges in.
    voiceService.speak.and.callFake(() => undefined);

    component.toggleMic();

    // cancelSpeech called twice: once at the initial listen, once by the barge-in.
    expect(voiceService.cancelSpeech).toHaveBeenCalledTimes(2);
  });

  it('voz desactivada: no habla la respuesta', () => {
    const component = setup();
    component.voiceEnabled = false;
    coraService.chat.and.returnValue(of(makeResponse('reply')));
    component.draft = 'how many?';

    component.send();

    expect(voiceService.speak).not.toHaveBeenCalled();
  });

  it('toggleMic: inicia el reconocimiento en el idioma de la UI', () => {
    const component = setup();
    component.toggleMic();

    expect(component.listening).toBeTrue();
    expect(voiceService.startListening).toHaveBeenCalledWith('en-US', jasmine.any(Object));
  });

  it('reconocimiento final: coloca el texto y envía automáticamente', () => {
    const component = setup();
    coraService.chat.and.returnValue(of(makeResponse('ok')));
    voiceService.startListening.and.callFake((_lang, cb) => cb.onResult('cuántos empleados', true));

    component.toggleMic();

    expect(coraService.chat).toHaveBeenCalledWith('ag-1', 'cuántos empleados', 'en', []);
    expect(component.listening).toBeFalse();
  });

  it('sin soporte de reconocimiento: recognitionSupported es false', () => {
    const component = setup(false, true);
    expect(component.recognitionSupported).toBeFalse();
  });
});
