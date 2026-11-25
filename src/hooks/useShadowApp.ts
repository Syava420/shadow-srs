'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { Folder, Deck, FlashCard, AppSettings, AppStats } from '@/types';
import { storage } from '@/lib/storage';
import { cloudSync, SyncStatus } from '@/lib/cloud-sync';

const emptySubscribe = () => () => {};

/**
 * Centralized ShadowSRS application state hook.
 * Handles local persistence, non-destructive Firebase cloud sync, daily new-card overrides,
 * and strict React 19 purity/hydration rules.
 */
export function useShadowApp() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [folders, setFolders] = useState<Folder[]>(() =>
    typeof window !== 'undefined' ? storage.getFolders() : []
  );
  const [decks, setDecks] = useState<Deck[]>(() =>
    typeof window !== 'undefined' ? storage.getDecks() : []
  );
  const [cards, setCards] = useState<FlashCard[]>(() =>
    typeof window !== 'undefined' ? storage.getCards() : []
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    typeof window !== 'undefined' ? storage.getSettings() : storage.getSettings()
  );
  const [stats, setStats] = useState<AppStats>(() =>
    typeof window !== 'undefined' ? storage.getStats() : storage.getStats()
  );
  const [dailyNewOverride, setDailyNewOverrideState] = useState<number | null>(() =>
    typeof window !== 'undefined' ? storage.getDailyNewOverride() : null
  );

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const loadedDecks = storage.getDecks();
    return loadedDecks[0]?.id || null;
  });

  const [activeStudyDeckId, setActiveStudyDeckId] = useState<string | null>(null);
  const activeStudyDeckIdRef = useRef<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle'
  );
  const [syncProgress, setSyncProgress] = useState<number | undefined>(undefined);
  const debouncedPushRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    activeStudyDeckIdRef.current = activeStudyDeckId;
  }, [activeStudyDeckId]);

  const refreshData = useCallback(() => {
    const updatedDecks = storage.getDecks();
    setFolders(storage.getFolders());
    setDecks(updatedDecks);
    setCards(storage.getCards());
    setSettings(storage.getSettings());
    setStats(storage.getStats());
    setDailyNewOverrideState(storage.getDailyNewOverride());
    setSelectedDeckId((prev) =>
      prev && updatedDecks.some((d) => d.id === prev) ? prev : updatedDecks[0]?.id || null
    );
  }, []);

  const triggerCloudPush = useCallback((immediate = false) => {
    if (debouncedPushRef.current) clearTimeout(debouncedPushRef.current);

    const executePush = () => {
      if (storage.isSandboxMode()) {
        setSyncStatus('synced');
        return;
      }
      setSyncStatus('syncing');
      setSyncProgress(15);
      cloudSync
        .pushToCloud(
          storage.getFolders(),
          storage.getDecks(),
          storage.getCards(),
          storage.getStats(),
          storage.getSettings(),
          storage.getLastUpdatedAt(),
          (pct) => setSyncProgress(pct)
        )
        .then((ok) => {
          setSyncStatus(ok ? 'synced' : 'error');
          setSyncProgress(undefined);
        });
    };

    if (immediate) {
      executePush();
    } else {
      debouncedPushRef.current = setTimeout(executePush, 1000);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentDecks = storage.getDecks();
    // Skip auto-fetching 3,000-card Anki JSON in lightweight ?sandbox=1 mode unless requested,
    // and in normal mode only fetch if not yet imported and not tombstoned.
    if (
      !storage.isSandboxMode() &&
      !currentDecks.some((d) => d.id === 'deck-anki-slova') &&
      !storage.getDeletedDeckIds().includes('deck-anki-slova')
    ) {
      fetch('/api/anki-deck')
        .then((res) => res.json())
        .then((data) => {
          if (data.deck && data.cards) {
            storage.importDeckAndCards(data.deck, data.cards);
            refreshData();
            setSelectedDeckId(data.deck.id);
          }
        })
        .catch((err) => console.error('Auto-load Anki deck error:', err));
    }

    cloudSync
      .sync((pct) => setSyncProgress(pct))
      .then((res) => {
        if (res.success) {
          if (res.pulled) refreshData();
          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
        setSyncProgress(undefined);
      })
      .catch(() => {
        setSyncStatus('offline');
        setSyncProgress(undefined);
      });

    const unsubscribe = cloudSync.subscribeToCloud(
      () => {
        refreshData();
        setSyncStatus('synced');
      },
      () => Boolean(activeStudyDeckIdRef.current)
    );

    const handleOnline = () => {
      setSyncStatus('syncing');
      cloudSync
        .sync()
        .then((res) => {
          if (res.success) {
            if (res.pulled) refreshData();
            setSyncStatus('synced');
          } else {
            setSyncStatus('offline');
          }
        })
        .catch(() => setSyncStatus('offline'));
    };

    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshData]);

  const handleSyncWithCloud = useCallback(async () => {
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
  }, [refreshData]);

  const setTodayNewLimitOverride = useCallback(
    (limit: number | null) => {
      const normalized = limit === settings.dailyNewLimit ? null : limit;
      storage.setDailyNewOverride(normalized);
      setDailyNewOverrideState(normalized);
    },
    [settings.dailyNewLimit]
  );

  const effectiveDailyNewLimit = dailyNewOverride ?? settings.dailyNewLimit ?? 20;

  const updateSettings = useCallback(
    (newSettings: AppSettings) => {
      setSettings(newSettings);
      storage.saveSettings(newSettings);
      if (dailyNewOverride !== null && dailyNewOverride === newSettings.dailyNewLimit) {
        storage.setDailyNewOverride(null);
        setDailyNewOverrideState(null);
      }
      triggerCloudPush();
    },
    [dailyNewOverride, triggerCloudPush]
  );

  const createFolder = useCallback(
    (name: string) => {
      const currentFolders = storage.getFolders();
      const newFolder: Folder = { id: `folder-${Date.now()}`, name, createdAt: Date.now() };
      const updated = [...currentFolders, newFolder];
      setFolders(updated);
      storage.saveFolders(updated);
      triggerCloudPush();
    },
    [triggerCloudPush]
  );

  const updateFolder = useCallback(
    (id: string, name: string) => {
      const updated = storage.getFolders().map((f) => (f.id === id ? { ...f, name } : f));
      setFolders(updated);
      storage.saveFolders(updated);
      triggerCloudPush();
    },
    [triggerCloudPush]
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const updatedFolders = storage.getFolders().filter((f) => f.id !== folderId);
      const updatedDecks = storage
        .getDecks()
        .map((d) => (d.folderId === folderId ? { ...d, folderId: undefined } : d));
      setFolders(updatedFolders);
      setDecks(updatedDecks);
      storage.saveFolders(updatedFolders);
      storage.saveDecks(updatedDecks);
      triggerCloudPush(true);
    },
    [triggerCloudPush]
  );

  const createDeck = useCallback(
    (name: string, description: string, folderId?: string) => {
      const newDeck: Deck = { id: `deck-${Date.now()}`, folderId, name, description, createdAt: Date.now() };
      const updated = [...storage.getDecks(), newDeck];
      setDecks(updated);
      storage.saveDecks(updated);
      setSelectedDeckId(newDeck.id);
      triggerCloudPush();
    },
    [triggerCloudPush]
  );

  const updateDeck = useCallback(
    (id: string, name: string, description: string, folderId?: string) => {
      const updated = storage
        .getDecks()
        .map((d) => (d.id === id ? { ...d, name, description, folderId } : d));
      setDecks(updated);
      storage.saveDecks(updated);
      triggerCloudPush();
    },
    [triggerCloudPush]
  );

  const deleteDeck = useCallback(
    (deckId: string) => {
      storage.markDeckDeleted(deckId);
      const updatedDecks = storage.getDecks().filter((d) => d.id !== deckId);
      const updatedCards = storage.getCards().filter((c) => c.deckId !== deckId);
      setDecks(updatedDecks);
      setCards(updatedCards);
      storage.saveDecks(updatedDecks);
      storage.saveCards(updatedCards);
      setSelectedDeckId((prev) => (prev === deckId ? updatedDecks[0]?.id || null : prev));
      triggerCloudPush(true);
    },
    [triggerCloudPush]
  );

  const importCards = useCallback(
    (newCards: FlashCard[]) => {
      const updated = [...newCards, ...storage.getCards()];
      setCards(updated);
      storage.saveCards(updated);
      triggerCloudPush(true);
    },
    [triggerCloudPush]
  );

  const saveCard = useCallback(
    (card: FlashCard) => {
      const current = storage.getCards();
      const index = current.findIndex((c) => c.id === card.id);
      const updated =
        index >= 0
          ? current.map((c, i) => (i === index ? card : c))
          : [card, ...current];
      setCards(updated);
      storage.saveCards(updated);
      triggerCloudPush();
    },
    [triggerCloudPush]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      const updated = storage.getCards().filter((c) => c.id !== cardId);
      setCards(updated);
      storage.saveCards(updated);
      triggerCloudPush();
    },
    [triggerCloudPush]
  );

  const updateCardAfterReview = useCallback((updatedCard: FlashCard) => {
    const updated = storage
      .getCards()
      .map((c) => (c.id === updatedCard.id ? updatedCard : c));
    setCards(updated);
    storage.saveCards(updated);
    setStats(storage.getStats());
  }, []);

  const resetAll = useCallback(() => {
    storage.resetAll();
    refreshData();
  }, [refreshData]);

  return {
    mounted,
    folders,
    decks,
    cards,
    settings,
    stats,
    selectedDeckId,
    setSelectedDeckId,
    activeStudyDeckId,
    setActiveStudyDeckId,
    syncStatus,
    syncProgress,
    dailyNewOverride,
    effectiveDailyNewLimit,
    setTodayNewLimitOverride,
    refreshData,
    triggerCloudPush,
    handleSyncWithCloud,
    updateSettings,
    createFolder,
    updateFolder,
    deleteFolder,
    createDeck,
    updateDeck,
    deleteDeck,
    importCards,
    saveCard,
    deleteCard,
    updateCardAfterReview,
    resetAll,
  };
}
