'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Folder, Layers } from 'lucide-react';
import { Folder as FolderType } from '@/types';

interface FolderDeckModalProps {
  isOpen: boolean;
  mode: 'folder' | 'deck';
  targetFolderId?: string;
  editingItem?: { id: string; name: string; description?: string; folderId?: string } | null;
  folders: FolderType[];
  onClose: () => void;
  onCreateFolder: (name: string) => void;
  onCreateDeck: (name: string, description: string, folderId?: string) => void;
  onUpdateFolder?: (id: string, name: string) => void;
  onUpdateDeck?: (id: string, name: string, description: string, folderId?: string) => void;
}

export const FolderDeckModal: React.FC<FolderDeckModalProps> = ({
  isOpen,
  mode,
  targetFolderId,
  editingItem,
  folders,
  onClose,
  onCreateFolder,
  onCreateDeck,
  onUpdateFolder,
  onUpdateDeck,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setDescription(editingItem.description || '');
      setSelectedFolderId(editingItem.folderId || '');
    } else {
      setName('');
      setDescription('');
      setSelectedFolderId(targetFolderId || '');
    }
  }, [editingItem, targetFolderId, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(editingItem);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && editingItem) {
      if (mode === 'folder' && onUpdateFolder) {
        onUpdateFolder(editingItem.id, name.trim());
      } else if (onUpdateDeck) {
        onUpdateDeck(editingItem.id, name.trim(), description.trim(), selectedFolderId || undefined);
      }
    } else {
      if (mode === 'folder') {
        onCreateFolder(name.trim());
      } else {
        onCreateDeck(name.trim(), description.trim(), selectedFolderId || undefined);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            {mode === 'folder' ? (
              <Folder className="w-4 h-4 text-zinc-400" />
            ) : (
              <Layers className="w-4 h-4 text-zinc-400" />
            )}
            <h3 className="text-base font-semibold text-zinc-100">
              {isEditing
                ? (mode === 'folder' ? 'Переименовать папку' : 'Настройки колоды')
                : (mode === 'folder' ? 'Новая папка' : 'Новая колода')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Название
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'folder' ? 'Например: 🇺🇸 Английский' : 'Например: Разговорные фразы'}
              className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {mode === 'deck' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Описание (необязательно)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Коротко: для чего эти карточки"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Поместить в папку
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 cursor-pointer"
                >
                  <option value="">Без папки (в корень)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-md ${
                !name.trim()
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Сохранить' : 'Создать'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
