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
  buildCharacterLockBlock,
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

    const callArg = mockGenerateContent.mock.calls[0][0];
    const parts = callArg.contents.parts;
    expect(parts).toHaveLength(3);
    expect(parts[0].text).toContain(
      '[CHARACTER SHEET] Image 1 is the locked character design. Match proportions, colors, outfit exactly.'
    );
    expect(parts[1]).toEqual({ inlineData: { mimeType: 'image/png', data: 'U0hFRVQ=' } });
    expect(parts[2]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'UkVG1Q==' } });
  });

  it('uses 4:3 aspect ratio and avoids sibling poses on single sticker regeneration', async () => {
    const settings = baseSettings({
      characterSheet: 'data:image/png;base64,U0hFRVQ=',
      customIntents: [
        { text: '早安', description: 'greeting', visual: 'waving hand happily' },
        { text: '哭哭', description: 'sad', visual: 'crying waterfall tears' },
        { text: '收到', description: 'ok', visual: 'saluting firmly' },
      ],
    });

    await generateSingleSticker(settings, 1, 'test-key-unused');

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.config.imageConfig.aspectRatio).toBe('4:3');

    const promptText: string = callArg.contents.parts[0].text;
    expect(promptText).toContain('[Target] Text: "哭哭", Visual: crying waterfall tears');
    expect(promptText).toContain('Do NOT reuse these poses:');
    expect(promptText).toContain('waving hand happily');
    expect(promptText).toContain('saluting firmly');
    const doNotReuseLine = promptText.split('\n').find((line) => line.includes('Do NOT reuse these poses:')) ?? '';
    expect(doNotReuseLine).not.toContain('crying waterfall tears');
  });

  it('places character lock block at both start and end of generateStickerImage prompt when characterSheet exists', async () => {
    const settings = baseSettings({
      characterSheet: 'data:image/jpeg;base64,U0hFRVQ=',
      gridSize: GridOption.Grid8,
    });

    await generateStickerImage(settings, 'test-key-unused');

    const promptText: string = mockGenerateContent.mock.calls[0][0].contents.parts[0].text;
    const lockBlock = buildCharacterLockBlock(GridOption.Grid8);
    const occurrences = promptText.split(lockBlock).length - 1;

    expect(occurrences).toBe(2);
    expect(promptText.startsWith(lockBlock)).toBe(true);
    expect(promptText.endsWith(lockBlock)).toBe(true);
    expect(promptText).toContain('if anything conflicts with Image 1, Image 1 takes precedence');
    expect(promptText).toContain("Match Image 1's art style strictly");
    expect(promptText).not.toContain('Classic Chibi Vector');
  });

  it('includes character lock block in generateSingleSticker prompt when characterSheet exists', async () => {
    const settings = baseSettings({
      characterSheet: 'data:image/jpeg;base64,U0hFRVQ=',
    });

    await generateSingleSticker(settings, 0, 'test-key-unused');

    const promptText: string = mockGenerateContent.mock.calls[0][0].contents.parts[0].text;
    expect(promptText).toContain(buildCharacterLockBlock());
    expect(promptText).toContain('if anything conflicts with Image 1, Image 1 takes precedence');
    expect(promptText).toContain("Match Image 1's art style strictly");
    expect(promptText).not.toContain('Classic Chibi Vector');
  });

  it('keeps generateStickerImage and generateSingleSticker prompts unchanged when characterSheet is absent', async () => {
    const settings = baseSettings({ characterSheet: null });

    await generateStickerImage(settings, 'test-key-unused');
    const sheetPrompt: string = mockGenerateContent.mock.calls[0][0].contents.parts[0].text;

    expect(sheetPrompt.startsWith('You are a LINE sticker artist.')).toBe(true);
    expect(sheetPrompt.endsWith('Generate the sheet.')).toBe(true);
    expect(sheetPrompt).not.toContain('[STRICT CHARACTER LOCK - IMAGE 1]');
    expect(sheetPrompt).toContain('- Subject: A chubby tabby cat with a red scarf');
    expect(sheetPrompt).toContain('- Style: Classic Chibi Vector');
    expect(sheetPrompt).toContain('Art Style: Classic Chibi Vector');

    await generateSingleSticker(settings, 0, 'test-key-unused');
    const singlePrompt: string = mockGenerateContent.mock.calls[1][0].contents.parts[0].text;

    expect(singlePrompt.startsWith('Create a SINGLE sticker.')).toBe(true);
    expect(singlePrompt).not.toContain('[STRICT CHARACTER LOCK - IMAGE 1]');
    expect(singlePrompt).toContain('Subject: A chubby tabby cat with a red scarf, Style: Classic Chibi Vector');
  });
});
