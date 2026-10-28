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
    tts.speak(
      localSettings.voiceAccent === 'en-GB'
        ? "Brilliant! The meeting has been confirmed for tomorrow morning."
        : "Awesome! I gotta run right now, see you later!",
      {
        accent: localSettings.voiceAccent,
        gender: localSettings.voiceGender || 'female',
        rate: localSettings.speechRate,
      }
    );
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
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Озвучка & Произношение
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
              Azure Neural
            </span>
          </div>

          {/* Voice Accent & Voice Gender */}
          <div className="space-y-3">
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
                  <span className="block font-semibold text-zinc-200">Американский (US)</span>
                  <span className="block text-[10px] text-zinc-400 mt-0.5">
                    {localSettings.voiceGender === 'male' ? 'Guy Neural' : 'Jenny Neural'}
                  </span>
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
                  <span className="block font-semibold text-zinc-200">Британский (UK)</span>
                  <span className="block text-[10px] text-zinc-400 mt-0.5">
                    {localSettings.voiceGender === 'male' ? 'Ryan Neural' : 'Sonia Neural'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Тембр голоса
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, voiceGender: 'female' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-left ${
                    (localSettings.voiceGender ?? 'female') === 'female'
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="block font-semibold text-zinc-200">Женский голос</span>
                  <span className="block text-[10px] text-zinc-400 mt-0.5">
                    {localSettings.voiceAccent === 'en-GB' ? 'Sonia Neural (UK)' : 'Jenny Neural (US)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, voiceGender: 'male' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-left ${
                    localSettings.voiceGender === 'male'
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="block font-semibold text-zinc-200">Мужской голос</span>
                  <span className="block text-[10px] text-zinc-400 mt-0.5">
                    {localSettings.voiceAccent === 'en-GB' ? 'Ryan Neural (UK)' : 'Guy Neural (US)'}
                  </span>
                </button>
              </div>
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

        {/* Daily Goals & Quotas */}
        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Дневной план обучения (выставил и забыл)
            </h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Настройте один раз — приложение само распределит нагрузку по дням
            </p>
          </div>

          {/* New cards per day */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs text-zinc-300 block font-medium">Новых карточек в день</span>
              <span className="text-[11px] text-zinc-500 block">Целевое количество новых слов в сутки</span>
            </div>
            <select
              value={localSettings.dailyNewLimit ?? 20}
              onChange={(e) => setLocalSettings({ ...localSettings, dailyNewLimit: Number(e.target.value) })}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-1.5 outline-none font-mono cursor-pointer"
            >
              <option value={5}>5 в день</option>
              <option value={10}>10 в день</option>
              <option value={15}>15 в день</option>
              <option value={20}>20 в день (стандарт)</option>
              <option value={30}>30 в день</option>
              <option value={50}>50 в день</option>
              <option value={100}>100 в день</option>
            </select>
          </div>

          {/* Reviews limit per day */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs text-zinc-300 block font-medium">Лимит повторений в день</span>
              <span className="text-[11px] text-zinc-500 block">Максимальный объем проверки старых слов в сутки</span>
            </div>
            <select
              value={localSettings.dailyReviewLimit ?? 100}
              onChange={(e) => setLocalSettings({ ...localSettings, dailyReviewLimit: Number(e.target.value) })}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-1.5 outline-none font-mono cursor-pointer"
            >
              <option value={30}>30 повторений</option>
              <option value={50}>50 повторений</option>
              <option value={100}>100 повторений</option>
              <option value={200}>200 повторений</option>
              <option value={0}>Без лимита (все накопившиеся)</option>
            </select>
          </div>

          {/* Session Batch Size */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs text-zinc-300 block font-medium">
                Размер одной порции
              </span>
              <span className="text-[11px] text-zinc-500 block">
                Сколько карточек брать за один подход
              </span>
            </div>
            <select
              value={
                localSettings.sessionDurationMinutes && localSettings.sessionDurationMinutes > 0
                  ? `time_${localSettings.sessionDurationMinutes}`
                  : (localSettings.sessionLimit ?? 20)
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('time_')) {
                  const minutes = Number(val.replace('time_', ''));
                  const estimatedCards = Math.round(minutes * 2.5);
                  setLocalSettings({ 
                    ...localSettings, 
                    sessionDurationMinutes: minutes,
                    sessionLimit: estimatedCards,
                  });
                } else {
                  const limit = Number(val);
                  setLocalSettings({ 
                    ...localSettings, 
                    sessionDurationMinutes: 0,
                    sessionLimit: limit,
                  });
                }
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-1.5 outline-none font-mono cursor-pointer"
            >
              <optgroup label="По времени (таймер):">
                <option value="time_5">5 минут (~12 карт)</option>
                <option value="time_10">10 минут (~25 карт)</option>
                <option value="time_15">15 минут (~35 карт)</option>
                <option value="time_20">20 минут (~50 карт)</option>
              </optgroup>
              <optgroup label="По количеству карт:">
                <option value={5}>5 карточек (экспресс)</option>
                <option value={10}>10 карточек</option>
                <option value={20}>20 карточек (стандарт)</option>
                <option value={30}>30 карточек</option>
                <option value={50}>50 карточек</option>
                <option value={0}>Без лимита (все сразу)</option>
              </optgroup>
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
            <div>
              <span className="text-xs text-zinc-300 block">
                Произношение русскими буквами
              </span>
              <span className="text-[11px] text-zinc-500 block">
                Подсказка для начинающих под английским текстом
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.showTranscription ?? true}
              onChange={(e) => setLocalSettings({ ...localSettings, showTranscription: e.target.checked })}
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
