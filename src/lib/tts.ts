/**
 * Studio Text-to-Speech manager.
 * Priority 1: Real studio native human recordings for vocabulary words via Dictionary Audio API.
 * Priority 2: System neural/SAPI voices (Edge Online Natural voices: Guy & Ryan; Windows SAPI: David & Mark).
 * Priority 3: Fallback with acoustic pitch modulation.
 */

import { storage } from '@/lib/storage';

export interface TTSOptions {
  accent?: 'en-US' | 'en-GB';
  gender?: 'male' | 'female';
  rate?: number; // 0.7 - 1.3
}

const MALE_VOICE_KEYWORDS = [
  'guy online', 'ryan online', 'guy', 'ryan', 'david', 'mark', 'george',
  'male', 'natural male', 'christopher', 'james', 'richard', 'daniel'
];

const FEMALE_VOICE_KEYWORDS = [
  'jenny online', 'sonia online', 'jenny', 'sonia', 'zira', 'susan', 'hazel',
  'female', 'natural female', 'aria', 'catherine', 'linda', 'heather'
];

class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private wordAudioCache = new Map<string, string>();

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
  public getLocalVoice(
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
      // Prioritize online natural male voices (e.g. Edge Natural Guy/Ryan), then desktop David/Mark/George
      for (const kw of MALE_VOICE_KEYWORDS) {
        const found = pool.find(v => v.name.toLowerCase().includes(kw));
        if (found) return found;
      }
      // If no explicit male voice exists on this machine, pick voice not matching known female names
      const nonFemale = pool.find(v => !FEMALE_VOICE_KEYWORDS.some(kw => v.name.toLowerCase().includes(kw)));
      if (nonFemale) return nonFemale;
    } else {
      for (const kw of FEMALE_VOICE_KEYWORDS) {
        const found = pool.find(v => v.name.toLowerCase().includes(kw));
        if (found) return found;
      }
    }

    return pool[0];
  }

  /**
   * Attempts to play authentic studio recording of a vocabulary word
   */
  private async tryPlayDictionaryWord(word: string): Promise<boolean> {
    const cleanWord = word.trim().toLowerCase();
    if (!/^[a-z]+$/i.test(cleanWord)) return false;

    try {
      let audioUrl = this.wordAudioCache.get(cleanWord);
      if (!audioUrl) {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
        if (!res.ok) return false;
        const data = await res.json();
        const phonetics = Array.isArray(data) ? data[0]?.phonetics : null;
        if (Array.isArray(phonetics)) {
          const match = phonetics.find((p: any) => p.audio && p.audio.length > 0);
          if (match?.audio) {
            audioUrl = match.audio;
            this.wordAudioCache.set(cleanWord, audioUrl!);
          }
        }
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        await audio.play();
        return true;
      }
    } catch {
      // Fallback seamlessly to Web Speech
    }
    return false;
  }

  /**
   * Speaks the provided text using the highest quality available audio.
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

    // For single vocabulary words (like flashcard backs), try real studio recording first
    if (/^[a-zA-Z]+$/.test(cleanText)) {
      this.tryPlayDictionaryWord(cleanText).then((played) => {
        if (!played) {
          this.speakLocal(cleanText, accent, gender, rate);
        }
      });
      return;
    }

    this.speakLocal(cleanText, accent, gender, rate);
  }

  /**
   * Speaks with local browser synthesizer
   */
  private speakLocal(
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
    const cleanWord = text.trim().toLowerCase();
    if (/^[a-z]+$/i.test(cleanWord) && !this.wordAudioCache.has(cleanWord)) {
      this.tryPlayDictionaryWord(cleanWord).catch(() => {});
    }
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
