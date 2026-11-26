# 🛠️ Handoff：Roadmap 執行計畫（交給 Antigravity 執行）

- **建立日期**：2026-11-25
- **基準 commit**：`da4fcc6`（main）
- **背景文件**：[docs/ROADMAP.md](docs/ROADMAP.md)，包含市場趨勢、問題清單與優化方向。本文件是可直接照著執行的版本。
- **上一份 handoff**：Tailwind 建置遷移、chunk splitting。內容在 git 歷史 `69ab84e`，相關工作都已完成。

---

## 0. 執行守則（每個任務都要遵守）

### 0.1 安全

- 遵守 [GEMINI.md](GEMINI.md) 的 Security Mandate：
  - 不得把 API Key 寫進程式碼、log、測試或文件。
  - 不得新增任何會把使用者資料送到 Gemini 以外服務的程式碼。
  - 不得新增後端。

### 0.2 分支與 commit

- 從 `main` 開分支：Phase 0 用 `feat/phase0-compliance`，之後每個 Phase 各開一個新分支。
- **一個任務一個 commit**。commit message 用 Conventional Commits 格式，例如 `fix(processor): enforce LINE max size on regenerated slices`。
- **不要 push 到 `main`，也不要自行 merge**。push 到 `main` 會觸發 GitHub Pages 部署。每個 Phase 完成後停下來，等 owner 驗收。

### 0.3 每個任務完成前必須全部通過

**執行環境：Node 24 LTS**（本機已用 nvm 安裝 v24.22.3 並設為預設；Node 20 已於 2026-04 EOL）。執行任何指令前先確認：

```bash
node -v                     # 必須是 v24.x；若不是：source ~/.nvm/nvm.sh && nvm use 24
```

已驗證：在 Node 24 下 `npm ci`、`lint`、`tsc --noEmit`、`build` 全部通過（2026-11-25）。

```bash
npm run lint                # 0 error
npx tsc --noEmit            # 0 error
npm test                    # Phase 0-T4 之後才有，之後每次都要跑
npm run build               # 成功
```

### 0.4 不要順手重構

- 只改任務指定的範圍。
- 發現其他問題時，寫進本文件最後的「§6 發現的其他問題」，不要直接修。

### 0.5 遇到以下情況先停下來詢問 owner

- 需要新增本文件沒有列出的 npm 依賴。
- 任務的驗收標準和實際行為有衝突，例如修改後切片結果和原本不同。
- LINE 官方規格和本文件寫的數字不一致。**以官方為準**，並回報差異。
- 需要真實的 Gemini API 呼叫才能驗證。owner 會提供自己的 Key 在本機測試，**不得把 Key 寫進任何檔案**。

### 0.6 回報

- 每完成一個任務，在本文件的「§7 進度紀錄」加一行：日期、任務編號、commit hash、備註。

---

## 1. 專案速覽（執行前先讀）

| 檔案 | 職責 |
|---|---|
| [App.tsx](App.tsx) | 全域狀態：API Key、result、lastSettings。包含 `handleGenerate`、`handleRegenerateSlice`、`handleReplaceSlice` |
| [services/geminiService.ts](services/geminiService.ts) | 13 組氛圍台詞資料（約 314 筆 intent）、`generateStickerImage`、`generateSingleSticker` |
| [utils/imageProcessor.ts](utils/imageProcessor.ts) | `processFileToBase64`（參考圖用）、`resizeImage`、`splitImage`（Valley Finding）、`validateSticker`、`autoFixMargin`、`removeSingleImageBackground`、`downloadAllImages` |
| [components/ResultsView.tsx](components/ResultsView.tsx) | 結果頁的切片、審核、聊天室預覽、批次文字，以及上傳替換（`handleFileUpload`） |
| [components/StickerEditor.tsx](components/StickerEditor.tsx) | Canvas 文字編輯器。輸出尺寸和輸入相同（`canvas.width = img.width`） |
| [components/SettingsPanel.tsx](components/SettingsPanel.tsx) | 風格、字型、氛圍、關係模式、張數、模型選擇 |
| [types.ts](types.ts) | `GridOption`（8、16、24）、`ModelOption`、`ValidationIssue` 等型別 |

**LINE 靜態貼圖規格**（[.gemini/skills/line-sticker-spec.md](.gemini/skills/line-sticker-spec.md)）

| 項目 | 規格 |
|---|---|
| 貼圖本體 | 最大 370×320，寬高必須是偶數，四周留 10px 透明邊距 |
| 主圖 | 240×240 |
| 標籤圖 | 96×74 |
| 格式 | PNG，背景透明 |
| 檔案大小 | 每張 ≤1MB |
| 一組張數 | 8、16、24、32、40 |

---

## 2. Phase 0：上架合規修補與基礎建設

**目標**：所有輸出的貼圖都符合 LINE 規格，並用測試與 CI 保護。
**分支**：`feat/phase0-compliance`
**建議順序**：T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8。T4 的純函式抽取可以和 T1 一起規劃，但 commit 要分開。

### 已確認的 3 個 P0 問題（T1–T3 要修的就是這些）

1. **單張重新生成的圖太大**
   - `handleRegenerateSlice` 的流程是 `generateSingleSticker` → `removeSingleImageBackground` → `autoFixMargin`。
   - `autoFixMargin` 會沿用原圖尺寸，所以 1024×1024 的圖會原封不動進入 ZIP。
2. **上傳替換的圖變成白底 JPEG**
   - `ResultsView.handleFileUpload` 用的是 `processFileToBase64`。這個函式會填白底、轉成 JPEG（品質 0.85）、最大 1536px。
   - 結果是 ZIP 裡出現 `.png` 檔名的 JPEG，沒有透明背景，尺寸也超標。
3. **合規檢查漏了三項**
   - `validateSticker` 沒有檢查最大尺寸、檔案大小，也沒有檢查背景是否透明，所以問題 1、2 都會顯示「通過」。

另外還有一個相關風險：`StickerEditor` 存檔、`ResultsView.applyTextToImage`（批次文字）、`handleAutoFix` 輸出的圖都沒有重新檢查邊距。文字描邊可能壓到 10px 邊距。

---

### P0-T0｜統一 Node 版本為 24

**檔案**：`.nvmrc`（新增）、`package.json`、`.github/workflows/deploy.yml`

1. 新增 `.nvmrc`，內容只有一行：`24`。
2. `package.json` 加上 `"engines": { "node": "24.x" }`。**必須用 `24.x`，不可用 `>=24`**：Vercel 會以 `engines.node` 為準並蓋過後台設定，寫 `>=24` 可能被自動升到 Node 26。
3. `.github/workflows/deploy.yml`：把 `node-version: '20'` 改成 `node-version-file: '.nvmrc'`。**只改這一行**，其他部署設定不動。
4. README 和 DEPLOYMENT.md 裡的「Node.js 18+」改成「Node.js 24+」。
5. ~~Vercel 專案設定的 Node.js Version 改成 24.x~~ ✅ owner 已於 2026-11-25 在後台完成，agy 不需處理。

**驗收**：`node -v` 是 v24；`npm ci && npm run build` 成功；用 grep 搜尋 `node-version: '20'` 和 `Node.js 18` 都沒有結果。

---

### P0-T1｜新增唯一的輸出關卡 `enforceLineSpec`

**檔案**：`utils/imageProcessor.ts`，以及新檔 `utils/stickerMath.ts`（純函式，T4 要測）

#### 步驟 1：建立 `utils/stickerMath.ts`

這個檔案不能依賴 DOM，以下函式都要匯出：

```ts
export const LINE_STICKER_MAX_W = 370;
export const LINE_STICKER_MAX_H = 320;
export const LINE_SAFE_PADDING = 10;
export const LINE_MAX_FILE_BYTES = 1024 * 1024;

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number } // 含端點
export interface SpecLayout {
  canvasW: number; canvasH: number;   // 皆為偶數，≤ MAX
  drawW: number; drawH: number;       // 內容繪製尺寸
  offsetX: number; offsetY: number;   // 內容置中位移
}

/** 回傳 alpha > threshold 的像素外框；若全透明回傳 null */
export function findAlphaBounds(data: ArrayLike<number>, width: number, height: number, threshold = 0): Bounds | null;

/** 依內容尺寸計算合規版面 */
export function computeSpecLayout(contentW: number, contentH: number, opts?: {
  maxW?: number; maxH?: number; padding?: number; allowUpscale?: boolean; // 預設 false
}): SpecLayout;

/** 從 dataURL 估算解碼後的位元組數 */
export function estimateDataUrlBytes(dataUrl: string): number;

/** 偶數化（向下取偶） */
export function toEven(n: number): number;
```

#### 步驟 2：`computeSpecLayout` 的規則

1. 可用區域為 `availW = maxW - 2*padding`、`availH = maxH - 2*padding`，也就是 350×300。
2. 縮放比例 `scale = min(availW/contentW, availH/contentH)`。如果 `allowUpscale` 是 false，再取 `min(scale, 1)`。
3. `drawW = round(contentW*scale)`、`drawH = round(contentH*scale)`。
4. `canvasW = toEven(min(maxW, drawW + 2*padding))`。如果偶數化後 `canvasW - drawW < 2*padding`，就把 `drawW` 減到符合為止。`canvasH` 照同樣方式處理。
5. `offsetX = floor((canvasW - drawW)/2)`、`offsetY = floor((canvasH - drawH)/2)`。
6. **不變量**（T4 要測）：
   - `canvasW`、`canvasH` 都是偶數，且分別 ≤370、≤320。
   - `offsetX ≥ padding`，`canvasW - offsetX - drawW ≥ padding`。Y 方向相同。

#### 步驟 3：在 `imageProcessor.ts` 實作 `enforceLineSpec`

```ts
export const enforceLineSpec = async (dataUrl: string, opts?: { padding?: number; allowUpscale?: boolean }): Promise<string>
```

流程：

1. 載入圖片，用 `findAlphaBounds` 找出內容外框。全透明時直接回傳原圖。
2. 用 `computeSpecLayout` 算出版面。
3. 在新 canvas 上 `clearRect` 後，用 `imageSmoothingQuality = 'high'` 把內容 `drawImage` 到 offset 位置。
4. 用 `toDataURL('image/png')` 輸出。
5. 如果 `estimateDataUrlBytes` 超過 1MB，把 `maxW`、`maxH` 乘以 0.9 重新計算，最多試 3 次。仍然超過時照樣回傳，由 T3 的檢查顯示錯誤。

#### 步驟 4：保留舊 API

把 `autoFixMargin(b64, padding)` 改成只呼叫 `enforceLineSpec(b64, { padding })` 的薄包裝，並加上 `/** @deprecated use enforceLineSpec */`。這次先不刪除。

#### 步驟 5：把所有輸出路徑接上 `enforceLineSpec`

| 位置 | 改法 |
|---|---|
| `splitImage` 結尾 | 原本是 `Promise.all(slices.map(s => autoFixMargin(s, 10)))`，改成 `enforceLineSpec` |
| `App.handleRegenerateSlice` | 原本是 `autoFixMargin(processedImage, 10)`，改成 `enforceLineSpec(processedImage)`。這就是 P0 問題 1 的修正 |
| `ResultsView.handleAutoFix` | 改用 `enforceLineSpec` |
| `ResultsView.handleSaveEdit` | 先 `await enforceLineSpec(newImage)`，再呼叫 `onReplaceSlice` |
| `ResultsView.handleBatchApply` | `applyTextToImage` 之後接 `enforceLineSpec` |
| `downloadAllImages` | 打包前對每張切片再跑一次 `enforceLineSpec`（縱深防禦） |

**驗收**

- `enforceLineSpec` 是**冪等**的：對已經合規的圖再跑一次，輸出尺寸不變。T4 會測版面函式的冪等性。
- 本機手動測試（需要 owner 的 Key）：產生 8 格 → 任選一格「重新生成」→ 到審核頁按「全部檢查」→ 該格尺寸 ≤370×320。
- 不需要 Key 的替代測試：把一張 1024×1024 的透明 PNG 交給 `enforceLineSpec`，輸出 ≤370×320 且寬高都是偶數。

---

### P0-T2｜上傳替換改為保留透明的 PNG 流程

**檔案**：`utils/imageProcessor.ts`、`components/ResultsView.tsx`

1. 新增 `export const loadStickerFile = (file: File): Promise<string>`：
   - 用 FileReader 讀檔，畫到 canvas 上，**不填背景色**。
   - 用 `toDataURL('image/png')` 輸出後，`return enforceLineSpec(png)`。
   - 不支援的格式（例如瀏覽器無法解碼的 HEIC）要 reject，並給中文錯誤訊息：「不支援此圖片格式，請上傳 PNG」。
2. 把 `ResultsView.handleFileUpload` 改用 `loadStickerFile`。
   - 替換成功後，對該格執行 `validateSticker`，並更新 `validationResults[index]`，讓使用者立刻看到檢查結果。
3. 在 `processFileToBase64` 上方加註解：**僅供 Gemini 參考圖使用，不得用於貼圖輸出**。不要改它的行為。

**驗收**：上傳一張 800×800 的透明 PNG → 下載 ZIP → 對應編號的檔案是 PNG（檔頭為 `89 50 4E 47`）、有透明背景、≤370×320。

---

### P0-T3｜`validateSticker` 補上缺少的檢查

**檔案**：`utils/imageProcessor.ts`、`types.ts`

1. `ValidationIssue.type` 加上 `'opaque_background'`。
2. 新增以下檢查：

| 檢查 | 條件 | severity | autoFixable | 訊息 |
|---|---|---|---|---|
| 最大尺寸 | 寬 > 370 或高 > 320 | error | true | 「尺寸超過 LINE 上限 370×320（目前 W×H）。」 |
| 檔案大小 | `estimateDataUrlBytes` > 1MB | error | true | 「檔案超過 1MB。」 |
| 背景不透明 | 四個角落像素的 alpha 都是 255 | error | false | 「背景不是透明的，請先去背。」 |

3. 改成**只有 error 才判定不通過**：`passed = issues.every(i => i.severity !== 'error')`。
   - 這和原本「有任何 issue 就不通過」不同。原本 margin 和 chroma 的 warning 也會讓結果不通過，這樣不合理。**commit message 要寫明這項行為變更。**
4. 審核頁 UI：`autoFixable` 為 true 的 error 要顯示「自動修正」按鈕。這個按鈕呼叫的 `handleAutoFix` 已在 T1 改成 `enforceLineSpec`。

**驗收**：1024×1024 的圖顯示尺寸 error，按「自動修正」後通過；白底 JPEG 顯示「背景不透明」。

---

### P0-T4｜導入 Vitest，把切片演算法抽成純函式並測試

**新增依賴**（已確認版本相容）：`vitest@^5`（目前最新 5.1.1）。Vitest 5 需要 Node `^22.12 || ^24 || >=26` 與 Vite `^6.4`，本專案是 Node 24、Vite 6.4.3，兩者都符合。T0 必須先完成。

1. 在 `package.json` 的 scripts 加上：
   - `"test": "vitest run"`
   - `"typecheck": "tsc --noEmit"`
2. 測試環境用 `node`（不需要 jsdom）。可以在 `vite.config.ts` 加 `test: { environment: 'node' }`；如果型別衝突，就改成獨立的 `vitest.config.ts`。
3. 把 `splitImage` 裡的運算**原封不動地**搬到 `utils/stickerMath.ts`，**行為完全不變**：

```ts
export function gridDims(grid: number): { rows: number; cols: number }; // 8→2x4, 16→4x4, 24→6x4
export function smoothDensity(arr: ArrayLike<number>, windowSize: number): Float32Array;
export function findCuts(
  raw: ArrayLike<number>,       // 原始密度 (colDensity/rowDensity)
  smoothed: ArrayLike<number>,  // 平滑後
  length: number,               // img.width 或 img.height
  parts: number,                // cols 或 rows
  crossLength: number           // 另一軸長度，用於 5% 安全閥值
): number[];                    // 含 0 與 length
```

   - `findCuts` 必須保留原本的三個規則：15% 搜尋範圍、`score = smoothed*100 + |x-expected|`、`raw[best] > crossLength*0.05` 時退回均分線。
   - `splitImage` 改為呼叫這些函式。
   - `geminiService.ts` 裡重複的 rows/cols 判斷也改用 `gridDims`。aspectRatio 的對照留在 service 裡。
4. 測試檔放在 `utils/__tests__/stickerMath.test.ts`，至少涵蓋：
   - `gridDims`：8、16、24 三種。
   - `findCuts`：
     - 間隙偏離均分線但在 15% 範圍內時，切在間隙。
     - 內容剛好跨過均分線、沒有乾淨谷地時，退回均分線。
     - 輸出長度為 `parts + 1`，而且嚴格遞增。
   - `smoothDensity`：邊界視窗的平均值正確。
   - `computeSpecLayout`：
     - 以不同內容尺寸（例如 1×1、350×300、1024×1024、2000×100、101×99）驗證 T1 列出的所有不變量。
     - 冪等性：`computeSpecLayout(drawW, drawH)` 的輸出和輸入的 canvas 尺寸相同。
   - `findAlphaBounds`：全透明回傳 null；單一像素時外框正確。
   - `estimateDataUrlBytes`：結尾有 `=` 和 `==` 補位的兩種情況都正確。
5. **回歸檢查**：重構前後用同一張合成測試圖（程式產生的 RGBA buffer）算出的 cut 位置必須相同。把這個比對寫成一個測試。

**驗收**：`npm test` 全部通過；`splitImage` 的對外行為不變。

---

### P0-T5｜新增 CI 檢查流程

新增 `.github/workflows/ci.yml`：

- 觸發條件：`pull_request` 和 `push`（所有分支）。
- 步驟：`actions/checkout@v4` → `actions/setup-node@v4`（`node-version-file: '.nvmrc'`、cache npm）→ `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`。
- `deploy.yml` 除了 T0 改過的 Node 版本，**不要再修改**。

**驗收**：push 分支後，GitHub Actions 的 CI 是綠燈。如果沒有 push 權限，就在本機依序跑完這五個指令並記錄結果。

---

### P0-T6｜補上 PWA 圖示

目前 `public/` 資料夾不存在，所以 manifest 裡的 `pwa-192x192.png`、`pwa-512x512.png`、`favicon.ico`、`apple-touch-icon.png`、`mask-icon.svg` 都會 404。

1. 建立 `public/logo.svg`。內容沿用 [components/Header.tsx](components/Header.tsx) 的貓咪 SVG 頭像，取出成獨立的正方形 SVG。
2. 用 vite-pwa 官方的產生器做出各尺寸圖示，產出的檔案要 commit。這是一次性指令，不加進 dependencies：
   ```bash
   npx --yes @vite-pwa/assets-generator --preset minimal-2023 public/logo.svg
   ```
3. 依實際產出的檔名更新 `vite.config.ts` 的 `includeAssets` 和 `manifest.icons`。要包含 maskable icon，`purpose: 'maskable'`。
4. 在 `index.html` 加上 favicon 和 apple-touch-icon 的 `<link>`。

**驗收**：`npm run build && npm run preview` 後，DevTools 的 Application → Manifest 沒有圖示錯誤，Network 沒有 404。

---

### P0-T7｜統一模型名稱

1. `types.ts`：刪除 `ModelOption.Gemini3Pro`，它和 NanoBananaPro 指向同一個模型。
   - 同時刪除 SettingsPanel 裡對應的按鈕（第 145–190 行附近）。
   - 刪除 `geminiService.ts` 裡 `isPro` 判斷中的 `Gemini3Pro`。
2. 新增 `ModelOption → 實際模型 ID` 的對照表 `MODEL_IDS`，取代 service 裡兩處重複寫的 `actualModelId` 三元運算。
3. README.md 和 MANUAL.md：
   - 把所有「Gemini 1.5 Pro」改成「Gemini 3 Pro Image（Nano Banana Pro）」，「Gemini 2.5 Flash」改成「Gemini 2.5 Flash Image」。
   - 刪除 README 裡有具體數字的「免費配額」表格，因為這些數字無法驗證。改成連到 Google 官方的 rate limits 和 pricing 頁面。
   - 「8 / 16 / 24 格」與「5 種風格」等描述，改成和程式現況一致（目前有 14 種風格）。
4. 如果 localStorage 或其他地方保存了舊的 `'gemini-3-pro-image-preview-alt'` 值，要做 fallback 轉成 NanoBananaPro。先用 grep 確認是否真的有保存，沒有就跳過。

**驗收**：用 grep 搜尋 `1.5 Pro` 和 `Gemini3Pro` 都沒有結果；UI 只剩 2 個模型選項。

---

### P0-T8｜移除 UI 描述中的既有角色 IP 名稱

LINE 審核禁止模仿既有角色，所以 UI 描述和提示詞都不要帶入 IP 名稱。修改 [components/SettingsPanel.tsx](components/SettingsPanel.tsx)：

| 行 | 原文 | 改為 |
|---|---|---|
| 14 | 線條小狗風：粗線條、極簡色塊、強調表情 | 粗線條、極簡色塊、強調表情 |
| 17 | 吉伊卡哇式溫柔、水汪汪委屈大眼、療癒粉嫩 | 水汪汪委屈大眼、圓潤小短手、療癒粉嫩 |
| 24 | 阿德曼式黏土質感、指捏痕跡、定格動畫感 | 黏土質感、指捏痕跡、定格動畫感 |

接著用 grep 確認 `services/geminiService.ts` 的提示詞裡沒有任何既有角色、工作室或品牌名稱。目前已確認沒有，未來新增題材時也要維持。

**Phase 0 結束**：停下來，在 §7 寫上總結，等 owner 驗收後才開始 Phase 1。

---

## 3. Phase 1：角色續航與作品保存

**目標**：同一個角色能穩定地做出第 2、3 組，產出內容重新整理後也不會遺失。
**分支**：`feat/phase1-character`
**新增依賴**：`idb@^8`（IndexedDB 的輕量包裝），以及測試用的 devDependency `fake-indexeddb`。除此之外不再新增依賴。
**建議順序**：T0 → T1 → T2 → T5 → T3 → T4 → T6。
- T5（Toast 與錯誤分類）提前做，因為 T3 的角色設定圖生成會用到錯誤處理。
- T3 和 T6 需要真實的 Gemini 呼叫，請 owner 在本機瀏覽器輸入 Key 測試。
- T3 和 T4 的角色一致性要由 owner 目視驗收。

### P1-T0｜修正 `computeSpecLayout` 的奇數縮 1px 問題（Phase 0 遺留）

**檔案**：`utils/stickerMath.ts`、`utils/__tests__/stickerMath.test.ts`

- **問題**：`drawW + 2*padding` 是奇數時，現在的做法是把 `drawW` 減 1，讓畫布維持偶數。這會讓長寬比差 1px，原本不必縮放（scale = 1）的圖也會被重新取樣、稍微變糊。
- **修法**：
  1. 先算 `canvasW = drawW + 2*padding`。
  2. 如果是奇數，而且 `canvasW + 1 ≤ maxW`，就把畫布加 1px（多出的 1px 自然成為某一側的邊距），**不要縮內容**。
  3. 只有在加 1px 會超過上限時，才退回「`drawW` 減 1」。`canvasH` 照同樣方式處理。
- **測試**：
  - 新增「101×99 的內容、scale = 1 時，`drawW` 和 `drawH` 維持 101×99」。
  - 原有的不變量測試（偶數、≤ 上限、四邊邊距 ≥ padding、冪等）全部要繼續通過。
- **驗收**：`npm test` 通過；修完後把 §6 裡這一條標成已解決。

### P1-T1｜建立儲存層

- 新檔 `services/storage.ts`，用 `idb` 建立資料庫 `lulu-sticker`（version 1），包含 3 個 store：
  - `characters`：key 為 `id`
  - `projects`：key 為 `id`，加上 `updatedAt` 索引
  - `settings`
- 型別定義在 `types.ts`：

```ts
interface Character { id: string; name: string; prompt: string; stylePreset: string; textStylePreset: string;
  referenceImage: string | null; referenceImage2: string | null; characterSheet: string | null; createdAt: number }
interface Project { id: string; characterId: string | null; settings: GenerationSettings;
  original: string; slices: string[]; mainIndex: number; tabIndex: number; createdAt: number; updatedAt: number }
```

- 匯出 CRUD 函式。**API Key 不得存進 IndexedDB**，維持原本的 localStorage 加到期機制。
- **驗收**：新增 `storage` 的單元測試，使用 `fake-indexeddb`。這是 devDependency，屬於本任務允許新增的依賴。

### P1-T2｜專案自動保存與還原

- `handleGenerate` 成功後建立 Project；`handleReplaceSlice`、選擇主圖或標籤圖時更新 Project，寫入要 debounce 500ms。
- `mainIndex`、`tabIndex` 目前存在 ResultsView 裡，要提升到 App 或 Project 層級。
- App 啟動時讀取最新一筆 Project，顯示「繼續上次的作品？」橫幅。
- Header 加上「歷史作品」抽屜，列出縮圖、日期，可以刪除。
- **驗收**：產生 → 編輯一格 → 重新整理 → 還原後的結果和編輯內容一致。

### P1-T3｜角色設定圖（Character Sheet）

- 在 `geminiService.ts` 新增 `generateCharacterSheet(settings, apiKey)`：
  - 產出 1 張 16:9 的設定圖，內容是正面、側面、背面，加上 3 種表情（開心、生氣、哭）。
  - 綠幕背景，**不放任何文字**。
- SettingsPanel 新增「① 建立角色」步驟：
  - 產生設定圖 → 使用者可以重新產生或確認 → 確認後存成 Character。
  - 這個步驟可以跳過，跳過時維持現有流程。
- `generateStickerImage` 和 `generateSingleSticker`：如果有 `characterSheet`，把它當成第一張參考圖附上。
  - 提示詞加上 `[CHARACTER SHEET] Image 1 is the locked character design. Match proportions, colors, outfit exactly.`
  - 使用者原本的參考圖順延到後面。
- **驗收**：同一個角色產生 2 組貼圖，角色的主色與服裝一致。由 owner 目視驗收。

### P1-T4｜角色庫 UI

- 在 SettingsPanel 頂部加上「我的角色」橫向列表。
- 選擇角色後，自動填入 prompt、風格、字型、參考圖、設定圖，並顯示「用這個角色做新一組」。
- 支援重新命名與刪除。
- **驗收**：選擇已存的角色，不用重新輸入任何資料就能直接生成。

### P1-T5｜錯誤處理與 Toast

- 新增 `components/Toast.tsx` 和 `useToast` hook，取代全部 6 處 `alert()`、`confirm()`：
  - `App.tsx`：清除 API Key 的 `confirm`、重新生成失敗的 `alert`
  - `components/ResultsView.tsx`：批次文字的兩處 `alert`、上傳失敗的 `alert`
  - `utils/imageProcessor.ts`：`downloadAllImages` 打包失敗的 `alert`。這裡是 utils，不能用 hook，要改成丟出錯誤，由呼叫端（ResultsView）顯示 Toast
  - 完成後用 grep 搜尋 `alert(` 和 `confirm(` 都不能有結果
  - 清除 API Key 的確認改用自訂的確認對話框。
- 新增 `services/errors.ts`，提供 `classifyGeminiError(err)`，分成以下幾類：

| 類型 | 判斷方式 | 顯示訊息 |
|---|---|---|
| `quota` | 429 / `RESOURCE_EXHAUSTED` | 「已達使用額度，請稍後再試或更換模型」 |
| `auth` | 401 / 403 / API key invalid | 「API Key 無效」，並開啟 Key 設定視窗 |
| `safety` | `finishReason` 為 `SAFETY` 或沒有 inlineData | 「內容被安全過濾，請調整描述」 |
| `network` | 網路錯誤 | 網路錯誤訊息 |
| `unknown` | 其他 | 一般錯誤訊息 |

- 只有 `quota` 和 `network` 會自動重試：指數退避 2s、4s、8s，最多 3 次，UI 要顯示「重試中（2/3）」。
- **驗收**：用 mock 讓 `ai.models.generateContent` 丟出各種錯誤，`classifyGeminiError` 的單元測試全部通過。

### P1-T6｜重新生成時避免重複

- `generateSingleSticker` 的提示詞加入同組其他格的 `visual` 摘要，並要求 `Do NOT reuse these poses: ...`。
- 同時套用 P1-T3 的角色設定圖。
- 單張生成的 aspectRatio 改用 `4:3`，比較接近 370×320。輸出仍然會經過 `enforceLineSpec`。

**Phase 1 結束**：停下來等 owner 驗收。

### Phase 1 驗收修正（2026-11-26，Claude Code 審查後新增）

**背景**：Phase 1 的 46 項測試、lint、typecheck、build 都通過，但審查程式碼時發現以下問題。F1–F3 會造成作品內容錯誤或遺失，**必須修完才能合併**；F4、F5 建議一起修。

**分支**：繼續使用 `feat/phase1-character`。開始前先執行 `git merge origin/main`，帶入 main 上的部署流程修正 `b80527c`。這次合併不會有衝突。

**建議順序**：F1 → F2 → F3 → F5 → F4。

#### P1-F1｜單張重新生成會把結果寫進錯的作品（必修）

- **問題**：
  - `App.handleRegenerateSlice` 等 Gemini 回傳後，才用 `updateActiveProject` 寫入，寫入的是「當下」的 `activeProjectRef.current`。
  - 重新生成要 10–60 秒。這段期間如果使用者從歷史作品切到別的作品，或開始生成新的一組，新圖就會蓋掉**另一個作品**同一格，並被自動保存。
  - `loadingIndices` 也沒有區分作品，切換作品後，另一個作品的同一格會一直顯示轉圈。
- **修法**：
  1. 重新生成開始時，記下 `projectId = activeProjectRef.current.id`。
  2. 完成時依 `projectId` 寫入：
     - 如果還是目前作品，用 `updateActiveProject`。
     - 如果不是，從 `projects` state 找到該作品，更新 `slices` 和 `updatedAt` 後直接 `saveProject`，並同步更新 `projects` state。
     - 如果作品已經被刪除，就丟棄結果，不要報錯。
  3. `loadingIndices` 改成以作品區分，例如 `Record<string, number[]>`，或用 `${projectId}:${index}` 當 key。ResultsView 只顯示目前作品的轉圈狀態。
  4. 把「依 id 更新某作品的某一格」抽成純函式，例如 `services/projectState.ts` 的 `applySliceUpdate(projects, projectId, index, image)`，並寫單元測試：目前作品、非目前作品、已刪除作品三種情況。
- **驗收**：在作品 A 按某一格重新生成 → 立刻從歷史作品切到作品 B → 等重新生成完成：作品 B 不變，切回作品 A 時那一格已經更新。

#### P1-F2｜切換作品或關閉頁面時，最後 0.5 秒內的修改會遺失（必修）

- **問題**：
  - `handleGenerate`、`handleSelectProject`、`handleDeleteProject` 和元件卸載時，都直接 `clearTimeout` 掉還沒執行的自動保存。
  - 使用者編輯某一格後馬上切換作品、生成新的一組，或重新整理、關閉分頁，這次修改就不會寫進 IndexedDB。
- **修法**：
  1. 把 debounce 邏輯抽成 `utils/debouncedSaver.ts`：`createDebouncedSaver<T>(save: (v: T) => Promise<void>, delayMs)`，回傳 `{ schedule(v), flush(): Promise<void>, cancel() }`。
  2. 切換作品、生成新的一組、元件卸載時，改呼叫 `flush()`，**不要**用 `cancel()`。只有「刪除的正是還沒保存的那個作品」時才用 `cancel()`。
  3. 監聽 `pagehide` 和 `visibilitychange`（變成 `hidden` 時），呼叫 `flush()`。
  4. 用 Vitest 的 fake timers 測試 `createDebouncedSaver`：
     - 連續 `schedule` 只會保存最後一次。
     - `flush` 會立刻保存。
     - `cancel` 後不會保存。
     - `flush` 時沒有待保存的資料，不會呼叫 save。
- **驗收**：在審核頁編輯某一格的文字後，0.5 秒內按重新整理，還原後修改還在。

#### P1-F3｜瀏覽器儲存空間不足時，顯示成「Gemini 額度用完」（必修）

- **問題**：
  - `handleGenerate` 的 `try` 同時包住 Gemini 呼叫和 `await saveProject(...)`。
  - IndexedDB 空間不足時會丟出 `QuotaExceededError`，訊息裡有「quota」，被 `classifyGeminiError` 歸類成 `quota`，使用者看到的是「已達使用額度，請稍後再試或更換模型」。這是錯的。
  - 自動保存失敗只寫進 `console.error`，使用者完全不知道作品沒存到。
- **修法**：
  1. 新增 `services/storage.ts` 的 `isStorageQuotaError(err)`，判斷 `DOMException` 的 `name === 'QuotaExceededError'`。
  2. `handleGenerate` 把保存移出 Gemini 的 `try/catch`。生成成功但保存失敗時，結果照常顯示，Toast 顯示「瀏覽器儲存空間不足，這組作品沒有保存，請到歷史作品刪除舊作品」。
  3. 自動保存（F2 的 saver）失敗時也要顯示同樣的 Toast。同一個作品連續失敗時只提示一次，不要每次 debounce 都跳出來。
  4. `classifyGeminiError` 加一條防呆：`QuotaExceededError` 一律不歸類成 `quota`。並補一項測試。
- **驗收**：單元測試涵蓋 `isStorageQuotaError`，以及 `classifyGeminiError` 不把 `QuotaExceededError` 當成 Gemini 額度問題。

#### P1-F5｜歷史作品一按就刪除，沒有確認（建議修）

- **問題**：`HistoryDrawer` 的刪除按鈕直接呼叫 `onDelete`，而且刪除無法復原。角色刪除有確認對話框，作品刪除卻沒有。
- **修法**：比照角色刪除，用 `ConfirmDialog` 確認：「確定要刪除這組作品嗎？此操作無法復原。」
- **驗收**：在歷史作品按刪除會先跳出確認，按取消不會刪除。

#### P1-F4｜作品佔用的儲存空間（建議修）

- **問題**：
  - 每個作品都存了完整的 2K 原圖（PNG base64），`settings` 裡又複製了一份角色設定圖和參考圖。一個作品可能接近 10MB，而且沒有上限。
  - 角色設定圖以 2K PNG 存在角色庫，每次生成都整張送給 Gemini，請求很大、速度較慢。
- **修法**：
  1. 角色設定圖在產生後就壓縮：長邊最大 1536px，轉成 JPEG（品質 0.9），之後才存進角色庫和送給 Gemini。它只當參考圖用，不需要透明背景。
  2. 保存作品時，把 `original` 壓成 JPEG（品質 0.9）。它只用在「原圖」分頁顯示，不會再拿去切片。**`slices` 必須維持 PNG**，因為要保留透明背景。
  3. 歷史作品抽屜顯示已用空間（`navigator.storage.estimate()`）。超過 80% 時顯示提示，建議刪除舊作品。**不要自動刪除使用者的作品**。
  4. 第一次保存作品成功後，呼叫一次 `navigator.storage.persist()`，降低瀏覽器自動清除資料的機率。失敗或不支援就略過。
- **驗收**：產生一組 16 格貼圖後，DevTools → Application → IndexedDB 裡這筆作品比修正前明顯變小，而且貼圖切片仍是透明 PNG。

**修正完成**：在 §7 為每個修正加一行紀錄，然後停下來等 owner 驗收。**不要合併到 main**。

---

## 4. Phase 2：趨勢內容引擎與更多張數

**分支**：`feat/phase2-content`

### P2-T1｜把台詞資料抽成檔案

- 把 `geminiService.ts` 的 13 組 `INTENTS_*` 和 `VIBE_KEYS` 移到 `data/vibes/<key>.json`。
- 每個檔案的格式：

```json
{ "key": "Lazy & Chill", "label": "💤 懶散休閒", "desc": "...", "tags": ["日常"], "updatedAt": "2026-11-25",
  "intents": [{ "text": "...", "description": "...", "visual": "..." }] }
```

- 新增 `data/vibes/index.ts`，集中 import 並匯出 `VIBES` 陣列。SettingsPanel 的 `VIBE_PRESETS` 也改從這裡讀取，消除兩處重複定義。
- 新增測試：每個 vibe 至少要有 24 筆 intent，`text` 不得為空，不同 vibe 之間不得有完全重複的 `text`（允許例外清單）。
- **驗收**：UI 和生成結果與抽取前相同；`geminiService.ts` 只剩邏輯，少於 200 行。

### P2-T2｜新增趨勢包

新增 4 組氛圍，每組 24 筆。台詞要短（2–6 字）、動作描述要明確，並避免只有台灣人懂、外國人完全無法理解的梗。

| 氛圍 | 內容方向 |
|---|---|
| 死語復興 | LKK、瞎趴、哇哩咧、跩個 258 萬、粉好吃、涼拌炒雞蛋…… |
| 反差組合 | 前 12 格極度可愛、後 12 格同樣動作但崩潰，前後兩兩對照 |
| 節慶包・農曆新年 | 新年快樂、紅包拿來、恭喜發財、圍爐…… |
| 萬用基本款 | 早安、晚安、謝謝、OK、抱歉、收到、辛苦了、哈哈…… 這些是最高頻需求 |

- 每組 JSON 都寫上 `updatedAt`。另外新增 `data/vibes/README.md`，說明「每季檢查熱梗並更新」的流程與欄位規範。
- **驗收**：4 組都能選擇並生成；P2-T1 的資料測試通過。

### P2-T3｜無字模式與多語系輸出

- `GenerationSettings` 新增 `textMode: 'ai' | 'none' | 'overlay'`，預設為 `'ai'`，維持現狀。
  - `'none'` 和 `'overlay'`：提示詞改成 `Do NOT draw any text`，並在每格保留下方約 25% 的空間。
  - `'overlay'`：生成後由 Canvas 自動疊上每格的 `intent.text`。重用並改良 `ResultsView.applyTextToImage`，搬到 `utils/textOverlay.ts`。
    - 自動縮小字型讓文字寬度不超過 90%。
    - 描邊顏色和字型沿用 StickerEditor 的設定。
- `intent` 新增可選欄位 `textI18n?: { ja?: string; en?: string }`。
  - 下載時可以選語言（繁中、日、英），各自產出一份 ZIP。
  - 沒有翻譯的格子用 Gemini 文字模型（`gemini-2.5-flash`）批次翻譯，使用者可以修改。
- 疊字之後一律經過 `enforceLineSpec`。
- **驗收**：同一組圖可以下載中、日兩份 ZIP，圖案相同、文字不同，文字不壓到 10px 邊距。

### P2-T4｜支援 32 和 40 張

- `GridOption` 加上 32 和 40。生成方式是分批跑 16 格的流程：32 = 16 + 16，40 = 16 + 16 + 8。
  - 每一批都帶相同的角色設定圖（P1-T3），台詞依序分配。
  - 第 2 批之後，提示詞要加上「與前批不重複動作」的清單。
- 進度 UI 顯示「第 2/3 批生成中」。如果某一批失敗，只重試該批。
- 合併成一個 `slices` 陣列，ZIP 編號為 01–40。
- 台詞不足 32 或 40 筆時，從「萬用基本款」補足，並提示使用者。
- **驗收**：產生 40 張，ZIP 內有 01–40.png、main.png、tab.png，而且全部通過 `validateSticker`。

### P2-T5｜主圖與標籤圖專屬生成

- 新增 `generateIconImage(settings, kind: 'main' | 'tab', apiKey)`：
  - 內容是角色的大頭、表情最具代表性，**不放文字**，構圖要飽滿。
  - 生成後縮放成 240×240（main）或 96×74（tab）。內容用 contain 方式置中，四周保留 4–6px。
- ResultsView 的主圖與標籤圖選擇器加上「AI 生成專屬圖」按鈕。原本「從貼圖中選一張」的方式保留。
- **驗收**：專屬標籤圖在 96×74 的大小下，仍然看得出角色是誰。由 owner 目視驗收。

### P2-T6｜情緒覆蓋檢查

- 新增 `utils/coverage.ts`：定義約 10 個高頻類別（打招呼、晚安、感謝、OK、道歉、拒絕、等等、愛你、哭、生氣），每個類別配一組關鍵字。
- 比對這一組 intents 的 `text` 和 `description`，在 SettingsPanel 顯示覆蓋率，並提示缺少的類別，例如「這組缺少『道歉』類」。
- **驗收**：`coverage` 單元測試通過；選擇「死語復興」時，會提示缺少的高頻類別。

**Phase 2 結束**：停下來等 owner 驗收。

---

## 5. Phase 3：新格式與上架輔助

**分支**：`feat/phase3-formats`
**⚠️ 開工前必做**：到 [LINE Creators Market 官方指南](https://creator.line.me/en/guideline/) 核對以下規格，把查到的結果寫進 `.gemini/skills/line-sticker-spec.md`，**確認後才開始寫程式**：

1. 動態貼圖的尺寸上限、影格數、播放秒數、循環次數、檔案大小。
2. 表情貼的尺寸與數量。
3. **一般上架時，AI 生成的貼圖和表情貼是否允許，以及需要哪些聲明**。2026 年「放手去DRAW」大賽只開放 AI 貼圖，不開放 AI 表情貼，一般上架的規定要另外確認。

下表的數字只是參考，**以官方為準**：

| 格式 | 參考規格（待核對） |
|---|---|
| 動態貼圖 | APNG、最大 320×270、5–20 影格、≤4 秒、≤300KB |
| 表情貼 | 180×180 PNG，每組 8–40 個 |

### P3-T1｜動態貼圖（程式產生動態）

- **新增依賴**：`upng-js`（APNG 編碼）。加入前要先詢問 owner。
- 新檔 `utils/animate.ts`：輸入一張靜態貼圖，套用預設動態模板，在 Canvas 上逐格繪製後編碼成 APNG。
  - 預設模板：彈跳、左右搖晃、放大縮小、閃爍星星、抖動（生氣）。
  - 每種模板要能調整速度和強度。
  - 輸出必須符合官方規格。檔案超過上限時，依序減少影格數、降低色彩數，再重新編碼。
- ResultsView 新增「動態」分頁，可以對每格選擇模板並即時預覽（`<img>` 可直接播放 APNG）。
- ZIP 匯出：動態貼圖要另外打包成符合官方結構的 ZIP，結構以官方指南為準。
- **驗收**：單元測試驗證影格數與尺寸；匯出的 APNG 要通過官方規格檢查，可用 LINE Creators Market 的上傳模擬器確認，或由 owner 實測。

### P3-T2｜表情貼

- 只有在「開工前必做」第 3 點確認可以使用 AI 時才進行。不可以的話，在 §6 記錄並跳過。
- 新增 `GenerationSettings.productType: 'sticker' | 'emoji'`。
- emoji 模式的提示詞：單純的符號或表情，**不放文字**，在小尺寸下也要能辨識。
- 切片後輸出 180×180，編號格式依官方規定。

### P3-T3｜上架資料產生器

- 新增 `generateListingMeta(settings, intents, apiKey)`，用 `gemini-2.5-flash` 文字模型產生：
  - 繁中、日、英三種語言的標題與說明，字數上限依官方規定。
  - 建議標籤。
- ResultsView 新增「上架資料」分頁：可以編輯，並提供「複製」按鈕。
- 附上 AI 使用聲明與原創性檢查清單，例如「沒有使用既有角色、品牌、名人肖像」「已勾選使用 AI」。
- **驗收**：產生的文字都在字數上限內，可以修改，也可以複製。

### P3-T4｜隨你填（Custom）貼圖：只做調查

- 研究官方規格，輸出一份可行性評估到 `docs/research-custom-stickers.md`。**這個任務不寫程式**。

---

## 6. 發現的其他問題（執行期間記錄）

> 執行過程中發現但不在任務範圍內的問題，請記在這裡，不要直接修。

- （已知）`getIntentsByVibe` 遇到自訂氛圍（Custom）時，會退回 HIGH_ENERGY 的台詞。使用者沒有開啟「自訂貼圖文字」時，自訂氛圍只會影響提示詞，不會影響台詞。等 Phase 2 再評估。
- （已知）`ResultsView.applyTextToImage` 的字型寫死為 Inter 和微軟正黑體，在 macOS 會 fallback 到其他字型。P2-T3 會一起處理。
- （已解決，P1-T0）`computeSpecLayout` 遇到奇數寬高時曾把內容縮 1px 來維持畫布偶數，已改為畫布未達上限時多補 1px 邊距，只有在加 1px 會超限時才縮 1px。
- （已知限制）`hasOpaqueBackground` 是用內容外框周長判斷的，本身就是「方形卡片」造型的貼圖（外框整圈不透明）會被誤判為未去背。目前視為可接受，若使用者回報再改為 warning。

---

## 7. 進度紀錄

| 日期 | 任務 | commit | 備註 |
|---|---|---|---|
| 2026-11-25 | — | `da4fcc6` | 建立本 handoff 與 docs/ROADMAP.md（Claude Code） |
| 2026-11-25 | 環境 | — | 本機用 nvm 安裝 Node v24.22.3 並設為預設；已驗證 npm ci、lint、tsc、build 通過。repo 內的版本設定由 P0-T0 處理 |
| 2026-11-25 | P0-T0 | `e82f0e3` | 新增 `.nvmrc` (`24`)、`package.json` `engines.node: "24.x"`、更新 `deploy.yml` 與 `README.md`，驗證 `npm ci && lint && tsc && build` 通過 |
| 2026-11-25 | P0-T1 | `8946cab` | 新增 `utils/stickerMath.ts` 與 `enforceLineSpec` 並串接所有輸出路徑，保留 `@deprecated autoFixMargin` |
| 2026-11-25 | P0-T2 | `eba9f2a` | 新增 `loadStickerFile` 保留透明 PNG 並於上傳替換後自動檢查 |
| 2026-11-25 | P0-T3 | `bb9117c` | `validateSticker` 新增 370×320、1MB 與不透明背景檢查；改為僅 `error` 判定不通過 |
| 2026-11-25 | P0-T4 | `9eb6bf1` | 導入 Vitest 5，抽出 `gridDims`、`smoothDensity`、`findCuts` 至 `stickerMath.ts` 並完成 19 項單元與回歸測試 |
| 2026-11-25 | P0-T5 | `5c28b7f` | 新增 `.github/workflows/ci.yml`（lint、typecheck、test、build）並本機驗證通過 |
| 2026-11-25 | P0-T6 | `b5340d5` | 產生 PWA 圖示與 favicon，更新 `vite.config.ts` manifest icons 與 `index.html` links |
| 2026-11-25 | P0-T7 | `d2b3f34` | 移除重複 `ModelOption.Gemini3Pro`、新增 `MODEL_IDS` 對照表並同步 README/MANUAL 模型名稱 |
| 2026-11-25 | P0-T8 | `c473434` | 移除 `SettingsPanel` 風格描述中的既有角色與工作室 IP 名稱，確認 `geminiService.ts` 無 IP 名稱 |
| 2026-11-25 | Phase 0 | — | **Phase 0 全部完成（P0-T0 ~ P0-T8）**：Node 24 標準化、`enforceLineSpec` 輸出關卡、透明 PNG 上傳、`validateSticker` 補全檢查、Vitest 19 項測試、GitHub Actions CI、PWA 圖示、模型名稱統一、IP 名稱移除。待 owner 驗收。 |
| 2026-11-25 | P0 驗收修正 | — | （Claude Code）修正「背景不透明」檢查：`enforceLineSpec` 補的透明邊距讓整張圖四角永遠透明，白底上傳會漏判。改為新增 `hasOpaqueBackground`，看內容外框周長（≥95% 不透明即判定），並加 6 項測試（共 25 項）。 |
| 2026-11-25 | P1-T0 | `cc7e4d5` | 修正 `computeSpecLayout` 奇數寬高優先多補 1px 畫布邊距、僅超限時縮 1px，更新 §6 狀態並補齊 3 項測試（共 28 項） |
| 2026-11-25 | P1-T1 | `9b27774` | 新增 `idb@^8` 與 `fake-indexeddb`，建立 `services/storage.ts`（`characters`/`projects`/`settings` stores，阻擋 API Key 寫入）與單元測試 |
| 2026-11-25 | P1-T2 | `fa97461` | 實作作品自動保存（500ms debounce）、提升 `mainIndex`/`tabIndex`、新增啟動還原橫幅與 `HistoryDrawer` 歷史作品抽屜 |
| 2026-11-25 | P1-T5 | `abeb967` | 新增 `services/errors.ts`（含 402 `billing`/`quota`/`auth`/`safety`/`network` 分類與 2s/4s/8s 重試）、`Toast` 與 `ConfirmDialog` 取代全部 6 處 `alert`/`confirm` |
| 2026-11-25 | P1-T3 | `324dd71` | 新增 `generateCharacterSheet`（16:9 正側背＋三表情、綠幕無字），於 `SettingsPanel` 加入「① 建立角色設定圖」步驟並優先以 Image 1 注入生成流程 |
| 2026-11-25 | P1-T4 | `d323f2f` | 新增 `CharacterLibrary` 橫向角色庫 UI，支援一鍵帶入設定、重新命名與確認刪除 |
| 2026-11-25 | P1-T6 | `3407d2c` | `generateSingleSticker` 改用 `4:3` 長寬比並附帶同組其他格 `visual` 避免重複姿勢 |
| 2026-11-25 | Phase 1 | — | **Phase 1 全部完成（P1-T0 ~ P1-T6）**：奇數畫布修補、IndexedDB 儲存與作品自動保存、錯誤分類重試與 Toast、角色設定圖與角色庫、單張重繪防重複；46 項單元測試與 lint/typecheck/build 全過，待 owner 實機驗收。 |
