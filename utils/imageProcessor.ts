import { GridOption, ValidationResult, ValidationIssue } from "../types";
import JSZip from "jszip";

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
      let rows = 4;
      let cols = 4;

      if (gridSize === GridOption.Grid8) {
        rows = 2; cols = 4;
      } else if (gridSize === GridOption.Grid24) {
        rows = 6; cols = 4;
      }

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

      // 檢查偵測到的顏色是否偏綠 (允許各種莫蘭迪綠、淺綠、草綠、深綠)
      const isBgGreenish = gBg > 65 && gBg - rBg > 8 && gBg - bBg > 8;

      // 判斷像素是否為背景 (透明 或 綠幕)
      const isBg = (x: number, y: number) => {
          const idx = (y * img.width + x) * 4;
          const r = fullData[idx];
          const g = fullData[idx+1];
          const b = fullData[idx+2];
          const a = fullData[idx+3];
          if (a < 10) return true; // 透明
          if (removeBackground) {
              if (isBgGreenish) {
                  // 根據與偵測背景色的色差平方判定
                  const distSq = (r - rBg) ** 2 + (g - gBg) ** 2 + (b - bBg) ** 2;
                  if (distSq < 3600) return true; // 容許值 60 的色彩距離
              } else {
                  // 備用：寬鬆綠色過濾
                  if (g > 75 && g - r > 10 && g - b > 10) return true;
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

      // --- 優化：對密度進行平滑處理 (Moving Average) 以過濾雜訊像素 ---
      const smoothDensity = (arr: Int32Array, windowSize: number) => {
        const result = new Float32Array(arr.length);
        const half = Math.floor(windowSize / 2);
        for (let i = 0; i < arr.length; i++) {
          let sum = 0;
          let count = 0;
          for (let j = i - half; j <= i + half; j++) {
            if (j >= 0 && j < arr.length) {
              sum += arr[j];
              count++;
            }
          }
          result[i] = sum / count;
        }
        return result;
      };

      const smoothedCols = smoothDensity(colDensity, 5); // 5px 窗口平滑
      const smoothedRows = smoothDensity(rowDensity, 5);

      // 2. Valley Finding: 尋找最佳切割線 (避免切到突出的圖案或文字)
      const cutX = [0];
      for (let c = 1; c < cols; c++) {
          const expected = Math.floor(c * (img.width / cols));
          const searchRange = Math.floor((img.width / cols) * 0.15); // 使用較為保守的 15% 搜尋範圍
          
          let bestX = expected;
          let minD = Infinity;
          
          // 尋找範圍內「平滑密度最低」且「最靠近預期中心」的點
          for (let x = Math.max(0, expected - searchRange); x <= Math.min(img.width - 1, expected + searchRange); x++) {
              // 權重計算：密度優先，距離次之
              const score = smoothedCols[x] * 100 + Math.abs(x - expected);
              if (score < minD) {
                  minD = score;
                  bestX = x;
              }
          }
          
          // 【安全閥值】：如果選出來的切割線依然包含過多前景像素 (大於高度的 5%)，代表沒有足夠乾淨的谷地，強行使用均分線
          const maxAllowedDensityX = img.height * 0.05;
          if (colDensity[bestX] > maxAllowedDensityX) {
              bestX = expected;
          }
          
          cutX.push(bestX);
      }
      cutX.push(img.width);

      const cutY = [0];
      for (let r = 1; r < rows; r++) {
          const expected = Math.floor(r * (img.height / rows));
          const searchRange = Math.floor((img.height / rows) * 0.15); // 使用較為保守的 15% 搜尋範圍
          
          let bestY = expected;
          let minD = Infinity;
          
          for (let y = Math.max(0, expected - searchRange); y <= Math.min(img.height - 1, expected + searchRange); y++) {
              const score = smoothedRows[y] * 100 + Math.abs(y - expected);
              if (score < minD) {
                  minD = score;
                  bestY = y;
              }
          }
          
          // 【安全閥值】：如果選出來的切割線依然包含過多前景像素 (大於寬度的 5%)，代表沒有足夠乾淨的谷地，強行使用均分線
          const maxAllowedDensityY = img.width * 0.05;
          if (rowDensity[bestY] > maxAllowedDensityY) {
              bestY = expected;
          }
          
          cutY.push(bestY);
      }
      cutY.push(img.height);

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

              if (isBgGreenish) {
                const distSq = (r - rBg) ** 2 + (g - gBg) ** 2 + (b - bBg) ** 2;
                if (distSq < 2700) {
                  isTargetBg = true;
                } else if (distSq < 4800) {
                  isWeakTargetBg = true;
                }
              } else {
                // 備用：寬鬆綠色判斷
                const isGreen = g > 75 && g - r > 10 && g - b > 10;
                const isStrongGreen = g > 90 && g - r > 20 && g - b > 20;
                if (isStrongGreen) {
                  isTargetBg = true;
                } else if (isGreen) {
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

      // 4. 強制執行 autoFixMargin 保證偶數尺寸與 10px 絕對安全邊距
      try {
         const fixedSlices = await Promise.all(slices.map(s => autoFixMargin(s, 10)));
         resolve(fixedSlices);
      } catch (err) {
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

      // 3. Dimension check (Even numbers)
      if (img.width % 2 !== 0 || img.height % 2 !== 0) {
        issues.push({ type: 'dimension', severity: 'error', message: '尺寸必須為偶數。', autoFixable: true });
      }

      resolve({ passed: issues.length === 0, issues });
    };
    img.onerror = () => resolve({ passed: false, issues: [{ type: 'dimension', severity: 'error', message: '圖片載入失敗', autoFixable: false }] });
    img.src = stickerBase64;
  });
};

export const autoFixMargin = async (stickerBase64: string, padding: number = 10): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use existing image dimensions as target, typically already LINE-optimized (e.g. 370x320 max)
      // Force even numbers for LINE compliance
      const targetW = img.width % 2 === 0 ? img.width : img.width - 1;
      const targetH = img.height % 2 === 0 ? img.height : img.height - 1;
      
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(stickerBase64); return; }

      // Find actual content boundaries
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) { resolve(stickerBase64); return; }
      tempCtx.drawImage(img, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
      let hasContent = false;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (data[(y * img.width + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            hasContent = true;
          }
        }
      }

      if (!hasContent) { resolve(stickerBase64); return; }

      const contentW = maxX - minX + 1;
      const contentH = maxY - minY + 1;

      // Calculate scale to fit content with padding
      const availW = targetW - padding * 2;
      const availH = targetH - padding * 2;
      const scale = Math.min(availW / contentW, availH / contentH, 1); // Don't scale up

      const finalW = contentW * scale;
      const finalH = contentH * scale;
      
      // Center the scaled content
      const x = (targetW - finalW) / 2;
      const y = (targetH - finalH) / 2;

      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, minX, minY, contentW, contentH, x, y, finalW, finalH);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = stickerBase64;
  });
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

      const isBgGreenish = gBg > 65 && gBg - rBg > 8 && gBg - bBg > 8;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 10) continue;

        let isTargetBg = false;
        let isWeakTargetBg = false;

        if (isBgGreenish) {
          const distSq = (r - rBg) ** 2 + (g - gBg) ** 2 + (b - bBg) ** 2;
          if (distSq < 2700) {
            isTargetBg = true;
          } else if (distSq < 4800) {
            isWeakTargetBg = true;
          }
        } else {
          const isGreen = g > 75 && g - r > 10 && g - b > 10;
          const isStrongGreen = g > 90 && g - r > 20 && g - b > 20;
          if (isStrongGreen) {
            isTargetBg = true;
          } else if (isGreen) {
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

    // 1. Add numbered stickers with STRICT LINE FILENAMES (01.png, 02.png...)
    slices.forEach((slice, index) => {
        // LINE requires strict "01.png", "02.png" format for batch upload
        const num = (index + 1).toString().padStart(2, '0');
        const base64Data = slice.split(',')[1];
        if (base64Data) {
            zip.file(`${num}.png`, base64Data, { base64: true });
        }
    });

    // 2. Add Main Image (240x240)
    if (slices[mainIndex]) {
        // Resize with Aspect Ratio Contain logic (handled in updated resizeImage)
        const mainResized = await resizeImage(slices[mainIndex], 240, 240);
        const mainData = mainResized.split(',')[1];
        if (mainData) zip.file('main.png', mainData, { base64: true });
    }

    // 3. Add Tab Image (96x74)
    if (slices[tabIndex]) {
        // Resize with Aspect Ratio Contain logic
        const tabResized = await resizeImage(slices[tabIndex], 96, 74);
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
        alert("Failed to generate zip file.");
    }
};