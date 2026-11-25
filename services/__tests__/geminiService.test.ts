import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import {
  generateCharacterSheet,
  generateStickerImage,
  generateSingleSticker,
} from '../geminiService';

const FAKE_PNG_RESPONSE = {
  candidates: [
    {
      finishReason: 'STOP',
      content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'QUJD' } }] },
    },
  ],
};

function baseSettings(overrides: Partial<GenerationSettings> = {}): GenerationSettings {
  return {
    prompt: 'A chubby tabby cat with a red scarf',
    referenceImage: null,
    referenceImage2: null,
    characterSheet: null,
    gridSize: GridOption.Grid8,
    model: ModelOption.NanoBananaPro,
    removeBackground: true,
    stylePreset: 'Classic Chibi Vector',
    textStylePreset: 'Colorful Pop Rounded',
    vibePreset: 'Threads Trending Memes',
    relationshipMode: 'general',
    ...overrides,
  };
}

describe('geminiService character sheet & reference injection', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue(FAKE_PNG_RESPONSE);
  });

  it('generateCharacterSheet requests 16:9 turnaround + 3 expressions on #00FF00 with no text', async () => {
    const result = await generateCharacterSheet(baseSettings(), 'test-key-unused');
    expect(result).toBe('data:image/png;base64,QUJD');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.imageConfig.aspectRatio).toBe('16:9');
    const promptText: string = callArg.contents.parts[0].text;
    expect(promptText).toMatch(/Front view/i);
    expect(promptText).toMatch(/Side/i);
    expect(promptText).toMatch(/Back view/i);
    expect(promptText).toMatch(/Happy/i);
    expect(promptText).toMatch(/Angry/i);
    expect(promptText).toMatch(/Crying/i);
    expect(promptText).toContain('#00FF00');
    expect(promptText).toMatch(/DO NOT draw ANY text/i);
  });

  it('attaches characterSheet as Image 1 before user reference images in generateStickerImage', async () => {
    const settings = baseSettings({
      characterSheet: 'data:image/png;base64,U0hFRVQ=',
      referenceImage: 'data:image/jpeg;base64,UkVG1A==',
      referenceImage2: 'data:image/jpeg;base64,UkVGMg==',
    });

    await generateStickerImage(settings, 'test-key-unused');

    const parts = mockGenerateContent.mock.calls[0][0].contents.parts;
    expect(parts).toHaveLength(4);
    expect(parts[0].text).toContain(
      '[CHARACTER SHEET] Image 1 is the locked character design. Match proportions, colors, outfit exactly.'
    );
    expect(parts[1]).toEqual({ inlineData: { mimeType: 'image/png', data: 'U0hFRVQ=' } });
    expect(parts[2]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'UkVG1A==' } });
    expect(parts[3]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'UkVGMg==' } });
  });

  it('attaches characterSheet as Image 1 before user reference images in generateSingleSticker', async () => {
    const settings = baseSettings({
      characterSheet: 'data:image/png;base64,U0hFRVQ=',
      referenceImage: 'data:image/jpeg;base64,UkVG1Q==',
    });

    await generateSingleSticker(settings, 0, 'test-key-unused');

    const parts = mockGenerateContent.mock.calls[0][0].contents.parts;
    expect(parts).toHaveLength(3);
    expect(parts[0].text).toContain(
      '[CHARACTER SHEET] Image 1 is the locked character design. Match proportions, colors, outfit exactly.'
    );
    expect(parts[1]).toEqual({ inlineData: { mimeType: 'image/png', data: 'U0hFRVQ=' } });
    expect(parts[2]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'UkVG1Q==' } });
  });
});
