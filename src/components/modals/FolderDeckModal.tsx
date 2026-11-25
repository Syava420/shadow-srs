'use client';

import React, { useState } from 'react';
import { X, Check, Folder, Layers, Trash2 } from 'lucide-react';
import { Folder as FolderType } from '@/types';
import { ModalDialog } from './ModalDialog';

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
  onDelete?: (id: string) => void;
}

const FolderDeckModalInner: React.FC<Omit<FolderDeckModalProps, 'isOpen'>> = ({
  mode,
  targetFolderId,
  editingItem,
  folders,
  onClose,
  onCreateFolder,
  onCreateDeck,
  onUpdateFolder,
  onUpdateDeck,
  onDelete,
}) => {
  const [name, setName] = useState(editingItem?.name || '');
  const [description, setDescription] = useState(editingItem?.description || '');
  const [selectedFolderId, setSelectedFolderId] = useState(
    editingItem?.folderId || targetFolderId || ''
  );

  const isEditing = Boolean(editingItem);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && editingItem) {
      if (mode === 'folder' && onUpdateFolder) {
        onUpdateFolder(editingItem.id, name.trim());
      } else if (onUpdateDeck) {
        onUpdateDeck(
          editingItem.id,
          name.trim(),
          description.trim(),
          selectedFolderId || undefined
        );
      }
    } else if (mode === 'folder') {
      onCreateFolder(name.trim());
    } else {
      onCreateDeck(name.trim(), description.trim(), selectedFolderId || undefined);
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          {mode === 'folder' ? (
            <Folder className="w-4 h-4 text-zinc-400" />
          ) : (
            <Layers className="w-4 h-4 text-zinc-400" />
          )}
          <h2 id="folder-deck-title" className="text-base font-semibold text-zinc-100">
            {isEditing
              ? mode === 'folder'
                ? 'Переименовать папку'
                : 'Настройки колоды'
              : mode === 'folder'
                ? 'Новая папка'
                : 'Новая колода'}
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

      <div>
        <label htmlFor="folder-deck-name" className="block text-xs font-medium text-zinc-400 mb-1">
          Название
        </label>
        <input
          id="folder-deck-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode === 'folder' ? 'Например: Английский' : 'Например: Разговорные фразы'}
          className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
        />
      </div>

      {mode === 'deck' && (
        <>
          <div>
            <label htmlFor="deck-desc" className="block text-xs font-medium text-zinc-400 mb-1">
              Описание (необязательно)
            </label>
            <input
              id="deck-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Коротко: о чём колода"
              className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="deck-folder" className="block text-xs font-medium text-zinc-400 mb-1">
              Папка
            </label>
            <select
              id="deck-folder"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-zinc-900">Без папки</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id} className="bg-zinc-900">
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
        {isEditing && editingItem && onDelete ? (
          <button
            type="button"
            onClick={() => {
              const itemTitle =
                mode === 'folder' ? `папку «${editingItem.name}»` : `колоду «${editingItem.name}»`;
              if (confirm(`Удалить ${itemTitle}?`)) {
                onDelete(editingItem.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 border border-white/15 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Сохранить' : 'Создать'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export const FolderDeckModal: React.FC<FolderDeckModalProps> = (props) => {
  return (
    <ModalDialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      ariaLabelledBy="folder-deck-title"
      className="w-[calc(100%-1.5rem)] max-w-md bg-[#111216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-100"
    >
      <FolderDeckModalInner
        key={`${props.mode}-${props.editingItem?.id || 'new'}-${props.targetFolderId || ''}-${props.isOpen}`}
        mode={props.mode}
        targetFolderId={props.targetFolderId}
        editingItem={props.editingItem}
        folders={props.folders}
        onClose={props.onClose}
        onCreateFolder={props.onCreateFolder}
        onCreateDeck={props.onCreateDeck}
        onUpdateFolder={props.onUpdateFolder}
        onUpdateDeck={props.onUpdateDeck}
        onDelete={props.onDelete}
      />
    </ModalDialog>
  );
};
