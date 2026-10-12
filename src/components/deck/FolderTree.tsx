'use client';

import React, { useState } from 'react';
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
  X 
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
  onClose?: () => void;
}

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
  const [openFolderIds, setOpenFolderIds] = useState<Record<string, boolean>>({
    'folder-demo-1': true,
  });

  const toggleFolder = (folderId: string) => {
    setOpenFolderIds(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Group decks by folderId
  const folderDecksMap: Record<string, DeckType[]> = {};
  const rootDecks: DeckType[] = [];

  decks.forEach(deck => {
    if (deck.folderId) {
      if (!folderDecksMap[deck.folderId]) folderDecksMap[deck.folderId] = [];
      folderDecksMap[deck.folderId].push(deck);
    } else {
      rootDecks.push(deck);
    }
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {onClose && (
        <div
          onClick={onClose}
          className="fixed inset-0 top-16 bg-black/70 backdrop-blur-xs z-15 md:hidden"
        />
      )}

      <aside className="fixed md:static top-16 bottom-0 left-0 z-20 w-72 max-w-[85vw] bg-[#09090b] border-r border-zinc-800/80 flex flex-col h-[calc(100vh-4rem)] shadow-2xl md:shadow-none select-none">
        <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Колоды & Папки
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCreateFolder()}
              title="Создать папку"
              className="p-1 px-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Папка</span>
            </button>
            <button
              onClick={() => onCreateDeck()}
              title="Создать колоду"
              className="p-1 px-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Колода</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 md:hidden ml-1"
                title="Закрыть панель"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Render Folders */}
        {folders.map(folder => {
          const isOpen = openFolderIds[folder.id] ?? true;
          const folderDecks = folderDecksMap[folder.id] || [];

          return (
            <div key={folder.id} className="space-y-0.5">
              <div 
                onContextMenu={(e) => {
                  e.preventDefault();
                  onEditFolder(folder);
                }}
                className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-900/80 transition-colors text-xs"
              >
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="flex items-center gap-2 flex-1 text-left text-zinc-300 hover:text-zinc-100 font-medium cursor-pointer truncate mr-1"
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  )}
                  {isOpen ? (
                    <FolderOpen className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  ) : (
                    <FolderIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </button>

                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  <button
                    onClick={() => onCreateDeck(folder.id)}
                    title="Добавить колоду в папку"
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEditFolder(folder)}
                    title="Переименовать папку"
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить папку "${folder.name}"?`)) {
                        onDeleteFolder(folder.id);
                      }
                    }}
                    title="Удалить папку"
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-decks */}
              {isOpen && (
                <div className="pl-6 space-y-0.5 border-l border-zinc-800/60 ml-3">
                  {folderDecks.length === 0 ? (
                    <div className="text-[11px] text-zinc-600 px-2 py-1 italic">
                      Нет колод (нажмите +)
                    </div>
                  ) : (
                    folderDecks.map(deck => {
                      const deckCards = cards.filter(c => c.deckId === deck.id);
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
                          className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? 'bg-zinc-800/90 text-zinc-100 font-medium'
                              : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate flex-1 mr-2">
                            <Layers className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                            <span className="truncate">{deck.name}</span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {stats.dueCount > 0 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/50">
                                {stats.dueCount}
                              </span>
                            ) : stats.newCount > 0 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-950/50 text-blue-300 border border-blue-900/50">
                                {stats.newCount}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-600">
                                {stats.total}
                              </span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditDeck(deck);
                              }}
                              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-zinc-200 ml-1"
                              title="Редактировать / переместить колоду"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Удалить колоду "${deck.name}" и все её карточки?`)) {
                                  onDeleteDeck(deck.id);
                                }
                              }}
                              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded text-zinc-500 hover:text-red-400 ml-0.5"
                              title="Удалить колоду"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Root Decks (Outside Folders) */}
        {rootDecks.length > 0 && (
          <div className="pt-2">
            <div className="px-2 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Без папки
            </div>
            {rootDecks.map(deck => {
              const deckCards = cards.filter(c => c.deckId === deck.id);
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
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-zinc-800 text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-2">
                    <Layers className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    <span className="truncate">{deck.name}</span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {stats.dueCount > 0 ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/50">
                        {stats.dueCount}
                      </span>
                    ) : stats.newCount > 0 ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-950/50 text-blue-300 border border-blue-900/50">
                        {stats.newCount}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-600">
                        {stats.total}
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditDeck(deck);
                      }}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-zinc-200 ml-1"
                      title="Редактировать / переместить колоду"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить колоду "${deck.name}"?`)) {
                          onDeleteDeck(deck.id);
                        }
                      }}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded text-zinc-500 hover:text-red-400 ml-0.5"
                      title="Удалить колоду"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
