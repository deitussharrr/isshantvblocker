/**
 * Storage module for IsshanTV Guardian.
 * Uses Chrome Storage API for settings and small data.
 * Uses IndexedDB for large blocklists (10,000+ channels, 100,000+ keywords).
 */

import type {
  ChannelEntry,
  KeywordEntry,
  VideoEntry,
  PlaylistEntry,
  RegexEntry,
  AllowlistEntry,
  AppSettings,
  BlockLog,
  ExportData,
} from '../types';
import { STORAGE_KEYS } from '../types';
import { KeywordTrie, IdSet } from '../utils/trie';

// ========================
// Data Ready Tracking
// ========================

let dataLoadAttempted = false;
let dataLoadResolve: (() => void) | null = null;
const dataReadyPromise = new Promise<void>((resolve) => {
  dataLoadResolve = resolve;
});

export function isDataLoadAttempted(): boolean {
  return dataLoadAttempted;
}

export function waitForDataReady(): Promise<void> {
  return dataReadyPromise;
}

function markDataReady(): void {
  dataLoadAttempted = true;
  if (dataLoadResolve) {
    dataLoadResolve();
  }
}

// ========================
// IndexedDB Database
// ========================

const DB_NAME = 'IsshanTVGuardianDB';
const DB_VERSION = 2;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('channels')) {
        db.createObjectStore('channels', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('keywords')) {
        db.createObjectStore('keywords', { keyPath: 'keyword' });
      }
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('regex')) {
        db.createObjectStore('regex', { keyPath: 'pattern' });
      }
      if (!db.objectStoreNames.contains('allowlist')) {
        db.createObjectStore('allowlist', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('logs')) {
        const logStore = db.createObjectStore('logs', { keyPath: 'timestamp', autoIncrement: true });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
        db.close();
      };
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    } catch (err) {
      reject(err);
    }
  });
}

function putAllInStore<T>(storeName: string, items: T[]): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      for (const item of items) {
        store.put(item);
      }

      transaction.oncomplete = () => {
        resolve();
        db.close();
      };
      transaction.onerror = () => {
        reject(transaction.error);
        db.close();
      };
    } catch (err) {
      reject(err);
    }
  });
}

function clearStore(storeName: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
        db.close();
      };
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    } catch (err) {
      reject(err);
    }
  });
}

function deleteFromStore(storeName: string, key: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
        db.close();
      };
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    } catch (err) {
      reject(err);
    }
  });
}

// ========================
// Chrome Storage (Settings)
// ========================

async function getChromeStorage<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

async function setChromeStorage(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// ========================
// Default Settings
// ========================

let defaultSettingsCache: AppSettings | null = null;

export async function getDefaultSettings(): Promise<AppSettings> {
  if (defaultSettingsCache) return defaultSettingsCache;

  try {
    const response = await fetch(chrome.runtime.getURL('data/settings.json'));
    defaultSettingsCache = await response.json();
    return defaultSettingsCache!;
  } catch {
    // Fallback if fetch fails
    return {
      general: {
        enabled: true,
        blockingAction: 'hide',
        showWarning: true,
        blockShorts: true,
        blockLiveStreams: false,
        blockPlaylists: false,
        enableLogging: false,
        logRetentionDays: 30,
      },
      password: { hash: '', salt: '', created: false },
      categories: {},
      temporaryUnlock: { active: false, expiresAt: 0 },
      ui: { theme: 'dark', compactMode: false, showStats: true },
      version: 1,
    } as AppSettings;
  }
}

// ========================
// Settings API
// ========================

export async function getSettings(): Promise<AppSettings> {
  const settings = await getChromeStorage<AppSettings>(STORAGE_KEYS.SETTINGS);
  if (settings) return settings;

  const defaults = await getDefaultSettings();
  await setChromeStorage(STORAGE_KEYS.SETTINGS, defaults);
  return defaults;
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = deepMerge(current, settings);
  await setChromeStorage(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val !== undefined) {
      if (isObject(val) && isObject(result[key])) {
        result[key] = deepMerge(result[key], val);
      } else {
        result[key] = val;
      }
    }
  }

  return result;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

// ========================
// Channel Operations
// ========================

export async function getAllChannels(): Promise<ChannelEntry[]> {
  return getAllFromStore<ChannelEntry>('channels');
}

export async function addChannel(channel: ChannelEntry): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction('channels', 'readwrite');
  transaction.objectStore('channels').put(channel);
  transaction.oncomplete = () => db.close();
}

export async function addChannels(channels: ChannelEntry[]): Promise<void> {
  await putAllInStore('channels', channels);
}

export async function removeChannel(id: string): Promise<void> {
  await deleteFromStore('channels', id);
}

export async function clearChannels(): Promise<void> {
  await clearStore('channels');
}

// ========================
// Keyword Operations
// ========================

export async function getAllKeywords(): Promise<KeywordEntry[]> {
  return getAllFromStore<KeywordEntry>('keywords');
}

export async function addKeyword(keyword: KeywordEntry): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction('keywords', 'readwrite');
  transaction.objectStore('keywords').put(keyword);
  transaction.oncomplete = () => db.close();
}

export async function addKeywords(keywords: KeywordEntry[]): Promise<void> {
  await putAllInStore('keywords', keywords);
}

export async function removeKeyword(keyword: string): Promise<void> {
  await deleteFromStore('keywords', keyword);
}

export async function clearKeywords(): Promise<void> {
  await clearStore('keywords');
}

// ========================
// Built-in Data Loading
// ========================

export async function loadBuiltinData(): Promise<void> {
  // Check if already installed
  const installed = await getChromeStorage<boolean>(STORAGE_KEYS.INSTALLED);
  if (installed) {
    // Even if installed, verify data actually exists in IndexedDB
    // This handles service worker restart without onInstalled
    try {
      const channels = await getAllChannels();
      if (channels.length > 0) {
        console.log('IsshanTV Guardian: Data already loaded, skipping');
        markDataReady();
        return;
      }
    } catch {
      // DB might not be ready, fall through to load
    }
    // If channels are empty, force reload
    console.log('IsshanTV Guardian: Data empty, force reloading');
  }

  try {
    console.log('IsshanTV Guardian: Loading built-in data...');

    // Load channels
    const channelsResp = await fetch(chrome.runtime.getURL('data/channels.json'));
    const channelsData: ChannelEntry[] = await channelsResp.json();
    await addChannels(channelsData);
    console.log(`IsshanTV Guardian: Loaded ${channelsData.length} channels`);

    // Load keywords
    const keywordsResp = await fetch(chrome.runtime.getURL('data/keywords.json'));
    const keywordsData: KeywordEntry[] = await keywordsResp.json();
    await addKeywords(keywordsData);
    console.log(`IsshanTV Guardian: Loaded ${keywordsData.length} keywords`);

    // Load videos
    const videosResp = await fetch(chrome.runtime.getURL('data/videos.json'));
    const videosData: VideoEntry[] = await videosResp.json();
    await putAllInStore('videos', videosData);
    console.log(`IsshanTV Guardian: Loaded ${videosData.length} videos`);

    // Load playlists
    const playlistsResp = await fetch(chrome.runtime.getURL('data/playlists.json'));
    const playlistsData: PlaylistEntry[] = await playlistsResp.json();
    await putAllInStore('playlists', playlistsData);

    // Load regex
    const regexResp = await fetch(chrome.runtime.getURL('data/regex.json'));
    const regexData: RegexEntry[] = await regexResp.json();
    await putAllInStore('regex', regexData);

    // Load allowlist
    const allowlistResp = await fetch(chrome.runtime.getURL('data/allowlist.json'));
    const allowlistData: AllowlistEntry[] = await allowlistResp.json();
    await putAllInStore('allowlist', allowlistData);

    // Load settings defaults
    await getDefaultSettings();

    // Mark as installed
    await setChromeStorage(STORAGE_KEYS.INSTALLED, true);

    markDataReady();
    console.log('IsshanTV Guardian: Built-in data loaded successfully');
  } catch (err) {
    console.error('IsshanTV Guardian: Failed to load built-in data:', err);
    // Still mark as ready so requests don't hang forever
    markDataReady();
  }
}

// ========================
// IndexedDB to Trie Conversion
// ========================

export async function buildKeywordTrie(): Promise<KeywordTrie> {
  const keywords = await getAllKeywords();
  return KeywordTrie.fromKeywords(
    keywords.filter(k => k.enabled)
  );
}

export async function buildChannelSet(): Promise<IdSet> {
  const channels = await getAllChannels();
  const set = new IdSet();
  for (const channel of channels.filter(c => c.enabled)) {
    set.add(channel.id, { name: channel.name, category: channel.category, enabled: channel.enabled, builtin: channel.builtin });
  }
  return set;
}

// ========================
// Generic Store Operations
// ========================

export async function addToStore(storeName: string, item: any): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).put(item);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { resolve(); db.close(); };
    transaction.onerror = () => { reject(transaction.error); db.close(); };
  });
}

export async function removeFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).delete(key);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { resolve(); db.close(); };
    transaction.onerror = () => { reject(transaction.error); db.close(); };
  });
}

export async function getFromStore(storeName: string, key: string): Promise<any> {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => { resolve(request.result); db.close(); };
    request.onerror = () => { reject(request.error); db.close(); };
  });
}

export async function updateInStore(storeName: string, key: string, updates: any): Promise<any | null> {
  const item = await getFromStore(storeName, key);
  if (!item) return null;
  Object.assign(item, updates);
  await addToStore(storeName, item);
  return item;
}

export async function toggleInStore(storeName: string, key: string, field: string): Promise<any | null> {
  const item = await getFromStore(storeName, key);
  if (!item) return null;
  item[field] = !item[field];
  await addToStore(storeName, item);
  return item;
}

// ========================
// Log Operations
// ========================

export async function addLog(log: BlockLog): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction('logs', 'readwrite');
  transaction.objectStore('logs').add(log);

  // Cleanup old logs based on retention
  const settings = await getSettings();
  if (settings.general.logRetentionDays > 0) {
    const cutoff = Date.now() - settings.general.logRetentionDays * 24 * 60 * 60 * 1000;
    const index = transaction.objectStore('logs').index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    const deleteRequest = index.openCursor(range);

    deleteRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  transaction.oncomplete = () => db.close();
}

export async function getLogs(limit: number = 500): Promise<BlockLog[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction('logs', 'readonly');
      const store = transaction.objectStore('logs');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const logs: BlockLog[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && logs.length < limit) {
          logs.push(cursor.value);
          cursor.continue();
        } else {
          resolve(logs);
          db.close();
        }
      };
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    } catch (err) {
      reject(err);
    }
  });
}

export async function clearLogs(): Promise<void> {
  await clearStore('logs');
}

// ========================
// Export All Data
// ========================

export async function exportAllData(): Promise<ExportData> {
  const [channels, keywords, videos, playlists, regex, allowlist, settings, logs] = await Promise.all([
    getAllChannels(),
    getAllKeywords(),
    getAllFromStore<VideoEntry>('videos'),
    getAllFromStore<PlaylistEntry>('playlists'),
    getAllFromStore<RegexEntry>('regex'),
    getAllFromStore<AllowlistEntry>('allowlist'),
    getSettings(),
    getLogs(10000),
  ]);

  return {
    version: 1,
    exportedAt: Date.now(),
    channels,
    keywords,
    videos,
    playlists,
    regex,
    allowlist,
    settings,
    logs,
  };
}

// ========================
// Import All Data
// ========================

export async function importAllData(data: ExportData): Promise<{
  success: boolean;
  imported: { channels: number; keywords: number; videos: number; playlists: number; regex: number; allowlist: number };
  errors: string[];
}> {
  const errors: string[] = [];
  const imported = { channels: 0, keywords: 0, videos: 0, playlists: 0, regex: 0, allowlist: 0 };

  try {
    if (data.channels?.length) {
      await addChannels(data.channels);
      imported.channels = data.channels.length;
    }

    if (data.keywords?.length) {
      await addKeywords(data.keywords);
      imported.keywords = data.keywords.length;
    }

    if (data.videos?.length) {
      await putAllInStore('videos', data.videos);
      imported.videos = data.videos.length;
    }

    if (data.playlists?.length) {
      await putAllInStore('playlists', data.playlists);
      imported.playlists = data.playlists.length;
    }

    if (data.regex?.length) {
      await putAllInStore('regex', data.regex);
      imported.regex = data.regex.length;
    }

    if (data.allowlist?.length) {
      await putAllInStore('allowlist', data.allowlist);
      imported.allowlist = data.allowlist.length;
    }

    if (data.settings) {
      await updateSettings(data.settings);
    }

    return { success: true, imported, errors: [] };
  } catch (err) {
    return {
      success: false,
      imported,
      errors: [err instanceof Error ? err.message : 'Unknown error during import'],
    };
  }
}

// ========================
// Statistics
// ========================

export async function getStats(): Promise<{
  totalChannels: number;
  totalKeywords: number;
  totalVideos: number;
  totalRegex: number;
  totalLogs: number;
  blockedToday: number;
  enabledCategories: number;
}> {
  const [channels, keywords, videos, regex, logs, settings] = await Promise.all([
    getAllChannels(),
    getAllKeywords(),
    getAllFromStore<VideoEntry>('videos'),
    getAllFromStore<RegexEntry>('regex'),
    getLogs(),
    getSettings(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const blockedToday = logs.filter(l => l.timestamp >= todayStart).length;

  const enabledCategories = Object.values(settings.categories).filter(c => c.enabled).length;

  return {
    totalChannels: channels.length,
    totalKeywords: keywords.length,
    totalVideos: videos.length,
    totalRegex: regex.length,
    totalLogs: logs.length,
    blockedToday,
    enabledCategories,
  };
}
