import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Folder, Deck, FlashCard, AppSettings, AppStats } from '@/types';
import { storage } from './storage';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CloudPayload {
  version: number;
  updatedAt: number;
  folders: Folder[];
  decks: Deck[];
  cards: FlashCard[];
  stats: AppStats;
  settings?: AppSettings;
  lastPushedBy?: string;
}

// 1,000 cards without SVG is ~300KB, well under Firestore 1MB limit.
// 3,000 cards requires only 3 documents instead of 12!
const CHUNK_SIZE = 1000;

// Unique client identifier to prevent downloading our own uploads (echo suppression)
const CLIENT_ID = typeof window !== 'undefined'
  ? (window.sessionStorage?.getItem('shadow_srs_client_id') || (() => {
      const id = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      try { window.sessionStorage?.setItem('shadow_srs_client_id', id); } catch {}
      return id;
    })())
  : 'server';

export const cloudSync = {
  getClientId(): string {
    return CLIENT_ID;
  },

  /**
   * Pushes all current local data to Firestore in parallel chunks.
   * Reports real-time percentage progress (0 - 100%).
   */
  async pushToCloud(
    folders: Folder[],
    decks: Deck[],
    cards: FlashCard[],
    stats: AppStats,
    settings: AppSettings,
    timestamp?: number,
    onProgress?: (percent: number) => void
  ): Promise<boolean> {
    try {
      const now = timestamp || Date.now();
      storage.setLastUpdatedAt(now);
      if (onProgress) onProgress(15);

      const chunkCount = Math.ceil(cards.length / CHUNK_SIZE);

      // 1. Save metadata, folders, decks, stats, and settings
      await setDoc(doc(db, 'shadow_srs', 'metadata'), {
        version: 2,
        updatedAt: now,
        folders,
        decks,
        stats,
        settings,
        totalCards: cards.length,
        chunkCount,
        lastPushedBy: CLIENT_ID,
      });

      if (onProgress) onProgress(35);

      if (chunkCount === 0) {
        if (onProgress) onProgress(100);
        return true;
      }

      // 2. Save card chunks in parallel
      let completedChunks = 0;
      const chunkPromises = [];

      for (let i = 0; i < chunkCount; i++) {
        const chunk = cards.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const p = setDoc(doc(db, 'shadow_srs', `cards_chunk_${i}`), {
          chunkIndex: i,
          cards: chunk,
          updatedAt: now,
        }).then(() => {
          completedChunks++;
          if (onProgress) {
            const pct = 35 + Math.round((completedChunks / chunkCount) * 65);
            onProgress(Math.min(100, pct));
          }
        });
        chunkPromises.push(p);
      }

      await Promise.all(chunkPromises);
      if (onProgress) onProgress(100);
      return true;
    } catch (error) {
      console.error('Firebase cloud push failed:', error);
      return false;
    }
  },

  /**
   * Pulls all data from Firestore in parallel chunks with progress reporting
   */
  async pullFromCloud(onProgress?: (percent: number) => void): Promise<{
    folders?: Folder[];
    decks?: Deck[];
    cards?: FlashCard[];
    stats?: AppStats;
    settings?: AppSettings;
    updatedAt: number;
    lastPushedBy?: string;
  } | null> {
    try {
      if (onProgress) onProgress(15);
      const metaSnap = await getDoc(doc(db, 'shadow_srs', 'metadata'));
      if (!metaSnap.exists()) {
        return null;
      }

      const meta = metaSnap.data();
      const chunkCount = meta.chunkCount || 0;
      if (onProgress) onProgress(35);

      if (chunkCount === 0) {
        if (onProgress) onProgress(100);
        return {
          folders: meta.folders || [],
          decks: meta.decks || [],
          cards: [],
          stats: meta.stats,
          settings: meta.settings,
          updatedAt: meta.updatedAt || 0,
          lastPushedBy: meta.lastPushedBy,
        };
      }

      // Download all chunks in parallel
      let downloadedCount = 0;
      const chunkPromises = [];

      for (let i = 0; i < chunkCount; i++) {
        const p = getDoc(doc(db, 'shadow_srs', `cards_chunk_${i}`)).then((chunkSnap) => {
          downloadedCount++;
          if (onProgress) {
            const pct = 35 + Math.round((downloadedCount / chunkCount) * 65);
            onProgress(Math.min(100, pct));
          }
          if (chunkSnap.exists()) {
            const chunkData = chunkSnap.data();
            return Array.isArray(chunkData.cards) ? (chunkData.cards as FlashCard[]) : [];
          }
          return [] as FlashCard[];
        });
        chunkPromises.push(p);
      }

      const chunkResults = await Promise.all(chunkPromises);
      const allCards = chunkResults.flat();

      if (onProgress) onProgress(100);

      return {
        folders: meta.folders || [],
        decks: meta.decks || [],
        cards: allCards,
        stats: meta.stats,
        settings: meta.settings,
        updatedAt: meta.updatedAt || 0,
        lastPushedBy: meta.lastPushedBy,
      };
    } catch (error) {
      console.error('Firebase cloud pull failed:', error);
      return null;
    }
  },

  /**
   * Performs timestamp-based synchronization with progress callback
   */
  async sync(onProgress?: (percent: number) => void): Promise<{ success: boolean; pulled: boolean; pushed: boolean }> {
    try {
      const cloudData = await this.pullFromCloud(onProgress);

      const localDecks = storage.getDecks();
      const localCards = storage.getCards();
      const localFolders = storage.getFolders();
      const localStats = storage.getStats();
      const localSettings = storage.getSettings();
      const localTime = storage.getLastUpdatedAt();
      const deletedDeckIds = storage.getDeletedDeckIds();

      // Case 1: Cloud is empty, push local to cloud
      if (!cloudData) {
        if (localCards.length > 0) {
          const now = storage.touch();
          await this.pushToCloud(localFolders, localDecks, localCards, localStats, localSettings, now, onProgress);
          return { success: true, pulled: false, pushed: true };
        }
        return { success: true, pulled: false, pushed: false };
      }

      // Filter out any tombstoned decks or cards
      const cleanCloudDecks = (cloudData.decks || []).filter(d => !deletedDeckIds.includes(d.id));
      const cleanCloudCards = (cloudData.cards || []).filter(c => !deletedDeckIds.includes(c.deckId));

      // DATA PROTECTION SHIELD:
      // If local has more cards than cloud, NEVER let cloud overwrite local! Always push local to cloud!
      if (localCards.length > cleanCloudCards.length && (localCards.length - cleanCloudCards.length > 10)) {
        console.warn('Local has more cards than cloud. Pushing local to cloud.');
        const now = storage.touch();
        await this.pushToCloud(localFolders, localDecks, localCards, localStats, localSettings, now, onProgress);
        return { success: true, pulled: false, pushed: true };
      }

      const cloudTime = cloudData.updatedAt || 0;

      // Case 2: Cloud is strictly newer than local
      if (cloudTime > localTime) {
        const mergedDailyHistory = { ...(cloudData.stats?.dailyHistory || {}) };
        for (const [dateKey, localDay] of Object.entries(localStats.dailyHistory || {})) {
          const cloudDay = mergedDailyHistory[dateKey];
          if (!cloudDay || (localDay.cardsReviewed || 0) > (cloudDay.cardsReviewed || 0)) {
            mergedDailyHistory[dateKey] = localDay;
          }
        }

        const mergedStats: AppStats = {
          streakDays: Math.max(localStats.streakDays || 1, cloudData.stats?.streakDays || 1),
          lastStudiedDate: localStats.lastStudiedDate || cloudData.stats?.lastStudiedDate,
          totalActiveSeconds: Math.max(localStats.totalActiveSeconds || 0, cloudData.stats?.totalActiveSeconds || 0),
          dailyHistory: mergedDailyHistory,
        };

        storage.saveFolders(cloudData.folders || [], true);
        storage.saveDecks(cleanCloudDecks, true);
        storage.saveCards(cleanCloudCards, true);
        storage.saveStats(mergedStats, true);
        if (cloudData.settings) storage.saveSettings(cloudData.settings, true);
        storage.setLastUpdatedAt(cloudTime);

        return { success: true, pulled: true, pushed: false };
      }

      // Case 3: Local has newer changes made offline
      if (localTime > cloudTime || (localTime === 0 && localCards.length > 0)) {
        const now = localTime || storage.touch();
        await this.pushToCloud(
          localFolders,
          localDecks,
          localCards,
          localStats,
          localSettings,
          now,
          onProgress
        );
        return { success: true, pulled: false, pushed: true };
      }

      // Case 4: Already identical
      return { success: true, pulled: false, pushed: false };
    } catch (e) {
      console.error('Sync failed:', e);
      return { success: false, pulled: false, pushed: false };
    }
  },

  /**
   * Listens for real-time changes in Firestore.
   * Suppresses own client echo to prevent UI freeze and redundant downloads.
   */
  subscribeToCloud(onDataChanged: () => void, isActivelyStudying?: () => boolean): () => void {
    if (typeof window === 'undefined') return () => {};

    try {
      const metaRef = doc(db, 'shadow_srs', 'metadata');
      const unsubscribe = onSnapshot(
        metaRef,
        async (snap) => {
          if (!snap.exists()) return;
          const meta = snap.data();

          // Suppress own echo: do not re-download if we were the ones who pushed!
          if (meta.lastPushedBy && meta.lastPushedBy === CLIENT_ID) {
            return;
          }

          // Do not interrupt active study sessions with full background reloads
          if (isActivelyStudying && isActivelyStudying()) {
            return;
          }

          const cloudTime = meta.updatedAt || 0;
          const localTime = storage.getLastUpdatedAt();
          const localCards = storage.getCards();
          const deletedDeckIds = storage.getDeletedDeckIds();

          if (cloudTime > localTime) {
            const fullCloud = await cloudSync.pullFromCloud();
            if (fullCloud) {
              const cleanCloudCards = (fullCloud.cards || []).filter(c => !deletedDeckIds.includes(c.deckId));
              const cleanCloudDecks = (fullCloud.decks || []).filter(d => !deletedDeckIds.includes(d.id));

              // Shield: don't let cloud wipe a larger local deck
              if (localCards.length > cleanCloudCards.length && (localCards.length - cleanCloudCards.length > 10)) {
                return;
              }

              const localStats = storage.getStats();
              const mergedDailyHistory = { ...(fullCloud.stats?.dailyHistory || {}) };
              for (const [dateKey, localDay] of Object.entries(localStats.dailyHistory || {})) {
                const cloudDay = mergedDailyHistory[dateKey];
                if (!cloudDay || (localDay.cardsReviewed || 0) > (cloudDay.cardsReviewed || 0)) {
                  mergedDailyHistory[dateKey] = localDay;
                }
              }

              storage.saveFolders(fullCloud.folders || [], true);
              storage.saveDecks(cleanCloudDecks, true);
              storage.saveCards(cleanCloudCards, true);
              if (fullCloud.stats) {
                storage.saveStats({
                  ...fullCloud.stats,
                  dailyHistory: mergedDailyHistory,
                }, true);
              }
              if (fullCloud.settings) storage.saveSettings(fullCloud.settings, true);
              storage.setLastUpdatedAt(cloudTime);
              onDataChanged();
            }
          }
        },
        (error) => {
          console.warn('Realtime cloud listener error:', error);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Could not initialize cloud listener:', err);
      return () => {};
    }
  },
};
