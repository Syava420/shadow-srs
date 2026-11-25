'use client';

import React from 'react';
import { Plus, Settings, Flame, ChevronDown, BarChart3, RefreshCw, Layers } from 'lucide-react';
import { SyncStatus } from '@/lib/cloud-sync';

interface NavbarProps {
  deckName?: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenAddWords: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  streakDays: number;
  dueToday: number;
  newCount: number;
  syncStatus?: SyncStatus;
  syncProgress?: number;
  onTriggerSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  deckName,
  isSidebarOpen,
  onToggleSidebar,
  onOpenAddWords,
  onOpenStats,
  onOpenSettings,
  streakDays,
  dueToday,
  newCount,
  syncStatus = 'idle',
  syncProgress,
  onTriggerSync,
}) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#09090b]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Clean Deck Switcher Dropdown Trigger (No logo, no version, no avatar) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-expanded={isSidebarOpen}
          className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg hover:bg-zinc-900 text-left min-w-0 flex-1 max-w-[260px] sm:max-w-xs transition-colors cursor-pointer group"
          title="Выбрать или создать колоду"
        >
          <Layers className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
            {deckName || 'Колоды'}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0 transition-transform ${
              isSidebarOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Right: Quiet Telemetry + Sync Dot + Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Unified Telemetry Strip */}
          <div className="flex items-center gap-2 sm:gap-2.5 bg-zinc-950 border border-white/[0.08] px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono tabular-nums text-zinc-400">
            <span className="flex items-center gap-1 text-zinc-200" title="Серия дней подряд">
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{streakDays}д</span>
            </span>

            <span className="text-zinc-800">·</span>

            <span className="flex items-center gap-1" title="Карточек к повторению на сегодня">
              <span className="text-zinc-200 font-medium">{dueToday}</span>
              <span className="text-zinc-500">повт</span>
            </span>

            <span className="text-zinc-800 hidden xs:inline sm:inline">·</span>

            <span className="hidden xs:flex sm:flex items-center gap-1" title="Новых карточек в колоде">
              <span className="text-zinc-200 font-medium">{newCount}</span>
              <span className="text-zinc-500">нов</span>
            </span>
          </div>

          {/* Minimal Sync Status Dot Button */}
          <button
            type="button"
            onClick={onTriggerSync}
            title={
              syncStatus === 'synced'
                ? 'Синхронизировано с облаком. Нажмите для проверки.'
                : syncStatus === 'syncing'
                ? `Синхронизация (${syncProgress || 0}%)...`
                : syncStatus === 'offline'
                ? 'Офлайн-режим (данные сохранены локально)'
                : 'Синхронизировать с облаком'
            }
            className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-white/[0.08] flex items-center gap-1 transition-colors cursor-pointer"
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-400'
                    : syncStatus === 'error'
                    ? 'bg-rose-400'
                    : 'bg-zinc-500'
                }`}
              />
            )}
          </button>

          {/* Quick Add Word / Batch Button (Titanium, NOT blinding white) */}
          <button
            type="button"
            onClick={onOpenAddWords}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-100 border border-white/10 text-xs font-medium transition-all cursor-pointer"
            title="Добавить слово или пачку слов"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Добавить</span>
          </button>

          {/* Stats Button */}
          <button
            type="button"
            onClick={onOpenStats}
            title="Статистика и график активности"
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Настройки лимитов, голоса и бэкапа"
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
