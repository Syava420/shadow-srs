import { FlashCard, AppSettings, DirectionMode } from '@/types';
import {
  isCardDue,
  isCardNew,
  calculateMasteryPercent,
  calculateRetrievability,
  State,
} from '@/lib/fsrs';
import { getLocalDateString } from '@/lib/date-utils';
import { CardDirection } from './FlashCard';

export interface StudyQueueItem {
  card: FlashCard;
  direction: CardDirection;
}

export function computeCardDirection(
  card: FlashCard,
  mode: DirectionMode = 'adaptive'
): CardDirection {
  if (mode === 'ru_en') return 'ru_to_en';
  if (mode === 'en_ru') return 'en_to_ru';
  if (mode === 'random') return Math.random() < 0.5 ? 'ru_to_en' : 'en_to_ru';

  const mastery = calculateMasteryPercent(card);
  if (mastery < 35) return 'en_to_ru';
  if (mastery < 75) return 'ru_to_en';
  return Math.random() < 0.5 ? 'ru_to_en' : 'en_to_ru';
}

export function buildStudyQueue(
  cards: FlashCard[],
  settings: AppSettings,
  effectiveDailyNewLimit: number,
  directionMode: DirectionMode,
  cardLimit?: number,
  durationMins: number = 0
): StudyQueueItem[] {
  const dueReviews = cards.filter(isCardDue);

  dueReviews.sort((a, b) => {
    const aIsRelearning =
      a.fsrsCard?.state === State.Learning || a.fsrsCard?.state === State.Relearning ? 0 : 1;
    const bIsRelearning =
      b.fsrsCard?.state === State.Learning || b.fsrsCard?.state === State.Relearning ? 0 : 1;
    if (aIsRelearning !== bIsRelearning) return aIsRelearning - bIsRelearning;
    return calculateRetrievability(a) - calculateRetrievability(b);
  });

  const newCards = cards.filter(isCardNew);
  const todayStr = getLocalDateString();
  const newLearnedToday = cards.filter(
    (c) =>
      c.fsrsCard?.reps === 1 &&
      c.lastStudiedAt &&
      getLocalDateString(new Date(c.lastStudiedAt)) === todayStr
  ).length;

  const remainingNewToday = Math.max(0, effectiveDailyNewLimit - newLearnedToday);
  const dailyReviewLimit = settings.dailyReviewLimit ?? 100;

  const availableReviews =
    dailyReviewLimit > 0 ? dueReviews.slice(0, dailyReviewLimit) : dueReviews;
  const availableNews = newCards.slice(0, remainingNewToday);

  const effectiveLimit =
    cardLimit !== undefined
      ? cardLimit
      : durationMins > 0
        ? Math.round(durationMins * 2.5)
        : (settings.sessionLimit ?? 20);

  let selected: FlashCard[];

  if (availableReviews.length > 0 && availableNews.length > 0) {
    const limit =
      effectiveLimit > 0 ? effectiveLimit : availableReviews.length + availableNews.length;
    const relearningCount = availableReviews.filter(
      (c) => c.fsrsCard?.state === State.Learning || c.fsrsCard?.state === State.Relearning
    ).length;
    const baseNews = Math.min(availableNews.length, Math.max(1, Math.round(limit * 0.3)));
    const targetReviews = Math.max(
      relearningCount,
      Math.min(availableReviews.length, limit - baseNews)
    );
    const targetNews = Math.min(availableNews.length, Math.max(0, limit - targetReviews));

    const sliceReviews = availableReviews.slice(0, targetReviews);
    const sliceNews = availableNews.slice(0, targetNews);

    selected = [];
    let rIdx = 0;
    let nIdx = 0;
    while (rIdx < sliceReviews.length || nIdx < sliceNews.length) {
      if (rIdx < sliceReviews.length) selected.push(sliceReviews[rIdx++]);
      if (rIdx < sliceReviews.length) selected.push(sliceReviews[rIdx++]);
      if (nIdx < sliceNews.length) selected.push(sliceNews[nIdx++]);
    }
  } else if (availableReviews.length > 0) {
    selected = effectiveLimit > 0 ? availableReviews.slice(0, effectiveLimit) : availableReviews;
  } else if (availableNews.length > 0) {
    selected = effectiveLimit > 0 ? availableNews.slice(0, effectiveLimit) : availableNews;
  } else {
    const practiceCards = [...cards].sort((a, b) => {
      const retA = calculateRetrievability(a);
      const retB = calculateRetrievability(b);
      if (Math.abs(retA - retB) > 8) return retA - retB;
      const lapsesA = a.fsrsCard?.lapses || 0;
      const lapsesB = b.fsrsCard?.lapses || 0;
      if (lapsesB !== lapsesA) return lapsesB - lapsesA;
      return Math.random() - 0.5;
    });
    selected = effectiveLimit > 0 ? practiceCards.slice(0, effectiveLimit) : practiceCards;
  }

  return selected.map((card) => ({
    card,
    direction: computeCardDirection(card, directionMode),
  }));
}
