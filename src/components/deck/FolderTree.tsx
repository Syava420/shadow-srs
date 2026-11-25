'use client';

import React, { useState, useEffect } from 'react';
import { Folder as FolderType, Deck as DeckType, FlashCard } from '@/types';
import { calculateDeckStats } from '@/lib/fsrs';
import {
  Folder as FolderIcon,
  FolderOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';

interface FolderTreeProps {
  folders: FolderType[];
  decks: DeckType[];
  cards: FlashCard[];
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string) => void;
  onCreateFolder: () => void;
  onCreateDeck: (folderId?: string) => void;
  onEditFolder: (folder: FolderType) => void;
  onEditDeck: (deck: DeckType) => void;
  onDeleteDeck: (deckId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onClose: () => void;
}

/**
 * On-demand slide-over drawer for folders and decks.
 * Dismissible via Esc, backdrop click, or close button across desktop and mobile.
 */
export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  decks,
  cards,
  selectedDeckId,
  onSelectDeck,
  onCreateFolder,
  onCreateDeck,
  onEditFolder,
  onEditDeck,
  onDeleteDeck,
  onDeleteFolder,
  onClose,
}) => {
  const [openFolderIds, setOpenFolderIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const toggleFolder = (folderId: string) => {
    setOpenFolderIds((prev) => ({
      ...prev,
      [folderId]: !(prev[folderId] ?? true),
    }));
  };

  const folderDecksMap: Record<string, DeckType[]> = {};
  const rootDecks: DeckType[] = [];

  decks.forEach((deck) => {
    if (deck.folderId) {
      if (!folderDecksMap[deck.folderId]) folderDecksMap[deck.folderId] = [];
      folderDecksMap[deck.folderId].push(deck);
    } else {
      rootDecks.push(deck);
    }
  });

  const renderDeckRow = (deck: DeckType) => {
    const deckCards = cards.filter((c) => c.deckId === deck.id);
    const stats = calculateDeckStats(deckCards);
    const isSelected = selectedDeckId === deck.id;

    return (
      <div
        key={deck.id}
        onClick={() => onSelectDeck(deck.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onEditDeck(deck);
        }}
        className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
          isSelected
            ? 'bg-zinc-800 text-zinc-100 font-medium border border-white/10'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 mr-2">
          <Layers className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="truncate">{deck.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-mono tabular-nums text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-950 border border-white/[0.06]">
            {stats.dueCount > 0 ? stats.dueCount : stats.total}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditDeck(deck);
            }}
            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-zinc-200 transition-opacity cursor-pointer"
            title="Редактировать колоду"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Удалить колоду «${deck.name}» и все её карточки?`)) {
                onDeleteDeck(deck.id);
              }
            }}
            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-rose-400 transition-opacity cursor-pointer"
            title="Удалить колоду"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 animate-fadeIn"
      />

      <aside className="fixed top-0 bottom-0 left-0 z-50 w-80 max-w-[88vw] bg-[#0c0d12] border-r border-white/[0.1] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Колоды и папки
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCreateFolder}
              title="Создать папку"
              className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Папка</span>
            </button>
            <button
              type="button"
              onClick={() => onCreateDeck()}
              title="Создать колоду"
              className="px-2 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Колода</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 ml-1 cursor-pointer"
              title="Закрыть [Esc]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {folders.map((folder) => {
            const isOpen = openFolderIds[folder.id] ?? true;
            const folderDecks = folderDecksMap[folder.id] || [];

            return (
              <div key={folder.id} className="space-y-1">
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onEditFolder(folder);
                  }}
                  className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors text-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 text-left text-zinc-300 hover:text-zinc-100 font-medium cursor-pointer truncate mr-1"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                    {isOpen ? (
                      <FolderOpen className="w-4 h-4 text-zinc-400 shrink-0" />
                    ) : (
                      <FolderIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <span className="truncate">{folder.name}</span>
                  </button>

                  <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onCreateDeck(folder.id)}
                      title="Добавить колоду в папку"
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditFolder(folder)}
                      title="Переименовать папку"
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Удалить папку «${folder.name}»? Колоды останутся без папки.`)) {
                          onDeleteFolder(folder.id);
                        }
                      }}
                      title="Удалить папку"
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="pl-4 space-y-0.5 border-l border-white/[0.06] ml-3">
                    {folderDecks.length === 0 ? (
                      <div className="text-[11px] text-zinc-600 px-2 py-1">
                        Пустая папка
                      </div>
                    ) : (
                      folderDecks.map(renderDeckRow)
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {rootDecks.length > 0 && (
            <div className="pt-2 space-y-1">
              <div className="px-2 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Без папки
              </div>
              {rootDecks.map(renderDeckRow)}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
