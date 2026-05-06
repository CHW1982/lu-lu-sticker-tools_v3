# 部署步驟說明

## 🚀 Vercel 一鍵部署（最簡單）

### 方法一：使用 Vercel CLI

```bash
# 1. 確保在專案目錄中
cd /Users/carlsonwang/DevProjects/lu-lu-sticker-tools_v3

# 2. 如果還沒安裝 Vercel CLI
npm install -g vercel

# 3. 登入 Vercel（會開啟瀏覽器）
vercel login

# 4. 部署到生產環境
vercel --prod
```

**執行後會得到**：

- 一個公開的 URL（例如：`lu-lu-sticker-tools.vercel.app`）
- 自動 HTTPS
- 全球 CDN 加速

### 方法二：使用 Vercel 網頁版

1. 前往 [vercel.com](https://vercel.com)
2. 點擊「Import Project」
3. 選擇您的 GitHub repository（需先推送到 GitHub）
4. Vercel 會自動偵測 Vite 設定並部署
5. 完成！

---

## 🌐 Netlify 部署

```bash
# 1. 建置專案
npm run build

# 2. 安裝 Netlify CLI
npm install -g netlify-cli

# 3. 登入
netlify login

# 4. 部署
netlify deploy --prod --dir=dist
```

或直接拖放 `dist` 資料夾到 [Netlify Drop](https://app.netlify.com/drop)

---

## 📊 GitHub Pages 部署

### 自動部署設定

1. 將程式碼推送到 GitHub
2. 啟用 GitHub Actions（已包含 workflow 檔案）
3. 在 Repository Settings → Pages → Source 選擇 `gh-pages` 分支
4. 每次推送 main 分支都會自動部署

---

## ✅ 部署後檢查清單

部署完成後，請驗證以下功能：

- [ ] 開啟部署的 URL，頁面正常載入
- [ ] API Key 輸入視窗正常顯示
- [ ] 輸入測試 API Key 並生成一組貼圖
- [ ] **測試透明邊距修復功能 (自動 10px 邊距)**
- [ ] **進入「切片」分頁，點擊單張貼圖開啟後期編輯器**
- [ ] **測試在編輯器中修改文字、描邊並儲存**
- [ ] **進入「聊天室」分頁，確認 LINE 模擬預覽是否正常**
- [ ] 下載 ZIP 功能正常，檢查下載解壓縮後的檔案尺寸是否為偶數
- [ ] 單張重繪功能正常
- [ ] 在手機上測試響應式設計
- [ ] 檢查瀏覽器 Console 沒有錯誤

---

## 🔧 常見問題

### Q: 部署後出現 404 錯誤？

A: 確保 `vercel.json` 包含 rewrites 設定，這樣 SPA 路由才能正常工作。

### Q: 圖片無法載入？

A: 檢查 Vite 的 base 設定，確保資源路徑正確。

### Q: API Key 儲存失效？

A: 確認瀏覽器沒有封鎖 LocalStorage，且使用 HTTPS 連線。

---

## 📱 分享給使用者

部署完成後，您可以這樣分享：

```markdown
嗨！我做了一個 LINE 貼圖生成工具 🎨

🔗 立即使用：[您的部署URL]

✨ 特色：
- 🤖 使用 AI 自動生成可愛貼圖，內建「情侶/職場/好友」關係模式
- 📐 支援 8/16/24 格版型與 7 大情感氛圍
- ✂️ 智能山谷切片：動態尋找縫隙切割，保證圖案與文字不裁切
- 🛠️ 後期編輯室：支援 Canvas 即時文字編輯與 LINE 聊天室真實預覽
- ✅ 100% 審核通過保證：自動強制偶數尺寸與 10px 絕對安全透明邊距
- 💸 完全免費（使用自己的 Gemini API Key）

📝 使用步驟：
1. 前往 https://aistudio.google.com/app/apikey 取得免費 API Key
2. 在工具中輸入 API Key
3. 選擇風格並描述角色
4. 點擊生成！

🔐 隱私保證：
- API Key 僅儲存在您的瀏覽器本地
- 不會上傳到任何伺服器
- 使用您自己的 API 配額

有問題歡迎聯絡我！
```

---

## 🎯 下一步建議

- [ ] 設定自訂網域（Vercel 支援）
- [ ] 新增 Google Analytics 追蹤使用情況
- [ ] 收集使用者反饋並改進
- [ ] 考慮新增 PWA 支援（可安裝到手機）
