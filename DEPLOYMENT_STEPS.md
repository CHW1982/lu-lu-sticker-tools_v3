# 雙重部署執行指南

## ✅ 階段一：本地驗證 - 完成

**結果**：應用程式本地運行正常 ✅

- API Key 模態視窗正確顯示
- 頁面載入無錯誤
- 所有品牌元素正確呈現

![本地驗證截圖](file:///Users/carlsonwang/.gemini/antigravity/brain/643748b4-aff7-4129-b074-d4e917f01785/local_app_verification_1766029285536.webp)

---

## 🚀 階段二：Vercel 部署（需要您親自執行）

Vercel 需要瀏覽器登入驗證，請執行以下步驟：

### 步驟 1: 登入 Vercel

```bash
cd /Users/carlsonwang/DevProjects/lu-lu-sticker-tools_v3
vercel login
```

這會開啟瀏覽器，請選擇登入方式（建議使用 GitHub）。

### 步驟 2: 部署到生產環境

```bash
vercel --prod
```

### 預期互動問題

1. **Set up and deploy?** → 輸入 `Y`
2. **Which scope?** → 選擇您的帳號（通常是預設）
3. **Link to existing project?** → 輸入 `N`（第一次部署）
4. **What's your project's name?** → 按 Enter（使用預設 `lu-lu-sticker-tools_v3`）
5. **In which directory is your code located?** → 按 Enter（使用 `./`）
6. **Want to modify build settings?** → 輸入 `N`

### 預期結果

```text
✔ Production: https://lu-lu-sticker-tools-v3.vercel.app [copied]
```

---

## 📘 階段三：GitHub Pages 部署

### 選項 A：自動部署（推薦）

如果您的專案已經在 GitHub 上：

```bash
cd /Users/carlsonwang/DevProjects/lu-lu-sticker-tools_v3

# 確認 remote 設定
git remote -v

# 如果已設定，直接推送
git add .
git commit -m "Add deployment configuration for dual deployment"
git push origin main
```

然後：

1. 前往 GitHub Repository → **Settings** → **Pages**
2. Source 選擇：**GitHub Actions**
3. 等待 Actions 自動建置（約 3-5 分鐘）
4. 完成後會顯示：`Your site is live at https://<username>.github.io/lu-lu-sticker-tools_v3/`

### 選項 B：首次設定 GitHub Remote

如果專案尚未推送到 GitHub：

```bash
cd /Users/carlsonwang/DevProjects/lu-lu-sticker-tools_v3

# 1. 在 GitHub 建立新 repository（via 網頁）
# 2. 複製 repository URL，例如：https://github.com/CHW1982/lu-lu-sticker-tools_v3.git

# 3. 初始化並推送
git init
git add .
git commit -m "Initial commit with dual deployment setup"
git branch -M main
git remote add origin <您的-GITHUB-URL>
git push -u origin main
```

然後按照選項 A 的步驟 1-4。

---

## 📋 部署後檢查清單

### Vercel 部署驗證

- [ ] 開啟 Vercel URL
- [ ] API Key 模態框正常顯示
- [ ] 測試生成一組貼圖
- [ ] 驗證下載功能
- [ ] 檢查台灣地區載入速度

### GitHub Pages 部署驗證

- [ ] 開啟 GitHub Pages URL
- [ ] API Key 模態框正常顯示
- [ ] 測試生成一組貼圖
- [ ] 驗證下載功能
- [ ] 作為備援方案確認可用

---

## 🎯 完成後

取得兩個 URL 後，您將擁有：

1. **主要網址（Vercel）**：`https://lu-lu-sticker-tools-v3.vercel.app`
   - 最快速度
   - 最佳使用者體驗
   - 推薦分享給使用者

2. **備援網址（GitHub Pages）**：`https://<username>.github.io/lu-lu-sticker-tools_v3/`
   - 100% 免費保證
   - 穩定可靠
   - 作為備援方案

---

## ⚠️ 常見問題

### Q: Vercel 部署失敗？

A: 確認您已執行 `vercel login` 並在瀏覽器中完成登入。

### Q: GitHub Actions 失敗？

A: 檢查 Repository Settings → Actions → 確認 Actions 已啟用。

### Q: GitHub Pages 顯示 404？

A: 等待 3-5 分鐘讓 Actions 完成建置，然後檢查 Settings → Pages 是否已啟用。

---

## 📞 需要協助？

如果遇到任何問題，請提供：

1. 錯誤訊息截圖
2. 執行的命令
3. 終端機輸出

我會協助您解決！
