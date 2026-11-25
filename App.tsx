import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { ResultsView } from './components/ResultsView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { generateStickerImage, generateSingleSticker } from './services/geminiService';
import { splitImage, removeSingleImageBackground, enforceLineSpec } from './utils/imageProcessor';
import { listProjects, saveProject, deleteProject } from './services/storage';
import { GenerationSettings, Project } from './types';

const getStoredApiKey = (): string => {
  const storedKey = localStorage.getItem('gemini_api_key');
  const storedExpiry = localStorage.getItem('gemini_api_key_expiry');

  if (storedKey && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
    return storedKey;
  }
  return '';
};

function App() {
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(() => !getStoredApiKey());

  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndices, setLoadingIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [restoreCandidate, setRestoreCandidate] = useState<Project | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [lastSettings, setLastSettings] = useState<GenerationSettings | null>(null);

  const activeProjectRef = useRef<Project | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const commitActiveProject = (project: Project | null) => {
    activeProjectRef.current = project;
    setActiveProject(project);
  };

  const scheduleProjectSave = (updated: Project) => {
    setProjects((prev) => {
      const others = prev.filter((p) => p.id !== updated.id);
      return [updated, ...others];
    });
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      saveProject(updated).catch((err) => {
        console.error('Failed to auto-save project', err);
      });
    }, 500);
  };

  const updateActiveProject = (updater: (current: Project) => Project) => {
    const current = activeProjectRef.current;
    if (!current) return;
    const next: Project = { ...updater(current), updatedAt: Date.now() };
    activeProjectRef.current = next;
    setActiveProject(next);
    scheduleProjectSave(next);
  };

  // Clear an expired key from storage on mount and load saved projects.
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedExpiry = localStorage.getItem('gemini_api_key_expiry');

    if (storedKey && storedExpiry && Date.now() >= parseInt(storedExpiry, 10)) {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('gemini_api_key_expiry');
    }

    let cancelled = false;
    listProjects()
      .then((loaded) => {
        if (cancelled) return;
        setProjects(loaded);
        if (loaded.length > 0) {
          setRestoreCandidate(loaded[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load projects from IndexedDB', err);
      });

    return () => {
      cancelled = true;
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSaveApiKey = (key: string, rememberForDays: number) => {
    setApiKey(key);

    if (rememberForDays > 0) {
      // Calculate expiry time (in milliseconds)
      const expiryTime = Date.now() + (rememberForDays * 24 * 60 * 60 * 1000);

      // Save both key and expiry time
      localStorage.setItem('gemini_api_key', key);
      localStorage.setItem('gemini_api_key_expiry', expiryTime.toString());
    } else {
      // Don't save to localStorage if user doesn't want to remember
      // Key will only exist in state for this session
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('gemini_api_key_expiry');
    }

    setIsApiKeyModalOpen(false);
  };

  const handleResetApiKey = () => {
    if (window.confirm("確定要清除 API Key 嗎？下次使用時需要重新輸入。")) {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('gemini_api_key_expiry');
      setApiKey('');
      setIsApiKeyModalOpen(true);
    }
  };

  const handleGenerate = async (settings: GenerationSettings) => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    commitActiveProject(null);
    setRestoreCandidate(null);
    setLastSettings(settings);

    try {
      // 1. Generate the full sheet - passing the API Key
      const originalImage = await generateStickerImage(settings, apiKey);

      // 2. Cut the image client-side (optionally removing background)
      const slices = await splitImage(originalImage, settings.gridSize, settings.removeBackground);

      const now = Date.now();
      const newProject: Project = {
        id: crypto.randomUUID(),
        characterId: settings.characterId ?? null,
        settings,
        original: originalImage,
        slices,
        mainIndex: 0,
        tabIndex: 0,
        createdAt: now,
        updatedAt: now,
      };
      commitActiveProject(newProject);
      await saveProject(newProject);
      setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "生成貼圖時發生錯誤，請檢查 API Key 是否正確。");
      // If unauthorized, maybe prompt for key again?
      if (message && (message.includes('403') || message.includes('key'))) {
        // Optional: automatically open modal if key seems invalid
        // setIsApiKeyModalOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSlice = async (index: number) => {
    if (!lastSettings || !activeProjectRef.current || !apiKey) return;

    setLoadingIndices(prev => [...prev, index]);

    try {
      // Generate single square image for this slot - passing the API Key
      const newImageBase64 = await generateSingleSticker(lastSettings, index, apiKey);

      let processedImage = newImageBase64;
      if (lastSettings.removeBackground) {
        processedImage = await removeSingleImageBackground(processedImage);
      }
      processedImage = await enforceLineSpec(processedImage);

      updateActiveProject((prev) => {
        const newSlices = [...prev.slices];
        newSlices[index] = processedImage;
        return { ...prev, slices: newSlices };
      });

    } catch (err) {
      console.error("Failed to regenerate single sticker", err);
      alert("重新生成失敗，請檢查 API Key 或再試一次。");
    } finally {
      setLoadingIndices(prev => prev.filter(i => i !== index));
    }
  };

  const handleReplaceSlice = (index: number, newBase64: string) => {
    updateActiveProject((prev) => {
      const newSlices = [...prev.slices];
      newSlices[index] = newBase64;
      return { ...prev, slices: newSlices };
    });
  };

  const handleSelectMainIndex = (index: number) => {
    updateActiveProject((prev) => ({ ...prev, mainIndex: index }));
  };

  const handleSelectTabIndex = (index: number) => {
    updateActiveProject((prev) => ({ ...prev, tabIndex: index }));
  };

  const handleSelectProject = (project: Project) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    commitActiveProject(project);
    setLastSettings(project.settings);
    setRestoreCandidate(null);
    setIsHistoryOpen(false);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectRef.current?.id === id) {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      commitActiveProject(null);
    }
    if (restoreCandidate?.id === id) {
      setRestoreCandidate(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-6 bg-lulu-50 relative">
      <ApiKeyModal isOpen={isApiKeyModalOpen} onSave={handleSaveApiKey} />

      <Header
        projectCount={projects.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        projects={projects}
        activeProjectId={activeProject?.id ?? null}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleSelectProject}
        onDelete={handleDeleteProject}
      />

      <main className="max-w-3xl mx-auto px-4 py-8 flex-grow w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-lulu-500 mb-2 tracking-tight">幾秒鐘內製作 LINE 貼圖！</h2>
          <p className="text-slate-500 font-medium">選擇版型、設定風格，讓 AI 為您施展魔法。</p>
        </div>

        {!activeProject && restoreCandidate && (
          <div className="mb-6 bg-white rounded-2xl p-4 border-2 border-lulu-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-lulu-50 border border-lulu-100 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                {restoreCandidate.slices[restoreCandidate.mainIndex] ?? restoreCandidate.slices[0] ? (
                  <img
                    src={restoreCandidate.slices[restoreCandidate.mainIndex] ?? restoreCandidate.slices[0]}
                    alt="上次作品縮圖"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-xl">🎨</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-lulu-600">繼續上次的作品？</p>
                <p className="text-xs text-slate-500 truncate">
                  {restoreCandidate.settings.prompt || '未命名作品'} · {restoreCandidate.slices.length} 張貼圖
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectProject(restoreCandidate)}
                className="px-4 py-2 rounded-xl bg-lulu-500 hover:bg-lulu-600 text-white text-xs font-bold shadow-sm transition-colors"
              >
                繼續編輯
              </button>
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        )}

        <SettingsPanel isLoading={isLoading} onGenerate={handleGenerate} />

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-bold">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeProject && (
          <ResultsView
            key={activeProject.id}
            originalImage={activeProject.original}
            slices={activeProject.slices}
            mainIndex={activeProject.mainIndex}
            tabIndex={activeProject.tabIndex}
            onSelectMainIndex={handleSelectMainIndex}
            onSelectTabIndex={handleSelectTabIndex}
            onRegenerateSlice={handleRegenerateSlice}
            onReplaceSlice={handleReplaceSlice}
            loadingIndices={loadingIndices}
          />
        )}
      </main>

      <footer className="w-full text-center py-6 mt-8 border-t border-lulu-100 bg-white/60 backdrop-blur-sm text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <p className="font-bold text-sm">
            製作人：@CHW1982
            <span className="mx-2 opacity-30">|</span>
            版權所有 &copy; {new Date().getFullYear()} Lu Lu Sticker Tools
          </p>
          <p className="text-xs opacity-70">
            本工具使用 Google Gemini API 技術驅動
          </p>
          <button
            onClick={handleResetApiKey}
            className="text-[10px] text-slate-400 hover:text-red-500 underline mt-2"
          >
            更換/清除 API Key
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;