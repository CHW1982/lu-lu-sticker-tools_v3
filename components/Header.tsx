import React from 'react';

// Custom SVG Avatar based on the provided Brown Tabby Cat with Pompoms
const CAT_AVATAR_URI = `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fur" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:%23a1887f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:%238d6e63;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Ears (Folded) -->
  <path d="M15,45 Q10,25 35,35" fill="%236d4c41"/>
  <path d="M85,45 Q90,25 65,35" fill="%236d4c41"/>
  <!-- Head -->
  <circle cx="50" cy="55" r="42" fill="url(%23fur)"/>
  <!-- Stripes -->
  <path d="M50,15 L50,30 M30,20 L35,32 M70,20 L65,32" stroke="%234e342e" stroke-width="4" stroke-linecap="round"/>
  <path d="M10,55 L25,55 M90,55 L75,55" stroke="%234e342e" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
  <!-- Eyes -->
  <circle cx="35" cy="55" r="10" fill="%233e2723"/>
  <circle cx="65" cy="55" r="10" fill="%233e2723"/>
  <circle cx="32" cy="52" r="3" fill="white"/>
  <circle cx="62" cy="52" r="3" fill="white"/>
  <!-- Mouth/Nose -->
  <ellipse cx="50" cy="66" rx="5" ry="3" fill="%233e2723"/>
  <path d="M42,76 Q50,82 58,76" fill="none" stroke="%233e2723" stroke-width="3" stroke-linecap="round"/>
  <!-- Pompoms (Cheerleading) -->
  <circle cx="15" cy="80" r="15" fill="%23ffcc80" stroke="%23f57c00" stroke-width="2" stroke-dasharray="4,2"/>
  <circle cx="85" cy="80" r="15" fill="%23ffcc80" stroke="%23f57c00" stroke-width="2" stroke-dasharray="4,2"/>
  <!-- Text -->
  <text x="50" y="20" font-family="sans-serif" font-weight="bold" font-size="14" text-anchor="middle" fill="%233e2723">加油</text>
</svg>`;

export const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b-4 border-lulu-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-lulu-50 rounded-full border-4 border-white ring-2 ring-lulu-200 flex items-center justify-center overflow-hidden shadow-lg transform rotate-[-5deg]">
            <img src={CAT_AVATAR_URI} alt="LuLu Cat Avatar" className="w-full h-full object-cover scale-110" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-lulu-600 tracking-tight flex items-baseline gap-2">
              Lu Lu 貼圖神器
              <span className="text-sm font-bold text-white bg-lulu-400 px-2 py-0.5 rounded-full shadow-sm">v3.0</span>
            </h1>
            <p className="text-xs text-lulu-400 font-bold">可愛風 GenAI 貼圖製作工具</p>
          </div>
        </div>
        <a 
            href="https://miner.tw/line_cutter/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:block text-xs font-bold text-lulu-400 hover:text-lulu-600 underline"
        >
            靈感來源：Line Cutter
        </a>
      </div>
    </header>
  );
};