# Skill: LINE Sticker Specification Compliance (LINE 貼圖規格合規)

## 當何時使用 (When to Use)
當需要修改圖像處理演算法 (`utils/imageProcessor.ts`)、調整畫布 (Canvas) 切割邏輯，或是修改上傳至 LINE Creators Market 的 zip 打包腳本時。

## 核心守則 (Core Principles)
任何切割或匯出的貼圖都必須**嚴格遵守** LINE 官方的尺寸與格式限制。這是工具可用性的最基本要求。

## 執行動作 (Actions)

### 1. 尺寸與格式驗證 (Dimensions & Format)
- **主要貼圖 (Main Image)**: 240 x 240 (W x H)
- **貼圖本體 (Sticker Images)**: 
  - 最大尺寸：370 x 320 (W x H)
  - 邊長**必須為偶數** (Even numbers only)。
- **聊天室標籤圖 (Tab Image)**: 96 x 74 (W x H)
- **格式**: 僅允許 PNG (背景必須為透明)。

### 2. 安全邊距 (Safe Margin)
- 貼圖本體周圍**必須保留至少 10px 的透明邊距**。
- 切割演算法 (Valley Finding) 在運算後，最後的 Canvas 輸出階段必須將圖形置中，並強制 Padding 10px。

### 3. 去背與品質 (Transparency & Quality)
- 使用 `context.clearRect()` 確保背景完全透明。
- 檢查生成的 PNG 檔案，確保無殘留的白色背景或邊緣白邊 (Halos)。
- 檔案大小每張不可超過 1MB。

### 開發查核清單 (Dev Checklist)
- [ ] 寬高是否為偶數？
- [ ] 是否有 10px 安全邊距？
- [ ] 背景是否完全透明？
- [ ] 輸出是否為 PNG？
