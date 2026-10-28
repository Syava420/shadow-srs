/**
 * Studio Text-to-Speech manager.
 * Priority 1: High-definition Microsoft Azure Neural voices via /api/tts.
 * Priority 2: Instant zero-latency Web Speech API fallback with precise male/female voice selection and acoustic pitch tuning.
 */

import { storage } from '@/lib/storage';

export interface TTSOptions {
  accent?: 'en-US' | 'en-GB';
  gender?: 'male' | 'female';
  rate?: number; // 0.7 - 1.3
}

const MALE_VOICE_KEYWORDS = ['david', 'mark', 'george', 'guy', 'male', 'ryan', 'james', 'richard', 'daniel', 'paul', 'oliver', 'stephen', 'thomas'];
const FEMALE_VOICE_KEYWORDS = ['zira', 'susan', 'hazel', 'female', 'jenny', 'sonia', 'catherine', 'linda', 'heather', 'alice', 'sarah', 'katherine'];

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

  /**
   * Selects an accent-matched voice respecting male or female gender.
   */
  private getLocalVoice(
    accent: 'en-US' | 'en-GB' = 'en-US',
    gender: 'male' | 'female' = 'female'
  ): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    const langPrefix = accent === 'en-GB' ? 'en-GB' : 'en-US';
    const matchingLang = this.voices.filter(v => v.lang.replace('_', '-').startsWith(langPrefix));
    const pool = matchingLang.length > 0 ? matchingLang : this.voices;
    if (pool.length === 0) return null;

    if (gender === 'male') {
      const maleVoice = pool.find(v => {
        const name = v.name.toLowerCase();
        return MALE_VOICE_KEYWORDS.some(kw => name.includes(kw));
      });
      if (maleVoice) return maleVoice;

      // If no explicit male keyword, pick voice that is not female
      const nonFemale = pool.find(v => !FEMALE_VOICE_KEYWORDS.some(kw => v.name.toLowerCase().includes(kw)));
      if (nonFemale) return nonFemale;
    } else {
      const femaleVoice = pool.find(v => {
        const name = v.name.toLowerCase();
        return FEMALE_VOICE_KEYWORDS.some(kw => name.includes(kw));
      });
      if (femaleVoice) return femaleVoice;
    }

    return pool[0];
  }

  /**
   * Speaks the provided text using Azure Neural when available,
   * with instantaneous fallback to gender-accurate local browser Web Speech.
   */
  public speak(text: string, options: TTSOptions = {}): void {
    if (typeof window === 'undefined') return;
    if (!text || !text.trim()) return;

    this.stop();

    const cleanText = text.trim();
    const settings = typeof window !== 'undefined' ? storage.getSettings() : null;
    const accent = options.accent || settings?.voiceAccent || 'en-US';
    const gender = options.gender || settings?.voiceGender || 'female';
    const rate = options.rate ?? settings?.speechRate ?? 1.0;

    // Use fast timeout fetch to avoid hanging on slow network or datacenter blocks
    const url = `/api/tts?text=${encodeURIComponent(cleanText)}&accent=${accent}&gender=${gender}&rate=${rate}`;
    
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = setTimeout(() => {
      if (controller) controller.abort();
    }, 1500);

    fetch(url, { signal: controller?.signal, cache: 'force-cache' })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (blob.type.includes('text') || blob.size < 100) {
          throw new Error('Invalid audio response');
        }
        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        this.currentAudio = audio;
        audio.onended = () => URL.revokeObjectURL(blobUrl);
        return audio.play();
      })
      .catch(() => {
        clearTimeout(timeoutId);
        this.speakFallback(cleanText, accent, gender, rate);
      });
  }

  /**
   * Instant local fallback with acoustic pitch tuning
   */
  private speakFallback(
    text: string, 
    accent: 'en-US' | 'en-GB', 
    gender: 'male' | 'female', 
    rate: number
  ): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getLocalVoice(accent, gender);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = accent;
    }

    utterance.rate = Math.max(0.6, Math.min(1.4, rate));
    // Acoustic baritone pitch for male (0.86), natural crisp tone for female (1.04)
    utterance.pitch = gender === 'male' ? 0.86 : 1.04;

    window.speechSynthesis.speak(utterance);
  }

  public preload(text: string, options: TTSOptions = {}): void {
    if (typeof window === 'undefined' || !text || !text.trim()) return;
    const settings = typeof window !== 'undefined' ? storage.getSettings() : null;
    const accent = options.accent || settings?.voiceAccent || 'en-US';
    const gender = options.gender || settings?.voiceGender || 'female';
    const rate = options.rate ?? settings?.speechRate ?? 1.0;
    const url = `/api/tts?text=${encodeURIComponent(text.trim())}&accent=${accent}&gender=${gender}&rate=${rate}`;
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
