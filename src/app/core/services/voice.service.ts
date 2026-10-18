import { Injectable, NgZone, inject } from '@angular/core';

export interface VoiceRecognitionCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

/**
 * Thin wrapper around the browser's Web Speech API (SpeechRecognition +
 * SpeechSynthesis). No backend / no API cost. Recognition is Chrome/Edge only
 * (webkit-prefixed); callers must check {@link isRecognitionSupported} and hide
 * the mic gracefully elsewhere. The SpeechRecognition types are not in the
 * standard TS DOM lib, so we access them through `window as any`.
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private zone = inject(NgZone);
  private recognition: any = null;

  private get recognitionCtor(): any {
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  isRecognitionSupported(): boolean {
    return !!this.recognitionCtor;
  }

  isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Start a single-utterance recognition session in the given BCP-47 language.
   * Callbacks are marshalled back into the Angular zone (Web Speech events fire
   * outside it, so change detection would not run otherwise).
   */
  startListening(lang: string, cb: VoiceRecognitionCallbacks): void {
    const Ctor = this.recognitionCtor;
    if (!Ctor) {
      cb.onError('unsupported');
      return;
    }
    this.stopListening();
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let transcript = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }
      this.zone.run(() => cb.onResult(transcript, isFinal));
    };
    rec.onerror = (event: any) => this.zone.run(() => cb.onError(event?.error || 'error'));
    rec.onend = () => this.zone.run(() => cb.onEnd());

    this.recognition = rec;
    rec.start();
  }

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
      this.recognition = null;
    }
  }

  /**
   * Speak text aloud in the given BCP-47 language, cancelling anything in
   * flight. Markdown and emoji are stripped first so the engine doesn't read
   * out "asterisk", "hash", bullets, etc. `onEnd` fires (inside the Angular
   * zone) when speech finishes — used to chain continuous voice conversation.
   */
  speak(text: string, lang: string, onEnd?: () => void): void {
    const speakable = this.toSpeakableText(text);
    if (!this.isSynthesisSupported() || !speakable) {
      if (onEnd) {
        onEnd();
      }
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(speakable);
    utterance.lang = lang;
    const voice = this.pickBestVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }
    // Slightly warmer, natural cadence.
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    if (onEnd) {
      utterance.onend = () => this.zone.run(() => onEnd());
      // Some engines fire onerror instead of onend if interrupted; chain anyway.
      utterance.onerror = () => this.zone.run(() => onEnd());
    }
    synth.speak(utterance);
  }

  /**
   * Convert Cora's reply (which may contain Markdown and emoji) into plain text
   * suitable for text-to-speech. Removes headers, emphasis markers, list
   * bullets, code ticks, link/image syntax and emoji; keeps the words.
   */
  toSpeakableText(raw: string): string {
    if (!raw) {
      return '';
    }
    return raw
      // Images: drop entirely (alt text is usually decorative here).
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Links: keep the visible label, drop the URL.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Headers (leading #), blockquotes (leading >).
      .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
      .replace(/^[ \t]*>[ \t]?/gm, '')
      // List bullets at line start (-, *, •).
      .replace(/^[ \t]*[-*•][ \t]+/gm, '')
      // Emphasis / code / strikethrough markers.
      .replace(/(\*\*|\*|__|_|`|~~)/g, '')
      // Emoji & pictographs (incl. ⏳ hourglass, clocks, ✅, arrows, dingbats):
      // Extended_Pictographic covers the lot; also drop variation selectors,
      // ZWJ and keycap combiners, plus a few symbol blocks not flagged pictographic.
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}]/gu, '')
      // Collapse leftover whitespace.
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  cancelSpeech(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  private speechUnlocked = false;

  /**
   * iOS/Safari blocks speechSynthesis until it's first invoked from within a
   * user gesture (tap). Call this from a tap handler (opening Cora, mic, etc.)
   * to "unlock" audio so later async replies can be spoken. No-op after the
   * first successful unlock, and on platforms that don't need it.
   */
  unlockSpeech(): void {
    if (!this.isSynthesisSupported() || this.speechUnlocked) {
      return;
    }
    try {
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      window.speechSynthesis.speak(warmup);
      this.speechUnlocked = true;
    } catch {
      /* ignore — best effort */
    }
  }

  // Known female voice names across Windows/Chrome/Edge/macOS/Android for en & es.
  // Used only as a preference heuristic — the Web Speech API exposes no reliable
  // gender field, so we match by name (plus an explicit "female" marker).
  private static readonly FEMALE_VOICE_HINTS = [
    // English
    'zira', 'aria', 'jenny', 'michelle', 'jane', 'sara', 'nancy', 'amber', 'ashley',
    'samantha', 'victoria', 'susan', 'hazel', 'catherine', 'linda', 'heera', 'eva',
    'emma', 'libby', 'sonia', 'maisie', 'natasha', 'clara', 'joanna', 'kendra',
    'kimberly', 'salli', 'ivy', 'allison', 'kate',
    // Spanish
    'elvira', 'sabina', 'helena', 'laura', 'monica', 'mónica', 'paulina', 'dalia',
    'renata', 'paloma', 'abril', 'camila', 'sofia', 'sofía', 'lucia', 'lucía',
    'ximena', 'tania', 'marisol', 'esperanza', 'isabela', 'salome', 'penélope', 'penelope'
  ];

  /**
   * Pick the best installed voice for a language, preferring a FEMALE voice,
   * then the most natural-sounding one ("Natural"/Google/online beat the default
   * robotic voices). Voices load asynchronously, so this reads the live list at
   * speak time. Falls back to any in-language voice if no female one is found.
   */
  private pickBestVoice(lang: string): SpeechSynthesisVoice | undefined {
    const prefix = lang.toLowerCase().slice(0, 2);
    const inLang = window.speechSynthesis.getVoices()
      .filter(v => (v.lang || '').toLowerCase().startsWith(prefix));
    if (!inLang.length) {
      return undefined;
    }
    const score = (v: SpeechSynthesisVoice): number => {
      const name = (v.name || '').toLowerCase();
      let s = 0;
      // Gender preference dominates so a female voice always wins when present.
      if (this.isLikelyFemaleVoiceName(name)) s += 20;
      else if (/\bmale\b/.test(name)) s -= 20;
      // Quality tiebreakers.
      if (name.includes('natural')) s += 6;
      if (name.includes('google')) s += 4;
      if (name.includes('premium') || name.includes('enhanced')) s += 3;
      if (name.includes('microsoft')) s += 2;
      if (!v.localService) s += 3; // online voices are usually higher quality
      return s;
    };
    return inLang.sort((a, b) => score(b) - score(a))[0];
  }

  /** Heuristic: does this voice name look female? */
  isLikelyFemaleVoiceName(name: string): boolean {
    const n = (name || '').toLowerCase();
    if (n.includes('female')) {
      return true;
    }
    return VoiceService.FEMALE_VOICE_HINTS.some(h => n.includes(h));
  }
}
