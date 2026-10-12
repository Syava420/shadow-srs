'use client';

import React, { useState } from 'react';
import { X, Check, Volume2, RotateCcw, Sliders, Shield } from 'lucide-react';
import { AppSettings } from '@/types';
import { tts } from '@/lib/tts';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSaveSettings: (settings: AppSettings) => void;
  onResetAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSaveSettings,
  onResetAll,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    tts.speak("Consistency is key to mastering any language.", {
      accent: localSettings.voiceAccent,
      rate: localSettings.speechRate,
    });
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#121215] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <h3 className="text-base font-semibold text-zinc-100">
              Настройки приложения
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio / Voice Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Озвучка & Произношение
          </h4>

          {/* Accent */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Акцент диктора
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, voiceAccent: 'en-US' })}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-left ${
                  localSettings.voiceAccent === 'en-US'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🇺🇸 Американский (US Natural)
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, voiceAccent: 'en-GB' })}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-left ${
                  localSettings.voiceAccent === 'en-GB'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🇬🇧 Британский (UK Oxford)
              </button>
            </div>
          </div>

          {/* Speech Rate Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-medium text-zinc-400">Скорость речи</span>
              <span className="font-mono text-zinc-300">{localSettings.speechRate.toFixed(2)}x</span>
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
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
              <span>0.75x (Медленно)</span>
              <span>1.0x (Нормально)</span>
              <span>1.25x (Быстро)</span>
            </div>
          </div>

          {/* Test voice button */}
          <button
            type="button"
            onClick={handleTestSpeech}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-800 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Тест звука</span>
          </button>
        </div>

        {/* Daily & Session Batch Size */}
        <div className="space-y-2 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Размер порции для тренировки
              </h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Сколько карточек брать в одну сессию (защита от выгорания)
              </p>
            </div>
            <select
              value={localSettings.sessionLimit ?? 20}
              onChange={(e) => setLocalSettings({ ...localSettings, sessionLimit: Number(e.target.value) })}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-1.5 outline-none font-mono cursor-pointer"
            >
              <option value={5}>5 карточек (экспресс)</option>
              <option value={10}>10 карточек</option>
              <option value={20}>20 карточек (стандарт)</option>
              <option value={30}>30 карточек</option>
              <option value={50}>50 карточек</option>
              <option value={0}>Без лимита (все сразу)</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Поведение карточек
          </h4>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-xs text-zinc-300">
              Автоматически озвучивать при перевороте
            </span>
            <input
              type="checkbox"
              checked={localSettings.autoPlayAudio}
              onChange={(e) => setLocalSettings({ ...localSettings, autoPlayAudio: e.target.checked })}
              className="w-4 h-4 accent-zinc-200 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-xs text-zinc-300">
              Показывать ассоциативные картинки
            </span>
            <input
              type="checkbox"
              checked={localSettings.showImages}
              onChange={(e) => setLocalSettings({ ...localSettings, showImages: e.target.checked })}
              className="w-4 h-4 accent-zinc-200 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Danger zone / Reset */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm('Сбросить все колоды и карточки к стартовому демо?')) {
                onResetAll();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить к демо-данным</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium transition-colors cursor-pointer shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Сохранить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
