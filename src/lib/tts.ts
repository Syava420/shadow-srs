/**
 * High quality Text-to-Speech manager using Web Speech API
 * Automatically detects and prefers modern Neural / Natural voices (Edge & Chrome)
 */

export interface TTSOptions {
  accent?: 'en-US' | 'en-GB';
  rate?: number; // 0.7 - 1.3
}

class TTSService {
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded = false;

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
    if (this.voices.length > 0) {
      this.isLoaded = true;
    }
  }

  public getBestVoice(accent: 'en-US' | 'en-GB' = 'en-US'): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    const langPrefix = accent === 'en-GB' ? 'en-GB' : 'en-US';
    const matching = this.voices.filter(v => v.lang.replace('_', '-').startsWith(langPrefix));

    if (matching.length === 0) {
      // Fallback to any english voice
      const anyEn = this.voices.filter(v => v.lang.startsWith('en'));
      return anyEn[0] || null;
    }

    // Priority 1: Natural / Neural voices (Microsoft Edge Natural, Google)
    const naturalVoice = matching.find(v => 
      v.name.includes('Natural') || 
      v.name.includes('Neural') || 
      v.name.includes('Online')
    );
    if (naturalVoice) return naturalVoice;

    // Priority 2: Google / Apple / Microsoft standard English
    const qualityVoice = matching.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Samantha') || 
      v.name.includes('Guy') || 
      v.name.includes('Jenny')
    );
    if (qualityVoice) return qualityVoice;

    return matching[0];
  }

  public speak(text: string, options: TTSOptions = {}): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text || !text.trim()) return;

    // Stop ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    const accent = options.accent || 'en-US';
    const bestVoice = this.getBestVoice(accent);

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = accent;
    }

    utterance.rate = Math.max(0.6, Math.min(1.4, options.rate ?? 1.0));
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const tts = new TTSService();
