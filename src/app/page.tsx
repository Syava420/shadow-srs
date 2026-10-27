'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Folder, Deck, FlashCard, AppSettings, AppStats, DirectionMode } from '@/types';
import { storage } from '@/lib/storage';
import { calculateDeckStats } from '@/lib/fsrs';
import { cloudSync, SyncStatus } from '@/lib/cloud-sync';
import { Navbar } from '@/components/layout/Navbar';
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
  const [mounted, setMounted] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [stats, setStats] = useState<AppStats>(storage.getStats());

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [activeStudyDeckId, setActiveStudyDeckId] = useState<string | null>(null);
  const activeStudyDeckIdRef = useRef<string | null>(null);
  activeStudyDeckIdRef.current = activeStudyDeckId;

  const [studyDirectionMode, setStudyDirectionMode] = useState<DirectionMode>('adaptive');
  const [studyCardLimit, setStudyCardLimit] = useState<number | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncProgress, setSyncProgress] = useState<number | undefined>(undefined);
  const debouncedPushRef = useRef<NodeJS.Timeout | null>(null);

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFolderDeckOpen, setIsFolderDeckOpen] = useState(false);
  const [folderDeckMode, setFolderDeckMode] = useState<'folder' | 'deck'>('deck');
  const [targetFolderIdForDeck, setTargetFolderIdForDeck] = useState<string | undefined>(undefined);
  const [editingItemForFolderDeck, setEditingItemForFolderDeck] = useState<{ id: string; name: string; description?: string; folderId?: string } | null>(null);

  const [isCardEditOpen, setIsCardEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);

  useEffect(() => {
    setFolders(storage.getFolders());
    const loadedDecks = storage.getDecks();
    setDecks(loadedDecks);
    setCards(storage.getCards());
    setSettings(storage.getSettings());
    setStats(storage.getStats());

    // Check if Anki deck is present; if not, auto-import from API
    if (!loadedDecks.some(d => d.id === 'deck-anki-slova')) {
      fetch('/api/anki-deck')
        .then(res => res.json())
        .then(data => {
          if (data.deck && data.cards) {
            storage.importDeckAndCards(data.deck, data.cards);
            setDecks(storage.getDecks());
            setCards(storage.getCards());
            setSelectedDeckId(data.deck.id);
          }
        })
        .catch(err => console.error('Auto-load Anki deck error:', err));
    } else if (loadedDecks.length > 0) {
      setSelectedDeckId(loadedDecks[0].id);
    }
    setMounted(true);

    // Initial background sync with Firebase Firestore
    cloudSync.sync((pct) => setSyncProgress(pct)).then(res => {
      if (res.success) {
        refreshData();
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
      setSyncProgress(undefined);
    }).catch(() => {
      setSyncStatus('offline');
      setSyncProgress(undefined);
    });

    // Realtime subscription: updates UI automatically when any other device changes anything
    // (Suppresses own device echo and avoids interrupting active study sessions)
    const unsubscribe = cloudSync.subscribeToCloud(() => {
      refreshData();
      setSyncStatus('synced');
    }, () => !!activeStudyDeckIdRef.current);

    const handleOnline = () => {
      setSyncStatus('syncing');
      cloudSync.sync().then(res => {
        if (res.success) {
          refreshData();
          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
      }).catch(() => setSyncStatus('offline'));
    };

    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshData = () => {
    setFolders(storage.getFolders());
    setDecks(storage.getDecks());
    setCards(storage.getCards());
    setSettings(storage.getSettings());
    setStats(storage.getStats());
  };

  const triggerCloudPush = (immediate = false) => {
    if (debouncedPushRef.current) clearTimeout(debouncedPushRef.current);
    const executePush = () => {
      setSyncStatus('syncing');
      setSyncProgress(15);
      cloudSync.pushToCloud(
        storage.getFolders(),
        storage.getDecks(),
        storage.getCards(),
        storage.getStats(),
        storage.getSettings(),
        storage.getLastUpdatedAt(),
        (pct) => setSyncProgress(pct)
      ).then(ok => {
        setSyncStatus(ok ? 'synced' : 'error');
        setSyncProgress(undefined);
      });
    };

    if (immediate) {
      executePush();
    } else {
      debouncedPushRef.current = setTimeout(executePush, 1000);
    }
  };

  const handleSyncWithCloud = async () => {
    setSyncStatus('syncing');
    setSyncProgress(15);
    const res = await cloudSync.sync((pct) => setSyncProgress(pct));
    if (res.success) {
      refreshData();
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
    setSyncProgress(undefined);
  };

  // Folder & Deck actions
  const handleCreateFolder = (name: string) => {
    const currentFolders = storage.getFolders();
    const newFolder: Folder = { id: `folder-${Date.now()}`, name, createdAt: Date.now() };
    const updated = [...currentFolders, newFolder];
    setFolders(updated);
    storage.saveFolders(updated);
    triggerCloudPush();
  };

  const handleUpdateFolder = (id: string, name: string) => {
    const currentFolders = storage.getFolders();
    const updated = currentFolders.map(f => f.id === id ? { ...f, name } : f);
    setFolders(updated);
    storage.saveFolders(updated);
    triggerCloudPush();
  };

  const handleCreateDeck = (name: string, description: string, folderId?: string) => {
    const currentDecks = storage.getDecks();
    const newDeck: Deck = { id: `deck-${Date.now()}`, folderId, name, description, createdAt: Date.now() };
    const updated = [...currentDecks, newDeck];
    setDecks(updated);
    storage.saveDecks(updated);
    setSelectedDeckId(newDeck.id);
    triggerCloudPush();
  };

  const handleUpdateDeck = (id: string, name: string, description: string, folderId?: string) => {
    const currentDecks = storage.getDecks();
    const updated = currentDecks.map(d => d.id === id ? { ...d, name, description, folderId } : d);
    setDecks(updated);
    storage.saveDecks(updated);
    triggerCloudPush();
  };

  const handleDeleteFolder = (folderId: string) => {
    const currentFolders = storage.getFolders();
    const currentDecks = storage.getDecks();
    const updatedFolders = currentFolders.filter(f => f.id !== folderId);
    const updatedDecks = currentDecks.map(d => d.folderId === folderId ? { ...d, folderId: undefined } : d);
    setFolders(updatedFolders);
    setDecks(updatedDecks);
    storage.saveFolders(updatedFolders);
    storage.saveDecks(updatedDecks);
    triggerCloudPush(true);
  };

  const handleDeleteDeck = (deckId: string) => {
    // Record tombstone so this deck can NEVER be resurrected by old cloud caches
    storage.markDeckDeleted(deckId);

    const currentDecks = storage.getDecks();
    const currentCards = storage.getCards();
    const updatedDecks = currentDecks.filter(d => d.id !== deckId);
    const updatedCards = currentCards.filter(c => c.deckId !== deckId);
    setDecks(updatedDecks);
    setCards(updatedCards);
    storage.saveDecks(updatedDecks);
    storage.saveCards(updatedCards);
    if (selectedDeckId === deckId) {
      setSelectedDeckId(updatedDecks[0]?.id || null);
    }
    triggerCloudPush(true);
  };

  // Card actions
  const handleImportCards = (newCards: FlashCard[]) => {
    const currentCards = storage.getCards();
    const updated = [...currentCards, ...newCards];
    setCards(updated);
    storage.saveCards(updated);
    triggerCloudPush(true);
  };

  const handleSaveCard = (card: FlashCard) => {
    const currentCards = storage.getCards();
    const index = currentCards.findIndex(c => c.id === card.id);
    let updated: FlashCard[];
    if (index >= 0) {
      updated = [...currentCards];
      updated[index] = card;
    } else {
      updated = [...currentCards, card];
    }
    setCards(updated);
    storage.saveCards(updated);
    triggerCloudPush();
  };

  const handleDeleteCard = (cardId: string) => {
    const currentCards = storage.getCards();
    const updated = currentCards.filter(c => c.id !== cardId);
    setCards(updated);
    storage.saveCards(updated);
    triggerCloudPush();
  };

  const handleUpdateCardAfterReview = (updatedCard: FlashCard) => {
    // Read from storage directly to avoid stale closures during continuous study sessions
    const currentCards = storage.getCards();
    const updated = currentCards.map(c => c.id === updatedCard.id ? updatedCard : c);
    setCards(updated);
    storage.saveCards(updated);
    setStats(storage.getStats());
    // NOTE: In-session reviews are written to local storage instantaneously (<1ms).
    // Cloud push happens only when the session ends or user exits to prevent lag and network spam.
  };

  if (!mounted) {
    return (
      <div className="h-screen bg-[#09090b] flex items-center justify-center text-zinc-500 text-xs">
        Загрузка ShadowSRS...
      </div>
    );
  }

  const selectedDeck = decks.find(d => d.id === selectedDeckId);
  const activeStudyDeck = decks.find(d => d.id === activeStudyDeckId);
  const globalStats = calculateDeckStats(cards);

  // If studying, show 100% Fullscreen Zen Mode (Navbar and headers are completely hidden)
  if (activeStudyDeck) {
    return (
      <StudySession
        cards={cards.filter(c => c.deckId === activeStudyDeck.id)}
        settings={settings}
        directionMode={studyDirectionMode}
        cardLimit={studyCardLimit}
        onUpdateCard={handleUpdateCardAfterReview}
        onDeleteCard={handleDeleteCard}
        onExit={() => {
          setActiveStudyDeckId(null);
          refreshData();
          triggerCloudPush(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-300">
      {/* Top Navigation */}
      <Navbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenStats={() => {
          setStats(storage.getStats());
          setIsStatsOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDataChanged={refreshData}
        totalCards={globalStats.total}
        dueToday={globalStats.dueCount}
        syncStatus={syncStatus}
        syncProgress={syncProgress}
        onTriggerSync={handleSyncWithCloud}
      />

      {/* Main Deck Management Mode */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Collapsible Left Folder/Deck Navigator */}
        {isSidebarOpen && (
          <FolderTree
            folders={folders}
            decks={decks}
            cards={cards}
            selectedDeckId={selectedDeckId}
            onClose={() => setIsSidebarOpen(false)}
            onSelectDeck={(id) => {
              setSelectedDeckId(id);
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setIsSidebarOpen(false);
              }
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
            onDeleteDeck={handleDeleteDeck}
            onDeleteFolder={handleDeleteFolder}
          />
        )}

        {/* Right Active Deck View */}
        {selectedDeck ? (
          <DeckView
            deck={selectedDeck}
            cards={cards}
            settings={settings}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              storage.saveSettings(newSettings);
            }}
            onStartStudy={(deckId, mode, limit) => {
              if (mode) setStudyDirectionMode(mode);
              setStudyCardLimit(limit);
              setActiveStudyDeckId(deckId);
            }}
            onOpenImport={() => setIsImportOpen(true)}
            onAddCard={() => {
              setEditingCard(null);
              setIsCardEditOpen(true);
            }}
            onEditCard={(card) => {
              setEditingCard(card);
              setIsCardEditOpen(true);
            }}
            onDeleteCard={handleDeleteCard}
            onEditDeck={(deck) => {
              setFolderDeckMode('deck');
              setEditingItemForFolderDeck(deck);
              setIsFolderDeckOpen(true);
            }}
            onDeleteDeck={handleDeleteDeck}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <Layers className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400 font-medium">Выберите или создайте колоду</p>
            <p className="text-xs text-zinc-600 mt-1">
              Используйте боковую панель для переключения колод.
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        decks={decks}
        existingCards={cards}
        selectedDeckId={selectedDeckId}
        onImportCards={handleImportCards}
      />

      <CardEditModal
        isOpen={isCardEditOpen}
        deckId={selectedDeckId || ''}
        cardToEdit={editingCard}
        onClose={() => {
          setIsCardEditOpen(false);
          setEditingCard(null);
        }}
        onSaveCard={handleSaveCard}
        onDeleteCard={handleDeleteCard}
      />

      <FolderDeckModal
        isOpen={isFolderDeckOpen}
        mode={folderDeckMode}
        targetFolderId={targetFolderIdForDeck}
        editingItem={editingItemForFolderDeck}
        folders={folders}
        onClose={() => {
          setIsFolderDeckOpen(false);
          setEditingItemForFolderDeck(null);
        }}
        onCreateFolder={handleCreateFolder}
        onCreateDeck={handleCreateDeck}
        onUpdateFolder={handleUpdateFolder}
        onUpdateDeck={handleUpdateDeck}
        onDelete={(id) => {
          if (folderDeckMode === 'folder') {
            handleDeleteFolder(id);
          } else {
            handleDeleteDeck(id);
          }
        }}
      />

      <StatsModal
        isOpen={isStatsOpen}
        stats={stats}
        cards={cards}
        settings={settings}
        onClose={() => setIsStatsOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          storage.saveSettings(newSettings);
        }}
        onResetAll={() => {
          storage.resetAll();
          refreshData();
        }}
      />
    </div>
  );
}
