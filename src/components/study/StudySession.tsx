'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlashCard as FlashCardType, AppSettings, DirectionMode } from '@/types';
import { scheduleCardReview } from '@/lib/fsrs';
import { storage } from '@/lib/storage';
import { tts } from '@/lib/tts';
import { FlashCard } from './FlashCard';
import { StudyControls } from './StudyControls';
import { StudySummary } from './StudySummary';
import { buildStudyQueue, computeCardDirection, StudyQueueItem } from './study-queue';
import { CardEditModal } from '@/components/modals/CardEditModal';
import { X, Pencil, Clock } from 'lucide-react';

export type { DirectionMode };

interface StudySessionProps {
  cards: FlashCardType[];
  settings: AppSettings;
  effectiveDailyNew: number;
  directionMode?: DirectionMode;
  cardLimit?: number;
  sessionDurationMinutes?: number;
  onUpdateCard: (updatedCard: FlashCardType) => void;
  onDeleteCard?: (cardId: string) => void;
  onExit: () => void;
}

export const StudySession: React.FC<StudySessionProps> = ({
  cards,
  settings,
  effectiveDailyNew,
  directionMode = 'adaptive',
  cardLimit,
  sessionDurationMinutes,
  onUpdateCard,
  onDeleteCard,
  onExit,
}) => {
  const durationMins =
    sessionDurationMinutes !== undefined
      ? sessionDurationMinutes
      : settings.sessionDurationMinutes || 0;

  const [queue, setQueue] = useState<StudyQueueItem[]>(() =>
    buildStudyQueue(cards, settings, effectiveDailyNew, directionMode, cardLimit, durationMins)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [forgottenCardIds, setForgottenCardIds] = useState<Set<string>>(() => new Set());
  const cardStartTimeRef = useRef<number>(0);

  const [totalReviewed, setTotalReviewed] = useState(0);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => durationMins * 60);

  useEffect(() => {
    cardStartTimeRef.current = Date.now();
  }, [currentIndex]);

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

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingCard) {
        onExit();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isEditingCard, onExit]);

  const currentItem = queue[currentIndex];
  const currentCard = currentItem?.card;
  const currentDirection = currentItem?.direction ?? 'en_to_ru';

  useEffect(() => {
    if (!currentCard || !settings.autoPlayAudio || isEditingCard) return;

    if (
      (currentDirection === 'en_to_ru' && !isFlipped) ||
      (currentDirection === 'ru_to_en' && isFlipped)
    ) {
      const timer = setTimeout(() => {
        tts.speak(currentCard.back, {
          accent: settings.voiceAccent,
          gender: settings.voiceGender,
          rate: settings.speechRate,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    currentCard,
    isFlipped,
    currentDirection,
    isEditingCard,
    settings.autoPlayAudio,
    settings.voiceAccent,
    settings.voiceGender,
    settings.speechRate,
  ]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const lastAudioClickRef = useRef<number>(0);

  const handleReplayAudio = useCallback(() => {
    if (!currentCard) return;
    const now = Date.now();
    const isSlow = now - lastAudioClickRef.current < 1600;
    lastAudioClickRef.current = now;
    const rate = isSlow ? Math.max(0.6, settings.speechRate * 0.65) : settings.speechRate;
    tts.speak(currentCard.back, {
      accent: settings.voiceAccent,
      gender: settings.voiceGender,
      rate,
    });
  }, [currentCard, settings.voiceAccent, settings.voiceGender, settings.speechRate]);

  const handleRate = useCallback(
    (isRemembered: boolean) => {
      if (!currentCard) return;

      const started = cardStartTimeRef.current || Date.now();
      const elapsedSecs = Math.min(45, (Date.now() - started) / 1000);
      storage.recordReviewActivity(elapsedSecs, isRemembered, currentCard.id);

      const updated = scheduleCardReview(currentCard, isRemembered, elapsedSecs);
      onUpdateCard(updated);

      setTotalReviewed((prev) => prev + 1);
      if (isRemembered) {
        setRememberedCount((prev) => prev + 1);
      }

      const currentCardId = currentCard.id;
      let nextQueue = [...queue];

      if (!isRemembered) {
        setForgottenCardIds((prev) => new Set(prev).add(currentCardId));
        const alreadyAhead = nextQueue
          .slice(currentIndex + 1)
          .some((item) => item.card.id === currentCardId);
        if (!alreadyAhead) {
          const requeueItem: StudyQueueItem = {
            card: updated,
            direction: computeCardDirection(updated, directionMode),
          };
          if (currentIndex + 4 < nextQueue.length) {
            nextQueue.splice(currentIndex + 4, 0, requeueItem);
          } else {
            nextQueue.push(requeueItem);
          }
        }
      } else {
        setForgottenCardIds((prev) => {
          if (!prev.has(currentCardId)) return prev;
          const next = new Set(prev);
          next.delete(currentCardId);
          return next;
        });
        nextQueue = nextQueue.filter(
          (item, idx) => idx <= currentIndex || item.card.id !== currentCardId
        );
      }

      setQueue(nextQueue);

      if (currentIndex + 1 < nextQueue.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setIsFinished(true);
      }
    },
    [currentCard, currentIndex, directionMode, queue, onUpdateCard]
  );

  const handleRestart = useCallback(() => {
    setQueue(
      buildStudyQueue(cards, settings, effectiveDailyNew, directionMode, cardLimit, durationMins)
    );
    setCurrentIndex(0);
    setIsFlipped(false);
    setTotalReviewed(0);
    setRememberedCount(0);
    setForgottenCardIds(new Set());
    setSecondsRemaining(durationMins * 60);
    setIsFinished(false);
  }, [cards, settings, effectiveDailyNew, directionMode, cardLimit, durationMins]);

  const handleReviewForgotten = useCallback(() => {
    const forgottenList = cards.filter((c) => forgottenCardIds.has(c.id));
    if (forgottenList.length === 0) {
      handleRestart();
      return;
    }
    const unique = Array.from(new Map(forgottenList.map((c) => [c.id, c])).values());
    setQueue(
      unique.map((card) => ({ card, direction: computeCardDirection(card, directionMode) }))
    );
    setCurrentIndex(0);
    setIsFlipped(false);
    setTotalReviewed(0);
    setRememberedCount(0);
    setSecondsRemaining(0);
    setIsFinished(false);
  }, [cards, directionMode, forgottenCardIds, handleRestart]);

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
    <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Top Minimal Header */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer"
            title="Завершить [Esc]"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsEditingCard(true)}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer"
            title="Редактировать"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clean Progress Line */}
        <div className="flex-1 max-w-sm mx-2">
          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-zinc-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Counter & Optional Timer */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 tabular-nums">
          {durationMins > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-white/[0.08]">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>
                {secondsRemaining === 0
                  ? '0:00'
                  : `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`}
              </span>
            </div>
          )}
          <span>
            {currentIndex + 1} / {queue.length}
          </span>
        </div>
      </div>

      {/* Time-Up Gentle Banner */}
      {durationMins > 0 && secondsRemaining === 0 && (
        <div className="w-full max-w-2xl mx-auto mt-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-between text-xs text-zinc-300">
          <span>Время вышло ({queue.length - currentIndex} карт осталось)</span>
          <button
            type="button"
            onClick={() => setIsFinished(true)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg border border-white/10 cursor-pointer"
          >
            Завершить
          </button>
        </div>
      )}

      {/* Main Centered Flashcard (key resets gloss smoothly per card) */}
      <div className="w-full flex justify-center items-center my-auto py-3">
        <FlashCard
          key={currentCard.id}
          card={currentCard}
          direction={currentDirection}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          onRate={handleRate}
          onEdit={() => setIsEditingCard(true)}
          showImages={settings.showImages}
          voiceAccent={settings.voiceAccent}
          voiceGender={settings.voiceGender}
          speechRate={settings.speechRate}
          showTranscription={settings.showTranscription ?? true}
        />
      </div>

      {/* Bottom 2-Button Controls */}
      <div className="w-full flex justify-center pb-2 sm:pb-4">
        <StudyControls
          card={currentCard}
          isFlipped={isFlipped}
          disabled={isEditingCard}
          onFlip={handleFlip}
          onRate={handleRate}
          onReplayAudio={handleReplayAudio}
        />
      </div>

      {/* In-Session Edit Dialog */}
      <CardEditModal
        isOpen={isEditingCard}
        deckId={currentCard.deckId}
        cardToEdit={currentCard}
        settings={settings}
        onClose={() => setIsEditingCard(false)}
        onSaveCard={(savedCard) => {
          onUpdateCard(savedCard);
          setQueue((prev) =>
            prev.map((item) =>
              item.card.id === savedCard.id ? { ...item, card: savedCard } : item
            )
          );
          setIsEditingCard(false);
        }}
        onDeleteCard={(cardId) => {
          if (onDeleteCard) onDeleteCard(cardId);
          const nextQueue = queue.filter((item) => item.card.id !== cardId);
          setQueue(nextQueue);
          setIsEditingCard(false);
          if (nextQueue.length === 0 || currentIndex >= nextQueue.length) {
            setIsFinished(true);
          }
        }}
      />
    </div>
  );
};
