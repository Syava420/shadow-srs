'use client';

import React, { useState, useMemo } from 'react';
import { X, Plus, Layers } from 'lucide-react';
import { AppSettings, Deck, FlashCard } from '@/types';
import { ModalDialog } from './ModalDialog';
import { SingleWordTab } from './SingleWordTab';
import { BatchImportTab } from './BatchImportTab';

interface ImportModalProps {
  isOpen: boolean;
  initialTab?: 'single' | 'batch';
  onClose: () => void;
  decks: Deck[];
  existingCards: FlashCard[];
  selectedDeckId: string | null;
  settings: AppSettings;
  onImportCards: (newCards: FlashCard[]) => void;
}

const ImportModalInner: React.FC<Omit<ImportModalProps, 'isOpen'>> = ({
  initialTab = 'single',
  onClose,
  decks,
  existingCards,
  selectedDeckId,
  settings,
  onImportCards,
}) => {
  const [tab, setTab] = useState<'single' | 'batch'>(initialTab);
  const [targetDeckId, setTargetDeckId] = useState(selectedDeckId || decks[0]?.id || '');

  const deckCards = useMemo(() => {
    return existingCards.filter((c) => c.deckId === targetDeckId);
  }, [existingCards, targetDeckId]);

  return (
    <div className="flex flex-col max-h-[85dvh] space-y-4">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div
          className="flex bg-zinc-950 border border-white/[0.08] p-1 rounded-xl gap-1"
          role="tablist"
          aria-label="Режим добавления"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'single'}
            onClick={() => setTab('single')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'single'
                ? 'bg-zinc-800 text-zinc-100 border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Одно слово</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'batch'}
            onClick={() => setTab('batch')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'batch'
                ? 'bg-zinc-800 text-zinc-100 border border-white/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Пачка слов</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {decks.length > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs bg-zinc-950 border border-white/[0.06] rounded-xl px-3 py-2">
          <span className="text-zinc-400 shrink-0">В колоду:</span>
          <select
            value={targetDeckId}
            onChange={(e) => setTargetDeckId(e.target.value)}
            className="bg-transparent text-zinc-200 text-xs focus:outline-none cursor-pointer truncate max-w-[260px]"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id} className="bg-zinc-900">
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {tab === 'single' ? (
        <SingleWordTab
          targetDeckId={targetDeckId}
          settings={settings}
          onAdd={(card) => onImportCards([card])}
          onClose={onClose}
        />
      ) : (
        <BatchImportTab
          targetDeckId={targetDeckId}
          deckCards={deckCards}
          onImport={onImportCards}
          onClose={onClose}
        />
      )}
    </div>
  );
};

export const ImportModal: React.FC<ImportModalProps> = (props) => {
  return (
    <ModalDialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      ariaLabel="Добавить слово или пачку слов"
      className="w-[calc(100%-1.5rem)] max-w-xl bg-[#111216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-100"
    >
      <ImportModalInner
        key={`${props.initialTab || 'single'}-${props.selectedDeckId || ''}-${props.isOpen}`}
        initialTab={props.initialTab}
        onClose={props.onClose}
        decks={props.decks}
        existingCards={props.existingCards}
        selectedDeckId={props.selectedDeckId}
        settings={props.settings}
        onImportCards={props.onImportCards}
      />
    </ModalDialog>
  );
};
