'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Check, CheckSquare, Square, AlertTriangle, Upload, FileUp } from 'lucide-react';
import { FlashCard } from '@/types';
import { parsePastedText } from '@/lib/parser';
import { createNewFSRSCard } from '@/lib/fsrs';

interface BatchImportTabProps {
  targetDeckId: string;
  deckCards: FlashCard[];
  onImport: (cards: FlashCard[]) => void;
  onClose: () => void;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

export const BatchImportTab: React.FC<BatchImportTabProps> = ({
  targetDeckId,
  deckCards,
  onImport,
  onClose,
}) => {
  const [rawText, setRawText] = useState('');
  const [selectionOverrides, setSelectionOverrides] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedItems = useMemo(() => {
    if (!rawText.trim()) return [];
    const parsed = parsePastedText(rawText);
    const existingFronts = new Set(deckCards.map((c) => normalize(c.front)));
    const existingBacks = new Set(deckCards.map((c) => normalize(c.back)));
    const batchSeen = new Set<string>();

    return parsed.map((item, idx) => {
      const normFront = normalize(item.front);
      const normBack = normalize(item.back);
      const isAlreadyInDeck = existingFronts.has(normFront) || existingBacks.has(normBack);
      const isBatchDuplicate = batchSeen.has(normFront) || batchSeen.has(normBack);
      batchSeen.add(normFront);
      batchSeen.add(normBack);

      const isDuplicate = isAlreadyInDeck || isBatchDuplicate;
      const stableKey = `${idx}-${normBack}`;
      const selected =
        selectionOverrides[stableKey] !== undefined ? selectionOverrides[stableKey] : !isDuplicate;

      return {
        ...item,
        id: stableKey,
        isDuplicate,
        selected,
      };
    });
  }, [rawText, deckCards, selectionOverrides]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(text);
      setSelectionOverrides({});
    } catch (err) {
      console.error('File read error:', err);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(text);
      setSelectionOverrides({});
    } catch (err) {
      console.error('File drop error:', err);
    }
  };

  const handleConfirmBatch = () => {
    if (!targetDeckId) return;
    const selectedToImport = parsedItems.filter((i) => i.selected);
    if (selectedToImport.length === 0) return;

    const newCards: FlashCard[] = selectedToImport.map((item, idx) => ({
      id: `card-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      deckId: targetDeckId,
      front: item.front,
      back: item.back,
      transcription: item.transcription,
      fsrsCard: createNewFSRSCard(),
      createdAt: Date.now() + idx,
      timeSpentSeconds: 0,
    }));

    onImport(newCards);
    onClose();
  };

  const selectedCount = parsedItems.filter((i) => i.selected).length;
  const duplicateCount = parsedItems.filter((i) => i.isDuplicate).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-400">Вставьте список или перетащите .txt файл</span>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.tsv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/[0.08] text-[11px] font-medium flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>Файл .txt</span>
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className="relative"
      >
        <textarea
          rows={5}
          autoFocus
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setSelectionOverrides({});
          }}
          placeholder={`Improve - Улучшать, совершенствовать\nResilience - Стойкость\nKeep me in the loop - Держи меня в курсе`}
          className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none leading-relaxed resize-y"
        />
        {isDragging && (
          <div className="absolute inset-0 bg-zinc-950/90 border-2 border-dashed border-zinc-400 rounded-xl flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            <FileUp className="w-6 h-6 text-zinc-300" />
            <span className="text-xs text-zinc-200">Отпустите файл для импорта</span>
          </div>
        )}
      </div>

      {parsedItems.length > 0 && (
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span>
                Распознано: <strong className="text-zinc-200 font-mono">{parsedItems.length}</strong>
              </span>
              {duplicateCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  дублей снято: {duplicateCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  parsedItems.forEach((it) => {
                    next[it.id] = true;
                  });
                  setSelectionOverrides(next);
                }}
                className="text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  parsedItems.forEach((it) => {
                    next[it.id] = false;
                  });
                  setSelectionOverrides(next);
                }}
                className="text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
              >
                Снять
              </button>
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {parsedItems.slice(0, 100).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setSelectionOverrides((prev) => ({
                    ...prev,
                    [item.id]: !item.selected,
                  }))
                }
                className={`w-full text-left p-2 rounded-lg border flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                  item.selected
                    ? 'bg-zinc-900 border-white/10 text-zinc-200'
                    : 'bg-zinc-950 border-white/[0.04] text-zinc-500 opacity-60'
                }`}
              >
                {item.selected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                )}
                <span className="truncate font-medium flex-1">{item.back}</span>
                <span className="text-zinc-600 shrink-0">—</span>
                <span className="truncate text-zinc-400 flex-1">{item.front}</span>
                {item.isDuplicate && (
                  <span className="text-[10px] font-mono text-amber-400 shrink-0">дубль</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors cursor-pointer"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleConfirmBatch}
          disabled={selectedCount === 0 || !targetDeckId}
          className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 border border-white/15 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Добавить ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
};
