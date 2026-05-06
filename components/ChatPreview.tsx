import React from 'react';

interface ChatPreviewProps {
  slices: string[];
}

export const ChatPreview: React.FC<ChatPreviewProps> = ({ slices }) => {
  return (
    <div className="bg-[#89a1c8] rounded-3xl overflow-hidden shadow-inner flex flex-col h-[500px] border-4 border-slate-800 relative">
      {/* LINE Header Simulation */}
      <div className="bg-[#242b3d] p-3 flex items-center justify-between text-white border-b border-white/10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-xs">A</div>
            <div className="font-bold text-sm">LINE 貼圖預覽 (Simulation)</div>
        </div>
        <div className="flex gap-3">
            <span className="text-xs opacity-50">🔍</span>
            <span className="text-xs opacity-50">☰</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Opponent Message */}
        <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                <span className="text-xs">👋</span>
            </div>
            <div className="space-y-1">
                <div className="text-[10px] text-slate-700 font-bold ml-1 opacity-70">好友</div>
                <div className="bg-white p-2 px-3 rounded-2xl rounded-tl-none shadow-sm text-sm max-w-[200px]">
                    嘿！看看你剛做的貼圖好不好看？✨
                </div>
            </div>
        </div>

        {/* Sticker Previews (User) */}
        <div className="flex flex-col items-end gap-6">
            {slices.slice(0, 3).map((slice, idx) => (
                <div key={idx} className="group relative flex flex-col items-end">
                    <div className="text-[10px] text-slate-100 font-bold mb-1 opacity-60 mr-1">下午 2:03</div>
                    <div className="max-w-[150px] transition-transform hover:scale-105 cursor-pointer">
                        <img src={slice} alt="Preview" className="w-full h-auto drop-shadow-md" />
                    </div>
                </div>
            ))}
        </div>

        {/* System Message */}
        <div className="flex justify-center">
            <div className="bg-black/20 text-white text-[10px] px-3 py-1 rounded-full">以上為模擬預覽畫面</div>
        </div>
      </div>

      {/* Input Area Simulation */}
      <div className="bg-white p-3 border-t border-slate-200 flex items-center gap-3">
         <span className="text-slate-300">➕</span>
         <div className="flex-grow h-8 bg-slate-100 rounded-full"></div>
         <span className="text-slate-300">😊</span>
         <span className="text-slate-300">🎤</span>
      </div>
      
      {/* Watermark Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none opacity-[0.03] select-none">
        <div className="text-9xl font-black text-slate-900">LU-LU</div>
      </div>
    </div>
  );
};
