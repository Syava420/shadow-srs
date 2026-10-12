import { doc, getDoc, setDoc } from 'firebase/firestore';
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
   * Pushes all current local data to Firestore
   */
  async pushToCloud(
    folders: Folder[],
    decks: Deck[],
    cards: FlashCard[],
    stats: AppStats,
    settings: AppSettings
  ): Promise<boolean> {
    try {
      const now = Date.now();

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
   * Pulls all data from Firestore and merges with local storage
   */
  async pullFromCloud(): Promise<{
    folders?: Folder[];
    decks?: Deck[];
    cards?: FlashCard[];
    stats?: AppStats;
    settings?: AppSettings;
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
      };
    } catch (error) {
      console.error('Firebase cloud pull failed:', error);
      return null;
    }
  },

  /**
   * Performs smart two-way synchronization:
   * 1. If cloud has data, load cloud data into local storage.
   * 2. If cloud is empty but local has data, upload local data to cloud.
   */
  async sync(): Promise<{ success: boolean; pulled: boolean; pushed: boolean }> {
    try {
      const cloudData = await this.pullFromCloud();

      const localDecks = storage.getDecks();
      const localCards = storage.getCards();
      const localFolders = storage.getFolders();
      const localStats = storage.getStats();
      const localSettings = storage.getSettings();

      // If cloud has data and it has cards
      if (cloudData && cloudData.cards && cloudData.cards.length > 0) {
        // Merge cloud cards with local (cloud takes priority for existing ids)
        const cloudCardIds = new Set(cloudData.cards.map(c => c.id));
        const localOnlyCards = localCards.filter(c => !cloudCardIds.has(c.id));
        const mergedCards = [...cloudData.cards, ...localOnlyCards];

        // Merge decks
        const cloudDeckIds = new Set(cloudData.decks?.map(d => d.id) || []);
        const localOnlyDecks = localDecks.filter(d => !cloudDeckIds.has(d.id));
        const mergedDecks = [...(cloudData.decks || []), ...localOnlyDecks];

        // Save locally
        if (cloudData.folders && cloudData.folders.length > 0) storage.saveFolders(cloudData.folders);
        storage.saveDecks(mergedDecks);
        storage.saveCards(mergedCards);
        if (cloudData.stats) storage.saveStats(cloudData.stats);
        if (cloudData.settings) storage.saveSettings(cloudData.settings);

        // If local had extra items, push merged back to cloud
        if (localOnlyCards.length > 0 || localOnlyDecks.length > 0) {
          await this.pushToCloud(
            cloudData.folders || localFolders,
            mergedDecks,
            mergedCards,
            cloudData.stats || localStats,
            cloudData.settings || localSettings
          );
        }

        return { success: true, pulled: true, pushed: localOnlyCards.length > 0 };
      }

      // If cloud is empty or has fewer cards than local, push local to cloud
      if (localCards.length > 0) {
        await this.pushToCloud(localFolders, localDecks, localCards, localStats, localSettings);
        return { success: true, pulled: false, pushed: true };
      }

      return { success: true, pulled: false, pushed: false };
    } catch (e) {
      console.error('Sync failed:', e);
      return { success: false, pulled: false, pushed: false };
    }
  },
};
