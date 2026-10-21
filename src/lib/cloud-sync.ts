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
}

const CHUNK_SIZE = 250; // Keep each document well under Firestore 1MB limit

export const cloudSync = {
  /**
   * Pushes all current local data to Firestore with a specific or current timestamp
   */
  async pushToCloud(
    folders: Folder[],
    decks: Deck[],
    cards: FlashCard[],
    stats: AppStats,
    settings: AppSettings,
    timestamp?: number
  ): Promise<boolean> {
    try {
      const now = timestamp || Date.now();
      storage.setLastUpdatedAt(now);

      // 1. Save metadata, folders, decks, stats, and settings
      await setDoc(doc(db, 'shadow_srs', 'metadata'), {
        version: 2,
        updatedAt: now,
        folders,
        decks,
        stats,
        settings,
        totalCards: cards.length,
        chunkCount: Math.ceil(cards.length / CHUNK_SIZE),
      });

      // 2. Save cards in chunks
      const chunkCount = Math.ceil(cards.length / CHUNK_SIZE);
      for (let i = 0; i < chunkCount; i++) {
        const chunk = cards.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await setDoc(doc(db, 'shadow_srs', `cards_chunk_${i}`), {
          chunkIndex: i,
          cards: chunk,
          updatedAt: now,
        });
      }

      return true;
    } catch (error) {
      console.error('Firebase cloud push failed:', error);
      return false;
    }
  },

  /**
   * Pulls all data from Firestore
   */
  async pullFromCloud(): Promise<{
    folders?: Folder[];
    decks?: Deck[];
    cards?: FlashCard[];
    stats?: AppStats;
    settings?: AppSettings;
    updatedAt: number;
  } | null> {
    try {
      const metaSnap = await getDoc(doc(db, 'shadow_srs', 'metadata'));
      if (!metaSnap.exists()) {
        return null;
      }

      const meta = metaSnap.data();
      const chunkCount = meta.chunkCount || 0;
      let allCards: FlashCard[] = [];

      for (let i = 0; i < chunkCount; i++) {
        const chunkSnap = await getDoc(doc(db, 'shadow_srs', `cards_chunk_${i}`));
        if (chunkSnap.exists()) {
          const chunkData = chunkSnap.data();
          if (Array.isArray(chunkData.cards)) {
            allCards = allCards.concat(chunkData.cards);
          }
        }
      }

      return {
        folders: meta.folders || [],
        decks: meta.decks || [],
        cards: allCards,
        stats: meta.stats,
        settings: meta.settings,
        updatedAt: meta.updatedAt || 0,
      };
    } catch (error) {
      console.error('Firebase cloud pull failed:', error);
      return null;
    }
  },

  /**
   * Performs timestamp-based synchronization (Last-Write-Wins without zombie resurrecting):
   * - If cloud was modified more recently than local: replace local storage with cloud (respects deletions!).
   * - If local has newer unpushed changes: push local to cloud.
   */
  async sync(): Promise<{ success: boolean; pulled: boolean; pushed: boolean }> {
    try {
      const cloudData = await this.pullFromCloud();

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
          await this.pushToCloud(localFolders, localDecks, localCards, localStats, localSettings, now);
          return { success: true, pulled: false, pushed: true };
        }
        return { success: true, pulled: false, pushed: false };
      }

      // Filter out any zombie decks or cards that were deleted by the user locally
      const cleanCloudDecks = (cloudData.decks || []).filter(d => !deletedDeckIds.includes(d.id));
      const cleanCloudCards = (cloudData.cards || []).filter(c => !deletedDeckIds.includes(c.deckId));

      // DATA PROTECTION SHIELD:
      // If local has significantly more cards than cloud (e.g. freshly imported 3,000 cards),
      // NEVER overwrite local with cloud! Always push local to cloud!
      if (localCards.length > cleanCloudCards.length && (localCards.length - cleanCloudCards.length > 10)) {
        console.warn('Local has more cards than cloud. Pushing local to cloud.');
        const now = storage.touch();
        await this.pushToCloud(localFolders, localDecks, localCards, localStats, localSettings, now);
        return { success: true, pulled: false, pushed: true };
      }

      const cloudTime = cloudData.updatedAt || 0;

      // Case 2: Cloud is strictly newer than local
      if (cloudTime > localTime) {
        // Safe stats merge: never wipe out today's study records with an older/empty cloud day!
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

      // Case 3: Local has newer changes made while offline (or localTime === 0 but local has cards)
      if (localTime > cloudTime || (localTime === 0 && localCards.length > 0)) {
        const now = localTime || storage.touch();
        await this.pushToCloud(
          localFolders,
          localDecks,
          localCards,
          localStats,
          localSettings,
          now
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
   * When another device deletes or adds anything, this device automatically
   * updates its local storage and triggers React re-render.
   */
  subscribeToCloud(onDataChanged: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    try {
      const metaRef = doc(db, 'shadow_srs', 'metadata');
      const unsubscribe = onSnapshot(
        metaRef,
        async (snap) => {
          if (!snap.exists()) return;
          const meta = snap.data();
          const cloudTime = meta.updatedAt || 0;
          const localTime = storage.getLastUpdatedAt();
          const localCards = storage.getCards();
          const deletedDeckIds = storage.getDeletedDeckIds();

          // Only pull if cloud timestamp is newer than our local actions
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
