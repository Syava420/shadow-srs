'use client';

import React, { useState } from 'react';
import { FlashCard, DirectionMode } from '@/types';
import { calculateDeckStats } from '@/lib/fsrs';
import { useShadowApp } from '@/hooks/useShadowApp';
import { Navbar } from '@/components/layout/Navbar';
import { AppSkeleton } from '@/components/layout/AppSkeleton';
import { FolderTree } from '@/components/deck/FolderTree';
import { DeckView } from '@/components/deck/DeckView';
import { StudySession } from '@/components/study/StudySession';
import { ImportModal } from '@/components/modals/ImportModal';
import { CardEditModal } from '@/components/modals/CardEditModal';
import { FolderDeckModal } from '@/components/modals/FolderDeckModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { StatsModal } from '@/components/modals/StatsModal';
import { Layers } from 'lucide-react';

export default function HomePage() {
  const app = useShadowApp();

  // Drawer & Study Session State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [studyDirectionMode, setStudyDirectionMode] = useState<DirectionMode>('adaptive');
  const [studyCardLimit, setStudyCardLimit] = useState<number | undefined>(undefined);

  // Dialogs State
  const [isAddWordsOpen, setIsAddWordsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFolderDeckOpen, setIsFolderDeckOpen] = useState(false);
  const [folderDeckMode, setFolderDeckMode] = useState<'folder' | 'deck'>('deck');
  const [targetFolderIdForDeck, setTargetFolderIdForDeck] = useState<string | undefined>(undefined);
  const [editingItemForFolderDeck, setEditingItemForFolderDeck] = useState<{
    id: string;
    name: string;
    description?: string;
    folderId?: string;
  } | null>(null);
  const [isCardEditOpen, setIsCardEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);

  if (!app.mounted) {
    return <AppSkeleton />;
  }

  const selectedDeck = app.decks.find((d) => d.id === app.selectedDeckId);
  const activeStudyDeck = app.decks.find((d) => d.id === app.activeStudyDeckId);

  const activeDeckCards = selectedDeck
    ? app.cards.filter((c) => c.deckId === selectedDeck.id)
    : app.cards;
  const headerStats = calculateDeckStats(activeDeckCards);

  // Fullscreen Study Mode
  if (activeStudyDeck) {
    return (
      <StudySession
        cards={app.cards.filter((c) => c.deckId === activeStudyDeck.id)}
        settings={app.settings}
        effectiveDailyNew={app.effectiveDailyNewLimit}
        directionMode={studyDirectionMode}
        cardLimit={studyCardLimit}
        onUpdateCard={app.updateCardAfterReview}
        onDeleteCard={app.deleteCard}
        onExit={() => {
          app.setActiveStudyDeckId(null);
          app.refreshData();
          app.triggerCloudPush(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-200">
      <Navbar
        deckName={selectedDeck?.name}
        isSidebarOpen={isDrawerOpen}
        onToggleSidebar={() => setIsDrawerOpen((prev) => !prev)}
        onOpenAddWords={() => setIsAddWordsOpen(true)}
        onOpenStats={() => {
          app.refreshData();
          setIsStatsOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        streakDays={app.stats.streakDays || 1}
        dueToday={headerStats.dueCount}
        newCount={headerStats.newCount}
        syncStatus={app.syncStatus}
        syncProgress={app.syncProgress}
        onTriggerSync={app.handleSyncWithCloud}
      />

      {/* On-Demand Folder/Deck Drawer */}
      {isDrawerOpen && (
        <FolderTree
          folders={app.folders}
          decks={app.decks}
          cards={app.cards}
          selectedDeckId={app.selectedDeckId}
          onClose={() => setIsDrawerOpen(false)}
          onSelectDeck={(id) => {
            app.setSelectedDeckId(id);
            setIsDrawerOpen(false);
          }}
          onCreateFolder={() => {
            setFolderDeckMode('folder');
            setEditingItemForFolderDeck(null);
            setIsFolderDeckOpen(true);
          }}
          onCreateDeck={(folderId) => {
            setFolderDeckMode('deck');
            setTargetFolderIdForDeck(folderId);
            setEditingItemForFolderDeck(null);
            setIsFolderDeckOpen(true);
          }}
          onEditFolder={(folder) => {
            setFolderDeckMode('folder');
            setEditingItemForFolderDeck(folder);
            setIsFolderDeckOpen(true);
          }}
          onEditDeck={(deck) => {
            setFolderDeckMode('deck');
            setEditingItemForFolderDeck(deck);
            setIsFolderDeckOpen(true);
          }}
          onDeleteDeck={app.deleteDeck}
          onDeleteFolder={app.deleteFolder}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full">
        {selectedDeck ? (
          <DeckView
            deck={selectedDeck}
            cards={app.cards}
            settings={app.settings}
            effectiveDailyNew={app.effectiveDailyNewLimit}
            dailyNewOverride={app.dailyNewOverride}
            onChangeTodayNewLimit={app.setTodayNewLimitOverride}
            onUpdateSettings={app.updateSettings}
            onStartStudy={(deckId, mode, limit) => {
              if (mode) setStudyDirectionMode(mode);
              setStudyCardLimit(limit);
              app.setActiveStudyDeckId(deckId);
            }}
            onOpenAddWords={() => setIsAddWordsOpen(true)}
            onEditCard={(card) => {
              setEditingCard(card);
              setIsCardEditOpen(true);
            }}
            onDeleteCard={app.deleteCard}
            onEditDeck={(deck) => {
              setFolderDeckMode('deck');
              setEditingItemForFolderDeck(deck);
              setIsFolderDeckOpen(true);
            }}
            onDeleteDeck={app.deleteDeck}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <Layers className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-300 font-medium">Выберите или создайте колоду</p>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium border border-white/10 cursor-pointer"
            >
              Открыть колоды
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <ImportModal
        isOpen={isAddWordsOpen}
        onClose={() => setIsAddWordsOpen(false)}
        decks={app.decks}
        existingCards={app.cards}
        selectedDeckId={app.selectedDeckId}
        settings={app.settings}
        onImportCards={app.importCards}
      />

      <CardEditModal
        isOpen={isCardEditOpen}
        deckId={app.selectedDeckId || ''}
        cardToEdit={editingCard}
        settings={app.settings}
        onClose={() => {
          setIsCardEditOpen(false);
          setEditingCard(null);
        }}
        onSaveCard={app.saveCard}
        onDeleteCard={app.deleteCard}
      />

      <FolderDeckModal
        isOpen={isFolderDeckOpen}
        mode={folderDeckMode}
        targetFolderId={targetFolderIdForDeck}
        editingItem={editingItemForFolderDeck}
        folders={app.folders}
        onClose={() => {
          setIsFolderDeckOpen(false);
          setEditingItemForFolderDeck(null);
        }}
        onCreateFolder={app.createFolder}
        onCreateDeck={app.createDeck}
        onUpdateFolder={app.updateFolder}
        onUpdateDeck={app.updateDeck}
        onDelete={(id) => {
          if (folderDeckMode === 'folder') {
            app.deleteFolder(id);
          } else {
            app.deleteDeck(id);
          }
        }}
      />

      <StatsModal
        isOpen={isStatsOpen}
        stats={app.stats}
        cards={app.cards}
        settings={app.settings}
        onClose={() => setIsStatsOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={app.settings}
        decks={app.decks}
        selectedDeckId={app.selectedDeckId}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={app.updateSettings}
        onImportCards={app.importCards}
        onDataChanged={app.refreshData}
        onResetAll={app.resetAll}
      />
    </div>
  );
}
