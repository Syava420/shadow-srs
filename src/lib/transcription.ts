/**
 * English to Russian Phonetic Transcription Engine
 * Generates natural Cyrillic phonetic pronunciation for A0 English learners.
 */

import { COMMON_DICTIONARY } from './transcriptionDictionary';

/**
 * Phonetic transliterator fallback for words not in the dictionary.
 */
function transliterateWord(word: string): string {
  let w = word.toLowerCase();

  // Special cluster replacements
  const clusters: [RegExp, string][] = [
    [/tion\b/g, 'шэн'],
    [/sion\b/g, 'жэн'],
    [/ture\b/g, 'чэ'],
    [/igh/g, 'ай'],
    [/eigh/g, 'эй'],
    [/ough/g, 'о'],
    [/augh/g, 'о'],
    [/kn/g, 'н'],
    [/wr/g, 'р'],
    [/wh/g, 'у'],
    [/th/g, 'з'],
    [/sh/g, 'ш'],
    [/ch/g, 'ч'],
    [/ph/g, 'ф'],
    [/ck/g, 'к'],
    [/qu/g, 'ку'],
    [/ee/g, 'и'],
    [/ea/g, 'и'],
    [/oo/g, 'у'],
    [/ai/g, 'эй'],
    [/ay/g, 'эй'],
    [/ey/g, 'эй'],
    [/oi/g, 'ой'],
    [/oy/g, 'ой'],
    [/ou/g, 'ау'],
    [/ow/g, 'оу'],
    [/au/g, 'о'],
    [/aw/g, 'о'],
    [/all\b/g, 'ол'],
    [/ng\b/g, 'нг'],
  ];

  for (const [pattern, replacement] of clusters) {
    w = w.replace(pattern, replacement);
  }

  // Letter by letter mapping
  const charMap: Record<string, string> = {
    a: 'э',
    b: 'б',
    c: 'к',
    d: 'д',
    e: 'е',
    f: 'ф',
    g: 'г',
    h: 'х',
    i: 'и',
    j: 'дж',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    q: 'к',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'а',
    v: 'в',
    w: 'у',
    x: 'кс',
    y: 'й',
    z: 'з',
  };

  let result = '';
  for (let i = 0; i < w.length; i++) {
    const char = w[i];
    result += charMap[char] || char;
  }

  // Remove silent 'e' at end of Russian representation if word ends with vowel + consonant + e
  if (result.endsWith('е') && result.length > 3) {
    result = result.slice(0, -1);
  }

  return result;
}

/**
 * Converts any English sentence or phrase into natural Russian phonetic transcription.
 * Example: "I would like a cup of coffee" -> "[ай вуд лайк э кап оф ко́фи]"
 */
export function getRussianTranscription(text: string): string {
  if (!text || !text.trim()) return '';

  // Clean brackets if text already has some
  const cleanedText = text.replace(/\[.*?\]/g, '').trim();
  if (!cleanedText) return '';

  // Tokenize words, numbers, and contractions while keeping order
  const tokens = cleanedText.match(/[a-zA-Z0-9']+|[^\s\w]/g);
  if (!tokens) return '';

  const transcribedTokens = tokens.map((token) => {
    // Punctuation marks
    if (/^[^\s\w]+$/.test(token)) {
      if (token === ',' || token === '?' || token === '!' || token === '.') return token;
      return '';
    }

    const lower = token.toLowerCase();

    // Check direct dictionary match
    if (COMMON_DICTIONARY[lower]) {
      return COMMON_DICTIONARY[lower];
    }

    // Numbers handling
    if (/^\d+$/.test(token)) {
      const numMap: Record<string, string> = {
        '0': 'зи́роу',
        '1': 'уа́н',
        '2': 'ту',
        '3': 'сри',
        '4': 'фор',
        '5': 'фа́йв',
        '6': 'сикс',
        '7': 'сэ́вэн',
        '8': 'эйт',
        '9': 'на́йн',
        '10': 'тэн',
        '20': 'туэ́нти',
        '30': 'сё́рти',
        '50': 'фи́фти',
        '100': 'ха́ндрэд',
      };
      return numMap[token] || token;
    }

    // Fallback to phonetic transliterator
    return transliterateWord(lower);
  });

  const result = transcribedTokens
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,?.!])/g, '$1') // attach punctuation without space
    .trim();

  return result ? `[${result}]` : '';
}
