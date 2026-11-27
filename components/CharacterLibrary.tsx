import React, { useState } from 'react';
import { Character } from '../types';

interface CharacterLibraryProps {
  characters: Character[];
  selectedCharacterId: string | null;
  onSelect: (character: Character) => void;
  onClearSelection: () => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  characters,
  selectedCharacterId,
  onSelect,
  onClearSelection,
  onRename,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? null;

  const startRename = (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(char.id);
    setDraftName(char.name);
  };

  const commitRename = async (id: string, e?: React.FormEvent | React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) return;
    await onRename(id, trimmed);
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="mb-6 bg-lulu-50/60 border-2 border-lulu-100 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-lulu-600 flex items-center gap-1.5">
            <span>🎭</span> 我的角色 ({characters.length})
          </h3>
          {selectedCharacter && (
            <span className="text-[11px] font-black bg-lulu-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">
              ✨ 用這個角色做新一組：{selectedCharacter.name}
            </span>
          )}
        </div>
        {selectedCharacter && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-[11px] font-bold text-slate-500 hover:text-lulu-600 underline"
          >
            清除選擇
          </button>
        )}
      </div>

      {characters.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium">
          尚無儲存的角色。於下方產生「角色設定圖」並儲存後，即可在此一鍵帶入造型做第 2、3 組貼圖。
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {characters.map((char) => {
            const isSelected = char.id === selectedCharacterId;
            const isEditing = editingId === char.id;
            const thumb = char.characterSheet || char.referenceImage;

            return (
              <div
                key={char.id}
                onClick={() => {
                  if (!isEditing) onSelect(char);
                }}
                className={`w-44 shrink-0 rounded-2xl border-2 p-2.5 transition-all cursor-pointer flex flex-col gap-2 bg-white ${
                  isSelected
                    ? 'border-lulu-500 ring-2 ring-lulu-200 shadow-md'
                    : 'border-slate-200 hover:border-lulu-300'
                }`}
              >
                <div className="aspect-video w-full rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={char.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl">🐾</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void commitRename(char.id);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      className="w-full px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-lulu-300 rounded-lg outline-none"
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={(e) => void commitRename(char.id, e)}
                        className="px-2 py-0.5 rounded bg-lulu-500 text-white text-[10px] font-bold"
                      >
                        儲存
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-700 truncate">{char.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{char.stylePreset}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => startRename(char, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-lulu-600 hover:bg-lulu-50 text-xs"
                        title="重新命名"
                        aria-label={`重新命名 ${char.name}`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(char.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs"
                        title="刪除角色"
                        aria-label={`刪除 ${char.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
