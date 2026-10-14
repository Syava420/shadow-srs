/**
 * English to Russian Phonetic Transcription Engine
 * Generates natural Cyrillic phonetic pronunciation for A0 English learners.
 * 100% offline, instant (0ms latency), and guarantees 0 English letters in output.
 */

import { COMMON_DICTIONARY } from './transcriptionDictionary';

/**
 * Phonetic transliterator fallback for words not in the dictionary.
 * Strictly guarantees all Latin letters are converted to natural Russian phonetics.
 */
function transliterateWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (!w) return '';

  // 1. High-frequency word overrides & common multi-word contractions
  const commonWords: Record<string, string> = {
    future: 'фью́чэ',
    power: 'па́уэ',
    flower: 'фла́уэ',
    tower: 'та́уэ',
    shower: 'ша́уэ',
    hour: 'а́уэр',
    hours: 'а́уэрз',
    our: 'а́уэр',
    ours: 'а́уэрз',
    out: 'а́ут',
    about: 'эба́ут',
    cloud: 'кла́уд',
    sound: 'са́унд',
    round: 'ра́унд',
    found: 'фа́унд',
    ground: 'гра́унд',
    house: 'ха́ус',
    mouse: 'ма́ус',
    mouth: 'ма́ус',
    down: 'да́ун',
    town: 'та́ун',
    now: 'на́у',
    how: 'ха́у',
    cow: 'ка́у',
    brown: 'бра́ун',
    clown: 'кла́ун',
    music: 'мью́зик',
    student: 'стью́дэнт',
    human: 'хью́мэн',
    duty: 'дью́ти',
    pure: 'пью́э',
    cure: 'кью́э',
    cute: 'кьют',
    huge: 'хьюдж',
    tube: 'тьюб',
    suit: 'сут',
    super: 'су́пэ',
    clean: 'клин',
    light: 'ла́йт',
    night: 'на́йт',
    right: 'ра́йт',
    flight: 'фла́йт',
    bright: 'бра́йт',
    truth: 'трус',
    dream: 'дрим',
    world: 'уёрлд',
    word: 'уёрд',
    work: 'уёрк',
  };

  if (commonWords[w]) {
    return commonWords[w];
  }

  // 2. Open syllable rule for 'u': u + consonant + vowel -> 'ью'
  // Example: future, music, student, cute, huge, abuse, perfume
  w = w.replace(/u(?=[bcdfghjklmnpqrstvwxz][aeiouy])/g, 'ью');
  w = w.replace(/^ью/, 'ю'); // at start of word: unit -> юнит

  // 3. Open syllable rules for single vowels before silent terminal 'e'
  // a_e -> эй (make, take, name, late, safe)
  w = w.replace(/a(?=[bcdfghjklmnpqrstvwxz]e\b)/g, 'эй');
  // i_e -> ай (like, time, life, ride, white, fine)
  w = w.replace(/i(?=[bcdfghjklmnpqrstvwxz]e\b)/g, 'ай');
  // o_e -> оу (home, hope, stone, smoke, role)
  w = w.replace(/o(?=[bcdfghjklmnpqrstvwxz]e\b)/g, 'оу');

  // 4. Special letter clusters
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
    [/all\b/g, 'ол'],
    [/all(?=[bcdfghjklmnpqrstvwxz])/g, 'ол'],
    [/ou/g, 'ау'],
    [/ow/g, 'оу'],
    [/au/g, 'о'],
    [/aw/g, 'о'],
    [/ng\b/g, 'нг'],
  ];

  for (const [pattern, replacement] of clusters) {
    w = w.replace(pattern, replacement);
  }

  // 5. Remove silent terminal 'e' if word has other vowels
  if (/[а-яёaeiouy]/.test(w) && w.endsWith('e') && w.length > 2) {
    w = w.slice(0, -1);
  }

  // 6. Letter by letter mapping (strictly maps all 26 Latin letters to Cyrillic)
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
    // If already Cyrillic, keep it; if Latin, map it; otherwise ignore unknown non-alphanumeric
    if (/[а-яёА-ЯЁ]/.test(char)) {
      result += char;
    } else if (charMap[char]) {
      result += charMap[char];
    }
  }

  // Final cleanup of accidental duplicates like 'йй' or trailing soft signs
  result = result.replace(/йй+/g, 'й');

  return result;
}

/**
 * Converts any English sentence or phrase into natural Russian phonetic transcription.
 * Example: "I would like a cup of coffee" -> "[ай вуд лайк э кап оф ко́фи]"
 */
export function getRussianTranscription(text: string): string {
  if (!text || !text.trim()) return '';

  // Clean existing bracket annotations
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

    // Algorithmic Cyrillic phonetic transliterator
    return transliterateWord(lower);
  });

  const result = transcribedTokens
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,?.!])/g, '$1') // attach punctuation without extra space
    .trim();

  return result ? `[${result}]` : '';
}
