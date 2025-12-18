import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string, rememberForDays: number) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to remember for better UX

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 0) {
      // If remember me is checked, save for 30 days, otherwise save for current session only (0 days)
      const daysToRemember = rememberMe ? 30 : 0;
      onSave(inputKey.trim(), daysToRemember);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border-4 border-lulu-200 transform transition-all scale-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-lulu-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
            🔑
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">請輸入 Gemini API Key</h2>
          <p className="text-sm text-slate-500 font-medium">
            為了開始製作貼圖，請輸入您個人的 API Key。<br />
            每位使用者使用自己的 Key，確保安全與獨立額度管理。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              您的 API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-lulu-400 focus:ring-4 focus:ring-lulu-100 outline-none transition-all text-slate-700 font-mono"
              autoFocus
              required
            />
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-lulu-50 rounded-xl border border-lulu-100">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mt-1 w-4 h-4 text-lulu-500 border-slate-300 rounded focus:ring-lulu-400 cursor-pointer"
            />
            <label htmlFor="rememberMe" className="flex-1 cursor-pointer">
              <div className="text-sm font-bold text-slate-700">記住我的 API Key（30 天）</div>
              <div className="text-xs text-slate-500 mt-1">
                勾選後，您的 API Key 將安全儲存在瀏覽器 30 天，期間不需重複輸入。
                30 天後自動過期以確保安全性。
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={!inputKey}
            className={`w-full py-3 rounded-xl font-bold text-white text-lg shadow-lg transition-transform active:scale-95 ${inputKey
                ? 'bg-lulu-500 hover:bg-lulu-600'
                : 'bg-slate-300 cursor-not-allowed'
              }`}
          >
            {rememberMe ? '儲存並開始使用' : '本次使用（不儲存）'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-lulu-400 hover:text-lulu-600 hover:underline flex items-center justify-center gap-1"
          >
            <span>還沒有 Key？點此免費獲取</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-[10px] text-slate-400 mt-2">
            您的 Key 僅儲存在瀏覽器本地，{rememberMe ? '30 天後自動清除' : '關閉視窗後即清除'}，絕不上傳至伺服器。
          </p>
        </div>
      </div>
    </div>
  );
};