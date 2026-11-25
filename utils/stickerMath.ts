export const LINE_STICKER_MAX_W = 370;
export const LINE_STICKER_MAX_H = 320;
export const LINE_SAFE_PADDING = 10;
export const LINE_MAX_FILE_BYTES = 1024 * 1024;

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpecLayout {
  canvasW: number;
  canvasH: number;
  drawW: number;
  drawH: number;
  offsetX: number;
  offsetY: number;
}

/** 偶數化（向下取偶） */
export function toEven(n: number): number {
  const floored = Math.floor(n);
  if (floored <= 0) return 0;
  return floored % 2 === 0 ? floored : floored - 1;
}

/** 回傳 alpha > threshold 的像素外框；若全透明回傳 null */
export function findAlphaBounds(
  data: ArrayLike<number>,
  width: number,
  height: number,
  threshold = 0
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasContent = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        hasContent = true;
      }
    }
  }

  return hasContent ? { minX, minY, maxX, maxY } : null;
}

/** 依內容尺寸計算合規版面 */
export function computeSpecLayout(
  contentW: number,
  contentH: number,
  opts?: {
    maxW?: number;
    maxH?: number;
    padding?: number;
    allowUpscale?: boolean;
  }
): SpecLayout {
  const maxW = opts?.maxW ?? LINE_STICKER_MAX_W;
  const maxH = opts?.maxH ?? LINE_STICKER_MAX_H;
  const padding = opts?.padding ?? LINE_SAFE_PADDING;
  const allowUpscale = opts?.allowUpscale ?? false;

  if (contentW <= 0 || contentH <= 0) {
    const canvasW = toEven(Math.min(maxW, 2 * padding));
    const canvasH = toEven(Math.min(maxH, 2 * padding));
    return {
      canvasW,
      canvasH,
      drawW: 0,
      drawH: 0,
      offsetX: Math.floor(canvasW / 2),
      offsetY: Math.floor(canvasH / 2),
    };
  }

  const availW = Math.max(1, maxW - 2 * padding);
  const availH = Math.max(1, maxH - 2 * padding);

  let scale = Math.min(availW / contentW, availH / contentH);
  if (!allowUpscale) {
    scale = Math.min(scale, 1);
  }

  let drawW = Math.round(contentW * scale);
  let drawH = Math.round(contentH * scale);

  const canvasW = toEven(Math.min(maxW, drawW + 2 * padding));
  if (canvasW - drawW < 2 * padding) {
    drawW = Math.max(0, canvasW - 2 * padding);
  }

  const canvasH = toEven(Math.min(maxH, drawH + 2 * padding));
  if (canvasH - drawH < 2 * padding) {
    drawH = Math.max(0, canvasH - 2 * padding);
  }

  const offsetX = Math.floor((canvasW - drawW) / 2);
  const offsetY = Math.floor((canvasH - drawH) / 2);

  return { canvasW, canvasH, drawW, drawH, offsetX, offsetY };
}

/** 從 dataURL 估算解碼後的位元組數 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const len = b64.length;
  if (len === 0) return 0;

  let padding = 0;
  if (b64.endsWith('==')) {
    padding = 2;
  } else if (b64.endsWith('=')) {
    padding = 1;
  }

  return Math.max(0, Math.floor((len * 3) / 4) - padding);
}

/** 依格數回傳列數與欄數（8→2x4, 16→4x4, 24→6x4） */
export function gridDims(grid: number): { rows: number; cols: number } {
  if (grid === 8) return { rows: 2, cols: 4 };
  if (grid === 24) return { rows: 6, cols: 4 };
  return { rows: 4, cols: 4 };
}

/** 移動平均平滑密度陣列以過濾雜訊像素 */
export function smoothDensity(arr: ArrayLike<number>, windowSize: number): Float32Array {
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
}

/** Valley Finding：在預期均分線 ±15% 範圍內尋找最佳切割點，超過 5% 閥值則退回均分線 */
export function findCuts(
  raw: ArrayLike<number>,
  smoothed: ArrayLike<number>,
  length: number,
  parts: number,
  crossLength: number
): number[] {
  const cuts = [0];
  const maxAllowedDensity = crossLength * 0.05;

  for (let p = 1; p < parts; p++) {
    const expected = Math.floor(p * (length / parts));
    const searchRange = Math.floor((length / parts) * 0.15);

    let best = expected;
    let minD = Infinity;

    for (let x = Math.max(0, expected - searchRange); x <= Math.min(length - 1, expected + searchRange); x++) {
      const score = smoothed[x] * 100 + Math.abs(x - expected);
      if (score < minD) {
        minD = score;
        best = x;
      }
    }

    if (raw[best] > maxAllowedDensity) {
      best = expected;
    }

    cuts.push(best);
  }

  cuts.push(length);
  return cuts;
}
