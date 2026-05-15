import React, { useState } from 'react';
import { downloadImage, downloadAllImages, processFileToBase64, validateSticker, autoFixMargin } from '../utils/imageProcessor';
import { ValidationResult } from '../types';
import { StickerEditor } from './StickerEditor';
import { ChatPreview } from './ChatPreview';

interface ResultsViewProps {
  originalImage: string;
  slices: string[];
  onRegenerateSlice: (index: number) => void;
  onReplaceSlice: (index: number, newBase64: string) => void;
  loadingIndices: number[]; // Which stickers are currently regenerating
}

export const ResultsView: React.FC<ResultsViewProps> = ({ 
  originalImage, 
  slices, 
  onRegenerateSlice, 
  onReplaceSlice,
  loadingIndices 
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'cuts' | 'review' | 'chat'>('cuts');
  const [mainIndex, setMainIndex] = useState<number>(0);
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [bgMode, setBgMode] = useState<'transparent' | 'red' | 'black' | 'white'>('transparent');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchTexts, setBatchTexts] = useState<string>('');

  const handleBatchApply = async () => {
    const lines = batchTexts.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) {
      alert("請輸入至少一行文字。");
      return;
    }

    setIsValidating(true);
    
    // Process each slice
    for (let i = 0; i < slices.length; i++) {
      const text = lines[i % lines.length];
      try {
        const processed = await applyTextToImage(slices[i], text);
        onReplaceSlice(i, processed);
      } catch (err) {
        console.error(`Failed to apply text to slice ${i}`, err);
      }
    }
    
    setIsBatchMode(false);
    setIsValidating(false);
    alert("批次文字合成完成！");
  };

  const applyTextToImage = (base64: string, text: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(base64); return; }
        
        ctx.drawImage(img, 0, 0);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Dynamic font size based on image height (approx 15%)
        const fontSize = Math.floor(img.height * 0.15);
        ctx.font = `bold ${fontSize}px "Inter", "Microsoft JhengHei", sans-serif`;
        
        const x = canvas.width / 2;
        const y = canvas.height * 0.82; // Position at bottom area

        // Dark Stroke
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = Math.floor(fontSize * 0.2);
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);

        // White Fill
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(base64);
    });
  };

  const handleValidateAll = async () => {
    setIsValidating(true);
    const results: Record<number, ValidationResult> = {};
    for (let i = 0; i < slices.length; i++) {
      results[i] = await validateSticker(slices[i]);
    }
    setValidationResults(results);
    setIsValidating(false);
  };

  const handleAutoFix = async (index: number) => {
    const fixed = await autoFixMargin(slices[index]);
    onReplaceSlice(index, fixed);
    // Re-validate after fix
    const result = await validateSticker(fixed);
    setValidationResults(prev => ({ ...prev, [index]: result }));
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const base64 = await processFileToBase64(file);
              onReplaceSlice(index, base64);
          } catch (err) {
              console.error("Failed to upload replacement", err);
          }
      }
  };

  const handleSaveEdit = (newImage: string) => {
    if (editingIndex !== null) {
      onReplaceSlice(editingIndex, newImage);
      setEditingIndex(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-lulu-100 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-lulu-600 flex items-center gap-2">
          <span className="text-2xl">🎉</span> 您的貼圖成果
        </h2>
        <div className="flex flex-wrap bg-lulu-50 p-1 rounded-xl">
           <button 
             onClick={() => { setActiveTab('sheet'); setIsBatchMode(false); }}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sheet' ? 'bg-white text-lulu-600 shadow-sm' : 'text-lulu-300'}`}
           >
             完整大圖
           </button>
           <button 
             onClick={() => { setActiveTab('cuts'); setIsBatchMode(false); }}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'cuts' && !isBatchMode ? 'bg-white text-lulu-600 shadow-sm' : 'text-lulu-300'}`}
           >
             貼圖切片 ({slices.length})
           </button>
           <button 
             onClick={() => { setActiveTab('cuts'); setIsBatchMode(true); }}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isBatchMode ? 'bg-white text-lulu-600 shadow-sm' : 'text-lulu-300'}`}
           >
             批次加字 ⚡
           </button>
           <button 
              onClick={() => { setActiveTab('chat'); setIsBatchMode(false); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-white text-lulu-600 shadow-sm' : 'text-lulu-300'}`}
            >
              💬 聊天預覽
            </button>
           <button 
              onClick={() => {
                setActiveTab('review');
                setIsBatchMode(false);
                if (Object.keys(validationResults).length === 0) handleValidateAll();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'review' ? 'bg-white text-lulu-600 shadow-sm' : 'text-lulu-300'}`}
            >
              🛡️ 審核預檢
            </button>
        </div>
      </div>

      {activeTab === 'sheet' && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50 p-2">
            <img src={originalImage} alt="Full Sticker Sheet" className="w-full h-auto rounded-xl" />
          </div>
          <p className="text-xs text-slate-400 text-center">注意：在「切片」分頁中對個別貼圖的重繪，不會更新此張原始大圖。</p>
          <button
            onClick={() => downloadImage(originalImage, 'lulu-sticker-sheet.png')}
            className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors"
          >
            下載完整大圖 (PNG)
          </button>
        </div>
      )}

      {activeTab === 'cuts' && !isBatchMode && (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-xs text-green-700 font-bold text-center flex justify-between items-center px-6 flex-grow">
                 <span>✅ 已優化 LINE 格式 (最大 370x320)</span>
                 <span className="hidden sm:inline">👆 滑鼠移入可編輯</span>
               </div>
               
               <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-black uppercase ml-1">背景</span>
                  <div className="flex gap-1.5">
                    {['transparent', 'white', 'black', 'red'].map(mode => (
                      <button 
                        key={mode}
                        onClick={() => setBgMode(mode as any)}
                        title={`切換為 ${mode} 背景`}
                        className={`w-6 h-6 rounded-lg border-2 transition-all ${bgMode === mode ? 'border-lulu-500 scale-110 shadow-sm' : 'border-white hover:border-slate-200'}`}
                        style={{ 
                          backgroundColor: mode === 'transparent' ? 'transparent' : mode, 
                          backgroundImage: mode === 'transparent' ? 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)' : 'none',
                          backgroundSize: '8px 8px',
                          backgroundPosition: '0 0, 0 4px, 4px 4px, 4px 0'
                        }}
                      />
                    ))}
                  </div>
               </div>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {slices.map((slice, idx) => {
                const isLoading = loadingIndices.includes(idx);
                const isMain = mainIndex === idx;
                const isTab = tabIndex === idx;

                const bgStyle = {
                  backgroundColor: bgMode === 'transparent' ? 'transparent' : bgMode,
                  backgroundImage: bgMode === 'transparent' ? 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)' : 'none',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px 6px, 6px 0'
                };

                return (
                <div key={idx} style={bgStyle} className={`group relative rounded-xl border-2 transition-all p-2 flex items-center justify-center ${isMain ? 'border-lulu-500 ring-2 ring-lulu-100' : isTab ? 'border-blue-400' : 'border-slate-100 hover:border-lulu-300'}`}>
                  <div className="absolute top-0 left-0 flex gap-1 p-1 z-10">
                      {isMain && <span className="bg-lulu-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">主圖 (Main)</span>}
                      {isTab && <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">標籤 (Tab)</span>}
                  </div>
                  <img src={slice} alt={`Sticker ${idx+1}`} className={`max-w-full max-h-full object-contain ${isLoading ? 'opacity-50 blur-sm' : ''}`} />
                  {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-lulu-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                  )}
                  <div className={`absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${isLoading ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="flex gap-2">
                        <button onClick={() => onRegenerateSlice(idx)} className="p-2 bg-white rounded-full text-lulu-500 hover:text-lulu-700 hover:scale-110 transition-all shadow-lg" title="重新生成此張貼圖">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button onClick={() => setEditingIndex(idx)} className="p-2 bg-white rounded-full text-lulu-600 hover:text-lulu-800 hover:scale-110 transition-all shadow-lg" title="後期編輯文字">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <label className="p-2 bg-white rounded-full text-blue-500 hover:text-blue-700 hover:scale-110 transition-all shadow-lg cursor-pointer" title="上傳圖片替換">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(idx, e)} />
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </label>
                    </div>
                    <div className="flex gap-1 mt-1">
                        <button onClick={() => setMainIndex(idx)} className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-white hover:bg-lulu-500 ${isMain ? 'opacity-50 cursor-default' : ''}`}>設為主圖</button>
                        <button onClick={() => setTabIndex(idx)} className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-white hover:bg-blue-500 ${isTab ? 'opacity-50 cursor-default' : ''}`}>設為標籤</button>
                    </div>
                 </div>
                 <span className="absolute bottom-1 right-2 text-[10px] text-slate-300 font-mono pointer-events-none">{(idx+1).toString().padStart(2, '0')}</span>
               </div>
            )})}
            </div>
            
            <button
            onClick={() => downloadAllImages(slices, 'lulu_sticker', mainIndex, tabIndex)}
            className="w-full py-3 rounded-xl bg-lulu-500 text-white font-bold hover:bg-lulu-600 transition-colors shadow-lg shadow-lulu-200 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            打包下載 LINE 貼圖包 (ZIP)
          </button>
          <p className="text-center text-xs text-slate-400">包含 main.png, tab.png 以及所有貼圖圖檔。</p>
        </div>
      )}

      {activeTab === 'cuts' && isBatchMode && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-lulu-50 p-6 rounded-3xl border-2 border-lulu-100 shadow-inner">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-lulu-500 text-white p-2 rounded-lg shadow-lg shadow-lulu-200">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h3 className="font-black text-lulu-700 text-lg">批次加字工作台</h3>
                <p className="text-xs text-slate-500">每一行文字將依序對應到一張貼圖。如果行數不足，則會循環套用。</p>
              </div>
            </div>

            <textarea 
              value={batchTexts}
              onChange={(e) => setBatchTexts(e.target.value)}
              placeholder="例如：&#10;早安&#10;晚安&#10;收到&#10;好的&#10;..."
              className="w-full h-48 p-5 rounded-2xl border-2 border-slate-100 focus:border-lulu-400 outline-none text-base font-bold shadow-sm transition-all"
            />
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleBatchApply}
                disabled={isValidating}
                className="flex-[2] py-4 rounded-2xl bg-lulu-500 text-white text-lg font-black shadow-xl shadow-lulu-200 hover:bg-lulu-600 active:scale-95 transition-all disabled:opacity-50"
              >
                {isValidating ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-circle-notch animate-spin"></i> 合成中...
                  </span>
                ) : '開始批次合成'}
              </button>
              <button 
                onClick={() => setIsBatchMode(false)}
                className="flex-1 py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 font-bold hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 opacity-40 grayscale pointer-events-none">
            {slices.map((slice, idx) => (
              <div key={idx} className="aspect-square rounded-xl border-2 border-slate-100 overflow-hidden bg-slate-50 p-1 flex items-center justify-center">
                <img src={slice} className="max-w-full max-h-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="space-y-4">
            <ChatPreview slices={slices} />
            <p className="text-center text-xs text-slate-400">點擊模擬器中的貼圖可快速預覽效果。</p>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="space-y-6">
          <div className="bg-lulu-50 p-4 rounded-2xl border-2 border-lulu-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lulu-700">🔍 智能審核報告</h3>
              <button onClick={handleValidateAll} disabled={isValidating} className="text-xs bg-white px-3 py-1.5 rounded-lg border border-lulu-200 text-lulu-600 font-bold hover:bg-lulu-50 disabled:opacity-50">{isValidating ? '掃描中...' : '重新掃描所有貼圖'}</button>
            </div>
            <p className="text-xs text-slate-500">此系統將模擬 LINE Creators Market 的審核標準，偵測邊距、尺寸與去背品質。</p>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {slices.map((slice, idx) => {
              const result = validationResults[idx];
              if (!result) return null;
              return (
                <div key={idx} className={`p-4 rounded-2xl border-2 flex items-start gap-4 transition-all ${result.passed ? 'border-green-100 bg-green-50/30' : 'border-amber-100 bg-amber-50/30'}`}>
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-100 p-1 shrink-0 flex items-center justify-center relative">
                    <img src={slice} alt={`Preview ${idx}`} className="max-w-full max-h-full object-contain" />
                    <span className="absolute -top-2 -left-2 bg-slate-800 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">{(idx+1)}</span>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${result.passed ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>{result.passed ? '通過' : '建議優化'}</span>
                    </div>
                    {result.issues.length > 0 ? (
                      <ul className="space-y-1">
                        {result.issues.map((issue, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5">
                            <span className="mt-0.5">{issue.severity === 'error' ? '❌' : '⚠️'}</span>
                            <div className="flex-grow">
                              <span className="text-slate-700 font-medium">{issue.message}</span>
                              {issue.autoFixable && <button onClick={() => handleAutoFix(idx)} className="ml-2 text-[10px] font-bold text-lulu-500 hover:underline">[自動修正]</button>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-green-600 font-medium">符合 LINE 上架標準規範。</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingIndex !== null && (
        <StickerEditor image={slices[editingIndex]} initialText="" onSave={handleSaveEdit} onClose={() => setEditingIndex(null)} />
      )}
    </div>
  );
};