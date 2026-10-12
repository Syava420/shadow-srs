import { ImportPreviewItem } from '@/types';

// Regex tests for language detection
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const LATIN_REGEX = /[a-zA-Z]/;

/**
 * Cleans punctuation, list markers (1., -, •), and trailing symbols
 */
function cleanSegment(text: string): string {
  let cleaned = text.trim();
  
  // Remove leading numbers or bullets like "1.", "1)", "-", "*", "•", "[1]"
  cleaned = cleaned.replace(/^(\d+[\.\)]\s*|[-*•]\s*|\[\d+\]\s*)/, '');
  
  // Remove leading/trailing quotes, dashes, commas, semicolons
  cleaned = cleaned.replace(/^["'«»—–\-,;]+\s*/, '');
  cleaned = cleaned.replace(/\s*["'«»—–\-,;]+$/, '');
  
  return cleaned.trim();
}

/**
 * Checks if a string contains mostly Cyrillic characters
 */
function isRussianText(text: string): boolean {
  const cyrillicMatches = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const latinMatches = (text.match(/[a-zA-Z]/g) || []).length;
  return cyrillicMatches > latinMatches;
}

/**
 * Splits a single line between Russian and English parts with smart boundary detection
 */
function splitLineLanguages(line: string): [string, string] | null {
  // 1. Dash with spaces: " - ", " — ", " – "
  const dashMatch = line.match(/\s+[—–\-]\s+/);
  if (dashMatch && dashMatch.index !== undefined) {
    const left = line.slice(0, dashMatch.index);
    const right = line.slice(dashMatch.index + dashMatch[0].length);
    if ((CYRILLIC_REGEX.test(left) && LATIN_REGEX.test(right)) || (LATIN_REGEX.test(left) && CYRILLIC_REGEX.test(right))) {
      return [left, right];
    }
  }

  // 2. Tab separation
  if (line.includes('\t')) {
    const parts = line.split('\t');
    return [parts[0], parts.slice(1).join(' ')];
  }

  // 3. Semicolon separation
  if (line.includes(';')) {
    const parts = line.split(';');
    return [parts[0], parts.slice(1).join(';')];
  }

  // 4. Smart comma separation: find the comma that sits on the boundary between languages
  const commaIndices: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ',') commaIndices.push(i);
  }

  for (const idx of commaIndices) {
    const left = line.slice(0, idx);
    const right = line.slice(idx + 1);
    const leftRu = CYRILLIC_REGEX.test(left);
    const leftEn = LATIN_REGEX.test(left);
    const rightRu = CYRILLIC_REGEX.test(right);
    const rightEn = LATIN_REGEX.test(right);

    // If one side has Cyrillic and other side has Latin without mixing
    if ((leftRu && !leftEn && rightEn) || (leftEn && !leftRu && rightRu)) {
      return [left, right];
    }
  }

  // 5. Fallbacks
  if (dashMatch && dashMatch.index !== undefined) {
    return [line.slice(0, dashMatch.index), line.slice(dashMatch.index + dashMatch[0].length)];
  }

  if (line.includes(',')) {
    const idx = line.indexOf(',');
    return [line.slice(0, idx), line.slice(idx + 1)];
  }

  return null;
}

/**
 * Parses raw text from LLMs into clean Russian (Front) -> English (Back) flashcard items.
 * Optimized to handle 100+ lines instantly.
 */
export function parsePastedText(rawText: string): ImportPreviewItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: ImportPreviewItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let parts = splitLineLanguages(line);

    // Check if it's two consecutive lines (e.g. Ru on line 1, En on line 2)
    if (!parts && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (
        (CYRILLIC_REGEX.test(line) && LATIN_REGEX.test(nextLine)) ||
        (LATIN_REGEX.test(line) && CYRILLIC_REGEX.test(nextLine))
      ) {
        parts = [line, nextLine];
        i++; // skip consumed line
      }
    }

    if (parts) {
      const cleanA = cleanSegment(parts[0]);
      const cleanB = cleanSegment(parts[1]);

      if (cleanA && cleanB) {
        const isA_Russian = isRussianText(cleanA);
        const front = isA_Russian ? cleanA : cleanB;
        const back = isA_Russian ? cleanB : cleanA;

        items.push({
          id: `import-${Date.now()}-${items.length}-${Math.random().toString(36).substring(2, 6)}`,
          front,
          back,
          selected: true,
        });
      }
    }
  }

  return items;
}
