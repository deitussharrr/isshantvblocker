/**
 * Observer module for watching YouTube DOM changes and SPA navigation.
 * Handles:
 * - MutationObserver for dynamic content
 * - History API changes
 * - yt-navigate-finish events
 * - Lazy loading
 * - Infinite scrolling
 */

import { FilterEngine } from './filter-engine';
import { applyBlocking, blockVideoPlayer } from './blockers';
import type { FilterResult } from '../types';

const OBSERVER_CONFIG = {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
};

let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let watchPageTimer: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;
let scanCount = 0;
let channelPageObserver: MutationObserver | null = null;

/**
 * Start observing YouTube page for changes
 */
export function startObserving(): void {
  if (observer) return;

  console.log('IsshanTV Guardian: Starting observer');

  observer = new MutationObserver((mutations) => {
    handleMutations(mutations);
  });

  observer.observe(document.documentElement, OBSERVER_CONFIG);

  // Listen for YouTube SPA navigation events
  document.addEventListener('yt-navigate-finish', handleNavigation);
  document.addEventListener('yt-page-data-updated', handleNavigation);

  // Listen for history changes (popstate)
  window.addEventListener('popstate', handleNavigation);

  // Initial scan - do multiple passes with delays for lazy-loaded content
  scheduleScan();
  setTimeout(scheduleScan, 1000);
  setTimeout(scheduleScan, 3000);
}

/**
 * Stop observing
 */
export function stopObserving(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  document.removeEventListener('yt-navigate-finish', handleNavigation);
  document.removeEventListener('yt-page-data-updated', handleNavigation);
  window.removeEventListener('popstate', handleNavigation);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  
  if (watchPageTimer) {
    clearTimeout(watchPageTimer);
    watchPageTimer = null;
  }
}

/**
 * Handle navigation events (SPA)
 * 
 * CRITICAL: For shorts pages, we MUST redirect IMMEDIATELY with ZERO delay.
 * YouTube's SPA starts playing shorts audio within milliseconds of navigation.
 * Waiting even 200ms means the audio already plays.
 * 
 * For regular watch pages, we can wait for YouTube to render the DOM first.
 */
function handleNavigation(event?: Event): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // ========================
  // IMMEDIATE SHORTS CHECK (NO DELAY)
  // If navigating to a shorts page, redirect now before YouTube starts playing.
  // ========================
  if (window.location.pathname.includes('/shorts/')) {
    // Kill any media that might have been created during the navigation
    document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(m => {
      try { m.pause(); m.muted = true; m.removeAttribute('src'); m.load(); m.remove(); } catch {}
    });
    
    // Ask background if shorts are blocked (fast async call)
    chrome.runtime.sendMessage(
      { type: 'GET_SETTINGS' },
      (response: any) => {
        if (chrome.runtime.lastError) return;
        if (response?.success && response.data?.general?.blockShorts) {
          window.location.href = 'https://www.youtube.com';
        }
      }
    );
    return;
  }
  
  // ========================
  // IMMEDIATE WATCH PAGE CHECK (NO DELAY)
  // Check if the video ID is in the blocklist before YouTube starts playing.
  // ========================
  if (window.location.pathname.includes('/watch')) {
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (videoId) {
      // Kill any existing media
      document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(m => {
        try { m.pause(); m.muted = true; m.removeAttribute('src'); m.load(); m.remove(); } catch {}
      });
      
      // Ask background to check this video against the cached blocklist
      chrome.runtime.sendMessage(
        { type: 'CHECK_PAGE', payload: { url: window.location.href } },
        (response: any) => {
          if (chrome.runtime.lastError) return;
          if (response?.success && response.data?.blocked) {
            window.location.href = 'https://www.youtube.com';
          }
        }
      );
    }
  }

  // CRITICAL: Do NOT check the watch page immediately after navigation.
  // YouTube's SPA fires yt-navigate-finish BEFORE updating the DOM.
  // The old page's #owner/#title elements are still present, giving us stale data
  // that would bypass the filter engine. We must wait for YouTube to render.
  
  // Cancel any pending watch page check from a previous navigation
  if (watchPageTimer) {
    clearTimeout(watchPageTimer);
  }
  
  // For yt-page-data-updated, page data has loaded - shorter delay
  // For yt-navigate-finish/popstate, DOM hasn't updated yet - longer delay
  const checkDelay = event?.type === 'yt-page-data-updated' ? 200 : 500;
  watchPageTimer = setTimeout(() => {
    watchPageTimer = null;
    checkWatchPage();
    checkChannelPage();
  }, checkDelay);

  // Schedule the full scan with delays for lazy-loaded content
  debounceTimer = setTimeout(() => {
    scheduleScan();
    // Do multiple passes for lazy-loaded content
    setTimeout(scheduleScan, 1500);
    setTimeout(scheduleScan, 3000);
  }, 800);
}

/**
 * Process DOM mutations with debouncing and batching
 */
function handleMutations(mutations: MutationRecord[]): void {
  // Check if we should process (significant mutations)
  const significantMutations = mutations.some(m => {
    if (m.type === 'childList' && m.addedNodes.length > 0) {
      for (const node of m.addedNodes) {
        if (node instanceof HTMLElement) {
          if (isVideoContainer(node)) {
            return true;
          }
        }
      }
    }
    return false;
  });

  if (!significantMutations) return;

  scheduleScan();
}

/**
 * Schedule a scan with debouncing
 */
function scheduleScan(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    performScan();
  }, 300);
}

/**
 * Perform the actual scan of visible YouTube content
 */
async function performScan(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const engine = FilterEngine.getInstance();
    if (!engine.isInitialized()) {
      isProcessing = false;
      return;
    }

    scanCount++;
    if (scanCount <= 3) {
      console.log(`IsshanTV Guardian: Scan #${scanCount}`);
    }

    // Scan different content areas - cast elements to HTMLElement
    const allVideos = document.querySelectorAll<HTMLElement>(
      'ytd-rich-item-renderer, ' +
      'ytd-video-renderer, ' +
      'ytd-compact-video-renderer, ' +
      'ytd-grid-video-renderer, ' +
      'ytd-playlist-video-renderer, ' +
      'ytd-reel-item-renderer, ' +
      'ytd-video-with-context-renderer, ' +
      'ytd-channel-renderer, ' +
      'ytd-compact-channel-renderer'
    );

    for (const element of allVideos) {
      if (element instanceof HTMLElement) {
        await evaluateAndBlock(element);
      }
    }

    // Scan shorts
    await scanShorts();

    // Remove shorts tab from navigation
    removeShortsNav();

    // Check the current watch page for blocked content
    await checkWatchPage();
    
    // Check if this is a blocked channel page
    await checkChannelPage();
  } catch (err) {
    console.error('IsshanTV Guardian: Scan error:', err);
  } finally {
    isProcessing = false;
  }
}

/**
 * Remove Shorts from navigation sidebar
 */
function removeShortsNav(): void {
  // YouTube's current sidebar navigation
  const shortsLinks = document.querySelectorAll<HTMLElement>(
    'a[title="Shorts"], ' +
    'ytd-guide-entry-renderer:has(a[title="Shorts"]), ' +
    'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])'
  );

  for (const el of shortsLinks) {
    if (el instanceof HTMLElement) {
      applyBlocking(el, {
        blocked: true,
        reason: 'Shorts navigation blocked',
        category: 'shorts',
        action: 'hide',
      });
    }
  }
}

/**
 * Scan Shorts
 */
async function scanShorts(): Promise<void> {
  // Find shorts shelves and sections
  const shortsShelves = document.querySelectorAll<HTMLElement>(
    'ytd-reel-shelf-renderer, ' +
    'ytd-rich-section-renderer'
  );

  for (const element of shortsShelves) {
    if (element instanceof HTMLElement) {
      // Check if this section contains shorts
      const hasShorts = element.querySelector(
        'a[href*="/shorts/"], ' +
        '[is-shorts], ' +
        'ytd-rich-item-renderer a[href*="/shorts/"]'
      );

      if (hasShorts) {
        applyBlocking(element, {
          blocked: true,
          reason: 'Shorts shelf blocked',
          category: 'shorts',
          action: 'hide',
        });
      }
    }
  }

  // Block individual shorts items
  const shortsItems = document.querySelectorAll<HTMLElement>(
    'ytd-reel-item-renderer, ' +
    'ytd-grid-video-renderer:has(a[href*="/shorts/"]), ' +
    'ytd-video-renderer:has(a[href*="/shorts/"])'
  );

  for (const element of shortsItems) {
    if (element instanceof HTMLElement) {
      applyBlocking(element, {
        blocked: true,
        reason: 'Shorts content blocked',
        category: 'shorts',
        action: 'hide',
      });
    }
  }
}

/**
 * Evaluate a single element and block if needed
 */
async function evaluateAndBlock(element: HTMLElement): Promise<void> {
  const engine = FilterEngine.getInstance();
  const data = extractPageData(element);
  if (!data) return;

  const result = engine.check(data);
  if (result.blocked) {
    applyBlocking(element, result);
  }
}

/**
 * Extract YouTube page data from a DOM element.
 * Uses multiple strategies to find channel IDs, names, and video titles
 * from YouTube's current DOM structure.
 */
function extractPageData(element: HTMLElement): {
  videoId?: string;
  channelId?: string;
  channelName?: string;
  videoTitle?: string;
  isShorts: boolean;
  isLive: boolean;
  isPlaylist: boolean;
} | null {
  const data: {
    videoId?: string;
    channelName?: string;
    channelId?: string;
    videoTitle?: string;
    isShorts: boolean;
    isLive: boolean;
    isPlaylist: boolean;
  } = {
    isShorts: false,
    isLive: false,
    isPlaylist: false,
  };

  // === Strategy 1: Get channel ID from links ===
  // YouTube uses both /channel/UC... and /@handle formats
  const channelLinks = element.querySelectorAll<HTMLAnchorElement>('a[href*="/channel/"], a[href*="/@"]');
  for (const link of channelLinks) {
    const href = link.getAttribute('href') || '';
    const channelMatch = href.match(/\/channel\/(UC[\w-]{22})/);
    if (channelMatch) {
      data.channelId = channelMatch[1];
      break;
    }
    // Handle /@username format - we can get the handle but not the ID from URLs
  }

  // === Strategy 2: Get channel name ===
  // YouTube has multiple selectors for channel names
  const channelNameSelectors = [
    'ytd-channel-name a',
    '#channel-name a',
    '.ytd-channel-name a',
    'ytd-video-owner-renderer a',
    '#owner #channel-name a',
    '#upload-info #channel-name a',
    'ytd-video-meta-block a[href*="/@"]',
    'ytd-channel-name',
    '#channel-name',
    '.ytd-channel-name',
    '.yt-video-meta-item a',
    'a[href*="/channel/"] yt-formatted-string',
  ];

  for (const selector of channelNameSelectors) {
    try {
      const nameEl = element.querySelector<HTMLElement>(selector);
      if (nameEl) {
        const text = nameEl.textContent?.trim();
        if (text && text.length > 0 && text.length < 100) {
          data.channelName = text;
          break;
        }
      }
    } catch {
      // Skip invalid selectors
    }
  }

  // === Strategy 3: Get channel name from any link with /@ or /channel/ ===
  if (!data.channelName) {
    for (const link of channelLinks) {
      const text = link.textContent?.trim();
      if (text && text.length > 0 && text.length < 100 && !text.includes('/')) {
        data.channelName = text;
        break;
      }
    }
  }

  // === Strategy 4: Get video ID ===
  // From video-id attribute
  const videoIdAttr = element.getAttribute('video-id');
  if (videoIdAttr) {
    data.videoId = videoIdAttr;
  }

  // From anchor links
  const videoLinks = element.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/watch?v="], ' +
    'a[href*="/shorts/"], ' +
    '#video-title, ' +
    'a#video-title'
  );

  for (const link of videoLinks) {
    const href = link.getAttribute('href') || '';
    // /watch?v=VIDEO_ID
    const watchMatch = href.match(/[?&]v=([\w-]{11})/);
    if (watchMatch) {
      data.videoId = watchMatch[1];
    }
    // /shorts/VIDEO_ID
    const shortsMatch = href.match(/\/shorts\/([\w-]{11})/);
    if (shortsMatch) {
      data.videoId = shortsMatch[1];
      data.isShorts = true;
    }
    if (href.includes('/shorts/')) {
      data.isShorts = true;
    }
  }

  // === Strategy 5: Get video title ===
  const titleSelectors = [
    '#video-title',
    'a#video-title',
    'yt-formatted-string#video-title',
    'h3 a#video-title',
    '#title h1',
    'h1.ytd-watch-metadata',
    '.video-title',
    'ytd-video-renderer #video-title',
    'ytd-rich-item-renderer #video-title',
    'ytd-compact-video-renderer #video-title',
  ];

  for (const selector of titleSelectors) {
    try {
      const titleEl = element.querySelector<HTMLElement>(selector);
      if (titleEl) {
        const title = titleEl.textContent?.trim();
        if (title && title.length > 0) {
          data.videoTitle = title;
          break;
        }
      }
    } catch {
      // Skip invalid selectors
    }
  }

  // === Strategy 6: Check for shorts ===
  if (element.closest('ytd-reel-shelf-renderer') ||
      element.closest('[is-shorts]') ||
      element.querySelector('[is-shorts]') ||
      element.matches('[is-shorts]')) {
    data.isShorts = true;
  }

  // === Strategy 7: Check for live indicator ===
  const liveIndicators = element.querySelectorAll<HTMLElement>(
    '[aria-label*="Live"], ' +
    '[label="LIVE"], ' +
    'ytd-badge-supported-renderer, ' +
    '.badge-style-type-live-now, ' +
    '[is-live]'
  );
  if (liveIndicators.length > 0) {
    data.isLive = true;
  }

  // === Strategy 8: Check for playlist ===
  const playlistIndicators = element.querySelectorAll<HTMLElement>(
    '[playlist-id], ' +
    'ytd-playlist-panel-renderer, ' +
    'ytd-playlist-video-renderer'
  );
  if (playlistIndicators.length > 0) {
    data.isPlaylist = true;
  }

  // Only return data if we found at least something useful
  if (!data.channelId && !data.channelName && !data.videoTitle && !data.videoId) {
    // Check if this is a channel page header - extract from page-level elements
    if (element.tagName === 'YTD-CHANNEL-RENDERER' || element.tagName === 'YTD-COMPACT-CHANNEL-RENDERER') {
      return data; // Return what we have - might have channel info
    }
    return null; // Nothing to filter on
  }

  return data;
}

/**
 * Check if an element is a video container
 */
function isVideoContainer(element: HTMLElement): boolean {
  const videoTags = [
    'YTD-RICH-ITEM-RENDERER',
    'YTD-VIDEO-RENDERER',
    'YTD-COMPACT-VIDEO-RENDERER',
    'YTD-GRID-VIDEO-RENDERER',
    'YTD-REEL-ITEM-RENDERER',
    'YTD-REEL-SHELF-RENDERER',
    'YTD-WATCH-NEXT-SECONDARY-RESULTS-RENDERER',
    'YTD-CHANNEL-RENDERER',
    'YTD-COMPACT-CHANNEL-RENDERER',
    'YTD-RICH-SECTION-RENDERER',
    'YTD-VIDEO-WITH-CONTEXT-RENDERER',
  ];

  const tagName = element.tagName;
  if (videoTags.includes(tagName)) return true;

  // Check if it contains any video-related elements
  return !!element.querySelector(videoTags.join(','));
}

/**
 * Extract video data from the watch page DOM elements.
 */
function getWatchPageData(): {
  channelName?: string;
  channelId?: string;
  videoTitle?: string;
} {
  const data: {
    channelName?: string;
    channelId?: string;
    videoTitle?: string;
  } = {};

  // Get channel name from the watch page owner section
  const channelNameEl = document.querySelector<HTMLElement>(
    '#owner #channel-name a, ' +
    '#upload-info #channel-name a, ' +
    'ytd-video-owner-renderer #channel-name a, ' +
    '#owner yt-formatted-string a, ' +
    '#upload-info yt-formatted-string a'
  );
  data.channelName = channelNameEl?.textContent?.trim();
  
  // Get channel ID from /channel/ link in owner section
  const channelLink = document.querySelector<HTMLAnchorElement>(
    '#owner a[href*="/channel/"], #upload-info a[href*="/channel/"]'
  );
  const channelHref = channelLink?.getAttribute('href') || '';
  const channelMatch = channelHref.match(/\/channel\/(UC[\w-]{22})/);
  data.channelId = channelMatch?.[1];
  
  // Also check from any /@ handle link (convert to channel ID)
  if (!data.channelId) {
    const handleLink = document.querySelector<HTMLAnchorElement>('#owner a[href*="/@"]');
    const handleHref = handleLink?.getAttribute('href') || '';
    const handleChannelMatch = handleHref.match(/\/channel\/(UC[\w-]{22})/);
    data.channelId = handleChannelMatch?.[1];
  }

  // Get video title from the watch page header
  const titleEl = document.querySelector<HTMLElement>(
    '#title h1, ' +
    'h1.ytd-watch-metadata, ' +
    '.ytd-watch-metadata h1'
  );
  data.videoTitle = titleEl?.textContent?.trim();

  return data;
}

/**
 * Ask the background service worker if a channel is blocked (fast lookup).
 * Uses the cached blocklist in the service worker for instant response.
 */
async function checkChannelWithBackground(channelId: string, handle?: string): Promise<{ blocked: boolean; channelName: string; reason: string } | null> {
  try {
    if (channelId) {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_CHANNEL_BY_ID',
        payload: { channelId },
      });
      if (response?.success) {
        return response.data;
      }
    }
    
    if (handle) {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_CHANNEL_BY_HANDLE',
        payload: { handle },
      });
      if (response?.success) {
        return response.data;
      }
    }
  } catch {
    // Background might not be ready yet
  }
  return null;
}

/**
 * Wait for the page content area (#page-manager) to render.
 * Used by both URL-based and DOM-based channel page blocking.
 */
async function waitForPageContent(attempt: number = 1): Promise<HTMLElement | null> {
  const pageContent = document.querySelector<HTMLElement>(
    '#page-manager, ' +
    'ytd-page-manager, ' +
    '#content-container, ' +
    '#primary'
  );
  
  if (pageContent) return pageContent;
  
  if (attempt <= 15) {
    await new Promise(r => setTimeout(r, 200 * attempt));
    return waitForPageContent(attempt + 1);
  }
  
  return null;
}

/**
 * Check if the current page is a channel page for a blocked channel.
 * Multi-layered approach:
 * 1. URL-based check for /channel/UC... (no DOM needed)
 * 2. Background service worker fast lookup
 * 3. DOM-based check for /@handle pages
 */
export async function checkChannelPage(attempt: number = 1): Promise<void> {
  // Clean up any previous channel page observer
  if (channelPageObserver) {
    channelPageObserver.disconnect();
    channelPageObserver = null;
  }

  const pathname = window.location.pathname;
  
  // Check if this is a channel page
  const channelIdMatch = pathname.match(/^\/channel\/(UC[\w-]{22})/);
  const handleMatch = pathname.match(/^\/@([\w.-]+)/);
  
  if (!channelIdMatch && !handleMatch) return;
  
  // ========================
  // LAYER 1: URL-based check (for /channel/UC... pages)
  // Uses the background service worker's cached blocklist for instant check.
  // No DOM needed - channel ID is in the URL itself.
  // ========================
  
  if (channelIdMatch) {
    const channelId = channelIdMatch[1];
    
    // Try background fast lookup first
    const bgResult = await checkChannelWithBackground(channelId);
    if (bgResult?.blocked) {
      console.log(`IsshanTV Guardian: Blocking channel page by URL (${channelId}) - ${bgResult.reason}`);
      
      // Wait for page content to render (needed for replacement)
      const pageContent = await waitForPageContent();
      if (pageContent) {
        blockChannelPage(pageContent, {
          blocked: true,
          reason: bgResult.reason || `Channel blocked: ${bgResult.channelName || channelId}`,
          category: 'custom',
          action: 'hide',
        });
      }
      return;
    }
    
    // Fallback: try the local filter engine
    const engine = FilterEngine.getInstance();
    if (engine.isInitialized()) {
      const engineResult = engine.check({
        channelId,
        channelName: '',
        videoTitle: '',
        description: '',
        searchQuery: '',
        url: window.location.href,
        isShorts: false,
        isLive: false,
        isPlaylist: false,
      });
      
      if (engineResult.blocked) {
        console.log(`IsshanTV Guardian: Blocking channel page by URL (engine) - ${engineResult.reason}`);
        const pageContent = await waitForPageContent();
        if (pageContent) {
          blockChannelPage(pageContent, engineResult);
        }
        return;
      }
    }
  }
  
  // ========================
  // LAYER 2: DOM-based check (for /@handle pages)
  // Needs to wait for the channel header to render to extract channel name.
  // ========================
  
  const engine = FilterEngine.getInstance();
  if (!engine.isInitialized()) {
    if (attempt <= 5) {
      setTimeout(() => checkChannelPage(attempt + 1), 300);
    }
    return;
  }

  // Extract channel info
  let channelId: string | undefined;
  let channelName: string | undefined;

  // Channel ID directly from URL (already checked above, but keep for completeness)
  if (channelIdMatch) {
    channelId = channelIdMatch[1];
  }

  // Try to get channel name from the page header (renders early on channel pages)
  const channelHeader = document.querySelector<HTMLElement>(
    '#channel-header yt-formatted-string, ' +
    '#channel-name yt-formatted-string, ' +
    '#channel-header-container #channel-name, ' +
    'ytd-channel-name yt-formatted-string#channel-name, ' +
    'ytd-channel-header-renderer #channel-name, ' +
    '#inner-header-container #channel-name, ' +
    '#page-header yt-formatted-string'
  );
  
  if (channelHeader) {
    const text = channelHeader.textContent?.trim();
    if (text && text.length > 0 && text.length < 100) {
      channelName = text;
    }
  }

  // If no channel name found yet and we have a handle, try background fast lookup
  if (!channelName && handleMatch) {
    const bgResult = await checkChannelWithBackground('', handleMatch[1]);
    if (bgResult?.blocked) {
      channelName = bgResult.channelName;
    }
  }

  // Fallback: get channel name from any link back to this channel on the page
  if (!channelName) {
    const channelLinks = document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/channel/"], a[href*="/@"]'
    );
    for (const link of channelLinks) {
      const href = link.getAttribute('href') || '';
      if (channelId && href.includes(channelId)) {
        const text = link.textContent?.trim();
        if (text && text.length > 0 && text.length < 100 && !text.includes('/')) {
          channelName = text;
          break;
        }
      }
    }
  }

  // If no data is available yet, YouTube's SPA hasn't finished rendering.
  // Retry with increasing delays.
  if (!channelName && !channelId) {
    if (attempt <= 8) {
      const delay = attempt * 300;
      console.log(`IsshanTV Guardian: Channel page data not ready, retry #${attempt} in ${delay}ms`);
      setTimeout(() => checkChannelPage(attempt + 1), delay);
    }
    return;
  }

  // Build page data and check against filter engine
  const pageData = {
    channelId,
    channelName,
    videoTitle: '',
    description: '',
    searchQuery: '',
    url: window.location.href,
    isShorts: false,
    isLive: false,
    isPlaylist: false,
  };

  const result = engine.check(pageData);
  if (!result.blocked) return;

  console.log(`IsshanTV Guardian: Blocking channel page (DOM) - ${result.reason}`);

  // Wait for the page content area to render before replacing it
  const pageContent = await waitForPageContent();
  if (!pageContent) return;

  // Block the channel page by replacing its content with a warning overlay
  blockChannelPage(pageContent, result);
}

/**
 * Block the entire channel page by replacing content with a warning overlay.
 * Uses a MutationObserver to keep the warning in place if YouTube re-renders.
 */
function blockChannelPage(pageContent: HTMLElement, result: FilterResult): void {
  if (pageContent.getAttribute('data-isshantv-blocked') === 'true') return;
  pageContent.setAttribute('data-isshantv-blocked', 'true');

  // Mark the primary area
  const primary = document.querySelector('#primary, #content-container, ytd-page-manager');
  if (primary instanceof HTMLElement) {
    primary.setAttribute('data-isshantv-blocked', 'true');
  }

  // Kill any autoplaying videos on the page
  const allMedia = document.querySelectorAll<HTMLMediaElement>('video, audio');
  allMedia.forEach(media => {
    try {
      media.pause();
      media.muted = true;
      media.volume = 0;
      media.removeAttribute('src');
      (media as any).srcObject = null;
      media.load();
    } catch {}
  });

  // Save dimensions before clearing
  const rect = pageContent.getBoundingClientRect();
  const height = rect.height || window.innerHeight * 0.8;

  // Create a full-page blocked wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'isshantv-guardian-channel-blocked';
  wrapper.style.cssText = `
    width: 100% !important;
    min-height: ${Math.max(height, 300)}px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: var(--yt-spec-base-background, #0f0f0f) !important;
    padding: 40px 20px !important;
    box-sizing: border-box !important;
  `;

  // Create the overlay with channel-specific message
  const channelName = result.reason?.replace('Channel blocked: ', '') || '';
  const message = result.reason 
    ? `The channel ${channelName} is blocked by your parent.`
    : 'This channel is blocked by your parent.';

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    text-align: center !important;
    max-width: 480px !important;
    margin: 0 auto !important;
    font-family: 'Roboto', 'Noto', Arial, sans-serif !important;
  `;

  // Shield icon
  const icon = document.createElement('div');
  icon.style.cssText = 'width: 64px; height: 64px; margin: 0 auto 24px; opacity: 0.7;';
  icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>`;
  overlay.appendChild(icon);

  // Title
  const title = document.createElement('div');
  title.textContent = 'Channel Blocked';
  title.style.cssText = 'font-size: 24px; font-weight: 500; color: #fff; margin-bottom: 16px;';
  overlay.appendChild(title);

  // Message
  const msg = document.createElement('div');
  msg.textContent = message;
  msg.style.cssText = 'font-size: 16px; color: #aaa; line-height: 1.5; margin-bottom: 8px;';
  overlay.appendChild(msg);

  // Second message
  const msg2 = document.createElement('div');
  msg2.textContent = 'Please contact your parent if you believe this is a mistake.';
  msg2.style.cssText = 'font-size: 14px; color: #888; line-height: 1.5;';
  overlay.appendChild(msg2);

  // Branding
  const brand = document.createElement('div');
  brand.textContent = 'IsshanTV Guardian';
  brand.style.cssText = 'margin-top: 32px; font-size: 12px; color: #4f8cff; font-weight: 600; letter-spacing: 0.5px; opacity: 0.8;';
  overlay.appendChild(brand);

  if (result.reason && channelName) {
    const reason = document.createElement('div');
    reason.textContent = `Reason: ${result.reason}`;
    reason.style.cssText = 'font-size: 12px; color: #666; margin-top: 16px; font-style: italic;';
    overlay.appendChild(reason);
  }

  wrapper.appendChild(overlay);

  // Clear the page content and insert the blocked wrapper
  pageContent.innerHTML = '';
  pageContent.appendChild(wrapper);

  // Set up MutationObserver to keep blocking if YouTube re-renders
  channelPageObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          // If YouTube re-creates content, re-apply the block
          if (node.tagName === 'YTD-BROWSE' || 
              node.tagName === 'YTD-TWO-COLUMN-BROWSE-RESULTS-RENDERER' ||
              node.id === 'primary' ||
              node.querySelector('#channel-header')) {
            
            const guard = document.querySelector('#isshantv-guardian-channel-blocked');
            if (!guard) {
              const newWrapper = wrapper.cloneNode(true) as HTMLElement;
              pageContent.innerHTML = '';
              pageContent.appendChild(newWrapper);
            }
            break;
          }
        }
      }
    }
  });
  channelPageObserver.observe(pageContent, { childList: true, subtree: true });

  // Update document title
  document.title = '🚫 Channel Blocked - IsshanTV Guardian';

  console.log('IsshanTV Guardian: Channel page fully blocked');
}

/**
 * Check the current watch page for blocked content.
 * When a user navigates to a video, this checks if the channel/video
 * is blocked and shows an overlay on the player if so.
 * Retries with delays to handle YouTube's lazy DOM rendering on SPA navigation.
 */
export async function checkWatchPage(attempt: number = 1): Promise<void> {
  const isWatchPage = window.location.pathname.includes('/watch');
  const isShortsPage = window.location.pathname.includes('/shorts/');
  
  if (!isWatchPage && !isShortsPage) return;
  
  const engine = FilterEngine.getInstance();
  if (!engine.isInitialized()) {
    if (attempt <= 5) {
      setTimeout(() => checkWatchPage(attempt + 1), 500);
    }
    return;
  }

  // Get video ID from URL (always available immediately after navigation)
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v') || window.location.pathname.match(/\/shorts\/([\w-]{11})/)?.[1];

  // Extract data from the watch page DOM
  const { channelName, channelId, videoTitle } = getWatchPageData();

  // If no data is available yet, YouTube's SPA hasn't finished rendering the new page.
  // Retry with increasing delays to wait for it.
  if (!channelName && !channelId && !videoTitle) {
    if (attempt <= 8) {
      const delay = attempt * 300;
      console.log(`IsshanTV Guardian: Watch page data not ready, retry #${attempt} in ${delay}ms`);
      setTimeout(() => checkWatchPage(attempt + 1), delay);
    }
    return;
  }

  // Build page data with the extracted info
  const pageData = {
    videoId: videoId || undefined,
    channelId: channelId,
    channelName: channelName,
    videoTitle: videoTitle,
    description: '',
    searchQuery: '',
    url: window.location.href,
    isShorts: isShortsPage,
    isLive: false,
    isPlaylist: window.location.href.includes('&list='),
  };

  // Check against the filter engine
  const result = engine.check(pageData);
  if (!result.blocked) {
    // Not blocked with current data. However, on SPA navigation, the DOM data
    // we found might be from the OLD page (stale). If we have a videoId, do a
    // couple more checks with delays to catch the case where fresh data differs.
    if (attempt <= 3 && videoId) {
      console.log(`IsshanTV Guardian: Not blocked (attempt #${attempt}), rechecking in case DOM was stale`);
      setTimeout(() => checkWatchPage(attempt + 1), 500);
    }
    return;
  }

  console.log(`IsshanTV Guardian: Blocking watch page - ${result.reason}`);

  // If the player isn't ready yet, retry until it is
  const player = document.querySelector<HTMLElement>('#movie_player');
  if (!player) {
    if (attempt <= 10) {
      setTimeout(() => checkWatchPage(attempt + 1), 300);
    }
    return;
  }

  // Block the player with the aggressive overlay
  blockVideoPlayer(player, result);

  // Also block autoplay in the playlist/up-next panel
  const compactVideos = document.querySelectorAll<HTMLElement>(
    'ytd-compact-video-renderer, ' +
    'ytd-compact-playlist-renderer'
  );
  for (const el of compactVideos) {
    if (el instanceof HTMLElement) {
      await evaluateAndBlock(el);
    }
  }
}

export { evaluateAndBlock, extractPageData };
