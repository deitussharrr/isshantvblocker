/**
 * Background service worker for IsshanTV Guardian.
 * Handles:
 * - Data initialization on install/update/startup
 * - Message routing between content script and UI
 * - Password verification
 * - Import/export operations
 */

import {
  loadBuiltinData,
  getAllChannels,
  getAllKeywords,
  getSettings,
  updateSettings,
  addLog,
  exportAllData,
  importAllData,
  getStats,
  getAllFromStore,
  clearLogs,
  getLogs,
  addToStore,
  removeFromStore,
  updateInStore,
  toggleInStore,
  addChannel,
  addKeyword,
  removeChannel,
  removeKeyword,
  waitForDataReady,
} from './storage';
import {
  isPasswordCreated,
  createPassword,
  verifyPassword,
  changePassword,
  isTemporarilyUnlocked,
  setTemporaryUnlock,
  lockNow,
  getRemainingUnlockTime,
} from './password';
import type {
  KeywordEntry,
  VideoEntry,
  PlaylistEntry,
  RegexEntry,
  AllowlistEntry,
  AppSettings,
  BlockLog,
  ExtensionMessage,
  ExtensionResponse,
  ExportData,
} from '../types';
import { STORAGE_KEYS } from '../types';

import { initNetworkBlocker, enableNetworkBlocking, disableNetworkBlocking, getNetworkBlockingStatus } from './network-blocker';

// ========================
// Extension Lifecycle
// ========================

// Load data on service worker startup (every time, not just install)
loadBuiltinData();

// Initialize the network blocker (restore previous state from settings)
setTimeout(() => initNetworkBlocker(), 3000);

// Install / Update handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await loadBuiltinData();
      console.log('IsshanTV Guardian: Built-in data loaded on install');
      chrome.tabs.create({ url: 'options.html' });
    } catch (err) {
      console.error('IsshanTV Guardian: Failed to load built-in data on install:', err);
    }
  }

  if (details.reason === 'update') {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.INSTALLED);
      await loadBuiltinData();
      console.log('IsshanTV Guardian: Built-in data reloaded on update');
    } catch (err) {
      console.error('IsshanTV Guardian: Failed to reload data on update:', err);
    }
  }
});

// ========================
// Message Handler
// ========================

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse: (response: ExtensionResponse) => void) => {
  handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((err) => {
      console.error('Message handler error:', err);
      sendResponse({ success: false, error: err.message || 'Unknown error' });
    });

  return true; // Keep channel open for async
});

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  try {
    switch (message.type) {
      // ========================
      // Init Data
      // ========================
      case 'GET_INIT_DATA': {
        await waitForDataReady();

        const [channels, keywords, videos, playlists, regex, allowlist, settings] = await Promise.all([
          getAllChannels(),
          getAllKeywords(),
          getAllFromStore<VideoEntry>('videos'),
          getAllFromStore<PlaylistEntry>('playlists'),
          getAllFromStore<RegexEntry>('regex'),
          getAllFromStore<AllowlistEntry>('allowlist'),
          getSettings(),
        ]);

        console.log(`IsshanTV Guardian: GET_INIT_DATA - ${channels.length} channels, ${keywords.length} keywords`);

        return {
          success: true,
          data: { channels, keywords, videos, playlists, regex, allowlist, settings },
        };
      }

      // ========================
      // Password Operations
      // ========================
      case 'PASSWORD_CREATED': {
        const created = await isPasswordCreated();
        return { success: true, data: { created } };
      }

      case 'SET_PASSWORD': {
        const { password } = message.payload as { password: string };
        await createPassword(password);
        return { success: true, data: { created: true } };
      }

      case 'VERIFY_PASSWORD': {
        const { password } = message.payload as { password: string };
        const valid = await verifyPassword(password);
        if (!valid) {
          return { success: false, error: 'Incorrect password' };
        }
        return { success: true, data: { valid: true } };
      }

      case 'CHANGE_PASSWORD': {
        const { oldPassword, newPassword } = message.payload as { oldPassword: string; newPassword: string };
        await changePassword(oldPassword, newPassword);
        return { success: true, data: { changed: true } };
      }

      case 'CHECK_UNLOCK': {
        const unlocked = await isTemporarilyUnlocked();
        const remaining = await getRemainingUnlockTime();
        return { success: true, data: { unlocked, remaining } };
      }

      case 'TEMPORARY_UNLOCK': {
        const { duration, password } = message.payload as { duration: number; password: string };
        const valid = await verifyPassword(password);
        if (!valid) {
          return { success: false, error: 'Incorrect password' };
        }
        await setTemporaryUnlock(duration);
        notifyTabs('REFRESH_BLOCKS');
        return { success: true, data: { unlocked: true } };
      }

      case 'LOCK': {
        await lockNow();
        notifyTabs('REFRESH_BLOCKS');
        return { success: true, data: { locked: true } };
      }

      // ========================
      // Settings Operations
      // ========================
      case 'GET_SETTINGS': {
        const settings = await getSettings();
        return { success: true, data: settings };
      }

      case 'UPDATE_SETTINGS': {
        const updatedSettings = message.payload as Partial<AppSettings>;
        await updateSettings(updatedSettings);

        const newSettings = await getSettings();
        if (updatedSettings?.general?.blockAllTraffic !== undefined) {
          if (updatedSettings.general.blockAllTraffic) {
            await enableNetworkBlocking();
          } else {
            await disableNetworkBlocking();
          }
        }

        notifyTabs('REINITIALIZE');
        return { success: true, data: newSettings };
      }

      // ========================
      // Universal Page Content Check
      // ========================
      case 'CHECK_PAGE': {
        const { url, pageTitle, pageText } = message.payload as { url: string; pageTitle: string; pageText: string };
        
        if (!cachedKeywords || cachedKeywords.length === 0) {
          await refreshPageCheckCache();
        }
        
        const settings = await getSettings();
        const settingsEnabled = settings.general.enabled;
        
        if (!settingsEnabled) {
          return { success: true, data: { blocked: false, reason: '', details: '', settingsEnabled: false } };
        }
        
        // Combine all text to check: URL + page title + visible text body
        const textToCheck = [url, pageTitle, pageText].filter(Boolean).join(' ').toLowerCase();
        let blocked = false;
        let reason = '';
        let details = '';
        
        // 1. Check keywords
        for (const kw of cachedKeywords) {
          if (textToCheck.includes(kw.keyword.toLowerCase())) {
            const catSettings = settings.categories[kw.category as keyof typeof settings.categories];
            if (!catSettings || catSettings.enabled) {
              blocked = true;
              const catLabel = kw.category.charAt(0).toUpperCase() + kw.category.slice(1);
              reason = `Matched blocked keyword "${kw.keyword}" (${catLabel}).`;
              details = `Keyword: ${kw.keyword}`;
              break;
            }
          }
        }
        
        // 2. Check videos (by video title or video ID)
        if (!blocked) {
          for (const video of cachedVideos) {
            if (textToCheck.includes(video.title.toLowerCase()) || textToCheck.includes(video.id.toLowerCase())) {
              const catSettings = settings.categories[video.category as keyof typeof settings.categories];
              if (!catSettings || catSettings.enabled) {
                blocked = true;
                const catLabel = video.category.charAt(0).toUpperCase() + video.category.slice(1);
                reason = `Matched blocked video "${video.title}" (${catLabel}).`;
                details = `Video: ${video.title}`;
                break;
              }
            }
          }
        }
        
        // 3. Check regex
        if (!blocked) {
          for (const regex of cachedRegexRules) {
            try {
              if (regex.pattern.test(textToCheck)) {
                const catSettings = settings.categories[regex.category as keyof typeof settings.categories];
                if (!catSettings || catSettings.enabled) {
                  blocked = true;
                  const catLabel = regex.category.charAt(0).toUpperCase() + regex.category.slice(1);
                  reason = `Matched regex "${regex.description}" (${catLabel}).`;
                  details = `Pattern: ${regex.description}`;
                  break;
                }
              }
            } catch {}
          }
        }
        
        return {
          success: true,
          data: { blocked, reason, details, settingsEnabled },
        };
      }

      case 'GET_BLOCKLISTS': {
        const [channels, keywords, videos, playlists, regex, allowlist] = await Promise.all([
          getAllChannels(),
          getAllKeywords(),
          getAllFromStore<VideoEntry>('videos'),
          getAllFromStore<PlaylistEntry>('playlists'),
          getAllFromStore<RegexEntry>('regex'),
          getAllFromStore<AllowlistEntry>('allowlist'),
        ]);

        return {
          success: true,
          data: { channels, keywords, videos, playlists, regex, allowlist },
        };
      }

      case 'ADD_BLOCKLIST_ITEM': {
        const { list, item } = message.payload as {
          list: string;
          item: any;
        };

        switch (list) {
          case 'channels':
            await addChannel(item);
            break;
          case 'keywords':
            await addKeyword(item);
            break;
          default:
            await addToStore(list, item);
        }

        notifyTabs('REINITIALIZE');
        return { success: true };
      }

      case 'REMOVE_BLOCKLIST_ITEM': {
        const { list, key } = message.payload as { list: string; key: string };

        const deleteFunctions: Record<string, (k: string) => Promise<void>> = {
          channels: removeChannel,
          keywords: removeKeyword,
        };

        if (deleteFunctions[list]) {
          await deleteFunctions[list](key);
        } else {
          await removeFromStore(list, key);
        }

        notifyTabs('REINITIALIZE');
        return { success: true };
      }

      case 'TOGGLE_BLOCKLIST_ITEM': {
        const { list, key, field } = message.payload as { list: string; key: string; field: string };
        const item = await toggleInStore(list, key, field);
        if (item) {
          notifyTabs('REINITIALIZE');
          return { success: true, data: item };
        }
        return { success: false, error: 'Item not found' };
      }

      case 'UPDATE_BLOCKLIST_ITEM': {
        const { list, key, updates } = message.payload as { list: string; key: string; updates: any };
        const item = await updateInStore(list, key, updates);
        if (item) {
          notifyTabs('REINITIALIZE');
          return { success: true, data: item };
        }
        return { success: false, error: 'Item not found' };
      }

      // ========================
      // Import/Export
      // ========================
      case 'IMPORT_DATA': {
        const data = message.payload as ExportData;
        const result = await importAllData(data);

        if (result.success) {
          notifyTabs('REINITIALIZE');
        }

        return { success: result.success, data: result };
      }

      case 'EXPORT_DATA': {
        const data = await exportAllData();
        return { success: true, data };
      }

      // ========================
      // Log Operations
      // ========================
      case 'ADD_LOG': {
        const log = message.payload as BlockLog;
        await addLog(log);
        return { success: true };
      }

      case 'GET_LOGS': {
        const logs = await getLogs();
        return { success: true, data: logs };
      }

      case 'CLEAR_LOGS': {
        await clearLogs();
        return { success: true };
      }

      // ========================
      // Channel Page Blocking (Fast Lookup)
      // ========================
      case 'CHECK_CHANNEL_BY_ID': {
        const { channelId } = message.payload as { channelId: string };
        
        if (!blockedChannelIds) {
          await refreshChannelBlockCache();
        }
        
        const blocked = blockedChannelIds?.has(channelId) || false;
        const channelName = blockedChannelNames?.get(channelId) || '';
        
        if (blocked) {
          console.log(`IsshanTV Guardian: Channel ${channelId} (${channelName}) is blocked`);
        }
        
        return { 
          success: true, 
          data: { 
            blocked, 
            channelName,
            reason: blocked ? `Channel blocked: ${channelName}` : '',
          } 
        };
      }

      case 'CHECK_CHANNEL_BY_HANDLE': {
        const { handle } = message.payload as { handle: string };
        
        // For @handle URLs, we need to search all channels for a matching name
        if (!blockedChannelIds) {
          await refreshChannelBlockCache();
        }
        
        // Check if any blocked channel name matches this handle (case-insensitive)
        const lowerHandle = handle.toLowerCase().replace(/^@/, '');
        let matched = false;
        let matchedName = '';
        
        blockedChannelNames.forEach((name, id) => {
          if (!matched) {
            const lowerName = name.toLowerCase().replace(/\s/g, '');
            if (lowerName === lowerHandle || lowerName.includes(lowerHandle) || lowerHandle.includes(lowerName)) {
              matched = true;
              matchedName = name;
            }
          }
        });
        
        return { 
          success: true, 
          data: { 
            blocked: matched, 
            channelName: matchedName,
            reason: matched ? `Channel blocked: ${matchedName}` : '',
          } 
        };
      }

      // ========================
      // Network Blocking
      // ========================
      case 'NETWORK_BLOCK_TOGGLE': {
        const { enabled } = message.payload as { enabled: boolean };
        if (enabled) {
          await enableNetworkBlocking();
        } else {
          await disableNetworkBlocking();
        }

        notifyTabs('REINITIALIZE');
        return { success: true, data: { enabled } };
      }

      case 'GET_NETWORK_BLOCK_STATUS': {
        const status = await getNetworkBlockingStatus();
        return { success: true, data: status };
      }

      // ========================
      // Statistics
      // ========================
      case 'GET_STATS': {
        const stats = await getStats();
        return { success: true, data: stats };
      }

      // ========================
      // Reinitialize universal content scripts
      // ========================
      case 'REINITIALIZE_UNIVERSAL': {
        await refreshPageCheckCache();
        await refreshChannelBlockCache();
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown message type: ${message.type}` };
    }
  } catch (err) {
    console.error('Message handler error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
// ========================
// Universal Page Check (Service Worker Layer)
// ========================

let cachedKeywords: Array<{ keyword: string; category: string }> = [];
let cachedVideos: Array<{ id: string; title: string; category: string }> = [];
let cachedRegexRules: Array<{ pattern: RegExp; description: string; category: string }> = [];

async function refreshPageCheckCache(): Promise<void> {
  try {
    // Cache enabled keywords
    const keywords = await getAllKeywords();
    cachedKeywords = keywords.filter(k => k.enabled).map(k => ({ keyword: k.keyword, category: k.category }));
    
    // Cache enabled videos
    const videos = await getAllFromStore<any>('videos');
    cachedVideos = videos.filter((v: any) => v.enabled).map((v: any) => ({ id: v.id, title: v.title || '', category: v.category }));
    
    // Cache enabled regex rules
    const regexEntries = await getAllFromStore<any>('regex');
    cachedRegexRules = regexEntries
      .filter((r: any) => r.enabled)
      .map((r: any) => ({
        pattern: new RegExp(r.pattern, r.flags || 'i'),
        description: r.description || r.pattern,
        category: r.category,
      }));
  } catch {
    cachedKeywords = [];
    cachedVideos = [];
    cachedRegexRules = [];
  }
}

setTimeout(refreshPageCheckCache, 500);
waitForDataReady().then(refreshPageCheckCache);

// ========================
// Channel Page Blocking (Service Worker Layer)
// ========================

/**
 * Check if a channel ID is in the blocklist.
 * Used by content script for immediate document_start check.
 */
let blockedChannelIds: Set<string> | null = null;
let blockedChannelNames: Map<string, string> = new Map();

// Update the cache whenever data is loaded
async function refreshChannelBlockCache(): Promise<void> {
  try {
    const channels = await getAllChannels();
    blockedChannelIds = new Set(
      channels.filter(c => c.enabled).map(c => c.id)
    );
    blockedChannelNames = new Map(
      channels.filter(c => c.enabled).map(c => [c.id, c.name])
    );
  } catch {
    blockedChannelIds = new Set();
    blockedChannelNames = new Map();
  }
}

// Pre-warm the cache
setTimeout(refreshChannelBlockCache, 500);

// Also refresh after data is loaded
waitForDataReady().then(refreshChannelBlockCache);

/**
 * Intercept YouTube channel page navigation at the browser level.
 * For /channel/UC... URLs, we can check and redirect BEFORE the page loads.
 * This is the most aggressive layer of channel page blocking.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only intercept when the tab first starts loading
  if (changeInfo.status === 'loading' && tab.url) {
    // Check if this is a YouTube channel page with explicit channel ID
    const match = tab.url.match(/youtube\.com\/channel\/(UC[\w-]{22})/i);
    if (match && blockedChannelIds) {
      const channelId = match[1];
      if (blockedChannelIds.has(channelId)) {
        console.log(`IsshanTV Guardian: Intercepted blocked channel page load (${channelId}), redirecting`);
        chrome.tabs.update(tabId, { url: 'about:blank' });
      }
    }
  }
});

// ========================
// Notify all YouTube tabs
// ========================

async function notifyTabs(type: string): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: [
      'https://www.youtube.com/*',
      'https://m.youtube.com/*',
      'https://youtube.com/*',
    ]});

    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type });
        } catch {
          // Tab might not have content script loaded yet
        }
      }
    }
  } catch {
    // Tabs query failed
  }

  // Also notify universal (non-YouTube) tabs whenever blocklists change
  if (type === 'REINITIALIZE' || type === 'REFRESH_BLOCKS') {
    try {
      const allTabs = await chrome.tabs.query({});
      for (const tab of allTabs) {
        if (!tab.id || !tab.url) continue;
        if (tab.url.includes('youtube.com') || tab.url.includes('chrome://') || tab.url.includes('about:')) {
          continue;
        }
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'REINITIALIZE_UNIVERSAL' });
        } catch {
          // Tab might not have universal content script loaded
        }
      }
    } catch {
      // Tabs query failed
    }
  }
}
