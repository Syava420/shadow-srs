'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FlashCard as FlashCardType, AppSettings, DirectionMode } from '@/types';
import { scheduleCardReview, isCardDue, isCardNew, calculateMasteryPercent, calculateRetrievability, State } from '@/lib/fsrs';
import { storage } from '@/lib/storage';
import { tts } from '@/lib/tts';
import { FlashCard, CardDirection } from './FlashCard';
import { StudyControls } from './StudyControls';
import { StudySummary } from './StudySummary';
import { CardEditModal } from '@/components/modals/CardEditModal';
import { X, Pencil, Clock } from 'lucide-react';

export type { DirectionMode };

interface StudySessionProps {
  cards: FlashCardType[];
  settings: AppSettings;
  directionMode?: DirectionMode;
  cardLimit?: number;
  sessionDurationMinutes?: number;
  onUpdateCard: (updatedCard: FlashCardType) => void;
  onDeleteCard?: (cardId: string) => void;
  onExit: () => void;
}

function computeCardDirection(card: FlashCardType, mode: DirectionMode = 'adaptive'): CardDirection {
  if (mode === 'ru_en') return 'ru_to_en';
  if (mode === 'en_ru') return 'en_to_ru';
  if (mode === 'random') return Math.random() < 0.5 ? 'ru_to_en' : 'en_to_ru';

  // Adaptive FSRS mode:
  const mastery = calculateMasteryPercent(card);
  // Fresh or recently forgotten: en_to_ru (Receptive/Listening)
  if (mastery < 35) return 'en_to_ru';
  // Intermediate learning: ru_to_en (Productive recall/Speaking)
  if (mastery < 75) return 'ru_to_en';
  // Strongly mastered: 50/50 mix
  return Math.random() < 0.5 ? 'ru_to_en' : 'en_to_ru';
}

export const StudySession: React.FC<StudySessionProps> = ({
  cards,
  settings,
  directionMode = 'adaptive',
  cardLimit,
  sessionDurationMinutes,
  onUpdateCard,
  onDeleteCard,
  onExit,
}) => {
  const durationMins = sessionDurationMinutes !== undefined 
    ? sessionDurationMinutes 
    : (settings.sessionDurationMinutes || 0);

  const initialQueue = useMemo(() => {
    // 1. Due review cards (already studied, urgent: memories fading right now)
    const dueReviews = cards.filter(isCardDue);
    // Sort due cards:
    // Priority 1: Forgotten / Relearning cards first (highest urgency: user just failed them)
    // Priority 2: Lowest retrievability first
    dueReviews.sort((a, b) => {
      const aIsRelearning = (a.fsrsCard?.state === State.Learning || a.fsrsCard?.state === State.Relearning) ? 0 : 1;
      const bIsRelearning = (b.fsrsCard?.state === State.Learning || b.fsrsCard?.state === State.Relearning) ? 0 : 1;
      if (aIsRelearning !== bIsRelearning) return aIsRelearning - bIsRelearning;
      return calculateRetrievability(a) - calculateRetrievability(b);
    });

    // 2. New cards (never studied before)
    const newCards = cards.filter(isCardNew);

    const effectiveLimit = cardLimit !== undefined 
      ? cardLimit 
      : durationMins > 0 
        ? Math.round(durationMins * 2.5) 
        : (settings.sessionLimit ?? 20);

    // If both reviews and new cards exist: build an interleaved, balanced session
    if (dueReviews.length > 0 && newCards.length > 0) {
      // Allocate ~70% to reviews and ~30% to new cards within session limit,
      // but ensure all active relearning/forgotten cards are included!
      const limit = effectiveLimit > 0 ? effectiveLimit : dueReviews.length + newCards.length;
      const relearningCount = dueReviews.filter(c => c.fsrsCard?.state === State.Learning || c.fsrsCard?.state === State.Relearning).length;
      const baseReviews = Math.ceil(limit * 0.7);
      const targetReviews = Math.max(relearningCount, Math.min(dueReviews.length, baseReviews));
      const targetNews = Math.min(newCards.length, Math.max(0, limit - targetReviews));
      
      const sliceReviews = dueReviews.slice(0, targetReviews);
      const sliceNews = newCards.slice(0, targetNews);

      // Interleave in natural pattern: [review, review, new, review, review, new...]
      const mixed: FlashCardType[] = [];
      let rIdx = 0;
      let nIdx = 0;
      while (rIdx < sliceReviews.length || nIdx < sliceNews.length) {
        if (rIdx < sliceReviews.length) mixed.push(sliceReviews[rIdx++]);
        if (rIdx < sliceReviews.length) mixed.push(sliceReviews[rIdx++]);
        if (nIdx < sliceNews.length) mixed.push(sliceNews[nIdx++]);
      }
      return mixed;
    }

    // If only reviews exist:
    if (dueReviews.length > 0) {
      return effectiveLimit > 0 ? dueReviews.slice(0, effectiveLimit) : dueReviews;
    }

    // If only new cards exist:
    if (newCards.length > 0) {
      return effectiveLimit > 0 ? newCards.slice(0, effectiveLimit) : newCards;
    }

    // Fallback if fully caught up: practice learned cards
    return effectiveLimit > 0 ? cards.slice(0, effectiveLimit) : [...cards];
  }, [cards, cardLimit, durationMins, settings.sessionLimit]);

  const [queue, setQueue] = useState<FlashCardType[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);

  // Set of card IDs that were marked 'forgotten' during this session and haven't been resolved yet
  const [forgottenCardIds, setForgottenCardIds] = useState<Set<string>>(new Set());
  
  // Track active time on card (excludes pauses > 45s)
  const cardStartTimeRef = useRef<number>(Date.now());

  // Session statistics
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Live session countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => durationMins * 60);

  useEffect(() => {
    if (durationMins <= 0 || isFinished) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [durationMins, isFinished]);

  const currentCard = queue[currentIndex];

  // Dynamic direction per card
  const currentDirection: CardDirection = useMemo(() => {
    if (!currentCard) return 'ru_to_en';
    return computeCardDirection(currentCard, directionMode);
  }, [currentCard, directionMode]);

  useEffect(() => {
    cardStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // Audio behavior based on direction:
  // en_to_ru: audio plays on appearance (when NOT flipped)
  // ru_to_en: audio plays on flip (when flipped to English)
  useEffect(() => {
    if (!currentCard || !settings.autoPlayAudio) return;

    if (currentDirection === 'en_to_ru' && !isFlipped) {
      const timer = setTimeout(() => {
        tts.speak(currentCard.back, {
          accent: settings.voiceAccent,
          rate: settings.speechRate,
        });
      }, 100);
      return () => clearTimeout(timer);
    } else if (currentDirection === 'ru_to_en' && isFlipped) {
      const timer = setTimeout(() => {
        tts.speak(currentCard.back, {
          accent: settings.voiceAccent,
          rate: settings.speechRate,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentCard, isFlipped, currentDirection, settings.autoPlayAudio, settings.voiceAccent, settings.speechRate]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleReplayAudio = useCallback(() => {
    if (currentCard) {
      tts.speak(currentCard.back, {
        accent: settings.voiceAccent,
        rate: settings.speechRate,
      });
    }
  }, [currentCard, settings.voiceAccent, settings.speechRate]);

  const handleRate = useCallback((isRemembered: boolean) => {
    if (!currentCard) return;

    // 1. Calculate active seconds spent (capped at 45s)
    const elapsedSecs = Math.min(45, (Date.now() - cardStartTimeRef.current) / 1000);
    storage.recordReviewActivity(elapsedSecs);

    // 2. Schedule via FSRS
    const updated = scheduleCardReview(currentCard, isRemembered, elapsedSecs);
    onUpdateCard(updated);

    // 3. Update session counters
    setTotalReviewed(prev => prev + 1);
    if (isRemembered) {
      setRememberedCount(prev => prev + 1);
    }

    // 4. Intra-session repetition and forgotten tracking
    const currentCardId = currentCard.id;
    let nextQueue = [...queue];

    if (!isRemembered) {
      // Mark as unresolved forgotten card
      setForgottenCardIds(prev => new Set(prev).add(currentCardId));
      
      // Prevent duplicate instances: check if card is already waiting ahead in the remaining queue
      const alreadyWaitingAhead = nextQueue.slice(currentIndex + 1).some(c => c.id === currentCardId);
      if (!alreadyWaitingAhead) {
        if (currentIndex + 4 < nextQueue.length) {
          nextQueue.splice(currentIndex + 4, 0, currentCard);
        } else {
          nextQueue.push(currentCard);
        }
      }
    } else {
      // Successfully remembered:
      // 1. Remove from unresolved forgotten set
      setForgottenCardIds(prev => {
        if (!prev.has(currentCardId)) return prev;
        const next = new Set(prev);
        next.delete(currentCardId);
        return next;
      });

      // 2. Remove ANY future remaining copies of this card from the queue!
      // Once remembered, the card is mastered for this session. User NEVER has to click 'Вспомнил' repeatedly!
      nextQueue = nextQueue.filter((c, idx) => idx <= currentIndex || c.id !== currentCardId);
    }

    setQueue(nextQueue);

    // 5. Advance or Finish
    // We do NOT forcefully terminate on timer expiry: user can finish remaining queue
    // or manually click 'Завершить' in the banner/top bar.
    if (currentIndex + 1 < nextQueue.length) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setIsFinished(true);
    }
  }, [currentCard, currentIndex, queue, onUpdateCard]);

  const handleRestart = () => {
    setQueue([...cards]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setTotalReviewed(0);
    setRememberedCount(0);
    setForgottenCardIds(new Set());
    setSecondsRemaining(durationMins * 60);
    setIsFinished(false);
  };

  const handleReviewForgotten = useCallback(() => {
    const forgottenList = cards.filter(c => forgottenCardIds.has(c.id));
    if (forgottenList.length === 0) {
      handleRestart();
      return;
    }
    // Deduplicate in case multiple entries existed
    const unique = Array.from(new Map(forgottenList.map(c => [c.id, c])).values());
    setQueue(unique);
    setCurrentIndex(0);
    setIsFlipped(false);
    setTotalReviewed(0);
    setRememberedCount(0);
    setSecondsRemaining(0);
    setIsFinished(false);
  }, [cards, forgottenCardIds]);

  if (isFinished || !currentCard) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-center items-center">
        <StudySummary
          totalReviewed={totalReviewed}
          rememberedCount={rememberedCount}
          timeSpentMinutes={durationMins > 0 ? durationMins : undefined}
          unresolvedCount={forgottenCardIds.size}
          onReviewForgotten={handleReviewForgotten}
          onExit={onExit}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round(((currentIndex + 1) / queue.length) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none overflow-hidden">
      {/* Top Ultra-Minimal Bar */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
            title="Завершить тренировку (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsEditingCard(true)}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
            title="Редактировать карточку (удерживание)"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Progress Line */}
        <div className="flex-1 max-w-md mx-4">
          <div className="w-full h-1.5 rounded-full bg-zinc-850 overflow-hidden">
            <div
              className="h-full bg-zinc-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timer and Card Counter */}
        <div className="flex items-center gap-2.5">
          {durationMins > 0 && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                secondsRemaining === 0
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  : secondsRemaining < 60
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
              title="Оставшееся время тренировки"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                {secondsRemaining === 0
                  ? '0:00 (Время вышло)'
                  : `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`}
              </span>
            </div>
          )}
          <span className="text-xs font-mono text-zinc-500">
            {currentIndex + 1} / {queue.length}
          </span>
        </div>
      </div>

      {/* Gentle Non-Intrusive Time-Up Banner */}
      {durationMins > 0 && secondsRemaining === 0 && (
        <div className="w-full max-w-4xl mx-auto mt-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>
              Время тренировки вышло. Можно доделать карточки ({queue.length - currentIndex} шт.) или завершить сейчас.
            </span>
          </div>
          <button
            onClick={() => setIsFinished(true)}
            className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium rounded-lg transition-colors cursor-pointer shrink-0 ml-3 text-xs"
          >
            Завершить
          </button>
        </div>
      )}

      {/* Main Flashcard Taking Whole Center */}
      <div className="w-full flex justify-center items-center my-auto">
        <FlashCard
          card={currentCard}
          direction={currentDirection}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          onRate={handleRate}
          onEdit={() => setIsEditingCard(true)}
          showImages={settings.showImages}
          voiceAccent={settings.voiceAccent}
          speechRate={settings.speechRate}
          showTranscription={settings.showTranscription ?? true}
        />
      </div>

      {/* Ergonomic Bottom Controls */}
      <div className="w-full flex justify-center pb-2 sm:pb-4">
        <StudyControls
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          onRate={handleRate}
          onReplayAudio={handleReplayAudio}
        />
      </div>

      {/* Modal for In-Session Card Editing */}
      {currentCard && (
        <CardEditModal
          isOpen={isEditingCard}
          deckId={currentCard.deckId}
          cardToEdit={currentCard}
          onClose={() => setIsEditingCard(false)}
          onSaveCard={(savedCard) => {
            onUpdateCard(savedCard);
            setQueue(prev => prev.map(c => c.id === savedCard.id ? savedCard : c));
            setIsEditingCard(false);
          }}
          onDeleteCard={(cardId) => {
            if (onDeleteCard) onDeleteCard(cardId);
            const nextQueue = queue.filter(c => c.id !== cardId);
            setQueue(nextQueue);
            setIsEditingCard(false);
            if (nextQueue.length === 0 || currentIndex >= nextQueue.length) {
              setIsFinished(true);
            }
          }}
        />
      )}
    </div>
  );
};
