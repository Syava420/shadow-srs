const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'beneath', 'under', 'above',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
  'do', 'does', 'did', 'have', 'has', 'had', 'having',
  'can', 'could', 'should', 'would', 'may', 'might', 'must',
  'very', 'really', 'just', 'too', 'quite', 'so', 'then', 'now'
]);

/**
 * Maps common vocabulary themes to stylish SVG visual motifs
 */
const ICON_MAP: Record<string, string> = {
  sleep: '🌙',
  heart: '❤️',
  chase: '⚡',
  options: '⚖️',
  mind: '🧠',
  time: '⏳',
  money: '💎',
  learn: '📚',
  speak: '🗣️',
  work: '💼',
  home: '🏠',
  think: '💡',
  run: '🏃',
  car: '🚗',
  goal: '🎯',
  music: '🎵',
  food: '☕',
  fire: '🔥',
  water: '🌊',
  world: '🌍',
};

export function extractKeywords(sentence: string): string {
  if (!sentence) return 'concept';
  
  const words = sentence
    .toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (words.length === 0) return 'focus';
  words.sort((a, b) => b.length - a.length);
  return words[0];
}

/**
 * Generates an elegant, lightweight SVG illustration matching the dark monochrome theme.
 * Completely independent of foreign CDNs, zero blocked domains, 0 latency.
 */
export function generateThematicSvg(text: string): string {
  const keyword = extractKeywords(text);
  const cleanWord = keyword.replace(/[^a-z]/gi, '').toLowerCase();
  
  let emoji = '✨';
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (cleanWord.includes(key) || text.toLowerCase().includes(key)) {
      emoji = icon;
      break;
    }
  }

  // Consistent subtle gradient hue based on keyword
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
  }
  const grayA = 18 + (Math.abs(hash) % 12);
  const grayB = 10 + (Math.abs(hash) % 8);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgb(${grayA},${grayA},${grayA + 4})"/>
        <stop offset="100%" stop-color="rgb(${grayB},${grayB},${grayB + 2})"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.06)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="200" cy="110" r="90" fill="url(#glow)"/>
    <rect x="20" y="20" width="360" height="220" rx="16" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    <text x="200" y="115" font-size="44" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    <text x="200" y="170" font-family="-apple-system, sans-serif" font-size="13" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="2">${cleanWord.toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getSmartImageUrl(englishSentence: string): string {
  return generateThematicSvg(englishSentence);
}
