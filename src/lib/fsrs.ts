import { fsrs, createEmptyCard, Rating, Card as FSRSCard, State } from 'ts-fsrs';
import { FlashCard } from '@/types';

// Instantiate FSRS engine with optimal default parameters
const f = fsrs({
  request_retention: 0.9, // Target 90% retention rate
  maximum_interval: 36500, // Up to 100 years
  enable_fuzz: true,      // Slight random fuzz to prevent cards piling up on same day
});

/**
 * Creates a fresh FSRS card state for a new flashcard
 */
export function createNewFSRSCard(): FSRSCard {
  return createEmptyCard(new Date());
}

/**
 * Schedules the next review for a card based on 2-button choice:
 * @param isRemembered true = "Вспомнил" (Rating.Good), false = "Забыл" (Rating.Again)
 * @param activeSeconds Time spent actively studying this card (capped)
 */
export function scheduleCardReview(
  card: FlashCard, 
  isRemembered: boolean,
  activeSeconds: number = 0
): FlashCard {
  const now = new Date();
  
  // Clean up date objects from serialized JSON if needed
  const currentFSRSCard: FSRSCard = {
    ...card.fsrsCard,
    due: new Date(card.fsrsCard.due),
    last_review: card.fsrsCard.last_review ? new Date(card.fsrsCard.last_review) : undefined,
  };

  const rating = isRemembered ? Rating.Good : Rating.Again;
  const schedulingRecord = f.repeat(currentFSRSCard, now);
  const updatedFSRSCard = schedulingRecord[rating].card;

  const currentSeconds = card.timeSpentSeconds || 0;
  const clampedSeconds = Math.min(45, Math.max(1, activeSeconds));

  return {
    ...card,
    fsrsCard: updatedFSRSCard,
    lastStudiedAt: now.getTime(),
    timeSpentSeconds: currentSeconds + clampedSeconds,
  };
}

/**
 * Determines if a card is new (has never been studied before)
 */
export function isCardNew(card: FlashCard): boolean {
  return !card.fsrsCard || (card.fsrsCard.state ?? State.New) === State.New;
}

/**
 * Determines if an already learned card is due for review today
 */
export function isCardDue(card: FlashCard): boolean {
  if (!card.fsrsCard || !card.fsrsCard.due) return false;
  if ((card.fsrsCard.state ?? State.New) === State.New) return false;
  const dueDate = new Date(card.fsrsCard.due);
  return dueDate.getTime() <= Date.now();
}

/**
 * Calculates Mastery Percent (0 - 100%) based on FSRS stability and repetition count.
 * 100% means information has successfully settled into long-term memory (S >= 25 days).
 */
export function calculateMasteryPercent(card: FlashCard): number {
  const state = card.fsrsCard?.state ?? State.New;
  if (state === State.New || !card.fsrsCard?.stability) return 0;

  const stability = card.fsrsCard.stability;
  const reps = card.fsrsCard.reps || 0;

  if (stability >= 30 && reps >= 3) return 100;
  if (stability >= 20) return 90;
  if (stability >= 10) return 75;
  if (stability >= 5) return 60;
  if (stability >= 2) return 45;
  if (stability >= 1) return 30;
  return 15;
}

/**
 * Calculates current Retrievability % (how freshly it is remembered right now, decays over time)
 */
export function calculateRetrievability(card: FlashCard): number {
  const state = card.fsrsCard?.state ?? State.New;
  if (state === State.New) return 0;
  if (!card.fsrsCard?.last_review || !card.fsrsCard?.stability) return 50;

  const lastReviewTime = new Date(card.fsrsCard.last_review).getTime();
  const elapsedDays = Math.max(0, (Date.now() - lastReviewTime) / (1000 * 60 * 60 * 24));
  const stability = Math.max(0.1, card.fsrsCard.stability);

  // FSRS Retrievability formula: R = (1 + factor * t / S)^(-0.5)
  const factor = 19 / 81; // standard FSRS factor for 90% retention at t = S
  const r = Math.pow(1 + (factor * elapsedDays) / stability, -0.5);
  return Math.round(Math.min(100, Math.max(0, r * 100)));
}

/**
 * Returns formatted human-friendly interval string (e.g. "10 мин", "1 дн", "4 дн")
 */
export function getNextIntervalText(card: FlashCard, isRemembered: boolean): string {
  try {
    const now = new Date();
    const currentFSRSCard: FSRSCard = {
      ...card.fsrsCard,
      due: new Date(card.fsrsCard.due),
      last_review: card.fsrsCard.last_review ? new Date(card.fsrsCard.last_review) : undefined,
    };
    const rating = isRemembered ? Rating.Good : Rating.Again;
    const nextCard = f.repeat(currentFSRSCard, now)[rating].card;
    const diffMs = new Date(nextCard.due).getTime() - now.getTime();
    
    if (diffMs <= 0) return '< 1 мин';
    const minutes = Math.round(diffMs / (1000 * 60));
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} дн`;
    const months = Math.round(days / 30);
    return `${months} мес`;
  } catch {
    return isRemembered ? '1 дн' : '10 мин';
  }
}

/**
 * Calculates statistics for a collection of cards
 */
export function calculateDeckStats(cards: FlashCard[]) {
  let newCount = 0;
  let dueCount = 0;
  let learnedCount = 0;

  for (const card of cards) {
    const state = card.fsrsCard?.state ?? State.New;
    if (state === State.New) {
      newCount++;
    } else if (isCardDue(card)) {
      dueCount++;
    } else {
      learnedCount++;
    }
  }

  return {
    total: cards.length,
    newCount,
    dueCount,
    learnedCount,
    totalNeedReview: newCount + dueCount,
  };
}
