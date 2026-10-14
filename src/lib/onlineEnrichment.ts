/**
 * Online Gloss Enrichment Service
 * Provides fast background word translation for rare words not in local dictionary.
 * Uses a strict 1.5-second timeout and permanent localStorage caching.
 */

import { WORD_GLOSS_DICTIONARY } from './wordGlossDictionary';

const CACHE_STORAGE_KEY = 'shadow_srs_gloss_enrichment_cache_v2';

// In-memory cache for instant session lookups
const memoryCache = new Map<string, string>();

function loadCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(word: string, translation: string) {
  if (typeof window === 'undefined') return;
  try {
    memoryCache.set(word, translation);
    const existing = loadCache();
    existing[word] = translation;
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fetches accurate translation from free public Google Translate endpoint with a strict 1.5s timeout.
 */
async function fetchWordTranslation(word: string): Promise<string | null> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return null;

  if (memoryCache.has(cleanWord)) {
    return memoryCache.get(cleanWord)!;
  }

  const diskCache = loadCache();
  if (diskCache[cleanWord]) {
    memoryCache.set(cleanWord, diskCache[cleanWord]);
    return diskCache[cleanWord];
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(cleanWord)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const translated = String(data[0][0][0]).trim().toLowerCase();
      saveCache(cleanWord, translated);
      return translated;
    }
  } catch {
    // Timeout or network drop - fail silently without blocking
  }

  return null;
}

/**
 * Enriches missing words in a sentence gloss in the background.
 * Returns updated formatted gloss string or null if nothing changed.
 */
export async function enrichGlossOnline(englishText: string): Promise<string | null> {
  if (!englishText || !englishText.trim()) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const tokens = englishText.match(/[a-zA-Z0-9']+/g) || [];
  if (tokens.length === 0) return null;

  // Filter only words not found in local dictionary
  const unknownTokens = tokens.filter((t) => {
    const lower = t.toLowerCase();
    return !WORD_GLOSS_DICTIONARY[lower];
  });

  if (unknownTokens.length === 0) {
    return null;
  }

  // Fetch only up to 4 unknown words in parallel to keep it blazing fast
  const targetWords = unknownTokens.slice(0, 4);
  let hasNewTranslations = false;

  await Promise.all(
    targetWords.map(async (tok) => {
      const res = await fetchWordTranslation(tok);
      if (res) hasNewTranslations = true;
    })
  );

  if (!hasNewTranslations) return null;

  // Build enhanced gloss
  const enhancedGloss = tokens.map((tok) => {
    const lower = tok.toLowerCase();
    const meaning = WORD_GLOSS_DICTIONARY[lower] || memoryCache.get(lower) || loadCache()[lower] || '—';
    return `${tok} (${meaning})`;
  }).join(' · ');

  return enhancedGloss;
}
