import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetDBConnection,
  saveCharacter,
  getCharacter,
  listCharacters,
  deleteCharacter,
  saveProject,
  getProject,
  listProjects,
  getLatestProject,
  deleteProject,
  setSetting,
  getSetting,
  deleteSetting,
} from '../storage';
import { Character, GridOption, ModelOption, Project } from '../../types';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: 'Mochi Cat',
    prompt: 'A chubby white cat wearing a red scarf',
    stylePreset: 'Classic Chibi Vector',
    textStylePreset: 'Colorful Pop Rounded',
    referenceImage: 'data:image/png;base64,AAA=',
    referenceImage2: null,
    characterSheet: 'data:image/png;base64,BBB=',
    createdAt: 1000,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    characterId: null,
    settings: {
      prompt: 'A chubby white cat',
      referenceImage: null,
      referenceImage2: null,
      gridSize: GridOption.Grid8,
      model: ModelOption.NanoBananaPro,
      removeBackground: true,
      stylePreset: 'Classic Chibi Vector',
      textStylePreset: 'Colorful Pop Rounded',
      vibePreset: 'Threads Trending Memes',
      relationshipMode: 'general',
    },
    original: 'data:image/png;base64,ORIG',
    slices: ['data:image/png;base64,S1', 'data:image/png;base64,S2'],
    mainIndex: 0,
    tabIndex: 1,
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

async function clearDatabase(): Promise<void> {
  await resetDBConnection();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('lulu-sticker');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('storage service (IndexedDB)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('supports Character CRUD and lists newest first', async () => {
    const older = makeCharacter({ id: 'c1', name: 'Older', createdAt: 100 });
    const newer = makeCharacter({ id: 'c2', name: 'Newer', createdAt: 300 });

    await saveCharacter(older);
    await saveCharacter(newer);

    expect(await getCharacter('c1')).toEqual(older);
    expect((await listCharacters()).map((c) => c.id)).toEqual(['c2', 'c1']);

    await saveCharacter({ ...older, name: 'Renamed' });
    expect((await getCharacter('c1'))?.name).toBe('Renamed');

    await deleteCharacter('c1');
    expect(await getCharacter('c1')).toBeUndefined();
    expect((await listCharacters()).map((c) => c.id)).toEqual(['c2']);
  });

  it('supports Project CRUD, updatedAt ordering, and getLatestProject', async () => {
    const p1 = makeProject({ id: 'p1', createdAt: 100, updatedAt: 100 });
    const p2 = makeProject({ id: 'p2', createdAt: 200, updatedAt: 500 });
    const p3 = makeProject({ id: 'p3', createdAt: 300, updatedAt: 300 });

    await saveProject(p1);
    await saveProject(p2);
    await saveProject(p3);

    expect(await getProject('p2')).toEqual(p2);
    expect((await listProjects()).map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
    expect((await getLatestProject())?.id).toBe('p2');

    await saveProject({ ...p1, updatedAt: 900, mainIndex: 1 });
    expect((await getLatestProject())?.id).toBe('p1');
    expect((await getProject('p1'))?.mainIndex).toBe(1);

    await deleteProject('p1');
    expect(await getProject('p1')).toBeUndefined();
    expect((await getLatestProject())?.id).toBe('p2');
  });

  it('supports settings CRUD and blocks storing API keys in IndexedDB', async () => {
    await setSetting('lastModel', ModelOption.FlashImage);
    expect(await getSetting<string>('lastModel')).toBe(ModelOption.FlashImage);

    await deleteSetting('lastModel');
    expect(await getSetting<string>('lastModel')).toBeUndefined();

    await expect(setSetting('apiKey', 'secret')).rejects.toThrow();
    await expect(setSetting('gemini_api_key', 'secret')).rejects.toThrow();
    await expect(setSetting('user-api-key', 'secret')).rejects.toThrow();
  });
});
