'use client';

import React, { useState, useRef } from 'react';
import { Volume2, RotateCcw } from 'lucide-react';
import { FlashCard as FlashCardType } from '@/types';
import { tts } from '@/lib/tts';

export type CardDirection = 'ru_to_en' | 'en_to_ru';

interface FlashCardProps {
  card: FlashCardType;
  direction: CardDirection;
  isFlipped: boolean;
  onFlip: () => void;
  onRate: (isRemembered: boolean) => void;
  showImages: boolean;
  voiceAccent: 'en-US' | 'en-GB';
  speechRate: number;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  card,
  direction,
  isFlipped,
  onFlip,
  onRate,
  showImages,
  voiceAccent,
  speechRate,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const isDragging = useRef(false);
  const lastTouchEndRef = useRef<number>(0);

  // Decide front/back text based on direction
  const isRuToEn = direction === 'ru_to_en';
  const questionText = isRuToEn ? card.front : card.back;
  const answerText = isRuToEn ? card.back : card.front;

  const handleReplayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    tts.speak(card.back, { accent: voiceAccent, rate: speechRate });
  };

  // Touch Gesture Handlers (Mobile Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartX;
    setDragOffset(diffX);
  };

  const handleTouchEnd = () => {
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
    if (Date.now() - lastTouchEndRef.current < 450) {
      return;
    }
    onFlip();
  };

  const swipeRotation = dragOffset * 0.05;
  const swipeGlow =
    dragOffset > 30
      ? 'border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
      : dragOffset < -30
      ? 'border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
      : 'border-zinc-800/80 hover:border-zinc-700/80';

  return (
    <div
      onClick={handleClick}
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
          className={`absolute inset-0 w-full h-full backface-hidden rounded-3xl bg-[#121215] border ${swipeGlow} p-6 md:p-12 flex flex-col items-center justify-between shadow-2xl transition-all`}
        >
          {/* Top Indicators */}
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
              {isRuToEn ? '🇷🇺 → 🇺🇸' : '🇺🇸 → 🇷🇺 (Аудирование)'}
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
          <div className="text-center my-auto px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-zinc-100 leading-relaxed max-w-2xl mx-auto">
              {questionText}
            </h2>
          </div>

          <div className="text-[11px] font-mono text-zinc-600">
            клик для переворота
          </div>
        </div>

        {/* BACK SIDE (ANSWER) */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl bg-[#131317] border ${swipeGlow} p-6 md:p-12 flex flex-col items-center justify-between shadow-2xl transition-all`}
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

          {/* Centered Answer Text + Art */}
          <div className="my-auto text-center flex flex-col items-center px-4">
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
          </div>

          {/* Question Reminder at bottom */}
          <div className="text-center text-xs text-zinc-400 max-w-lg">
            {questionText}
          </div>
        </div>
      </div>
    </div>
  );
};
