import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { ResultsView } from './components/ResultsView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { generateStickerImage, generateSingleSticker } from './services/geminiService';
import { splitImage } from './utils/imageProcessor';
import { GenerationSettings } from './types';

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingIndices, setLoadingIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ original: string; slices: string[] } | null>(null);
  const [lastSettings, setLastSettings] = useState<GenerationSettings | null>(null);

  // Load API Key on Mount with Expiration Check
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedExpiry = localStorage.getItem('gemini_api_key_expiry');

    if (storedKey && storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      const now = Date.now();

      // Check if the key has expired
      if (now < expiryTime) {
        // Key is still valid
        setApiKey(storedKey);
      } else {
        // Key has expired, clear it
        localStorage.removeItem('gemini_api_key');
        localStorage.removeItem('gemini_api_key_expiry');
        setIsApiKeyModalOpen(true);
      }
    } else {
      // No stored key or incomplete data
      setIsApiKeyModalOpen(true);
    }
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
    setResult(null);
    setLastSettings(settings);

    try {
      // 1. Generate the full sheet - passing the API Key
      const originalImage = await generateStickerImage(settings, apiKey);

      // 2. Cut the image client-side (optionally removing background)
      const slices = await splitImage(originalImage, settings.gridSize, settings.removeBackground);

      setResult({ original: originalImage, slices });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成貼圖時發生錯誤，請檢查 API Key 是否正確。");
      // If unauthorized, maybe prompt for key again?
      if (err.message && (err.message.includes('403') || err.message.includes('key'))) {
        // Optional: automatically open modal if key seems invalid
        // setIsApiKeyModalOpen(true); 
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSlice = async (index: number) => {
    if (!lastSettings || !result || !apiKey) return;

    setLoadingIndices(prev => [...prev, index]);

    try {
      // Generate single square image for this slot - passing the API Key
      const newImageBase64 = await generateSingleSticker(lastSettings, index, apiKey);

      let processedImage = newImageBase64;

      setResult(prev => {
        if (!prev) return null;
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
    setResult(prev => {
      if (!prev) return null;
      const newSlices = [...prev.slices];
      newSlices[index] = newBase64;
      return { ...prev, slices: newSlices };
    });
  };

  return (
    <div className="min-h-screen flex flex-col pb-6 bg-lulu-50 relative">
      <ApiKeyModal isOpen={isApiKeyModalOpen} onSave={handleSaveApiKey} />

      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8 flex-grow w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-lulu-500 mb-2 tracking-tight">幾秒鐘內製作 LINE 貼圖！</h2>
          <p className="text-slate-500 font-medium">選擇版型、設定風格，讓 AI 為您施展魔法。</p>
        </div>

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

        {result && (
          <ResultsView
            originalImage={result.original}
            slices={result.slices}
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