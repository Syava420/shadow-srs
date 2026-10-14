'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Volume2, RotateCcw, Pencil, BookOpen } from 'lucide-react';
import { FlashCard as FlashCardType } from '@/types';
import { tts } from '@/lib/tts';
import { getRussianTranscription } from '@/lib/transcription';
import { getWordGloss, GlossItem } from '@/lib/gloss';
import { enrichEnglishOnline } from '@/lib/onlineEnrichment';

export type CardDirection = 'ru_to_en' | 'en_to_ru';

interface FlashCardProps {
  card: FlashCardType;
  direction: CardDirection;
  isFlipped: boolean;
  onFlip: () => void;
  onRate: (isRemembered: boolean) => void;
  onEdit: () => void;
  showImages: boolean;
  voiceAccent: 'en-US' | 'en-GB';
  speechRate: number;
  showTranscription?: boolean;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  card,
  direction,
  isFlipped,
  onFlip,
  onRate,
  onEdit,
  showImages,
  voiceAccent,
  speechRate,
  showTranscription = true,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const isDragging = useRef(false);
  const lastTouchEndRef = useRef<number>(0);

  // Long-press detection (450ms) to trigger edit modal
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  const startLongPress = () => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      onEdit();
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const [showGloss, setShowGloss] = useState(false);
  const [enrichedData, setEnrichedData] = useState<{ transcription?: string; gloss?: string } | null>(null);

  useEffect(() => {
    setShowGloss(false);
  }, [card.id]);

  useEffect(() => {
    let isCancelled = false;
    setEnrichedData(null);
    enrichEnglishOnline(card.back).then((res) => {
      if (!isCancelled && res) {
        setEnrichedData(res);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [card.id, card.back]);

  // Decide front/back text based on direction
  const isRuToEn = direction === 'ru_to_en';
  const questionText = isRuToEn ? card.front : card.back;
  const answerText = isRuToEn ? card.back : card.front;

  const rawTranscription = (card.transcription && card.transcription.trim())
    ? card.transcription.trim()
    : (enrichedData?.transcription || getRussianTranscription(card.back));
  const displayTranscription = rawTranscription
    ? (rawTranscription.startsWith('[') ? rawTranscription : `[${rawTranscription}]`)
    : '';

  const glossItems: GlossItem[] = useMemo(() => {
    const glossSource = (card.gloss && card.gloss.trim()) || enrichedData?.gloss;
    if (glossSource && glossSource.trim()) {
      const parts = glossSource.split('·').map(p => p.trim());
      return parts.map(p => {
        const match = p.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) return { word: match[1].trim(), gloss: match[2].trim() };
        return { word: p, gloss: '' };
      });
    }
    return getWordGloss(card.back);
  }, [card.back, card.gloss, enrichedData?.gloss]);

  const handleReplayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    tts.speak(card.back, { accent: voiceAccent, rate: speechRate });
  };

  // Touch Gesture Handlers (Mobile Swipe & Long Press)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    isDragging.current = true;
    startLongPress();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX === null || touchStartY === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX;
    const diffY = currentY - touchStartY;

    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
      cancelLongPress();
    }
    setDragOffset(diffX);
  };

  const handleTouchEnd = () => {
    cancelLongPress();
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      isDragging.current = false;
      setDragOffset(0);
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }

    if (!isDragging.current) return;
    isDragging.current = false;
    lastTouchEndRef.current = Date.now();

    if (dragOffset > 60) {
      onRate(true);
    } else if (dragOffset < -60) {
      onRate(false);
    } else if (Math.abs(dragOffset) < 15) {
      onFlip();
    }

    setDragOffset(0);
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }
    if (Date.now() - lastTouchEndRef.current < 450) {
      return;
    }
    onFlip();
  };

  const swipeRotation = dragOffset * 0.05;
  const swipeGlow =
    dragOffset > 30
      ? 'border-zinc-500'
      : dragOffset < -30
      ? 'border-zinc-700'
      : 'border-zinc-800/80 hover:border-zinc-700/80';

  return (
    <div
      onClick={handleClick}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragOffset !== 0 ? `translateX(${dragOffset}px) rotate(${swipeRotation}deg)` : undefined,
        transition: isDragging.current ? 'none' : 'transform 0.25s ease-out',
      }}
      className="w-full max-w-3xl h-[65vh] min-h-[380px] max-h-[640px] cursor-pointer perspective-1000 select-none touch-pan-y"
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT SIDE (QUESTION) */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-[#111114] border ${swipeGlow} p-6 md:p-12 flex flex-col items-center justify-between shadow-xl transition-all`}
        >
          {/* Top Indicators */}
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
              {isRuToEn ? 'RU → EN' : 'EN → RU · Аудирование'}
            </span>

            <div className="flex items-center gap-2">
              {!isRuToEn && (
                <button
                  type="button"
                  onClick={handleReplayAudio}
                  className="p-2 rounded-full bg-zinc-850 hover:bg-zinc-750 text-zinc-300 border border-zinc-750 transition-colors"
                  title="Повторить озвучку (R)"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer border border-zinc-800"
                title="Редактировать карточку (удерживание)"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
                className="p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer border border-zinc-800"
                title="Перевернуть"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Centered Question Text */}
          <div className="text-center my-auto px-4 w-full">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-zinc-100 leading-relaxed max-w-2xl mx-auto">
              {questionText}
            </h2>
            {!isRuToEn && showTranscription && displayTranscription && (
              <p className="text-sm sm:text-base text-zinc-400 mt-3 font-mono tracking-wide">
                {displayTranscription}
              </p>
            )}

            {/* Interlinear Word-by-Word Gloss */}
            {!isRuToEn && showGloss && glossItems.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-wrap justify-center items-start gap-x-3 gap-y-2 mt-4 px-3.5 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 max-w-xl mx-auto text-center"
              >
                {glossItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[36px]">
                    <span className="text-xs font-medium text-zinc-200">{item.word}</span>
                    <span className="text-[11px] text-zinc-400 font-normal">{item.gloss}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-600">
            <span className="w-8" />
            <span className="text-center">клик — переворот · удерживание — ред.</span>
            <div className="w-8 flex justify-end">
              {!isRuToEn && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGloss((prev) => !prev);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowGloss((prev) => !prev);
                  }}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    showGloss
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                  title={showGloss ? 'Скрыть пословный разбор' : 'Пословный дословный разбор'}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BACK SIDE (ANSWER) */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-[#111114] border ${swipeGlow} p-6 md:p-12 flex flex-col items-center justify-between shadow-xl transition-all`}
        >
          {/* Top Controls */}
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFlip();
              }}
              className="p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer border border-zinc-800"
              title="Перевернуть обратно"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer border border-zinc-800"
                title="Редактировать карточку (удерживание)"
              >
                <Pencil className="w-4 h-4" />
              </button>

              {isRuToEn && (
                <button
                  type="button"
                  onClick={handleReplayAudio}
                  className="p-2.5 rounded-full bg-zinc-850 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 shadow-md cursor-pointer transition-colors"
                  title="Повторить озвучку (R)"
                >
                  <Volume2 className="w-5 h-5 text-zinc-300" />
                </button>
              )}
            </div>
          </div>

          {/* Centered Answer Text + Art */}
          <div className="my-auto text-center flex flex-col items-center px-4 w-full">
            {showImages && card.imageUrl && (
              <div className="w-48 h-32 sm:w-60 sm:h-40 rounded-2xl overflow-hidden mb-6 border border-zinc-800 shadow-lg bg-zinc-900 flex-shrink-0">
                <img
                  src={card.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-100 tracking-wide max-w-2xl">
              {answerText}
            </h2>
            {isRuToEn && showTranscription && displayTranscription && (
              <p className="text-sm sm:text-base text-zinc-400 mt-3 font-mono tracking-wide">
                {displayTranscription}
              </p>
            )}

            {/* Interlinear Word-by-Word Gloss */}
            {isRuToEn && showGloss && glossItems.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-wrap justify-center items-start gap-x-3 gap-y-2 mt-4 px-3.5 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 max-w-xl mx-auto text-center"
              >
                {glossItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[36px]">
                    <span className="text-xs font-medium text-zinc-200">{item.word}</span>
                    <span className="text-[11px] text-zinc-400 font-normal">{item.gloss}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question Reminder & Toggle at bottom */}
          <div className="w-full flex items-center justify-between text-xs text-zinc-400">
            <span className="w-8" />
            <div className="text-center max-w-lg truncate">
              <span>{questionText}</span>
              {!isRuToEn && showTranscription && displayTranscription && (
                <span className="block text-[11px] text-zinc-500 font-mono mt-0.5">
                  {displayTranscription}
                </span>
              )}
            </div>
            <div className="w-8 flex justify-end">
              {isRuToEn && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGloss((prev) => !prev);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowGloss((prev) => !prev);
                  }}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    showGloss
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                  title={showGloss ? 'Скрыть пословный разбор' : 'Пословный дословный разбор'}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
