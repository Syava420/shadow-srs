'use client';

import React, { useState } from 'react';
import { X, Check, Volume2, RotateCcw, Sliders, Download, Upload, Layers } from 'lucide-react';
import { AppSettings, Deck, FlashCard } from '@/types';
import { tts } from '@/lib/tts';
import { storage } from '@/lib/storage';
import { parsePastedText } from '@/lib/parser';
import { createNewFSRSCard } from '@/lib/fsrs';
import { ModalDialog } from './ModalDialog';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  decks: Deck[];
  selectedDeckId: string | null;
  onClose: () => void;
  onSaveSettings: (settings: AppSettings) => void;
  onImportCards: (cards: FlashCard[]) => void;
  onDataChanged: () => void;
  onResetAll: () => void;
}

const SettingsModalInner: React.FC<Omit<SettingsModalProps, 'isOpen'>> = ({
  settings,
  decks,
  selectedDeckId,
  onClose,
  onSaveSettings,
  onImportCards,
  onDataChanged,
  onResetAll,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [batchText, setBatchText] = useState('');
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  const handleTestSpeech = () => {
    tts.speak(
      localSettings.voiceAccent === 'en-GB'
        ? 'Brilliant! The meeting has been confirmed for tomorrow morning.'
        : 'Awesome! I gotta run right now, see you later!',
      {
        accent: localSettings.voiceAccent,
        gender: localSettings.voiceGender || 'female',
        rate: localSettings.speechRate,
      }
    );
  };

  const handleQuickBatchImport = () => {
    const targetDeck = selectedDeckId || decks[0]?.id;
    if (!targetDeck || !batchText.trim()) return;
    const parsed = parsePastedText(batchText);
    if (parsed.length === 0) return;

    const newCards: FlashCard[] = parsed.map((item, idx) => ({
      id: `card-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      deckId: targetDeck,
      front: item.front,
      back: item.back,
      transcription: item.transcription,
      fsrsCard: createNewFSRSCard(),
      createdAt: Date.now() + idx,
      timeSpentSeconds: 0,
    }));

    onImportCards(newCards);
    setBatchText('');
    setBatchNotice(`Добавлено в колоду: ${newCards.length}`);
    setTimeout(() => setBatchNotice(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && storage.importBackup(content)) {
        onDataChanged();
        setBatchNotice('Бэкап восстановлен');
        setTimeout(() => setBatchNotice(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="flex flex-col max-h-[82dvh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-zinc-400" />
          <h2 id="settings-title" className="text-base font-semibold text-zinc-100">
            Настройки
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">

      {/* 1. Base Daily Limits */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Дневной план по умолчанию
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            На главном экране можно снизить на один день — завтра вернётся эта база
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-zinc-200 block font-medium">Новых слов в день</span>
            <span className="text-[11px] text-zinc-500 block">Базовая норма</span>
          </div>
          <select
            value={localSettings.dailyNewLimit ?? 20}
            onChange={(e) => setLocalSettings({ ...localSettings, dailyNewLimit: Number(e.target.value) })}
            className="bg-zinc-950 border border-white/[0.08] text-zinc-200 text-xs rounded-xl px-3 py-1.5 outline-none font-mono cursor-pointer"
          >
            <option value={5}>5 / день</option>
            <option value={10}>10 / день</option>
            <option value={15}>15 / день</option>
            <option value={20}>20 / день</option>
            <option value={30}>30 / день</option>
            <option value={50}>50 / день</option>
            <option value={100}>100 / день</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs text-zinc-200 block font-medium">Максимум повторений</span>
            <span className="text-[11px] text-zinc-500 block">Лимит старых карточек в сутки</span>
          </div>
          <select
            value={localSettings.dailyReviewLimit ?? 100}
            onChange={(e) => setLocalSettings({ ...localSettings, dailyReviewLimit: Number(e.target.value) })}
            className="bg-zinc-950 border border-white/[0.08] text-zinc-200 text-xs rounded-xl px-3 py-1.5 outline-none font-mono cursor-pointer"
          >
            <option value={30}>30 / день</option>
            <option value={50}>50 / день</option>
            <option value={100}>100 / день</option>
            <option value={200}>200 / день</option>
            <option value={0}>Без лимита</option>
          </select>
        </div>
      </div>

      {/* 2. Audio / Voice */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Озвучка
          </h3>
          <button
            type="button"
            onClick={handleTestSpeech}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] border border-white/[0.08] transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Тест звука</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setLocalSettings({ ...localSettings, voiceAccent: 'en-US' })}
            className={`py-2 px-3 rounded-xl border transition-colors cursor-pointer text-left ${
              localSettings.voiceAccent === 'en-US'
                ? 'bg-zinc-800 border-white/15 text-zinc-100'
                : 'bg-zinc-950 border-white/[0.06] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="block font-medium">Американский (US)</span>
          </button>
          <button
            type="button"
            onClick={() => setLocalSettings({ ...localSettings, voiceAccent: 'en-GB' })}
            className={`py-2 px-3 rounded-xl border transition-colors cursor-pointer text-left ${
              localSettings.voiceAccent === 'en-GB'
                ? 'bg-zinc-800 border-white/15 text-zinc-100'
                : 'bg-zinc-950 border-white/[0.06] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="block font-medium">Британский (UK)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setLocalSettings({ ...localSettings, voiceGender: 'female' })}
            className={`py-2 px-3 rounded-xl border transition-colors cursor-pointer text-left ${
              (localSettings.voiceGender ?? 'female') === 'female'
                ? 'bg-zinc-800 border-white/15 text-zinc-100'
                : 'bg-zinc-950 border-white/[0.06] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="block font-medium">Женский голос</span>
            <span className="block text-[10px] text-zinc-400">
              {localSettings.voiceAccent === 'en-GB' ? 'Sonia' : 'Jenny'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setLocalSettings({ ...localSettings, voiceGender: 'male' })}
            className={`py-2 px-3 rounded-xl border transition-colors cursor-pointer text-left ${
              localSettings.voiceGender === 'male'
                ? 'bg-zinc-800 border-white/15 text-zinc-100'
                : 'bg-zinc-950 border-white/[0.06] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="block font-medium">Мужской голос</span>
            <span className="block text-[10px] text-zinc-400">
              {localSettings.voiceAccent === 'en-GB' ? 'Ryan' : 'Guy'}
            </span>
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="text-zinc-400">Скорость речи</span>
            <span className="font-mono text-zinc-200 tabular-nums">{localSettings.speechRate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.25"
            step="0.05"
            value={localSettings.speechRate}
            onChange={(e) => setLocalSettings({ ...localSettings, speechRate: parseFloat(e.target.value) })}
            className="w-full accent-zinc-300 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 3. Card Behavior Toggles */}
      <div className="space-y-2.5 pt-3 border-t border-white/[0.06] text-xs">
        <label className="flex items-center justify-between cursor-pointer py-1">
          <span className="text-zinc-300">Авто-озвучка при перевороте</span>
          <input
            type="checkbox"
            checked={localSettings.autoPlayAudio}
            onChange={(e) => setLocalSettings({ ...localSettings, autoPlayAudio: e.target.checked })}
            className="w-4 h-4 accent-zinc-200 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer py-1">
          <span className="text-zinc-300">Транскрипция русскими буквами</span>
          <input
            type="checkbox"
            checked={localSettings.showTranscription ?? true}
            onChange={(e) => setLocalSettings({ ...localSettings, showTranscription: e.target.checked })}
            className="w-4 h-4 accent-zinc-200 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer py-1">
          <span className="text-zinc-300">Загруженные картинки к карточкам</span>
          <input
            type="checkbox"
            checked={localSettings.showImages}
            onChange={(e) => setLocalSettings({ ...localSettings, showImages: e.target.checked })}
            className="w-4 h-4 accent-zinc-200 rounded cursor-pointer"
          />
        </label>
      </div>

      {/* 4. On-Demand Batch Add inside Settings (<details>) */}
      <details className="pt-3 border-t border-white/[0.06] group">
        <summary className="flex items-center justify-between cursor-pointer text-xs font-medium text-zinc-300 hover:text-zinc-100 list-none">
          <span className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Добавить пачку слов в текущую колоду</span>
          </span>
          {batchNotice && <span className="text-[11px] font-mono text-emerald-400">{batchNotice}</span>}
        </summary>
        <div className="pt-3 space-y-2">
          <textarea
            rows={4}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={`Improve - Улучшать\nResilience - Стойкость`}
            className="w-full bg-zinc-950 border border-white/[0.08] rounded-xl p-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-y"
          />
          <button
            type="button"
            onClick={handleQuickBatchImport}
            disabled={!batchText.trim()}
            className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
          >
            Импортировать список
          </button>
        </div>
      </details>

      {/* 5. Backup & Reset */}
      <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => storage.exportBackup()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-white/[0.08] text-zinc-300 text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать бэкап</span>
          </button>
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-white/[0.08] text-zinc-300 text-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Восстановить</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('Сбросить все колоды и карточки к стартовому демо?')) {
              onResetAll();
              onClose();
            }
          }}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Сброс</span>
        </button>
      </div>
      </div>

      {/* Pinned Footer Save Actions */}
      <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Сохранить</span>
        </button>
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  return (
    <ModalDialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      ariaLabelledBy="settings-title"
      className="w-[calc(100%-1.5rem)] max-w-lg bg-[#111216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-100"
    >
      <SettingsModalInner
        key={props.isOpen ? 'open' : 'closed'}
        settings={props.settings}
        decks={props.decks}
        selectedDeckId={props.selectedDeckId}
        onClose={props.onClose}
        onSaveSettings={props.onSaveSettings}
        onImportCards={props.onImportCards}
        onDataChanged={props.onDataChanged}
        onResetAll={props.onResetAll}
      />
    </ModalDialog>
  );
};
