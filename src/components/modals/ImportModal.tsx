'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Check, CheckSquare, Square, Layers, Image as ImageIcon, FileText, AlertTriangle } from 'lucide-react';
import { Deck, ImportPreviewItem, FlashCard } from '@/types';
import { parsePastedText } from '@/lib/parser';
import { createNewFSRSCard } from '@/lib/fsrs';
import { generateThematicSvg } from '@/lib/image-service';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  existingCards: FlashCard[];
  selectedDeckId: string | null;
  onImportCards: (newCards: FlashCard[]) => void;
}

const DEMO_MASS_TEXT = `Не делай из мухи слона - Don't make a mountain out of a molehill
Мы с тобой на одной волне - We are on the same page
Это стоит каждого цента - It's worth every penny
Держи меня в курсе событий - Keep me in the loop
У меня мурашки по коже - I've got goosebumps`;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  decks,
  existingCards,
  selectedDeckId,
  onImportCards,
}) => {
  const [rawText, setRawText] = useState('');
  const [targetDeckId, setTargetDeckId] = useState(selectedDeckId || decks[0]?.id || '');
  const [autoAttachImages, setAutoAttachImages] = useState(true);

  // Set default targetDeckId when opening
  useEffect(() => {
    if (selectedDeckId) setTargetDeckId(selectedDeckId);
  }, [selectedDeckId, isOpen]);

  // Existing cards in selected target deck for deduplication
  const deckCards = useMemo(() => {
    return existingCards.filter(c => c.deckId === targetDeckId);
  }, [existingCards, targetDeckId]);

  // Parse and annotate duplicates
  const [items, setItems] = useState<ImportPreviewItem[]>([]);

  useEffect(() => {
    if (!rawText.trim()) {
      setItems([]);
      return;
    }

    const parsed = parsePastedText(rawText);
    const existingFronts = new Set(deckCards.map(c => normalize(c.front)));
    const existingBacks = new Set(deckCards.map(c => normalize(c.back)));
    const batchSeen = new Set<string>();

    const annotated: ImportPreviewItem[] = parsed.map(item => {
      const normFront = normalize(item.front);
      const normBack = normalize(item.back);
      const isAlreadyInDeck = existingFronts.has(normFront) || existingBacks.has(normBack);
      const isBatchDuplicate = batchSeen.has(normFront) || batchSeen.has(normBack);

      batchSeen.add(normFront);
      batchSeen.add(normBack);

      const isDuplicate = isAlreadyInDeck || isBatchDuplicate;
      return {
        ...item,
        isDuplicate,
        selected: !isDuplicate, // Uncheck duplicates by default
      };
    });

    setItems(annotated);
  }, [rawText, deckCards]);

  if (!isOpen) return null;

  const toggleItemSelection = (id: string) => {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const handleSelectAll = (select: boolean) => {
    setItems(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleConfirmImport = () => {
    if (!targetDeckId) {
      alert('Пожалуйста, выберите колоду для добавления.');
      return;
    }

    const selectedToImport = items.filter(i => i.selected);
    if (selectedToImport.length === 0) {
      alert('Нет выбранных фраз для импорта (все сняты или являются дубликатами).');
      return;
    }

    const newCards: FlashCard[] = selectedToImport.map((item, idx) => ({
      id: `card-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      deckId: targetDeckId,
      front: item.front,
      back: item.back,
      transcription: item.transcription,
      imageUrl: autoAttachImages ? generateThematicSvg(item.back) : undefined,
      fsrsCard: createNewFSRSCard(),
      createdAt: Date.now() + idx,
      timeSpentSeconds: 0,
    }));

    onImportCards(newCards);
    setRawText('');
    setItems([]);
    onClose();
  };

  const selectedCount = items.filter(i => i.selected).length;
  const duplicateCount = items.filter(i => i.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#121215] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Sparkles className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Импорт списка из нейросети
                {duplicateCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Дубликатов: {duplicateCount}
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400">
                Автоматически отсекает повторы и разделяет русский с английским
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Target Deck Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span>Поместить в колоду:</span>
            </div>
            <select
              value={targetDeckId}
              onChange={(e) => setTargetDeckId(e.target.value)}
              className="bg-zinc-850 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              {decks.map(deck => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </div>

          {/* Text Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="font-medium text-zinc-300">
                Вставьте список фраз через тире или запятую:
              </label>
              <button
                type="button"
                onClick={() => setRawText(DEMO_MASS_TEXT)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Пример 5 фраз
              </button>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Вставляйте сразу пачкой:
Не делай из мухи слона - Don't make a mountain out of a molehill
Мы с тобой на одной волне - We are on the same page"
              className="w-full bg-[#09090b] border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Options: Auto attach image */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <button
              type="button"
              onClick={() => setAutoAttachImages(!autoAttachImages)}
              className="flex items-center gap-2.5 text-xs text-zinc-300 hover:text-zinc-100 cursor-pointer"
            >
              {autoAttachImages ? (
                <CheckSquare className="w-4 h-4 text-zinc-200" />
              ) : (
                <Square className="w-4 h-4 text-zinc-600" />
              )}
              <span className="flex items-center gap-1.5 font-medium">
                <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                Автоматически создавать иллюстрации
              </span>
            </button>
          </div>

          {/* Live Preview List with Duplicate Badges */}
          {items.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-2">
                  <span>Распознано:</span>
                  <strong className="text-zinc-100 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-xs">
                    {items.length}
                  </strong>
                  {duplicateCount > 0 && (
                    <span className="text-amber-400 font-mono text-[11px]">
                      ({duplicateCount} дубликатов снято)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                  >
                    Выбрать все
                  </button>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                  >
                    Снять все
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-colors flex items-center gap-3 text-xs ${
                      item.selected
                        ? 'bg-zinc-900 border-zinc-700/80 text-zinc-200'
                        : item.isDuplicate
                        ? 'bg-amber-950/20 border-amber-900/40 text-amber-200/60 opacity-60'
                        : 'bg-zinc-950/60 border-zinc-850 text-zinc-600 opacity-50'
                    }`}
                  >
                    {item.selected ? (
                      <CheckSquare className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                    )}

                    <span className="text-[10px] font-mono text-zinc-500 w-6 flex-shrink-0">
                      #{idx + 1}
                    </span>

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="truncate max-w-[36%] text-zinc-400">
                        {item.front}
                      </span>
                      <span className="text-zinc-600 flex-shrink-0">→</span>
                      <span className="truncate max-w-[36%] font-medium text-zinc-200">
                        {item.back}
                      </span>
                      {item.transcription && (
                        <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline truncate max-w-[28%]">
                          {item.transcription}
                        </span>
                      )}
                    </div>

                    {item.isDuplicate && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-800/40 flex-shrink-0">
                        Дубликат
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            {selectedCount > 0 ? (
              <span>Будет добавлено: <strong className="text-zinc-200 font-mono">{selectedCount}</strong> карточек</span>
            ) : (
              <span>Выберите карточки для добавления</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={selectedCount === 0 || !targetDeckId}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedCount === 0 || !targetDeckId
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950 shadow-md font-semibold hover:scale-[1.01]'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Добавить {selectedCount} карточек</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
