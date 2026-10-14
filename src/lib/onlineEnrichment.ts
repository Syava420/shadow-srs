/**
 * Online Enrichment Engine
 * Automatically upgrades phonetics and literal word-by-word translations via public online APIs.
 * Results are cached permanently in localStorage so every word/phrase is fetched only once.
 */

import { WORD_GLOSS_DICTIONARY } from './wordGlossDictionary';
import { COMMON_DICTIONARY } from './transcriptionDictionary';

const CACHE_STORAGE_KEY = 'shadow_srs_online_enrichment_cache_v1';

// In-memory cache
const memoryCache = new Map<string, { transcription?: string; gloss?: string }>();

function loadCache(): Record<string, { transcription?: string; gloss?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(key: string, data: { transcription?: string; gloss?: string }) {
  if (typeof window === 'undefined') return;
  try {
    memoryCache.set(key, data);
    const existing = loadCache();
    existing[key] = { ...existing[key], ...data };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore quota or private mode issues
  }
}

/**
 * Converts standard International Phonetic Alphabet (IPA) to natural Russian letters.
 * Example: "/ˈfjuːtʃər/" -> "фью́чэ", "/ˈpaʊ.ər/" -> "па́уэ"
 */
export function ipaToRussian(ipa: string): string {
  if (!ipa) return '';
  let s = ipa.replace(/[\/\[\]]/g, '').toLowerCase();

  // Diphthongs, consonant clusters, and special vowels
  const clusters: [RegExp, string][] = [
    [/tʃ/g, 'ч'],
    [/dʒ/g, 'дж'],
    [/θ/g, 'с'],
    [/ð/g, 'з'],
    [/ʃ/g, 'ш'],
    [/ʒ/g, 'ж'],
    [/ŋ/g, 'нг'],
    [/aɪ/g, 'ай'],
    [/eɪ/g, 'эй'],
    [/ɔɪ/g, 'ой'],
    [/aʊ/g, 'ау'],
    [/oʊ|əʊ/g, 'оу'],
    [/juː|ju/g, 'ью'],
    [/uː/g, 'у'],
    [/iː/g, 'и'],
    [/ɪə/g, 'иэ'],
    [/eə/g, 'эа'],
    [/ʊə/g, 'уэ'],
    [/ɜːr|ɜː|ər|ə/g, 'э'],
    [/ɔː|ɒ|ɑː/g, 'о'],
    [/æ|ʌ/g, 'э'],
    [/ɪ/g, 'и'],
    [/ʊ/g, 'у'],
    [/j/g, 'й'],
    [/w/g, 'у'],
    [/r/g, 'р'],
    [/l/g, 'л'],
    [/m/g, 'м'],
    [/n/g, 'н'],
    [/p/g, 'п'],
    [/b/g, 'б'],
    [/t/g, 'т'],
    [/d/g, 'д'],
    [/k/g, 'к'],
    [/g/g, 'г'],
    [/f/g, 'ф'],
    [/v/g, 'в'],
    [/s/g, 'с'],
    [/z/g, 'з'],
    [/h/g, 'х'],
  ];

  for (const [pattern, replacement] of clusters) {
    s = s.replace(pattern, replacement);
  }

  // Remove IPA stress marks and syllable boundaries
  s = s.replace(/[ˈˌ\.]/g, '').trim();

  return s;
}

/**
 * Fetches accurate translation from free public translation endpoint.
 */
async function fetchOnlineTranslation(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return String(data[0][0][0]).trim().toLowerCase();
    }
  } catch {
    // Offline or network error
  }
  return null;
}

/**
 * Fetches IPA phonetics for a single word from Dictionary API.
 */
async function fetchOnlineIPA(word: string): Promise<string | null> {
  try {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return null;
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.phonetics) {
      for (const p of data[0].phonetics) {
        if (p.text && p.text.trim()) {
          return p.text.trim();
        }
      }
    }
  } catch {
    // Offline or word not found
  }
  return null;
}

/**
 * Enriches an English sentence online:
 * 1. Resolves unknown or low-confidence words into exact translations and phonetic pronunciations.
 * 2. Caches everything in localStorage.
 */
export async function enrichEnglishOnline(
  englishText: string
): Promise<{ transcription?: string; gloss?: string } | null> {
  if (!englishText || !englishText.trim()) return null;
  const key = englishText.trim().toLowerCase();

  // Check memory or localStorage cache first
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }
  const diskCache = loadCache();
  if (diskCache[key]) {
    memoryCache.set(key, diskCache[key]);
    return diskCache[key];
  }

  // If offline, abort quietly
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const tokens = englishText.match(/[a-zA-Z0-9']+/g) || [];
    if (tokens.length === 0) return null;

    // Check if any words need enhancement
    const needsWordGloss = tokens.some(
      (t) => !WORD_GLOSS_DICTIONARY[t.toLowerCase()]
    );
    const needsTranscription = tokens.some(
      (t) => !COMMON_DICTIONARY[t.toLowerCase()]
    );

    if (!needsWordGloss && !needsTranscription) {
      return null;
    }

    // Enhance words in parallel (up to 8 tokens to avoid overwhelming)
    const tokenSubset = tokens.slice(0, 10);
    const resolvedGlossPairs: { word: string; gloss: string }[] = [];
    const resolvedPronunciations: string[] = [];

    await Promise.all(
      tokenSubset.map(async (tok) => {
        const lower = tok.toLowerCase();

        // 1. Gloss
        if (WORD_GLOSS_DICTIONARY[lower]) {
          resolvedGlossPairs.push({ word: tok, gloss: WORD_GLOSS_DICTIONARY[lower] });
        } else {
          const onlineWordTranslation = await fetchOnlineTranslation(tok);
          resolvedGlossPairs.push({
            word: tok,
            gloss: onlineWordTranslation || '—',
          });
        }

        // 2. Transcription
        if (COMMON_DICTIONARY[lower]) {
          resolvedPronunciations.push(COMMON_DICTIONARY[lower]);
        } else {
          const ipa = await fetchOnlineIPA(tok);
          if (ipa) {
            const ru = ipaToRussian(ipa);
            resolvedPronunciations.push(ru || lower);
          } else {
            resolvedPronunciations.push(lower);
          }
        }
      })
    );

    const glossString = resolvedGlossPairs
      .map((p) => `${p.word} (${p.gloss})`)
      .join(' · ');

    const transcriptionString = resolvedPronunciations.length > 0
      ? `[${resolvedPronunciations.join(' ')}]`
      : undefined;

    const result = {
      gloss: glossString || undefined,
      transcription: transcriptionString || undefined,
    };

    saveCache(key, result);
    return result;
  } catch {
    return null;
  }
}
