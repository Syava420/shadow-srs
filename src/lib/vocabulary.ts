import { FlashCard } from '@/types';
import { calculateMasteryPercent } from './fsrs';

export interface CEFRLevelInfo {
  level: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  title: string;
  minWords: number;
  maxWords: number;
  description: string;
}

export const CEFR_LEVELS: CEFRLevelInfo[] = [
  { level: 'A0', title: 'Beginner', minWords: 0, maxWords: 300, description: 'Первые базовые слова и фразы' },
  { level: 'A1', title: 'Elementary', minWords: 300, maxWords: 1000, description: 'Простые бытовые диалоги и фразы' },
  { level: 'A2', title: 'Pre-Intermediate', minWords: 1000, maxWords: 2200, description: 'Свободное общение в поездках и базовые темы' },
  { level: 'B1', title: 'Intermediate', minWords: 2200, maxWords: 4500, description: 'Понимание фильмов, уверенная речь и работа' },
  { level: 'B2', title: 'Upper-Intermediate', minWords: 4500, maxWords: 7500, description: 'Беглая речь без запинок, любые сложные темы' },
  { level: 'C1', title: 'Advanced', minWords: 7500, maxWords: 12000, description: 'Уровень носителя языка и академический английский' },
];

/**
 * Normalizes an English sentence into clean words
 */
export function extractUniqueWords(text: string): string[] {
  if (!text) return [];
  const matches = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^'+|'+$/g, ''))
    .filter(w => w.length > 1);

  return Array.from(new Set(matches));
}

export interface VocabularyAnalysis {
  totalUniqueWords: number;
  masteredWordsCount: number;
  learningWordsCount: number;
  currentLevel: CEFRLevelInfo;
  nextLevel: CEFRLevelInfo | null;
  progressPercent: number; // 0 - 100 to next level
  wordsToNextLevel: number;
  recentWords: string[];
}

/**
 * Analyzes cards, extracts individual words, and calculates CEFR vocabulary level
 */
export function analyzeVocabulary(cards: FlashCard[]): VocabularyAnalysis {
  const wordMasteryMap = new Map<string, number>();

  cards.forEach(card => {
    const cardMastery = calculateMasteryPercent(card);
    const words = extractUniqueWords(card.back);

    words.forEach(word => {
      const prev = wordMasteryMap.get(word) || 0;
      // Take the highest mastery score across all sentences containing this word
      if (cardMastery > prev) {
        wordMasteryMap.set(word, cardMastery);
      }
    });
  });

  const totalUniqueWords = wordMasteryMap.size;
  let masteredWordsCount = 0;
  let learningWordsCount = 0;
  const recentWords: string[] = [];

  wordMasteryMap.forEach((mastery, word) => {
    if (mastery >= 75) {
      masteredWordsCount++;
      if (recentWords.length < 15) recentWords.push(word);
    } else if (mastery > 0) {
      learningWordsCount++;
    }
  });

  // Determine CEFR level based on mastered unique words
  let currentLevel = CEFR_LEVELS[0];
  let nextLevel: CEFRLevelInfo | null = CEFR_LEVELS[1];

  for (let i = 0; i < CEFR_LEVELS.length; i++) {
    const lvl = CEFR_LEVELS[i];
    if (masteredWordsCount >= lvl.minWords) {
      currentLevel = lvl;
      nextLevel = CEFR_LEVELS[i + 1] || null;
    }
  }

  // Calculate progress percent to next level
  let progressPercent = 100;
  let wordsToNextLevel = 0;

  if (nextLevel) {
    const range = nextLevel.minWords - currentLevel.minWords;
    const currentInRange = masteredWordsCount - currentLevel.minWords;
    progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
    wordsToNextLevel = Math.max(0, nextLevel.minWords - masteredWordsCount);
  }

  return {
    totalUniqueWords,
    masteredWordsCount,
    learningWordsCount,
    currentLevel,
    nextLevel,
    progressPercent,
    wordsToNextLevel,
    recentWords,
  };
}
