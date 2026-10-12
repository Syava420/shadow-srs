'use client';

import React from 'react';
import { Layers, Sparkles, Settings, Download, Upload, PanelLeft, PanelLeftClose, BarChart3, Cloud, RefreshCw } from 'lucide-react';
import { storage } from '@/lib/storage';
import { SyncStatus } from '@/lib/cloud-sync';

interface NavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenImport: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onDataChanged: () => void;
  totalCards: number;
  dueToday: number;
  syncStatus?: SyncStatus;
  onTriggerSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenImport,
  onOpenStats,
  onOpenSettings,
  onDataChanged,
  totalCards,
  dueToday,
  syncStatus = 'idle',
  onTriggerSync,
}) => {
  const handleExport = () => {
    storage.exportBackup();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = storage.importBackup(content);
        if (success) {
          onDataChanged();
          alert('Бэкап успешно восстановлен!');
        } else {
          alert('Ошибка при чтении файла бэкапа.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-[#0c0c0e] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Скрыть боковую панель" : "Показать боковую панель"}
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeft className="w-4 h-4" />
          )}
        </button>

        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
          <Layers className="w-5 h-5 text-zinc-300" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-zinc-200 flex items-center gap-2">
            ShadowSRS
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              FSRS
            </span>
          </h1>
          <p className="text-xs text-zinc-500 hidden sm:block">Система глубокого запоминания</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Quick status counters */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
          <span className="text-zinc-400">
            На сегодня: <strong className={dueToday > 0 ? "text-amber-400" : "text-zinc-300"}>{dueToday}</strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">
            Всего карт: <strong className="text-zinc-300">{totalCards}</strong>
          </span>
        </div>

        {/* Primary Action: Import from AI */}
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition-colors cursor-pointer shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Импорт <span className="hidden sm:inline">из нейросети</span></span>
        </button>

        {/* Statistics & Calendar Button */}
        <button
          onClick={onOpenStats}
          title="Календарь активности и статистика"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Cloud Sync Status Button */}
        <button
          onClick={onTriggerSync}
          title={
            syncStatus === 'synced'
              ? 'Облако синхронизировано (Firebase). Нажмите для обновления.'
              : syncStatus === 'syncing'
              ? 'Синхронизация с Firebase...'
              : 'Нажмите для синхронизации с Firebase'
          }
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors cursor-pointer"
        >
          {syncStatus === 'syncing' ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          ) : syncStatus === 'synced' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          ) : syncStatus === 'offline' ? (
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span className="text-[11px] text-zinc-300 hidden md:inline">
            {syncStatus === 'syncing'
              ? 'Синхронизация...'
              : syncStatus === 'synced'
              ? 'Облако активно'
              : syncStatus === 'offline'
              ? 'Офлайн (локально)'
              : 'Синхронизировать'}
          </span>
        </button>

        {/* Backup Export */}
        <button
          onClick={handleExport}
          title="Скачать бэкап всех колод (JSON)"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Backup Import */}
        <label
          title="Восстановить бэкап из файла"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <input
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </label>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Настройки звука и карточек"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
