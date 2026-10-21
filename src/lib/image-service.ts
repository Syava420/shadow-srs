/**
 * Clean monochrome thematic illustration service.
 * Zero external CDNs, strictly NO emojis, pure SVG vector paths in dark graphite style.
 */

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

// Minimalist monochrome vector icons (strictly NO emojis)
function getVectorPath(keyword: string): string {
  if (keyword.includes('time') || keyword.includes('wait') || keyword.includes('clock') || keyword.includes('late')) {
    return `<circle cx="200" cy="115" r="24" fill="none" stroke="rgba(244,244,245,0.75)" stroke-width="2"/>
            <polyline points="200,99 200,115 212,123" fill="none" stroke="rgba(244,244,245,0.75)" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (keyword.includes('run') || keyword.includes('go') || keyword.includes('walk') || keyword.includes('speed') || keyword.includes('fast')) {
    return `<path d="M185,130 L195,115 L205,122 L215,100 M195,102 A4,4 0 1,1 195,94 A4,4 0 1,1 195,102" fill="none" stroke="rgba(244,244,245,0.75)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (keyword.includes('mind') || keyword.includes('think') || keyword.includes('idea') || keyword.includes('smart')) {
    return `<path d="M186,122 C180,116 182,102 192,98 C198,92 208,94 212,100 C220,104 220,116 214,122 C210,126 210,132 200,132 C190,132 190,126 186,122 Z" fill="none" stroke="rgba(244,244,245,0.75)" stroke-width="2"/>`;
  }
  if (keyword.includes('speak') || keyword.includes('say') || keyword.includes('talk') || keyword.includes('ask') || keyword.includes('word')) {
    return `<path d="M184,102 L216,102 C220,102 224,106 224,110 L224,122 C224,126 220,130 216,130 L198,130 L188,138 L188,130 L184,130 C180,130 176,126 176,122 L176,110 C176,106 180,102 184,102 Z" fill="none" stroke="rgba(244,244,245,0.75)" stroke-width="2"/>`;
  }
  if (keyword.includes('heart') || keyword.includes('love') || keyword.includes('feel')) {
    return `<path d="M200,128 C185,118 178,106 184,98 C190,92 198,96 200,102 C202,96 210,92 216,98 C222,106 215,118 200,128 Z" fill="none" stroke="rgba(244,244,245,0.75)" stroke-width="2"/>`;
  }
  // Default elegant geometric emblem (diamond with center circle)
  return `<polygon points="200,90 225,115 200,140 175,115" fill="none" stroke="rgba(244,244,245,0.7)" stroke-width="2"/>
          <circle cx="200" cy="115" r="5" fill="rgba(244,244,245,0.8)"/>`;
}

/**
 * Generates an elegant, lightweight SVG illustration matching the dark monochrome theme.
 * Completely independent of foreign CDNs, zero blocked domains, 0 latency, strictly NO emojis.
 */
export function generateThematicSvg(text: string): string {
  const keyword = extractKeywords(text);
  const cleanWord = keyword.replace(/[^a-z]/gi, '').toLowerCase();

  // Consistent subtle gradient hue based on keyword
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
  }
  const grayA = 18 + (Math.abs(hash) % 10);
  const grayB = 10 + (Math.abs(hash) % 6);
  const vectorMark = getVectorPath(cleanWord);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgb(${grayA},${grayA},${grayA + 3})"/>
        <stop offset="100%" stop-color="rgb(${grayB},${grayB},${grayB + 2})"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.05)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="200" cy="110" r="90" fill="url(#glow)"/>
    <rect x="20" y="20" width="360" height="220" rx="16" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    ${vectorMark}
    <text x="200" y="170" font-family="-apple-system, sans-serif" font-size="12" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="2">${cleanWord.toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getSmartImageUrl(englishSentence: string): string {
  return generateThematicSvg(englishSentence);
}
