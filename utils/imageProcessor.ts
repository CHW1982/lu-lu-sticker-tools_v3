import { GridOption, ValidationResult, ValidationIssue } from "../types";
import JSZip from "jszip";
import {
  LINE_STICKER_MAX_W,
  LINE_STICKER_MAX_H,
  LINE_MAX_FILE_BYTES,
  findAlphaBounds,
  hasOpaqueBackground,
  computeSpecLayout,
  estimateDataUrlBytes,
  gridDims,
  smoothDensity,
  findCuts,
} from "./stickerMath";

// 僅供 Gemini 參考圖使用，不得用於貼圖輸出
export const processFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Create an image to check dimensions and convert format
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Limit max dimension to avoid huge payloads (e.g. 1536px) which can cause latency or errors
        const maxDim = 1536; 
        let width = img.width;
        let height = img.height;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            // Fallback to original if canvas fails, though unlikely
            resolve(result);
            return;
        }
        
        // Fill white background to handle transparent PNGs converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to JPEG to ensure compatibility with Gemini API (AVIF/HEIC not always supported)
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
         // If it's not a loadable image, just return the base64 and hope the API handles it or throws a clear error
         resolve(result);
      };
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const loadStickerFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('無法建立畫布'));
          return;
        }
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL('image/png');
        try {
          const enforced = await enforceLineSpec(png);
          resolve(enforced);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        reject(new Error('不支援此圖片格式，請上傳 PNG'));
      };
      img.src = result;
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsDataURL(file);
  });
};

// Helper to resize image for Main/Tab icons with Aspect Ratio Preservation (Contain)
export const resizeImage = (base64Str: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if(ctx) {
        // High quality resize
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Clear canvas (transparent)
        ctx.clearRect(0, 0, width, height);

        // Calculate scale to FIT within the box (Contain)
        const scale = Math.min(width / img.width, height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        
        // Center the image
        const x = (width - w) / 2;
        const y = (height - h) / 2;

        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

export const splitImage = (
  imageSrc: string,
  gridSize: GridOption,
  removeBackground: boolean = false
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const { rows, cols } = gridDims(gridSize);

      // 1. 取得完整圖片資料以供掃描
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = img.width;
      fullCanvas.height = img.height;
      const fullCtx = fullCanvas.getContext("2d", { willReadFrequently: true });
      if (!fullCtx) { reject(new Error("Could not create canvas context")); return; }
      fullCtx.drawImage(img, 0, 0);
      const fullData = fullCtx.getImageData(0, 0, img.width, img.height).data;

      // 自動偵測背景顏色 (藉由取樣外圍與角落像素)
      const borderPixels = [
        [fullData[0], fullData[1], fullData[2], fullData[3]],
        [fullData[(img.width - 1) * 4], fullData[(img.width - 1) * 4 + 1], fullData[(img.width - 1) * 4 + 2], fullData[(img.width - 1) * 4 + 3]],
        [fullData[(img.height - 1) * img.width * 4], fullData[(img.height - 1) * img.width * 4 + 1], fullData[(img.height - 1) * img.width * 4 + 2], fullData[(img.height - 1) * img.width * 4 + 3]],
        [fullData[((img.height - 1) * img.width + (img.width - 1)) * 4], fullData[((img.height - 1) * img.width + (img.width - 1)) * 4 + 1], fullData[((img.height - 1) * img.width + (img.width - 1)) * 4 + 2], fullData[((img.height - 1) * img.width + (img.width - 1)) * 4 + 3]],
      ];
      
      let rBg = 0, gBg = 255, bBg = 0; // 預設純綠
      let validBgCount = 0;
      for (const p of borderPixels) {
        if (p[3] > 10) {
          rBg += p[0];
          gBg += p[1];
          bBg += p[2];
          validBgCount++;
        }
      }
      if (validBgCount > 0) {
        rBg = Math.round(rBg / validBgCount);
        gBg = Math.round(gBg / validBgCount);
        bBg = Math.round(bBg / validBgCount);
      }

      // 檢查偵測到的顏色是否為綠幕系 (含各種莫蘭迪綠、淺綠、草綠、灰綠)
      const isBgGreen = gBg >= rBg - 5 && gBg >= bBg - 5 && gBg > 50;

      // 判斷像素是否為背景 (透明 或 綠幕/紙張底色)
      const isBg = (x: number, y: number) => {
          const idx = (y * img.width + x) * 4;
          const r = fullData[idx];
          const g = fullData[idx+1];
          const b = fullData[idx+2];
          const a = fullData[idx+3];
          if (a < 10) return true; // 透明
          if (removeBackground) {
              const distSq = (r - rBg) ** 2 + (g - gBg) ** 2 + (b - bBg) ** 2;
              if (isBgGreen) {
                  if (distSq < 4800) return true;
                  if (g > 70 && g - r > 5 && g - b > 5) return true;
              } else {
                  // 若模型生成非綠色的純色/紙張質地底色，計算和邊框背景色的距離判定
                  if (distSq < 2000) return true;
              }
          }
          return false;
      };

      // 計算各行/列的非背景像素密度
      const colDensity = new Int32Array(img.width);
      const rowDensity = new Int32Array(img.height);
      for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
              if (!isBg(x, y)) {
                  colDensity[x]++;
                  rowDensity[y]++;
              }
          }
      }

      const smoothedCols = smoothDensity(colDensity, 5); // 5px 窗口平滑
      const smoothedRows = smoothDensity(rowDensity, 5);

      // 2. Valley Finding: 尋找最佳切割線 (避免切到突出的圖案或文字)
      const cutX = findCuts(colDensity, smoothedCols, img.width, cols, img.height);
      const cutY = findCuts(rowDensity, smoothedRows, img.height, rows, img.width);

      const LINE_MAX_W = 370;
      const LINE_MAX_H = 320;
      const slices: string[] = [];

      // 3. 根據動態切割線提取圖案並統一縮放
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = cutX[c];
          const y0 = cutY[r];
          const x1 = cutX[c+1];
          const y1 = cutY[r+1];
          const bw = x1 - x0;
          const bh = y1 - y0;

          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = bw;
          tempCanvas.height = bh;
          const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
          if (!tempCtx) continue;

          tempCtx.drawImage(img, x0, y0, bw, bh, 0, 0, bw, bh);

          // 去背 (優化版：包含邊緣消色處理)
          if (removeBackground) {
            const imageData = tempCtx.getImageData(0, 0, bw, bh);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              if (a < 10) continue;
              
              let isTargetBg = false;
              let isWeakTargetBg = false;
              const distSq = (r - rBg) ** 2 + (g - gBg) ** 2 + (b - bBg) ** 2;

              if (isBgGreen) {
                if (distSq < 3200 || (g > 85 && g - r > 10 && g - b > 10)) {
                  isTargetBg = true;
                } else if (distSq < 5500 || (g > 70 && g - r > 5 && g - b > 5)) {
                  isWeakTargetBg = true;
                }
              } else {
                // 非綠幕背景（如模型生成的塗鴉卡紙/灰白底）過濾
                if (distSq < 1500) {
                  isTargetBg = true;
                } else if (distSq < 2800) {
                  isWeakTargetBg = true;
                }
              }

              if (isTargetBg) {
                data[i + 3] = 0; // 完全透明
              } else if (isWeakTargetBg) {
                // 邊緣消色處理
                data[i + 3] = Math.max(0, data[i + 3] - 150); 
                data[i + 1] = (r + b) / 2; // 消色
              }
            }
            tempCtx.putImageData(imageData, 0, 0);
          }

          // 縮放至接近 LINE 的最大允許範圍，以獲得最清晰的畫質
          const scale = Math.min(LINE_MAX_W / bw, LINE_MAX_H / bh);
          const finalW = Math.round(bw * scale);
          const finalH = Math.round(bh * scale);

          const finalCanvas = document.createElement("canvas");
          finalCanvas.width = finalW;
          finalCanvas.height = finalH;
          const finalCtx = finalCanvas.getContext("2d");
          if (finalCtx) {
              finalCtx.imageSmoothingEnabled = true;
              finalCtx.imageSmoothingQuality = 'high';
              finalCtx.drawImage(tempCanvas, 0, 0, bw, bh, 0, 0, finalW, finalH);
              slices.push(finalCanvas.toDataURL("image/png"));
          }
        }
      }

      // 4. 強制執行 enforceLineSpec 保證偶數尺寸、≤370x320 與 10px 絕對安全邊距
      try {
         const fixedSlices = await Promise.all(slices.map(s => enforceLineSpec(s)));
         resolve(fixedSlices);
      } catch {
         resolve(slices);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};

export const validateSticker = async (stickerBase64: string): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve({ passed: false, issues: [{ type: 'dimension', severity: 'error', message: '無法讀取圖片內容', autoFixable: false }] });
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const issues: ValidationIssue[] = [];

      // 1. Margin check (10px)
      const padding = 10;
      let marginIssue = false;
      // Top
      if (img.height > padding) {
        for (let y = 0; y < padding; y++) {
          for (let x = 0; x < img.width; x++) {
            if (data[(y * img.width + x) * 4 + 3] > 0) { marginIssue = true; break; }
          }
          if (marginIssue) break;
        }
      }
      // Bottom
      if (!marginIssue && img.height > padding) {
        for (let y = img.height - padding; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            if (data[(y * img.width + x) * 4 + 3] > 0) { marginIssue = true; break; }
          }
          if (marginIssue) break;
        }
      }
      // Left
      if (!marginIssue && img.width > padding) {
        for (let x = 0; x < padding; x++) {
          for (let y = 0; y < img.height; y++) {
            if (data[(y * img.width + x) * 4 + 3] > 0) { marginIssue = true; break; }
          }
          if (marginIssue) break;
        }
      }
      // Right
      if (!marginIssue && img.width > padding) {
        for (let x = img.width - padding; x < img.width; x++) {
          for (let y = 0; y < img.height; y++) {
            if (data[(y * img.width + x) * 4 + 3] > 0) { marginIssue = true; break; }
          }
          if (marginIssue) break;
        }
      }

      if (marginIssue) {
        issues.push({ type: 'margin', severity: 'warning', message: '邊緣留白不足 10px，貼圖可能會在聊天室顯得過大或被裁切。', autoFixable: true });
      }

      // 2. Chroma Residue check
      let greenPixels = 0;
      const totalPixels = img.width * img.height;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a > 50) { // 只檢查較明顯的像素
          // 嚴格檢查綠色殘留
          const isGreen = g > 75 && g - r > 10 && g - b > 10;
          if (isGreen) {
            greenPixels++;
          }
        }
      }
      if (greenPixels > totalPixels * 0.005) { // If > 0.5% is green
        issues.push({ type: 'chroma_residue', severity: 'warning', message: '偵測到去背殘留，邊緣可能含有綠色像素。', autoFixable: false });
      }

      // 3. Dimension check (Even numbers & LINE max size 370x320)
      if (img.width % 2 !== 0 || img.height % 2 !== 0) {
        issues.push({ type: 'dimension', severity: 'error', message: '尺寸必須為偶數。', autoFixable: true });
      }
      if (img.width > LINE_STICKER_MAX_W || img.height > LINE_STICKER_MAX_H) {
        issues.push({
          type: 'dimension',
          severity: 'error',
          message: `尺寸超過 LINE 上限 370×320（目前 ${img.width}×${img.height}）。`,
          autoFixable: true,
        });
      }

      // 4. File size check (<= 1MB)
      if (estimateDataUrlBytes(stickerBase64) > LINE_MAX_FILE_BYTES) {
        issues.push({ type: 'filesize', severity: 'error', message: '檔案超過 1MB。', autoFixable: true });
      }

      // 5. Opaque background check：看內容外框周長，而非整張圖四角
      //    （enforceLineSpec 補的透明邊距會讓整張圖四角永遠透明）
      if (hasOpaqueBackground(data, img.width, img.height)) {
        issues.push({ type: 'opaque_background', severity: 'error', message: '背景不是透明的，請先去背。', autoFixable: false });
      }

      resolve({ passed: issues.every(i => i.severity !== 'error'), issues });
    };
    img.onerror = () => resolve({ passed: false, issues: [{ type: 'dimension', severity: 'error', message: '圖片載入失敗', autoFixable: false }] });
    img.src = stickerBase64;
  });
};

export const enforceLineSpec = async (
  dataUrl: string,
  opts?: { padding?: number; allowUpscale?: boolean }
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) { resolve(dataUrl); return; }

      tempCtx.drawImage(img, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const bounds = findAlphaBounds(imageData.data, img.width, img.height);
      if (!bounds) { resolve(dataUrl); return; }

      const contentW = bounds.maxX - bounds.minX + 1;
      const contentH = bounds.maxY - bounds.minY + 1;

      let maxW = LINE_STICKER_MAX_W;
      let maxH = LINE_STICKER_MAX_H;
      let result = dataUrl;

      for (let attempt = 0; attempt < 4; attempt++) {
        const layout = computeSpecLayout(contentW, contentH, {
          maxW,
          maxH,
          padding: opts?.padding,
          allowUpscale: opts?.allowUpscale,
        });

        const canvas = document.createElement('canvas');
        canvas.width = layout.canvasW;
        canvas.height = layout.canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }

        ctx.clearRect(0, 0, layout.canvasW, layout.canvasH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (layout.drawW > 0 && layout.drawH > 0) {
          ctx.drawImage(
            img,
            bounds.minX,
            bounds.minY,
            contentW,
            contentH,
            layout.offsetX,
            layout.offsetY,
            layout.drawW,
            layout.drawH
          );
        }

        result = canvas.toDataURL('image/png');
        if (estimateDataUrlBytes(result) <= LINE_MAX_FILE_BYTES) {
          resolve(result);
          return;
        }

        maxW = Math.floor(maxW * 0.9);
        maxH = Math.floor(maxH * 0.9);
      }

      resolve(result);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/** @deprecated use enforceLineSpec */
export const autoFixMargin = async (stickerBase64: string, padding: number = 10): Promise<string> => {
  return enforceLineSpec(stickerBase64, { padding });
};

export const removeSingleImageBackground = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // 自適應偵測單圖角落背景色
      const borderPixels = [
        [data[0], data[1], data[2], data[3]],
        [data[(img.width - 1) * 4], data[(img.width - 1) * 4 + 1], data[(img.width - 1) * 4 + 2], data[(img.width - 1) * 4 + 3]],
        [data[(img.height - 1) * img.width * 4], data[(img.height - 1) * img.width * 4 + 1], data[(img.height - 1) * img.width * 4 + 2], data[(img.height - 1) * img.width * 4 + 3]],
        [data[((img.height - 1) * img.width + (img.width - 1)) * 4], data[((img.height - 1) * img.width + (img.width - 1)) * 4 + 1], data[((img.height - 1) * img.width + (img.width - 1)) * 4 + 2], data[((img.height - 1) * img.width + (img.width - 1)) * 4 + 3]],
      ];

      let rBg = 0, gBg = 255, bBg = 0;
      let validBgCount = 0;
      for (const p of borderPixels) {
        if (p[3] > 10) {
          rBg += p[0];
          gBg += p[1];
          bBg += p[2];
          validBgCount++;
        }
      }
      if (validBgCount > 0) {
        rBg = Math.round(rBg / validBgCount);
        gBg = Math.round(gBg / validBgCount);
        bBg = Math.round(bBg / validBgCount);
      }

      const isBgGreen = gBg >= rBg - 5 && gBg >= bBg - 5 && gBg > 50;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 10) continue;

        let isTargetBg = false;
        let isWeakTargetBg = false;
        const distSq = (r - rBg) ** 2 + (g - gBg) ** 2 + (b - bBg) ** 2;

        if (isBgGreen) {
          if (distSq < 3200 || (g > 85 && g - r > 10 && g - b > 10)) {
            isTargetBg = true;
          } else if (distSq < 5500 || (g > 70 && g - r > 5 && g - b > 5)) {
            isWeakTargetBg = true;
          }
        } else {
          if (distSq < 1500) {
            isTargetBg = true;
          } else if (distSq < 2800) {
            isWeakTargetBg = true;
          }
        }

        if (isTargetBg) {
          data[i + 3] = 0; // 完全透明
        } else if (isWeakTargetBg) {
          data[i + 3] = Math.max(0, data[i + 3] - 150); 
          data[i + 1] = (r + b) / 2; // 消色
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadAllImages = async (
    slices: string[], 
    prefix: string, 
    mainIndex: number = 0, 
    tabIndex: number = 0
) => {
    const zip = new JSZip();
    const enforcedSlices = await Promise.all(slices.map(s => enforceLineSpec(s)));

    // 1. Add numbered stickers with STRICT LINE FILENAMES (01.png, 02.png...)
    enforcedSlices.forEach((slice, index) => {
        // LINE requires strict "01.png", "02.png" format for batch upload
        const num = (index + 1).toString().padStart(2, '0');
        const base64Data = slice.split(',')[1];
        if (base64Data) {
            zip.file(`${num}.png`, base64Data, { base64: true });
        }
    });

    // 2. Add Main Image (240x240)
    if (enforcedSlices[mainIndex]) {
        // Resize with Aspect Ratio Contain logic (handled in updated resizeImage)
        const mainResized = await resizeImage(enforcedSlices[mainIndex], 240, 240);
        const mainData = mainResized.split(',')[1];
        if (mainData) zip.file('main.png', mainData, { base64: true });
    }

    // 3. Add Tab Image (96x74)
    if (enforcedSlices[tabIndex]) {
        // Resize with Aspect Ratio Contain logic
        const tabResized = await resizeImage(enforcedSlices[tabIndex], 96, 74);
        const tabData = tabResized.split(',')[1];
        if (tabData) zip.file('tab.png', tabData, { base64: true });
    }

    // 4. Also validate main and tab dimensions to be even (LINE requirement)
    // Actually, resizeImage might not guarantee even numbers if scale is weird, 
    // but typically it does if input is even. 
    // We should ensure the canvas size is exactly 240x240 and 96x74 (which are even).

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        // The ZIP filename itself can be anything, but the contents must be specific
        link.download = `${prefix}_line_pack.zip`;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
        console.error("Failed to zip images:", err);
        throw new Error("打包 ZIP 失敗，請再試一次。", { cause: err });
    }
};