/**
 * Main content script entry point for IsshanTV Guardian.
 * Injected into YouTube pages.
 * Initializes the filtering engine, starts observing, and handles messages.
 */

import './content.css';
import { FilterEngine } from './filter-engine';
import { startObserving, stopObserving, checkChannelPage } from './observer';
import { removeAllBlocks, rescanAndBlock } from './blockers';
import type { AppSettings, ChannelEntry, KeywordEntry, VideoEntry, PlaylistEntry, RegexEntry, AllowlistEntry } from '../types';

let engineInitialized = false;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

// ========================
// LAYER 1: PRE-BLOCK AT document_start
// Immediately hide the entire page AND kill any media if this is a shorts page.
// CSS visibility:hidden does NOT stop audio — we need to physically destroy
// video/audio elements and prevent YouTube from creating them.
// ========================

const CURRENT_PATHNAME = window.location.pathname;
const CURRENT_URL = window.location.href;
const IS_CHANNEL_PAGE = !!CURRENT_PATHNAME.match(/^\/channel\/(UC[\w-]{22})/) || 
                         !!CURRENT_PATHNAME.match(/^\/@[\w.-]+/);
const IS_SHORTS_PAGE = CURRENT_PATHNAME.includes('/shorts/');
const PRE_BLOCK_STYLE_ID = 'isshantv-pre-block-css';

/**
 * Force-kill a media element — pause, mute, remove src, remove from DOM.
 */
function killMediaElement(media: HTMLMediaElement): void {
  try {
    media.pause();
    media.muted = true;
    media.volume = 0;
    media.currentTime = 999999;
    media.dispatchEvent(new Event('ended'));
    media.removeAttribute('src');
    media.removeAttribute('srcObject');
    (media as any).srcObject = null;
    media.load();
    media.remove();
  } catch {}
}

/**
 * Inject CSS to hide all page content immediately.
 * Called at document_start before YouTube renders anything.
 */
function injectPreBlockCSS(): void {
  if (document.getElementById(PRE_BLOCK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRE_BLOCK_STYLE_ID;
  style.textContent = `
    html { visibility: hidden !important; }
    body { visibility: hidden !important; }
    ytd-page-manager { display: none !important; }
    #page-manager { display: none !important; }
  `;
  // Append to documentElement BEFORE <head> is ready (works at document_start)
  document.documentElement.appendChild(style);
}

/**
 * Remove the pre-block CSS to reveal the page content.
 * Only called after we confirm the page is NOT a blocked channel.
 */
function removePreBlockCSS(): void {
  const style = document.getElementById(PRE_BLOCK_STYLE_ID);
  if (style) style.remove();
}

// ========================
// LAYER 1b: PRE-BLOCK CSS FOR CHANNEL PAGES
// ========================

if (IS_CHANNEL_PAGE) {
  injectPreBlockCSS();
}

// ========================
// LAYER 1c: SHORTS MEDIA KILLER (document_start)
// At document_start, before any YouTube JS runs, set up a MutationObserver
// that immediately destroys ANY video/audio element YouTube creates.
// Also prevent play events via capture-phase listener.
// CSS visibility:hidden does NOT stop audio — we need physical destruction.
// ========================

if (IS_SHORTS_PAGE) {
  injectPreBlockCSS();
  
  // MutationObserver: kill any video/audio elements YouTube creates
  const mediaKiller = new MutationObserver(() => {
    const media = document.querySelectorAll<HTMLMediaElement>('video, audio');
    media.forEach(killMediaElement);
  });
  try {
    mediaKiller.observe(document.documentElement, { childList: true, subtree: true });
  } catch {}
  
  // Capture-phase play prevention — fires BEFORE YouTube's play event
  document.addEventListener('play', (e) => {
    e.stopPropagation();
    const target = e.target as HTMLMediaElement;
    if (target) killMediaElement(target);
  }, true);
  
  // Also prevent loadedmetadata — YouTube uses this to start buffering
  document.addEventListener('loadedmetadata', (e) => {
    const target = e.target as HTMLMediaElement;
    if (target && target.tagName === 'VIDEO') killMediaElement(target);
  }, true);
  
  // Immediately ask background if shorts are blocked (no delay, no DOM needed)
  // We can't wait 500ms for initialize() — YouTube starts audio almost instantly
  chrome.runtime.sendMessage(
    { type: 'GET_SETTINGS' },
    (response: any) => {
      if (chrome.runtime.lastError) return;
      if (response?.success && response.data?.general?.blockShorts) {
        window.location.href = 'https://www.youtube.com';
      }
    }
  );
  
  // Backup redirect timer — in case GET_SETTINGS message fails
  let redirectTries = 0;
  const redirectTimer = setInterval(() => {
    if (++redirectTries > 50 || !window.location.pathname.includes('/shorts/')) {
      clearInterval(redirectTimer);
      return;
    }
    // Kill any media that may have been created
    document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(killMediaElement);
  }, 100);
}

/**
 * Initialize the content script
 */
async function initialize(): Promise<void> {
  if (engineInitialized) return;
  initAttempts++;

  try {
    console.log(`IsshanTV Guardian: Initializing (attempt ${initAttempts})...`);

    // Request all data from background script
    const response = await sendMessageToBackground('GET_INIT_DATA');
    if (!response || !response.success) {
      console.log('IsshanTV Guardian: Background not ready, retrying...');
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        setTimeout(initialize, Math.min(1000 * initAttempts, 5000));
      }
      return;
    }

    const data = response.data as {
      channels: ChannelEntry[];
      keywords: KeywordEntry[];
      videos: VideoEntry[];
      playlists: PlaylistEntry[];
      regex: RegexEntry[];
      allowlist: AllowlistEntry[];
      settings: AppSettings;
    };

    // Verify data is not empty - if no channels and no keywords, wait and retry
    const channelCount = data.channels?.length || 0;
    const keywordCount = data.keywords?.length || 0;

    if (channelCount === 0 && keywordCount === 0) {
      console.log('IsshanTV Guardian: Blocklist data is empty, retrying...');
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        setTimeout(initialize, Math.min(2000 * initAttempts, 10000));
      }
      return;
    }

    console.log(`IsshanTV Guardian: Got ${channelCount} channels, ${keywordCount} keywords`);

    // Check if shorts are blocked and this is a shorts page - redirect FIRST
    if (IS_SHORTS_PAGE && data.settings?.general?.blockShorts) {
      console.log('IsshanTV Guardian: Blocking shorts page (engine not yet initialized)');
      window.location.href = 'https://www.youtube.com';
      return;
    }

    // Initialize filter engine
    const engine = FilterEngine.getInstance();
    await engine.initialize(
      data.channels,
      data.keywords,
      data.videos || [],
      data.playlists || [],
      data.regex || [],
      data.allowlist || [],
      data.settings,
    );

    engineInitialized = true;
    console.log('IsshanTV Guardian: Engine initialized');

    // LAYER 2: Immediately check if this is a blocked channel page or shorts page
    // This happens BEFORE any observer scan, while the page is still hidden
    if (IS_CHANNEL_PAGE) {
      console.log('IsshanTV Guardian: Checking channel page immediately');
      await checkChannelPage();
    }
    
    // Only remove the pre-block CSS if no block was applied
    if (IS_CHANNEL_PAGE) {
      const hasBlockOverlay = document.querySelector('#isshantv-guardian-channel-blocked');
      if (!hasBlockOverlay) {
        removePreBlockCSS();
      }
      // If block WAS applied, CSS stays (the overlay replaces content)
    } else {
      // Normal page or unblocked shorts page — reveal content
      removePreBlockCSS();
    }

    // Start observing DOM changes
    startObserving();

    // Listen for updates from background
    chrome.runtime.onMessage.addListener(handleMessage);
  } catch (err) {
    console.error('IsshanTV Guardian: Failed to initialize:', err);
    if (initAttempts < MAX_INIT_ATTEMPTS) {
      setTimeout(initialize, Math.min(2000 * initAttempts, 10000));
    }
  }
}

/**
 * Handle messages from background script or popup
 */
function handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean {
  switch (message.type) {
    case 'REINITIALIZE':
      console.log('IsshanTV Guardian: Reinitializing...');
      engineInitialized = false;
      initAttempts = 0;
      rescanAndBlock();
      initialize();
      sendResponse({ success: true });
      break;

    case 'REFRESH_BLOCKS':
      console.log('IsshanTV Guardian: Refreshing blocks...');
      rescanAndBlock();
      setTimeout(() => {
        if (engineInitialized) {
          startObserving();
        } else {
          initAttempts = 0;
          initialize();
        }
      }, 500);
      sendResponse({ success: true });
      break;

    case 'REMOVE_ALL_BLOCKS':
      removeAllBlocks();
      sendResponse({ success: true });
      break;

    case 'GET_STATUS':
      sendResponse({
        success: true,
        data: {
          initialized: engineInitialized,
          url: window.location.href,
        },
      });
      break;

    case 'DEBUG_CHECK': {
      const engine = FilterEngine.getInstance();
      console.log('IsshanTV Guardian DEBUG:', {
        initialized: engineInitialized,
        engineReady: engine.isInitialized(),
      });
      sendResponse({ success: true, data: { initialized: engineInitialized } });
      break;
    }

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep message channel open for async response
}

/**
 * Send a message to the background script
 */
function sendMessageToBackground(type: string, payload?: any): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, resolve);
  });
}

// Initialize when DOM is ready
// Small delay to let YouTube's initial JS render
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initialize, 500);
  });
} else {
  setTimeout(initialize, 500);
}
// Export for debugging
export { engineInitialized };
