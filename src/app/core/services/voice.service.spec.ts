import { TestBed } from '@angular/core/testing';
import { VoiceService } from './voice.service';

describe('VoiceService.toSpeakableText', () => {
  let service: VoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceService);
  });

  it('quita encabezados, viñetas y marcadores de énfasis', () => {
    const raw = '# Resumen\n\n- **Ana Díaz** vence pronto\n- *CPR* en 3 días';
    expect(service.toSpeakableText(raw)).toBe('Resumen\n\nAna Díaz vence pronto\nCPR en 3 días');
  });

  it('conserva la etiqueta de los enlaces y descarta la URL e imágenes', () => {
    const raw = 'Mira ![logo](x.png) el [reporte](http://a.b) aquí';
    expect(service.toSpeakableText(raw)).toBe('Mira el reporte aquí');
  });

  it('elimina emojis', () => {
    expect(service.toSpeakableText('Todo bien ✅ 🎉 listo')).toBe('Todo bien listo');
  });

  it('elimina símbolos como reloj de arena y relojes', () => {
    expect(service.toSpeakableText('Pendiente ⏳ y ⏰ y ⌛ fin')).toBe('Pendiente y y fin');
  });

  it('texto vacío devuelve cadena vacía', () => {
    expect(service.toSpeakableText('')).toBe('');
  });

  it('texto plano se conserva igual', () => {
    expect(service.toSpeakableText('Tienes 9 empleados activos.')).toBe('Tienes 9 empleados activos.');
  });
});

describe('VoiceService.isLikelyFemaleVoiceName', () => {
  let service: VoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceService);
  });

  it('reconoce voces femeninas conocidas (en/es) y el marcador "female"', () => {
    expect(service.isLikelyFemaleVoiceName('Microsoft Zira - English (United States)')).toBeTrue();
    expect(service.isLikelyFemaleVoiceName('Microsoft Elvira (Natural) - Spanish (Spain)')).toBeTrue();
    expect(service.isLikelyFemaleVoiceName('Google español')).toBeFalse(); // sin pista de nombre
    expect(service.isLikelyFemaleVoiceName('English Female')).toBeTrue();
  });

  it('no marca como femeninas las voces masculinas', () => {
    expect(service.isLikelyFemaleVoiceName('Microsoft Pablo - Spanish (Mexico)')).toBeFalse();
    expect(service.isLikelyFemaleVoiceName('Microsoft David - English (United States)')).toBeFalse();
  });
});
