import { Card as FSRSCard } from 'ts-fsrs';

export type DirectionMode = 'adaptive' | 'random' | 'ru_en' | 'en_ru';

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Deck {
  id: string;
  folderId?: string; // Optional: can be in root or inside a folder
  name: string;
  description?: string;
  createdAt: number;
}

export interface FlashCard {
  id: string;
  deckId: string;
  front: string; // Russian (Question)
  back: string;  // English (Answer & Pronunciation)
  transcription?: string; // Russian pronunciation hint: e.g. [до́тэ]
  gloss?: string; // Literal word-by-word translation: e.g. Don't (не) · take (брать)
  imageUrl?: string;
  audioUrl?: string;
  fsrsCard: FSRSCard; // FSRS state: due, stability, difficulty, reps, lapses, state
  createdAt: number;
  lastStudiedAt?: number;
  timeSpentSeconds?: number; // Total active study time spent on this card
}

export interface AppSettings {
  voiceAccent: 'en-US' | 'en-GB';
  speechRate: number; // 0.7 to 1.3, default 1.0
  autoPlayAudio: boolean; // Auto play when flipped to English
  showImages: boolean;
  showTranscription: boolean; // Show Russian pronunciation guide under English text
  dailyGoal: number; // default 20
  sessionLimit: number; // default 20 (0 = unlimited)
  sessionDurationMinutes?: number; // 0 = by card count, 5 = 5 min, 10 = 10 min, etc.
}

export interface ImportPreviewItem {
  id: string;
  front: string;
  back: string;
  transcription?: string;
  gloss?: string;
  selected: boolean;
  isDuplicate?: boolean;
}

export interface DailyActivity {
  cardsReviewed: number; // Total review attempts (flips / button clicks)
  uniqueCardIds?: string[]; // IDs of distinct cards studied on this day
  activeSeconds: number;
  rememberedCount?: number;
  firstTryRememberedIds?: string[]; // IDs of cards remembered on first appearance today
}

export interface AppStats {
  streakDays: number;
  lastStudiedDate?: string;
  totalActiveSeconds: number;
  dailyHistory: Record<string, DailyActivity>; // Key: "YYYY-MM-DD"
}

export interface BackupData {
  version: number;
  exportedAt: number;
  folders: Folder[];
  decks: Deck[];
  cards: FlashCard[];
  settings: AppSettings;
  stats?: AppStats;
}
