# GitHub Pages 部署指南

## 📘 目前狀態

✅ **Vercel 部署已完成**：<https://lu-lu-sticker-tools-v3.vercel.app>

## 🚀 GitHub Pages 部署步驟

由於您的專案還沒有推送到 GitHub，需要先建立 GitHub Repository。

### 步驟 1：在 GitHub 建立新 Repository

1. 前往 <https://github.com/new>
2. 填寫以下資訊：
   - **Repository name**: `lu-lu-sticker-tools_v3`
   - **Description**: Lu Lu Sticker Tools - AI-powered LINE sticker generator
   - **Visibility**: 選擇 **Public**（GitHub Pages 免費版需要公開專案）
   - **不要**勾選 "Add a README file"
   - **不要**勾選 "Add .gitignore"
   - **不要**勾選 "Choose a license"
3. 點擊 **「Create repository」**

### 步驟 2：連結並推送到 GitHub

複製 GitHub 給您的 repository URL（例如：`https://github.com/CHW1982/lu-lu-sticker-tools_v3.git`）

然後在終端機執行：

```bash
cd /Users/carlsonwang/DevProjects/lu-lu-sticker-tools_v3

# 設定遠端 repository（替換成您的 URL）
git remote add origin https://github.com/CHW1982/lu-lu-sticker-tools_v3.git

# 設定主分支名稱
git branch -M main

# 推送到 GitHub
git push -u origin main
```

### 步驟 3：啟用 GitHub Pages

1. 在 GitHub Repository 頁面，點擊 **「Settings」**
2. 左側選單點擊 **「Pages」**
3. 在 **「Source」** 下拉選單中選擇：**「GitHub Actions」**
4. 等待 3-5 分鐘讓 GitHub Actions 自動建置

### 步驟 4：檢查部署狀態

1. 回到 Repository 首頁
2. 點擊上方的 **「Actions」** 標籤
3. 您應該會看到一個名為 "Deploy to GitHub Pages" 的 workflow 正在執行
4. 等待綠色勾勾 ✅ 出現

### 步驟 5：取得 GitHub Pages URL

部署完成後，您的網站會在：

```text
https://<您的GitHub使用者名稱>.github.io/lu-lu-sticker-tools_v3/
```

例如：`https://chw1982.github.io/lu-lu-sticker-tools_v3/`

---

## ⚠️ 注意事項

1. **公開 Repository**：GitHub Pages 免費版只支援公開專案
2. **建置時間**：首次部署需要 3-5 分鐘
3. **快取**：如果看到舊版本，請按 Ctrl+Shift+R 強制重新整理

---

## 🎯 完成後您將擁有

### 主要網址（Vercel）- 推薦使用

✅ <https://lu-lu-sticker-tools-v3.vercel.app>

- 最快載入速度
- 最佳使用者體驗
- 台灣地區優化

### 備援網址（GitHub Pages）

🔄 https://\<username\>.github.io/lu-lu-sticker-tools_v3/

- 100% 免費保證
- 穩定可靠
- 備援方案

---

## 📞 需要協助？

如果您在建立 GitHub Repository 或推送時遇到問題，請告訴我：

- 您的 GitHub 使用者名稱
- 錯誤訊息截圖
- 執行到哪個步驟

我會協助您完成！
