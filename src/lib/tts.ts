/**
 * Studio Neural Text-to-Speech manager using Microsoft Azure Neural voices (Edge-TTS).
 * Delivers lifelike human pronunciation with natural breathing and intonation across all browsers.
 * Automatically falls back to Web Speech API if offline.
 */

export interface TTSOptions {
  accent?: 'en-US' | 'en-GB';
  rate?: number; // 0.7 - 1.3
}

class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  private getLocalVoice(accent: 'en-US' | 'en-GB' = 'en-US'): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    const langPrefix = accent === 'en-GB' ? 'en-GB' : 'en-US';
    const matching = this.voices.filter(v => v.lang.replace('_', '-').startsWith(langPrefix));
    return matching[0] || this.voices[0] || null;
  }

  /**
   * Speaks the provided text using Microsoft Azure Neural voices.
   * Seamlessly falls back to local browser Web Speech API if offline.
   */
  public speak(text: string, options: TTSOptions = {}): void {
    if (typeof window === 'undefined') return;
    if (!text || !text.trim()) return;

    this.stop();

    const cleanText = text.trim();
    const accent = options.accent || 'en-US';
    const rate = options.rate ?? 1.0;

    // Use our high-quality Microsoft Azure Neural endpoint
    const url = `/api/tts?text=${encodeURIComponent(cleanText)}&accent=${accent}&rate=${rate}`;
    const audio = new Audio(url);
    this.currentAudio = audio;

    audio.play().catch((err) => {
      // If network request failed or blocked, fallback gracefully to browser SpeechSynthesis
      console.warn('Azure Neural TTS network play failed, falling back to Web Speech API:', err);
      this.speakFallback(cleanText, accent, rate);
    });
  }

  /**
   * Offline fallback using Web Speech API
   */
  private speakFallback(text: string, accent: 'en-US' | 'en-GB', rate: number): void {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getLocalVoice(accent);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = accent;
    }
    utterance.rate = Math.max(0.6, Math.min(1.4, rate));
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Preloads audio for upcoming cards so it plays with 0ms latency
   */
  public preload(text: string, options: TTSOptions = {}): void {
    if (typeof window === 'undefined' || !text || !text.trim()) return;
    const accent = options.accent || 'en-US';
    const rate = options.rate ?? 1.0;
    const url = `/api/tts?text=${encodeURIComponent(text.trim())}&accent=${accent}&rate=${rate}`;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const tts = new TTSService();
