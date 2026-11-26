import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Character, Project } from '../types';

const DB_NAME = 'lulu-sticker';
const DB_VERSION = 1;

interface LuluStickerDB extends DBSchema {
  characters: {
    key: string;
    value: Character;
  };
  projects: {
    key: string;
    value: Project;
    indexes: { updatedAt: number };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<LuluStickerDB>> | null = null;

/** Open (or return cached) IndexedDB connection for lulu-sticker v1. */
export function getDB(): Promise<IDBPDatabase<LuluStickerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LuluStickerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('characters')) {
          db.createObjectStore('characters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

/** Close and clear the cached DB connection (useful for test isolation). */
export async function resetDBConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

export async function saveCharacter(character: Character): Promise<void> {
  const db = await getDB();
  await db.put('characters', character);
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  const db = await getDB();
  return db.get('characters', id);
}

export async function listCharacters(): Promise<Character[]> {
  const db = await getDB();
  const all = await db.getAll('characters');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteCharacter(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('characters', id);
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('projects', 'updatedAt');
  return all.reverse();
}

export async function getLatestProject(): Promise<Project | undefined> {
  const projects = await listProjects();
  return projects[0];
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  if (/api[_-]?key/i.test(key)) {
    throw new Error('API Key 不得儲存於 IndexedDB');
  }
  const db = await getDB();
  await db.put('settings', value, key);
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get('settings', key)) as T | undefined;
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', key);
}

/** Detect browser storage quota exceeded errors (e.g. IndexedDB QuotaExceededError). */
export function isStorageQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: unknown }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}
