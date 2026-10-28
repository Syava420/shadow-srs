import { FlashCard, AppSettings } from '@/types';
import { calculateDeckStats, isCardDue, isCardNew, calculateMasteryPercent, isCardDifficult } from '@/lib/fsrs';

export interface BatchComposition {
  reviews: number;
  news: number;
  remainingNewToday: number;
  isPractice: boolean;
  quotaReached: boolean;
}

export function computeStudyBatchComposition(
  deckCards: FlashCard[],
  stats: ReturnType<typeof calculateDeckStats>,
  settings: AppSettings,
  remainingNewToday: number,
  dailyReviewLimit: number
): BatchComposition {
  const limit = (settings.sessionDurationMinutes && settings.sessionDurationMinutes > 0)
    ? Math.round(settings.sessionDurationMinutes * 2.5)
    : (settings.sessionLimit || 20);

  const availableReviews = dailyReviewLimit > 0 
    ? Math.min(stats.dueCount, dailyReviewLimit) 
    : stats.dueCount;
  const availableNews = Math.min(stats.newCount, remainingNewToday);

  if (availableReviews > 0 && availableNews > 0) {
    const baseNews = Math.min(availableNews, Math.max(1, Math.round(limit * 0.3)));
    const targetReviews = Math.min(availableReviews, limit - baseNews);
    const targetNews = Math.min(availableNews, limit - targetReviews);
    return { 
      reviews: targetReviews, 
      news: targetNews, 
      remainingNewToday, 
      isPractice: false,
      quotaReached: remainingNewToday === 0 && stats.newCount > 0,
    };
  }

  if (availableReviews > 0) {
    return { 
      reviews: Math.min(availableReviews, limit), 
      news: 0, 
      remainingNewToday, 
      isPractice: false,
      quotaReached: remainingNewToday === 0 && stats.newCount > 0,
    };
  }

  if (availableNews > 0) {
    return { 
      reviews: 0, 
      news: Math.min(availableNews, limit), 
      remainingNewToday, 
      isPractice: false,
      quotaReached: false,
    };
  }

  return { 
    reviews: Math.min(deckCards.length, limit), 
    news: 0, 
    remainingNewToday, 
    isPractice: true,
    quotaReached: remainingNewToday === 0 && stats.newCount > 0,
  };
}

export type SortOption = 'due_first' | 'difficult_first' | 'mastery_asc' | 'mastery_desc' | 'time_spent' | 'newest' | 'alphabetical';
export type FilterOption = 'all' | 'difficult';

export function filterAndSortCards(
  cards: FlashCard[],
  searchQuery: string,
  filterMode: FilterOption,
  sortBy: SortOption
): FlashCard[] {
  const query = searchQuery.trim().toLowerCase();
  
  let result = cards.filter(card => {
    if (query) {
      const match = card.front.toLowerCase().includes(query) || card.back.toLowerCase().includes(query);
      if (!match) return false;
    }
    if (filterMode === 'difficult') {
      return isCardDifficult(card);
    }
    return true;
  });

  return result.sort((a, b) => {
    switch (sortBy) {
      case 'due_first': {
        const scoreA = isCardDue(a) ? 2 : isCardNew(a) ? 1 : 0;
        const scoreB = isCardDue(b) ? 2 : isCardNew(b) ? 1 : 0;
        return scoreB - scoreA;
      }
      case 'difficult_first':
        return (b.fsrsCard?.lapses || 0) - (a.fsrsCard?.lapses || 0);
      case 'mastery_asc':
        return calculateMasteryPercent(a) - calculateMasteryPercent(b);
      case 'mastery_desc':
        return calculateMasteryPercent(b) - calculateMasteryPercent(a);
      case 'time_spent':
        return (b.timeSpentSeconds || 0) - (a.timeSpentSeconds || 0);
      case 'alphabetical':
        return a.back.localeCompare(b.back);
      case 'newest':
      default:
        return b.createdAt - a.createdAt;
    }
  });
}
