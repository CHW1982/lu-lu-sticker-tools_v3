import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyGeminiError, withGeminiRetry } from '../errors';
import { GridOption, ModelOption, GenerationSettings } from '../../types';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function MockGoogleGenAI() {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
  };
});

import { generateStickerImage, generateSingleSticker } from '../geminiService';

function baseSettings(): GenerationSettings {
  return {
    prompt: 'Cute tabby cat',
    referenceImage: null,
    referenceImage2: null,
    gridSize: GridOption.Grid8,
    model: ModelOption.NanoBananaPro,
    removeBackground: true,
    stylePreset: 'Classic Chibi Vector',
    textStylePreset: 'Colorful Pop Rounded',
    vibePreset: 'Threads Trending Memes',
    relationshipMode: 'general',
  };
}

describe('classifyGeminiError', () => {
  it('classifies 402 prepayment credits depleted as non-retryable billing error', () => {
    const raw = new Error(
      JSON.stringify({
        error: {
          code: 402,
          message: 'Your prepayment credits are depleted.',
          status: 'RESOURCE_EXHAUSTED',
        },
      })
    );
    const result = classifyGeminiError(raw);
    expect(result.kind).toBe('billing');
    expect(result.retryable).toBe(false);
    expect(result.openApiKeyModal).toBe(false);
  });

  it('classifies 429 and RESOURCE_EXHAUSTED as retryable quota error', () => {
    expect(classifyGeminiError({ code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' })).toMatchObject({
      kind: 'quota',
      retryable: true,
      message: '已達使用額度，請稍後再試或更換模型',
    });
    expect(classifyGeminiError(new Error('RESOURCE_EXHAUSTED'))).toMatchObject({
      kind: 'quota',
      retryable: true,
    });
  });

  it('classifies 401, 403, and invalid API key as auth error opening key modal', () => {
    expect(classifyGeminiError(new Error('403 Forbidden: API_KEY_INVALID'))).toMatchObject({
      kind: 'auth',
      retryable: false,
      openApiKeyModal: true,
      message: 'API Key 無效',
    });
    expect(classifyGeminiError({ code: 401, message: 'Unauthorized' })).toMatchObject({
      kind: 'auth',
      retryable: false,
      openApiKeyModal: true,
    });
  });

  it('classifies SAFETY and missing inlineData as non-retryable safety error', () => {
    expect(classifyGeminiError(new Error('SAFETY: blocked'))).toMatchObject({
      kind: 'safety',
      retryable: false,
      message: '內容被安全過濾，請調整描述',
    });
    expect(classifyGeminiError(new Error('no inlineData returned'))).toMatchObject({
      kind: 'safety',
      retryable: false,
    });
  });

  it('classifies network failures as retryable network error', () => {
    expect(classifyGeminiError(new TypeError('Failed to fetch'))).toMatchObject({
      kind: 'network',
      retryable: true,
    });
    expect(classifyGeminiError(new Error('ERR_NETWORK timeout'))).toMatchObject({
      kind: 'network',
      retryable: true,
    });
  });

  it('falls back to unknown for unrecognized errors', () => {
    expect(classifyGeminiError(new Error('Something unexpected'))).toMatchObject({
      kind: 'unknown',
      retryable: false,
      openApiKeyModal: false,
      message: 'Something unexpected',
    });
  });
});

describe('withGeminiRetry', () => {
  it('retries quota and network errors up to 3 times with 2s/4s/8s backoff', async () => {
    const sleepCalls: number[] = [];
    const retryCalls: Array<[number, number]> = [];
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockResolvedValue('ok');

    const result = await withGeminiRetry(fn, {
      onRetry: (attempt, maxRetries) => retryCalls.push([attempt, maxRetries]),
      sleep: async (ms) => {
        sleepCalls.push(ms);
      },
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(4);
    expect(sleepCalls).toEqual([2000, 4000, 8000]);
    expect(retryCalls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('does not retry auth, safety, billing, or unknown errors', async () => {
    const sleep = vi.fn();
    for (const err of [
      new Error('403 API key invalid'),
      new Error('SAFETY blocked'),
      new Error('402 prepayment credits'),
      new Error('Unknown failure'),
    ]) {
      const fn = vi.fn().mockRejectedValue(err);
      await expect(withGeminiRetry(fn, { sleep })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    }
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('geminiService error handling with mocked generateContent', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('throws safety error without retry when finishReason is SAFETY', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }],
    });

    await expect(generateStickerImage(baseSettings(), 'test-key-unused')).rejects.toThrow(/SAFETY/);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(classifyGeminiError(new Error('SAFETY: 內容被安全過濾')).kind).toBe('safety');
  });

  it('throws safety error when response contains no inlineData', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'refused' }] } }],
    });

    await expect(generateSingleSticker(baseSettings(), 0, 'test-key-unused')).rejects.toThrow(/inlineData/);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('retries when mocked generateContent throws 429 then succeeds', async () => {
    vi.useFakeTimers();
    try {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'))
        .mockResolvedValueOnce({
          candidates: [
            {
              finishReason: 'STOP',
              content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'QUJD' } }] },
            },
          ],
        });

      const onRetry = vi.fn();
      const promise = generateStickerImage(baseSettings(), 'test-key-unused', onRetry);
      await vi.advanceTimersByTimeAsync(2000);
      const image = await promise;

      expect(image).toBe('data:image/png;base64,QUJD');
      expect(onRetry).toHaveBeenCalledWith(1, 3);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
