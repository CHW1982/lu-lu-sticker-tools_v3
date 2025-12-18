import React, { useState } from 'react';
import { downloadImage, downloadAllImages, processFileToBase64 } from '../utils/imageProcessor';

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
  const [activeTab, setActiveTab] = useState<'sheet' | 'cuts'>('cuts');
  const [mainIndex, setMainIndex] = useState<number>(0);
  const [tabIndex, setTabIndex] = useState<number>(0);

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

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-lulu-100 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-lulu-600 flex items-center gap-2">
          <span className="text-2xl">🎉</span> 您的貼圖成果
        </h2>
        <div className="flex bg-lulu-50 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('sheet')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sheet' ? 'bg-white text-lulu-600 shadow-sm' : 'text-lulu-300'}`}
           >
             完整大圖
           </button>
           <button 
             onClick={() => setActiveTab('cuts')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'cuts' ? 'bg-white text-lulu-600 shadow-sm' : 'text-lulu-300'}`}
           >
             LINE 貼圖切片 ({slices.length})
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

      {activeTab === 'cuts' && (
        <div className="space-y-6">
           <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-xs text-green-700 font-bold text-center flex justify-between items-center px-6">
             <span>✅ 已優化 LINE 格式 (最大 370x320)</span>
             <span className="hidden sm:inline">👆 滑鼠移入可編輯</span>
           </div>
           
           <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
             {slices.map((slice, idx) => {
               const isLoading = loadingIndices.includes(idx);
               const isMain = mainIndex === idx;
               const isTab = tabIndex === idx;

               return (
               <div key={idx} className={`group relative bg-slate-50 rounded-xl border-2 transition-all p-2 flex items-center justify-center ${isMain ? 'border-lulu-500 ring-2 ring-lulu-100' : isTab ? 'border-blue-400' : 'border-slate-100 hover:border-lulu-300'}`}>
                 
                 {/* Main/Tab Indicators */}
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

                 {/* Hover Actions Overlay */}
                 <div className={`absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${isLoading ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                    
                    {/* Action Buttons Row */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onRegenerateSlice(idx)}
                            className="p-2 bg-white rounded-full text-lulu-500 hover:text-lulu-700 hover:scale-110 transition-all shadow-lg"
                            title="重新生成此張貼圖"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <label className="p-2 bg-white rounded-full text-blue-500 hover:text-blue-700 hover:scale-110 transition-all shadow-lg cursor-pointer" title="上傳圖片替換">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(idx, e)} />
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </label>
                    </div>

                    {/* Set Main/Tab Buttons */}
                    <div className="flex gap-1 mt-1">
                        <button 
                            onClick={() => setMainIndex(idx)}
                            className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-white hover:bg-lulu-500 ${isMain ? 'opacity-50 cursor-default' : ''}`}
                        >
                            設為主圖
                        </button>
                        <button 
                            onClick={() => setTabIndex(idx)}
                            className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-white hover:bg-blue-500 ${isTab ? 'opacity-50 cursor-default' : ''}`}
                        >
                            設為標籤
                        </button>
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
    </div>
  );
};