import { describe, it, expect } from 'vitest';
import {
  LINE_STICKER_MAX_W,
  LINE_STICKER_MAX_H,
  LINE_SAFE_PADDING,
  toEven,
  findAlphaBounds,
  computeSpecLayout,
  estimateDataUrlBytes,
  gridDims,
  smoothDensity,
  findCuts,
} from '../stickerMath';

describe('gridDims', () => {
  it('returns correct rows and cols for 8, 16, and 24 grids', () => {
    expect(gridDims(8)).toEqual({ rows: 2, cols: 4 });
    expect(gridDims(16)).toEqual({ rows: 4, cols: 4 });
    expect(gridDims(24)).toEqual({ rows: 6, cols: 4 });
  });
});

describe('toEven', () => {
  it('rounds down to nearest even non-negative integer', () => {
    expect(toEven(370)).toBe(370);
    expect(toEven(369)).toBe(368);
    expect(toEven(1)).toBe(0);
    expect(toEven(0)).toBe(0);
    expect(toEven(101.9)).toBe(100);
  });
});

describe('smoothDensity', () => {
  it('computes moving average correctly including boundary windows', () => {
    const arr = new Int32Array([10, 20, 30, 40, 50]);
    const smoothed = smoothDensity(arr, 3);
    // index 0: avg(10, 20) = 15
    // index 1: avg(10, 20, 30) = 20
    // index 2: avg(20, 30, 40) = 30
    // index 3: avg(30, 40, 50) = 40
    // index 4: avg(40, 50) = 45
    expect(Array.from(smoothed)).toEqual([15, 20, 30, 40, 45]);
  });
});

describe('findCuts', () => {
  it('cuts at shifted valley within 15% search range', () => {
    const length = 400;
    const parts = 4; // expected cuts: 100, 200, 300; range +-15px
    const crossLength = 100;
    const raw = new Int32Array(length).fill(50);
    // Put clean 5px valleys shifted from expected 100->108, 200->192, 300->305
    for (let d = -2; d <= 2; d++) {
      raw[108 + d] = 0;
      raw[192 + d] = 0;
      raw[305 + d] = 0;
    }
    // Also keep raw[100], raw[200], raw[300] high
    const smoothed = smoothDensity(raw, 5);
    const cuts = findCuts(raw, smoothed, length, parts, crossLength);

    expect(cuts).toEqual([0, 108, 192, 305, 400]);
  });

  it('falls back to expected uniform line when no clean valley exists (>5% crossLength)', () => {
    const length = 400;
    const parts = 4;
    const crossLength = 100; // 5% threshold = 5
    const raw = new Int32Array(length).fill(20); // all > 5
    const smoothed = smoothDensity(raw, 5);
    const cuts = findCuts(raw, smoothed, length, parts, crossLength);

    expect(cuts).toEqual([0, 100, 200, 300, 400]);
  });

  it('returns parts + 1 strictly increasing cut coordinates', () => {
    const length = 800;
    const parts = 4;
    const raw = new Int32Array(length).fill(10);
    raw[210] = 0;
    raw[395] = 0;
    raw[615] = 0;
    const smoothed = smoothDensity(raw, 5);
    const cuts = findCuts(raw, smoothed, length, parts, 200);

    expect(cuts).toHaveLength(parts + 1);
    expect(cuts[0]).toBe(0);
    expect(cuts[cuts.length - 1]).toBe(length);
    for (let i = 1; i < cuts.length; i++) {
      expect(cuts[i]).toBeGreaterThan(cuts[i - 1]);
    }
  });
});

describe('computeSpecLayout', () => {
  const sizes: Array<[number, number]> = [
    [1, 1],
    [350, 300],
    [1024, 1024],
    [2000, 100],
    [101, 99],
  ];

  it.each(sizes)('satisfies LINE spec invariants for content %ix%i', (w, h) => {
    const layout = computeSpecLayout(w, h);

    expect(layout.canvasW % 2).toBe(0);
    expect(layout.canvasH % 2).toBe(0);
    expect(layout.canvasW).toBeLessThanOrEqual(LINE_STICKER_MAX_W);
    expect(layout.canvasH).toBeLessThanOrEqual(LINE_STICKER_MAX_H);
    expect(layout.offsetX).toBeGreaterThanOrEqual(LINE_SAFE_PADDING);
    expect(layout.canvasW - layout.offsetX - layout.drawW).toBeGreaterThanOrEqual(LINE_SAFE_PADDING);
    expect(layout.offsetY).toBeGreaterThanOrEqual(LINE_SAFE_PADDING);
    expect(layout.canvasH - layout.offsetY - layout.drawH).toBeGreaterThanOrEqual(LINE_SAFE_PADDING);
  });

  it.each([
    [350, 300],
    [1024, 1024],
    [2000, 100],
    [101, 99],
  ])('is idempotent on canvas dimensions for %ix%i', (w, h) => {
    const first = computeSpecLayout(w, h);
    const second = computeSpecLayout(first.drawW, first.drawH);
    expect(second.canvasW).toBe(first.canvasW);
    expect(second.canvasH).toBe(first.canvasH);
  });
});

describe('findAlphaBounds', () => {
  it('returns null for fully transparent buffer', () => {
    const buf = new Uint8ClampedArray(10 * 10 * 4);
    expect(findAlphaBounds(buf, 10, 10)).toBeNull();
  });

  it('returns exact 1-pixel bounds for a single opaque pixel', () => {
    const buf = new Uint8ClampedArray(10 * 10 * 4);
    const x = 4;
    const y = 7;
    buf[(y * 10 + x) * 4 + 3] = 255;
    expect(findAlphaBounds(buf, 10, 10)).toEqual({ minX: 4, minY: 7, maxX: 4, maxY: 7 });
  });
});

describe('estimateDataUrlBytes', () => {
  it('handles = and == padding accurately', () => {
    // "Man" -> "TWFu" (3 bytes, no padding)
    expect(estimateDataUrlBytes('data:image/png;base64,TWFu')).toBe(3);
    // "Ma" -> "TWE=" (2 bytes, single =)
    expect(estimateDataUrlBytes('data:image/png;base64,TWE=')).toBe(2);
    // "M" -> "TQ==" (1 byte, double ==)
    expect(estimateDataUrlBytes('data:image/png;base64,TQ==')).toBe(1);
  });
});

describe('regression: synthetic RGBA buffer cut positions match legacy inline algorithm', () => {
  it('produces identical cutX and cutY on a synthetic 4x4 sticker sheet', () => {
    const width = 400;
    const height = 400;
    const rgba = new Uint8ClampedArray(width * height * 4); // transparent background

    // Draw 4x4 opaque blocks with slightly offset gaps
    const colRanges = [
      [15, 85],
      [120, 185],
      [215, 290],
      [315, 385],
    ];
    const rowRanges = [
      [12, 88],
      [115, 190],
      [210, 285],
      [312, 388],
    ];

    for (const [y0, y1] of rowRanges) {
      for (const [x0, x1] of colRanges) {
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const idx = (y * width + x) * 4;
            rgba[idx] = 255;
            rgba[idx + 1] = 100;
            rgba[idx + 2] = 100;
            rgba[idx + 3] = 255;
          }
        }
      }
    }

    // Legacy density computation
    const colDensity = new Int32Array(width);
    const rowDensity = new Int32Array(height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (rgba[(y * width + x) * 4 + 3] >= 10) {
          colDensity[x]++;
          rowDensity[y]++;
        }
      }
    }

    // Legacy inline reference
    const legacySmooth = (arr: Int32Array, windowSize: number) => {
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

    const legacyCut = (raw: Int32Array, smoothed: Float32Array, len: number, parts: number, cross: number) => {
      const cuts = [0];
      for (let c = 1; c < parts; c++) {
        const expected = Math.floor(c * (len / parts));
        const searchRange = Math.floor((len / parts) * 0.15);
        let best = expected;
        let minD = Infinity;
        for (let x = Math.max(0, expected - searchRange); x <= Math.min(len - 1, expected + searchRange); x++) {
          const score = smoothed[x] * 100 + Math.abs(x - expected);
          if (score < minD) {
            minD = score;
            best = x;
          }
        }
        if (raw[best] > cross * 0.05) {
          best = expected;
        }
        cuts.push(best);
      }
      cuts.push(len);
      return cuts;
    };

    const { rows, cols } = gridDims(16);
    const expectedCutX = legacyCut(colDensity, legacySmooth(colDensity, 5), width, cols, height);
    const expectedCutY = legacyCut(rowDensity, legacySmooth(rowDensity, 5), height, rows, width);

    const actualCutX = findCuts(colDensity, smoothDensity(colDensity, 5), width, cols, height);
    const actualCutY = findCuts(rowDensity, smoothDensity(rowDensity, 5), height, rows, width);

    expect(actualCutX).toEqual(expectedCutX);
    expect(actualCutY).toEqual(expectedCutY);
  });
});
