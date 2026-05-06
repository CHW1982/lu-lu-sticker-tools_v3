import React, { useState, useRef, useEffect } from 'react';

interface StickerEditorProps {
  image: string; // Base64
  initialText: string;
  onSave: (newImage: string) => void;
  onClose: () => void;
}

const QUICK_QUOTES = [
  { cat: "工作", items: ["收到", "好的", "辛苦了", "開會中", "下班了", "沒錢了", "救命"] },
  { cat: "生活", items: ["早安", "晚安", "好吃", "哈哈", "耶!", "OK", "拜託"] },
  { cat: "情緒", description: "Meme vibes", items: ["笑死", "我就爛", "是在哈囉", "確?", "呵呵", "我看倒像", "公沙小"] },
];

export const StickerEditor: React.FC<StickerEditorProps> = ({ image, initialText, onSave, onClose }) => {
  const [text, setText] = useState(initialText);
  const [fontSize, setFontSize] = useState(40);
  const [posX, setPosX] = useState(50); // Percent 0-100
  const [posY, setPosY] = useState(85); // Percent 0-100
  const [color, setColor] = useState('#ffffff');
  const [strokeColor, setStrokeColor] = useState('#333333');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px "Inter", "Microsoft JhengHei", sans-serif`;
      
      const x = (posX / 100) * canvas.width;
      const y = (posY / 100) * canvas.height;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 10;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);

      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };
  };

  useEffect(() => {
    draw();
  }, [image, text, fontSize, posX, posY, color, strokeColor]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left: Preview */}
        <div className="flex-grow bg-slate-100 flex items-center justify-center p-8 relative overflow-hidden min-h-[300px]">
          <div className="absolute inset-0 opacity-20" style={{ 
            backgroundImage: 'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)',
            backgroundSize: '20px 20px'
          }}></div>
          <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-lg rounded-lg z-10 bg-transparent" />
        </div>

        {/* Right: Controls */}
        <div className="w-full md:w-96 p-6 flex flex-col border-l border-slate-100 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800">貼圖後期編輯</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">貼圖文字</label>
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-lulu-400 outline-none font-bold text-slate-700" />
            </div>

            {/* Quick Quotes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">⚡ 快速語錄</label>
              <div className="space-y-3">
                {QUICK_QUOTES.map(cat => (
                  <div key={cat.cat} className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold ml-1">{cat.cat}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.map(q => (
                        <button 
                          key={q} 
                          onClick={() => setText(q)}
                          className="px-2 py-1 bg-lulu-50 text-lulu-600 text-xs font-bold rounded-lg border border-lulu-100 hover:bg-lulu-100 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Sliders */}
            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">大小: {fontSize}px</label>
                 <input type="range" min="10" max="120" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full h-1.5 bg-white rounded-lg appearance-none cursor-pointer accent-lulu-500" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">水平 (X)</label>
                   <input type="range" min="0" max="100" value={posX} onChange={(e) => setPosX(parseInt(e.target.value))} className="w-full h-1.5 bg-white rounded-lg appearance-none cursor-pointer accent-lulu-500" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">垂直 (Y)</label>
                   <input type="range" min="0" max="100" value={posY} onChange={(e) => setPosY(parseInt(e.target.value))} className="w-full h-1.5 bg-white rounded-lg appearance-none cursor-pointer accent-lulu-500" />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">文字顏色</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 rounded-lg border-2 border-slate-100 p-0.5 bg-white cursor-pointer" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">描邊顏色</label>
                <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-full h-8 rounded-lg border-2 border-slate-100 p-0.5 bg-white cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-400 hover:bg-slate-100 transition-colors">取消</button>
            <button onClick={handleSave} className="flex-[2] py-3 px-4 rounded-xl bg-lulu-500 text-white font-bold shadow-lg hover:bg-lulu-600 transition-all active:scale-95">套用並儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
};
