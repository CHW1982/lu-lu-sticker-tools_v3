import React, { useState, useEffect } from 'react';
import { GridOption, ModelOption, GenerationSettings, StickerIntent } from '../types';
import { processFileToBase64 } from '../utils/imageProcessor';
import { getIntentsByVibe } from '../services/geminiService';

interface SettingsPanelProps {
  isLoading: boolean;
  onGenerate: (settings: GenerationSettings) => void;
}

// Preset Data Configuration
const STYLE_PRESETS = [
  { value: "Classic Chibi Vector", label: "🎨 經典Q版 (Classic Chibi)", desc: "2D平面、粗線條、可愛比例" },
  { value: "Soft Hand-drawn Crayon", label: "🖍️ 軟萌手繪 (Soft Crayon)", desc: "蠟筆質感、粉嫩配色、溫暖氛圍" },
  { value: "Retro 8-bit Pixel Art", label: "👾 復古像素 (Pixel Art)", desc: "方塊感、懷舊遊戲風格" },
  { value: "American Cartoon", label: "📺 美式卡通 (Cartoon)", desc: "線條大膽、表情誇張、動感十足" },
  { value: "3D Clay Toy", label: "🧸 3D公仔 (3D Clay)", desc: "柔和光影、黏土/塑膠質感、圓潤" },
];

const TEXT_PRESETS = [
  { value: "Colorful Pop Rounded", label: "🌈 繽紛可愛 (Colorful Pop)", desc: "圓體、跳躍感、多彩配色" },
  { value: "Manga Impact High Contrast", label: "💥 漫畫衝擊 (Manga Impact)", desc: "尖銳、鋸齒狀、紅黃高對比" },
  { value: "Soft Organic Handwriting", label: "✍️ 溫柔手寫 (Handwriting)", desc: "邊緣柔和、治癒系色彩、手寫感" },
  { value: "Digital Pixel Font", label: "💾 像素數位 (Digital)", desc: "配合像素風格的方塊字體" },
  { value: "Minimalist Modern Sans", label: "✨ 極簡現代 (Minimal)", desc: "乾淨、高易讀性、單色" },
];

const VIBE_PRESETS = [
  { value: "High Energy & Cheerful", label: "⚡ 元氣滿滿 (High Energy)", desc: "閃亮、跳躍、極度快樂" },
  { value: "Lazy & Chill", label: "💤 厭世慵懶 (Lazy/Chill)", desc: "垂眼、融化、動作緩慢" },
  { value: "Over-the-top Dramatic", label: "🎭 誇張顏藝 (Dramatic)", desc: "瀑布淚、掉下巴、凸眼" },
  { value: "Wholesome & Healing", label: "💖 溫馨療癒 (Wholesome)", desc: "微笑、小花、臉紅、擁抱" },
  { value: "Sarcastic & Funny", label: "😏 搞怪嘲諷 (Sarcastic)", desc: "眼神死、斜眼、迷因表情" },
  { value: "Custom", label: "✨ 自定義氛圍 (Custom Vibe)", desc: "描述您想要的獨特風格！" },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isLoading, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [gridSize, setGridSize] = useState<GridOption>(GridOption.Grid8);
  const [model, setModel] = useState<ModelOption>(ModelOption.NanoBananaPro);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImage2, setReferenceImage2] = useState<string | null>(null);
  const [removeBackground, setRemoveBackground] = useState(true); // Default to TRUE for transparent stickers

  // New State for Presets
  const [stylePreset, setStylePreset] = useState(STYLE_PRESETS[0].value);
  const [textStylePreset, setTextStylePreset] = useState(TEXT_PRESETS[0].value);
  const [vibePreset, setVibePreset] = useState(VIBE_PRESETS[0].value);
  const [customVibeDesc, setCustomVibeDesc] = useState('');

  // Custom Sticker List State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editedIntents, setEditedIntents] = useState<StickerIntent[]>([]);

  // Effect: Update intents when Vibe Preset OR Grid Size changes
  useEffect(() => {
    // 1. Get the base list for the selected vibe
    // If Custom, we default to High Energy list as a starting point, 
    // but user is expected to edit.
    const baseIntents = getIntentsByVibe(vibePreset);
    
    // 2. Adjust length to match GridSize
    const targetLength = gridSize;
    
    setEditedIntents(prev => {
        // We will overwrite whenever vibePreset changes (logic handled by dependency array).
        return baseIntents.slice(0, targetLength);
    });
  }, [vibePreset, gridSize]);

  const handleIntentChange = (index: number, field: keyof StickerIntent, value: string) => {
    const newIntents = [...editedIntents];
    newIntents[index] = { ...newIntents[index], [field]: value };
    setEditedIntents(newIntents);
  };

  const handleResetIntents = () => {
    const baseIntents = getIntentsByVibe(vibePreset);
    setEditedIntents(baseIntents.slice(0, gridSize));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isSecond: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Convert to standard format (JPEG) and resize if necessary
        const base64 = await processFileToBase64(file);
        if (isSecond) {
          setReferenceImage2(base64);
        } else {
          setReferenceImage(base64);
        }
      } catch (err) {
        console.error("Error processing image file", err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use custom vibe description if 'Custom' is selected
    const finalVibe = vibePreset === 'Custom' ? customVibeDesc : vibePreset;

    onGenerate({ 
      prompt, 
      gridSize, 
      model, 
      referenceImage, 
      referenceImage2,
      removeBackground,
      stylePreset,
      textStylePreset,
      vibePreset: finalVibe,
      // Only send custom intents if the user actually opened the editor
      customIntents: isCustomizing ? editedIntents : undefined
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-lulu-100 mb-8">
      <h2 className="text-xl font-bold text-lulu-600 mb-4 flex items-center gap-2">
        <span className="text-2xl">✨</span> 開始製作您的貼圖
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">生成引擎 (AI Model)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModel(ModelOption.NanoBananaPro)}
              className={`p-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                model === ModelOption.NanoBananaPro
                  ? 'border-lulu-500 bg-lulu-50 text-lulu-600 shadow-md transform scale-[1.02]'
                  : 'border-slate-200 text-slate-400 hover:border-lulu-200'
              }`}
            >
              🍌 Nano Banana Pro
              <span className="block text-[10px] font-normal opacity-70">高品質 (Gemini 3 Pro Image)</span>
            </button>
            <button
              type="button"
              onClick={() => setModel(ModelOption.Gemini3Pro)}
              className={`p-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                model === ModelOption.Gemini3Pro
                  ? 'border-lulu-500 bg-lulu-50 text-lulu-600 shadow-md transform scale-[1.02]'
                  : 'border-slate-200 text-slate-400 hover:border-lulu-200'
              }`}
            >
              🤖 Gemini 3 pro
              <span className="block text-[10px] font-normal opacity-70">替代 Pro 模式</span>
            </button>
          </div>
        </div>

        {/* --- NEW PRESET DROPDOWNS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Character Style */}
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">角色風格</label>
            <div className="relative">
              <select 
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 bg-white appearance-none font-bold text-slate-700 focus:border-lulu-400 outline-none"
              >
                {STYLE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className="text-[10px] text-slate-400 mt-1 px-1">
                {STYLE_PRESETS.find(p => p.value === stylePreset)?.desc}
              </div>
            </div>
          </div>

          {/* Text Style */}
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">文字設計</label>
            <div className="relative">
              <select 
                value={textStylePreset}
                onChange={(e) => setTextStylePreset(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 bg-white appearance-none font-bold text-slate-700 focus:border-lulu-400 outline-none"
              >
                {TEXT_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className="text-[10px] text-slate-400 mt-1 px-1">
                {TEXT_PRESETS.find(p => p.value === textStylePreset)?.desc}
              </div>
            </div>
          </div>

           {/* Vibe/Emotion */}
           <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">情感氛圍</label>
            <div className="relative">
              <select 
                value={vibePreset}
                onChange={(e) => setVibePreset(e.target.value)}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 bg-white appearance-none font-bold text-slate-700 focus:border-lulu-400 outline-none"
              >
                {VIBE_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className="text-[10px] text-slate-400 mt-1 px-1">
                {VIBE_PRESETS.find(p => p.value === vibePreset)?.desc}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Vibe Input */}
        {vibePreset === 'Custom' && (
           <div className="animate-fade-in-down">
             <label className="block text-sm font-bold text-lulu-500 mb-2">描述您的自訂氛圍</label>
             <input
               type="text"
               value={customVibeDesc}
               onChange={(e) => setCustomVibeDesc(e.target.value)}
               placeholder="例如：一個不在乎世俗眼光的滑板少年，有點跩跩的自信..."
               className="w-full p-3 rounded-2xl border-2 border-lulu-300 focus:border-lulu-500 outline-none text-slate-700 font-medium"
               required
             />
           </div>
        )}

        {/* Prompt - now purely for character description */}
        <div>
           <label className="block text-sm font-bold text-slate-600 mb-2">角色主題 (Prompt)</label>
           <textarea
             className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-lulu-400 focus:ring-0 outline-none transition-colors resize-none bg-slate-800 text-white placeholder-slate-400 font-medium"
             rows={2}
             placeholder="主角是誰？(例如：一隻戴著紅圍巾的可愛小企鵝 / A cute baby penguin with a red scarf)"
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             required
           />
        </div>

        {/* Reference Image Section (Dual) */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">參考圖片 (人物設定)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Image 1: Protagonist */}
              <div className="relative group">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={(e) => handleFileChange(e, false)}
                   className="hidden"
                   id="ref-image-input"
                 />
                 <label 
                   htmlFor="ref-image-input"
                   className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-lulu-300 hover:bg-lulu-50 cursor-pointer transition-colors h-full justify-center"
                 >
                   <div className="w-20 h-20 bg-lulu-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                      {referenceImage ? (
                        <img src={referenceImage} alt="Ref 1" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl text-lulu-400">👤</span>
                      )}
                      {referenceImage && <div className="absolute inset-0 bg-black/10"></div>}
                   </div>
                   <div className="text-center">
                        <div className="text-sm font-bold text-lulu-600">主角 (Main)</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-1">
                            {referenceImage ? "點擊更換" : "上傳主角照片"}
                        </div>
                   </div>
                 </label>
                 {referenceImage && (
                     <button 
                        type="button"
                        onClick={() => setReferenceImage(null)}
                        className="absolute top-2 right-2 text-xs bg-red-100 text-red-500 w-6 h-6 flex items-center justify-center rounded-full font-bold hover:bg-red-200"
                     >
                        ✕
                     </button>
                 )}
              </div>

              {/* Image 2: Sidekick */}
              <div className="relative group">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={(e) => handleFileChange(e, true)}
                   className="hidden"
                   id="ref-image-input-2"
                 />
                 <label 
                   htmlFor="ref-image-input-2"
                   className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors h-full justify-center"
                 >
                   <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                      {referenceImage2 ? (
                        <img src={referenceImage2} alt="Ref 2" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl text-slate-400">👥</span>
                      )}
                   </div>
                   <div className="text-center">
                        <div className="text-sm font-bold text-slate-600">配角 (Sidekick)</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-1">
                            {referenceImage2 ? "點擊更換" : "上傳配角 (選填)"}
                        </div>
                   </div>
                 </label>
                 {referenceImage2 && (
                     <button 
                        type="button"
                        onClick={() => setReferenceImage2(null)}
                        className="absolute top-2 right-2 text-xs bg-red-100 text-red-500 w-6 h-6 flex items-center justify-center rounded-full font-bold hover:bg-red-200"
                     >
                        ✕
                     </button>
                 )}
              </div>

          </div>
        </div>

        {/* Grid Size */}
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">版面配置 (張數)</label>
          <div className="flex gap-4">
            {[
              { val: GridOption.Grid8, label: '8 張', sub: '4x2 (寬版)' },
              { val: GridOption.Grid16, label: '16 張', sub: '4x4 (正方)' },
              { val: GridOption.Grid24, label: '24 張', sub: '4x6 (長版)' },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setGridSize(opt.val)}
                className={`flex-1 py-3 px-2 rounded-2xl border-2 text-center transition-all ${
                  gridSize === opt.val
                    ? 'border-lulu-500 bg-lulu-50 text-lulu-600 shadow-md transform -translate-y-1'
                    : 'border-slate-200 text-slate-400 hover:border-lulu-200'
                }`}
              >
                <div className="text-lg font-black">{opt.val}</div>
                <div className="text-[10px] font-bold uppercase opacity-70">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOM STICKER LIST SECTION */}
        <div className="border-t-2 border-slate-100 pt-4">
            <button
                type="button"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="flex items-center gap-2 text-sm font-bold text-lulu-500 hover:text-lulu-700 transition-colors"
            >
                {isCustomizing ? '🔽 隱藏詳細編輯器' : '✏️ 自訂貼圖文字與動作'}
            </button>
            
            {isCustomizing && (
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border-2 border-lulu-100 animate-fade-in space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">貼圖內容編輯器</span>
                        <button 
                            type="button"
                            onClick={handleResetIntents}
                            className="text-xs text-red-400 hover:text-red-600 underline font-bold"
                        >
                            重置為 [{VIBE_PRESETS.find(v => v.value === vibePreset)?.label}] 預設值
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                        {editedIntents.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="bg-lulu-100 text-lulu-600 text-[10px] font-black px-2 py-0.5 rounded-full">#{idx + 1}</span>
                                    <span className="text-xs font-bold text-slate-500">貼圖位置</span>
                                </div>
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-3">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">顯示文字 (Text)</label>
                                        <input 
                                            type="text" 
                                            value={item.text}
                                            onChange={(e) => handleIntentChange(idx, 'text', e.target.value)}
                                            className="w-full p-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:border-lulu-300 outline-none placeholder-slate-300"
                                            placeholder="例如：早安"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">情境提示 (Prompt)</label>
                                        <input 
                                            type="text" 
                                            value={item.description}
                                            onChange={(e) => handleIntentChange(idx, 'description', e.target.value)}
                                            className="w-full p-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:border-lulu-300 outline-none placeholder-slate-300"
                                            placeholder="例如：打招呼、有精神"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">畫面動作 (Visual)</label>
                                        <input 
                                            type="text" 
                                            value={item.visual}
                                            onChange={(e) => handleIntentChange(idx, 'visual', e.target.value)}
                                            className="w-full p-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:border-lulu-300 outline-none placeholder-slate-300"
                                            placeholder="例如：揮手微笑"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 text-center pt-2">
                        小撇步：「顯示文字」是圖上的字，「情境提示」是給 AI 看的感覺描述。
                    </p>
                </div>
            )}
        </div>

        {/* Remove Background Option */}
        <div className="flex items-center gap-3 p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 hover:bg-white transition-colors cursor-pointer" onClick={() => setRemoveBackground(!removeBackground)}>
           <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${removeBackground ? 'bg-lulu-500 border-lulu-500' : 'bg-white border-slate-300'}`}>
              {removeBackground && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
           </div>
           <span className="text-sm font-bold text-slate-600">自動去背 (去除綠幕)</span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !prompt || (vibePreset === 'Custom' && !customVibeDesc)}
          className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg transform transition-all active:scale-95 ${
            isLoading || !prompt || (vibePreset === 'Custom' && !customVibeDesc)
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-lulu-500 hover:bg-lulu-600 hover:shadow-xl hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🌀</span> 生成中...
            </span>
          ) : (
            '立即生成貼圖！'
          )}
        </button>
      </form>
    </div>
  );
};