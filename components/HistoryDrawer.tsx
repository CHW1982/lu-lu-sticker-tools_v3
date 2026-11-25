import React from 'react';
import { Project } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  projects: Project[];
  activeProjectId: string | null;
  onClose: () => void;
  onSelect: (project: Project) => void;
  onDelete: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  projects,
  activeProjectId,
  onClose,
  onSelect,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md bg-white h-full shadow-2xl border-l-4 border-lulu-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-label="歷史作品"
      >
        <div className="p-5 border-b-2 border-lulu-100 flex items-center justify-between bg-lulu-50/70">
          <div>
            <h2 className="text-lg font-black text-lulu-600 flex items-center gap-2">
              <span>📂</span> 歷史作品 ({projects.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">所有貼圖作品均自動儲存在本機瀏覽器</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-lulu-200 text-slate-500 hover:text-lulu-600 font-bold flex items-center justify-center shadow-sm"
            aria-label="關閉歷史作品"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">🎨</div>
              <p className="text-sm font-bold">尚無歷史作品</p>
              <p className="text-xs mt-1">生成一組貼圖後，作品會自動保存在這裡。</p>
            </div>
          ) : (
            projects.map((project) => {
              const thumb =
                project.slices[project.mainIndex] ??
                project.slices[0] ??
                project.original;
              const isActive = project.id === activeProjectId;
              const updatedLabel = new Date(project.updatedAt).toLocaleString('zh-TW', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={project.id}
                  className={`group rounded-2xl border-2 p-3 flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? 'border-lulu-500 bg-lulu-50/70 shadow-sm'
                      : 'border-slate-100 hover:border-lulu-300 bg-white'
                  }`}
                  onClick={() => onSelect(project)}
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={project.settings.prompt || '作品縮圖'}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-2xl">🖼️</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {isActive && (
                        <span className="text-[10px] font-black bg-lulu-500 text-white px-2 py-0.5 rounded-full">
                          編輯中
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {project.slices.length} 張
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 truncate">
                      {project.settings.prompt || '未命名作品'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {updatedLabel} · {project.settings.stylePreset}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(project.id);
                    }}
                    className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="刪除此作品"
                    aria-label="刪除此作品"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
