/**
 * Date utilities that respect the user's LOCAL timezone.
 * Standard toISOString().split('T')[0] converts to UTC, causing off-by-one errors
 * after midnight or in timezones ahead of UTC (e.g. UTC+3, UTC+11).
 */

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

export function getDaysAgoLocalDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateString(d);
}
