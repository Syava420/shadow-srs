import { Folder, Deck, FlashCard, AppSettings, AppStats, BackupData } from '@/types';
import { INITIAL_FOLDERS, INITIAL_DECKS, INITIAL_CARDS } from './sample-data';
import { generateThematicSvg } from './image-service';

const STORAGE_KEYS = {
  FOLDERS: 'shadow_srs_folders',
  DECKS: 'shadow_srs_decks',
  CARDS: 'shadow_srs_cards',
  SETTINGS: 'shadow_srs_settings',
  STATS: 'shadow_srs_stats',
  UPDATED_AT: 'shadow_srs_updated_at',
};

export const DEFAULT_SETTINGS: AppSettings = {
  voiceAccent: 'en-US',
  speechRate: 1.0,
  autoPlayAudio: true,
  showImages: true,
  showTranscription: true,
  dailyGoal: 20,
  sessionLimit: 20,
  sessionDurationMinutes: 0,
};

export const DEFAULT_STATS: AppStats = {
  streakDays: 1,
  totalActiveSeconds: 0,
  dailyHistory: {},
};

function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const storage = {
  getLastUpdatedAt(): number {
    return safeGetItem<number>(STORAGE_KEYS.UPDATED_AT, 0);
  },

  setLastUpdatedAt(timestamp: number): void {
    safeSetItem(STORAGE_KEYS.UPDATED_AT, timestamp);
  },

  touch(): number {
    const now = Date.now();
    this.setLastUpdatedAt(now);
    return now;
  },

  getFolders(): Folder[] {
    const folders = safeGetItem<Folder[]>(STORAGE_KEYS.FOLDERS, []);
    if (folders.length === 0 && safeGetItem(STORAGE_KEYS.CARDS, []).length === 0) {
      this.saveFolders(INITIAL_FOLDERS);
      return INITIAL_FOLDERS;
    }
    return folders;
  },

  saveFolders(folders: Folder[], skipTouch = false): void {
    safeSetItem(STORAGE_KEYS.FOLDERS, folders);
    if (!skipTouch) this.touch();
  },

  getDecks(): Deck[] {
    const decks = safeGetItem<Deck[]>(STORAGE_KEYS.DECKS, []);
    if (decks.length === 0 && safeGetItem(STORAGE_KEYS.CARDS, []).length === 0) {
      this.saveDecks(INITIAL_DECKS);
      return INITIAL_DECKS;
    }
    return decks;
  },

  saveDecks(decks: Deck[], skipTouch = false): void {
    safeSetItem(STORAGE_KEYS.DECKS, decks);
    if (!skipTouch) this.touch();
  },

  getCards(): FlashCard[] {
    let cards = safeGetItem<FlashCard[]>(STORAGE_KEYS.CARDS, []);
    if (cards.length === 0) {
      this.saveCards(INITIAL_CARDS);
      return INITIAL_CARDS;
    }

    // Auto-migrate any broken unsplash or picsum links to zero-dependency SVG thematic art
    let changed = false;
    cards = cards.map(c => {
      if (c.imageUrl && (c.imageUrl.includes('unsplash.com') || c.imageUrl.includes('picsum.photos'))) {
        changed = true;
        return {
          ...c,
          imageUrl: generateThematicSvg(c.back),
        };
      }
      return c;
    });

    if (changed) {
      this.saveCards(cards);
    }

    return cards;
  },

  saveCards(cards: FlashCard[], skipTouch = false): void {
    safeSetItem(STORAGE_KEYS.CARDS, cards);
    if (!skipTouch) this.touch();
  },

  importDeckAndCards(deck: Deck, newCards: FlashCard[]): void {
    const existingDecks = this.getDecks();
    const existingCards = this.getCards();

    const deckIndex = existingDecks.findIndex(d => d.id === deck.id);
    let updatedDecks: Deck[];
    if (deckIndex >= 0) {
      updatedDecks = [...existingDecks];
      updatedDecks[deckIndex] = deck;
    } else {
      updatedDecks = [...existingDecks, deck];
    }

    const existingIds = new Set(existingCards.map(c => c.id));
    const toAdd = newCards.filter(c => !existingIds.has(c.id));
    const updatedCards = [...existingCards, ...toAdd];

    this.saveDecks(updatedDecks);
    this.saveCards(updatedCards);
    this.touch();
  },

  getSettings(): AppSettings {
    return safeGetItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  saveSettings(settings: AppSettings, skipTouch = false): void {
    safeSetItem(STORAGE_KEYS.SETTINGS, settings);
    if (!skipTouch) this.touch();
  },

  getStats(): AppStats {
    return safeGetItem<AppStats>(STORAGE_KEYS.STATS, DEFAULT_STATS);
  },

  saveStats(stats: AppStats, skipTouch = false): void {
    safeSetItem(STORAGE_KEYS.STATS, stats);
    if (!skipTouch) this.touch();
  },

  /**
   * Records a completed card review, tracks streak and capped active study time
   */
  recordReviewActivity(seconds: number, isRemembered?: boolean): void {
    const stats = this.getStats();
    const today = getTodayString();
    const clampedSecs = Math.min(45, Math.max(1, Math.round(seconds)));

    const todayEntry = stats.dailyHistory[today] || { cardsReviewed: 0, activeSeconds: 0, rememberedCount: 0 };
    todayEntry.cardsReviewed = (todayEntry.cardsReviewed || 0) + 1;
    todayEntry.activeSeconds = (todayEntry.activeSeconds || 0) + clampedSecs;
    if (isRemembered) {
      todayEntry.rememberedCount = (todayEntry.rememberedCount || 0) + 1;
    }

    // Calculate streak
    let streak = stats.streakDays || 1;
    if (stats.lastStudiedDate) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (stats.lastStudiedDate === yesterday) {
        streak += 1;
      } else if (stats.lastStudiedDate !== today) {
        streak = 1;
      }
    }

    const updatedStats: AppStats = {
      ...stats,
      streakDays: streak,
      lastStudiedDate: today,
      totalActiveSeconds: (stats.totalActiveSeconds || 0) + clampedSecs,
      dailyHistory: {
        ...stats.dailyHistory,
        [today]: todayEntry,
      },
    };

    this.saveStats(updatedStats);
  },

  exportBackup(): void {
    const backup: BackupData = {
      version: 2,
      exportedAt: Date.now(),
      folders: this.getFolders(),
      decks: this.getDecks(),
      cards: this.getCards(),
      settings: this.getSettings(),
      stats: this.getStats(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadow-srs-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importBackup(jsonString: string): boolean {
    try {
      const data: BackupData = JSON.parse(jsonString);
      if (!Array.isArray(data.decks) || !Array.isArray(data.cards)) {
        throw new Error('Invalid backup format');
      }
      this.saveFolders(data.folders || []);
      this.saveDecks(data.decks || []);
      this.saveCards(data.cards || []);
      if (data.settings) this.saveSettings(data.settings);
      if (data.stats) this.saveStats(data.stats);
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  },

  resetAll(): void {
    this.saveFolders(INITIAL_FOLDERS);
    this.saveDecks(INITIAL_DECKS);
    this.saveCards(INITIAL_CARDS);
    this.saveSettings(DEFAULT_SETTINGS);
    this.saveStats(DEFAULT_STATS);
  },
};
