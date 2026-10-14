/**
 * Literal English-to-Russian Word Gloss Engine
 * Provides word-by-word interlinear translations for A0 learners.
 */

import { WORD_GLOSS_DICTIONARY } from './wordGlossDictionary';

export interface GlossItem {
  word: string;
  gloss: string;
}

/**
 * Parses an English sentence into individual words with their literal Russian translations.
 */
export function getWordGloss(text: string): GlossItem[] {
  if (!text || !text.trim()) return [];

  // Remove existing bracketed notes if any
  const cleaned = text.replace(/\[.*?\]/g, '').trim();
  if (!cleaned) return [];

  // Match words with possible apostrophes (e.g. "don't", "I've", "apple")
  const tokens = cleaned.match(/[a-zA-Z0-9']+/g);
  if (!tokens) return [];

  return tokens.map((token) => {
    const lower = token.toLowerCase();

    // 1. Direct dictionary match
    if (WORD_GLOSS_DICTIONARY[lower]) {
      return { word: token, gloss: WORD_GLOSS_DICTIONARY[lower] };
    }

    // 2. Trailing 's (possessive: "John's" -> "Джона")
    if (lower.endsWith("'s") && lower.length > 2) {
      const base = lower.slice(0, -2);
      if (WORD_GLOSS_DICTIONARY[base]) {
        return { word: token, gloss: `${WORD_GLOSS_DICTIONARY[base]} (чей-то)` };
      }
    }

    // 3. Simple plural -s / -es (e.g. "books" -> "книга (мн.ч.)")
    if (lower.endsWith('es') && lower.length > 3) {
      const base = lower.slice(0, -2);
      if (WORD_GLOSS_DICTIONARY[base]) {
        return { word: token, gloss: `${WORD_GLOSS_DICTIONARY[base]} (мн.ч.)` };
      }
    } else if (lower.endsWith('s') && lower.length > 2 && !lower.endsWith('ss')) {
      const base = lower.slice(0, -1);
      if (WORD_GLOSS_DICTIONARY[base]) {
        return { word: token, gloss: `${WORD_GLOSS_DICTIONARY[base]} (мн.ч.)` };
      }
    }

    // 4. Past tense -ed (e.g. "walked" -> "идти (прош.)")
    if (lower.endsWith('ed') && lower.length > 3) {
      const baseWithoutD = lower.slice(0, -1);
      const baseWithoutEd = lower.slice(0, -2);
      const base = WORD_GLOSS_DICTIONARY[baseWithoutD]
        ? baseWithoutD
        : WORD_GLOSS_DICTIONARY[baseWithoutEd]
        ? baseWithoutEd
        : null;
      if (base) {
        return { word: token, gloss: `${WORD_GLOSS_DICTIONARY[base]} (прош.)` };
      }
    }

    // 5. Participle -ing (e.g. "waiting" -> "ждать (сейчас)")
    if (lower.endsWith('ing') && lower.length > 4) {
      const baseWithoutIng = lower.slice(0, -3);
      const baseWithE = baseWithoutIng + 'e';
      const base = WORD_GLOSS_DICTIONARY[baseWithoutIng]
        ? baseWithoutIng
        : WORD_GLOSS_DICTIONARY[baseWithE]
        ? baseWithE
        : null;
      if (base) {
        return { word: token, gloss: `${WORD_GLOSS_DICTIONARY[base]} (сейчас)` };
      }
    }

    // 6. Fallback if not in dictionary
    return { word: token, gloss: '—' };
  });
}

/**
 * Formats gloss array into a single compact readable string:
 * "Don't (не) · take (брать) · it (это) · to (к) · heart (сердце)"
 */
export function formatWordGlossString(text: string): string {
  const items = getWordGloss(text);
  if (items.length === 0) return '';
  return items.map((item) => `${item.word} (${item.gloss})`).join(' · ');
}
