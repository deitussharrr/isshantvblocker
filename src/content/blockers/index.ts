/**
 * Blocking actions module.
 * Applies different block actions to YouTube elements:
 * - hide: Completely remove from DOM
 * - blur: Blur the content
 * - replace: Replace with warning placeholder
 * - redirect: Redirect to another page (for video pages)
 * - warning: Show warning screen overlay
 */

import type { FilterResult } from '../../types';
import { createWarningElement, createOverlayWarning, applyBlur } from '../warning';

const BLOCKED_CLASS = 'isshantv-blocked';
const BLOCKED_DATA_ATTR = 'data-isshantv-blocked';

// Store active kill observers so they can be disconnected on cleanup
const killObservers: MutationObserver[] = [];

/**
 * Apply blocking to a DOM element based on filter result
 */
export function applyBlocking(element: HTMLElement, result: FilterResult): void {
  // Skip if already blocked
  if (element.getAttribute(BLOCKED_DATA_ATTR) === 'true') return;

  const action = result.action || 'hide';

  switch (action) {
    case 'hide':
      applyHide(element, result);
      break;
    case 'blur':
      applyBlurAction(element, result);
      break;
    case 'replace':
      applyReplace(element, result);
      break;
    case 'redirect':
      applyRedirectAction(element, result);
      break;
    case 'warning':
      applyWarningAction(element, result);
      break;
    default:
      applyHide(element, result);
  }

  // Mark as blocked
  element.setAttribute(BLOCKED_DATA_ATTR, 'true');
}

/**
 * Hide action - completely remove the element from DOM
 * Uses display:none to prevent layout shift
 */
function applyHide(element: HTMLElement, _result: FilterResult): void {
  element.style.display = 'none';
  element.classList.add(BLOCKED_CLASS);
}

/**
 * Blur action - blur the content while keeping layout
 */
function applyBlurAction(element: HTMLElement, _result: FilterResult): void {
  applyBlur(element);
  element.classList.add(BLOCKED_CLASS);
}

/**
 * Replace action - replace the element with a warning placeholder
 */
function applyReplace(element: HTMLElement, result: FilterResult): void {
  const parent = element.parentElement;
  if (!parent) {
    applyHide(element, result);
    return;
  }

  const warning = createWarningElement(result);
  warning.style.width = element.offsetWidth ? `${element.offsetWidth}px` : 'auto';
  warning.style.height = element.offsetHeight ? `${element.offsetHeight}px` : 'auto';

  element.style.display = 'none';
  parent.insertBefore(warning, element.nextSibling);
  element.classList.add(BLOCKED_CLASS);
}

/**
 * Redirect action - redirect to a safe page
 * Used primarily for video pages
 */
function applyRedirectAction(_element: HTMLElement, _result: FilterResult): void {
  // Only redirect if we're on a watch page
  if (window.location.pathname.includes('/watch') || window.location.pathname.includes('/shorts/')) {
    window.location.href = 'https://www.youtube.com';
  }
}

/**
 * Kill ALL AudioContext instances on the page to stop Web Audio API playback.
 */
function killAudioContexts(): void {
  try {
    // Close all active AudioContexts
    const w = window as any;
    if (w.AudioContext && w.__isshantv_originalAudioContext) {
      // We patched AudioContext constructor — close all tracked instances
      return;
    }
    
    // Try YouTube's internal audio context
    const ytAudioCtx = w.yt?.player?.getPlayer?.()?.getAudioContext?.();
    if (ytAudioCtx && typeof ytAudioCtx.close === 'function') {
      ytAudioCtx.close();
    }
    
    // Try to find any AudioContext on the page by checking known properties
    // YouTube stores audio context in several places
    const moviePlayer = document.querySelector('#movie_player') as any;
    if (moviePlayer) {
      if (moviePlayer.getAudioContext && typeof moviePlayer.getAudioContext === 'function') {
        const ctx = moviePlayer.getAudioContext();
        if (ctx && typeof ctx.close === 'function') ctx.close();
      }
      // Try private properties
      if (moviePlayer.audioElement) {
        moviePlayer.audioElement.pause();
        moviePlayer.audioElement.remove();
      }
      if (moviePlayer.audioTrack) {
        try { moviePlayer.audioTrack.dispose(); } catch {}
      }
    }
    
    // Check the html5 video element for audio-specific tracks
    const html5Player = document.querySelector('.html5-video-player') as any;
    if (html5Player) {
      if (html5Player.audioTrack_) {
        try { html5Player.audioTrack_.dispose(); } catch {}
      }
      if (html5Player.audioElement_) {
        try { html5Player.audioElement_.pause(); html5Player.audioElement_.remove(); } catch {}
      }
    }
  } catch {}
}

/**
 * Aggressively destroy ALL video/audio on the page and replace ALL content with a blocked warning.
 * Uses multiple layers of defense:
 * 1. Immediately stops all media elements globally
 * 2. Kills Web Audio API (AudioContext)
 * 3. Destroys YouTube's internal player API
 * 4. Replaces the ENTIRE page content area (not just player)
 * 5. Runs a kill timer for 10 seconds to catch re-initialized players
 * 6. Prevents YouTube SPA from re-creating the player
 */
export function blockVideoPlayer(player: HTMLElement, result: FilterResult): void {
  if (player.getAttribute(BLOCKED_DATA_ATTR) === 'true') return;
  
  player.setAttribute(BLOCKED_DATA_ATTR, 'true');

  // ========================
  // LAYER 0: REDIRECT — the ONLY reliable way to stop ALL audio
  // YouTube uses Web Audio API (AudioContext), MSE audio tracks, and
  // re-creates the player faster than any DOM-based kill timer can catch.
  // Overlays + media killing is NOT enough — audio will keep playing.
  // Redirecting away guarantees ZERO audio from blocked content.
  // ========================
  if (window.location.pathname.includes('/watch') || window.location.pathname.includes('/shorts/')) {
    console.log('IsshanTV Guardian: Redirecting from blocked video page to stop audio');
    
    // Kill all media one last time before navigating away
    document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(m => {
      try { m.pause(); m.muted = true; m.removeAttribute('src'); (m as any).srcObject = null; m.load(); m.remove(); } catch {}
    });
    
    window.location.href = 'https://www.youtube.com';
    return;
  }

  // ========================
  // LAYER 1: Kill ALL media elements on the ENTIRE page
  // ========================
  const allMediaElements = document.querySelectorAll<HTMLMediaElement>('video, audio');
  allMediaElements.forEach(media => {
    try {
      media.pause();
      media.muted = true;
      media.volume = 0;
      media.currentTime = 999999; // Seek to end
      media.dispatchEvent(new Event('ended'));
      media.removeAttribute('src');
      media.removeAttribute('srcObject');
      (media as any).srcObject = null;
      media.load();
      // Remove all <source> children
      media.querySelectorAll('source').forEach(s => s.remove());
      // Also detach from parent if possible
      try { media.remove(); } catch {}
    } catch {}
  });

  // ========================
  // LAYER 2: Kill AudioContext (Web Audio API)
  // ========================
  killAudioContexts();

  // ========================
  // LAYER 3: Destroy YouTube's internal player
  // ========================
  try {
    // YouTube's polymer player API
    const ytPlayer = document.querySelector('.html5-video-player') as any;
    if (ytPlayer) {
      if (typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
      if (typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
      if (typeof ytPlayer.destroy === 'function') ytPlayer.destroy();
      if (typeof ytPlayer.clearVideo === 'function') ytPlayer.clearVideo();
      if (typeof ytPlayer.loadVideoById === 'function') ytPlayer.loadVideoById(null);
    }

    // Internal YouTube API
    const internalApi = (window as any).yt?.player?.getPlayerByElement?.(player);
    if (internalApi) {
      if (typeof internalApi.stopVideo === 'function') internalApi.stopVideo();
      if (typeof internalApi.destroy === 'function') internalApi.destroy();
    }

    // Try the embedded player API
    const ytEmbed = document.querySelector('#movie_player') as any;
    if (ytEmbed) {
      if (typeof ytEmbed.stopVideo === 'function') ytEmbed.stopVideo();
      if (typeof ytEmbed.destroy === 'function') ytEmbed.destroy();
    }

  } catch {}

  // ========================
  // LAYER 4: Replace the ENTIRE primary content area, not just the player
  // This removes ALL rendered content including any background audio elements
  // ========================
  const rect = player.getBoundingClientRect();
  
  // Find the primary content container to replace entirely
  const primaryContainer = document.querySelector<HTMLElement>(
    '#primary, ' +
    'ytd-watch-flexy #primary, ' +
    'ytd-two-column-browse-results-renderer, ' +
    '#page-manager'
  );

  if (primaryContainer) {
    // Clear ALL inner content — removes every video element, sidebar, comments, everything
    primaryContainer.innerHTML = '';
    
    // Style the container to show our overlay
    primaryContainer.style.cssText = `
      width: 100% !important;
      min-height: ${Math.max(rect.height || 400, window.innerHeight * 0.6)}px !important;
      background: #0f0f0f !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      margin: 0 !important;
    `;

    // Create the blocked overlay
    const wrapper = document.createElement('div');
    wrapper.id = 'isshantv-guardian-blocked';
    wrapper.style.cssText = `
      width: 100% !important;
      min-height: 200px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `;

    const overlay = createOverlayWarning(result, undefined, 'IsshanTV Guardian');
    overlay.style.cssText = `
      text-align: center !important;
      padding: 40px 20px !important;
      max-width: 500px !important;
      margin: 0 auto !important;
    `;
    
    wrapper.appendChild(overlay);
    primaryContainer.appendChild(wrapper);
  } else {
    // Fallback: just replace the player element
    const parent = player.parentElement;
    const nextSibling = player.nextSibling;

    const wrapper = document.createElement('div');
    wrapper.id = 'isshantv-guardian-blocked';
    wrapper.style.cssText = `
      width: ${rect.width || 640}px !important;
      height: ${rect.height || 360}px !important;
      max-width: 100% !important;
      min-height: 200px !important;
      background: #0f0f0f !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      z-index: 999999 !important;
    `;

    player.remove();

    if (nextSibling && parent) {
      parent.insertBefore(wrapper, nextSibling);
    } else if (parent) {
      parent.appendChild(wrapper);
    } else {
      document.body.appendChild(wrapper);
    }

    const overlay = createOverlayWarning(result, undefined, 'IsshanTV Guardian');
    overlay.style.cssText = `
      text-align: center !important;
      padding: 20px !important;
      max-width: 500px !important;
      margin: 0 auto !important;
    `;
    wrapper.appendChild(overlay);
  }

  // ========================
  // LAYER 5: Kill timer — catch re-created players for 15 seconds
  // ========================
  let killCount = 0;
  const MAX_KILLS = 75; // 15 seconds at 200ms
  
  const killTimer = setInterval(() => {
    killCount++;
    if (killCount > MAX_KILLS) {
      clearInterval(killTimer);
      return;
    }

    // Kill any newly created media elements
    const newMedia = document.querySelectorAll<HTMLMediaElement>('video, audio');
    newMedia.forEach(media => {
      try {
        media.pause();
        media.muted = true;
        media.volume = 0;
        media.currentTime = 999999;
        media.removeAttribute('src');
        (media as any).srcObject = null;
        media.load();
        media.remove();
      } catch {}
    });

    // Kill any new AudioContext instances
    killAudioContexts();

    // If YouTube re-created any player element, remove it
    const newPlayer = document.querySelector('#movie_player, .html5-video-player');
    if (newPlayer && newPlayer.parentElement) {
      newPlayer.remove();
    }

    // Check if YouTube replaced our wrapper
    const guardBlock = document.querySelector('#isshantv-guardian-blocked');
    if (!guardBlock) {
      const body = document.body;
      const newWrapper = document.createElement('div');
      newWrapper.id = 'isshantv-guardian-blocked';
      newWrapper.style.cssText = `
        width: 100% !important;
        min-height: 400px !important;
        background: #0f0f0f !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
      `;
      const newOverlay = createOverlayWarning(result, undefined, 'IsshanTV Guardian');
      newWrapper.appendChild(newOverlay);
      
      const primary = document.querySelector('#primary, ytd-watch-flexy, ytd-page-manager');
      if (primary) {
        (primary as HTMLElement).style.cssText = 'width:100%!important;background:#0f0f0f!important;display:flex!important;align-items:center!important;justify-content:center!important;';
        (primary as HTMLElement).innerHTML = '';
        primary.appendChild(newWrapper);
      } else {
        body.prepend(newWrapper);
      }
    }
  }, 200);

  // Also set up a MutationObserver on the body level to catch re-created players
  let bodyObserver: MutationObserver | null = null;
  bodyObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          // Kill ANY video/audio element recreated by YouTube
          if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
            try {
              const media = node as HTMLMediaElement;
              media.pause();
              media.muted = true;
              media.volume = 0;
              media.removeAttribute('src');
              (media as any).srcObject = null;
              media.load();
              media.remove();
            } catch {}
          }
          if (node.id === 'movie_player' || node.classList.contains('html5-video-player')) {
            node.remove();
          }
          // Also check children
          const video = node.querySelector?.('video, audio, #movie_player, .html5-video-player');
          if (video) {
            try {
              if (video.tagName === 'VIDEO' || video.tagName === 'AUDIO') {
                (video as HTMLMediaElement).pause();
                (video as HTMLMediaElement).removeAttribute('src');
              }
              video.remove();
            } catch {}
          }
        }
      }
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
  killObservers.push(bodyObserver);

  // Store the timer ID so it can be cleaned up
  (window as any).__isshantvKillTimer = killTimer;

  // ========================
  // LAYER 6: Prevent YouTube SPA from re-initializing
  // ========================
  (window as any).__isshantvBlocked = true;

  // Update the document title
  document.title = '🚫 Blocked by IsshanTV Guardian';

  console.log('IsshanTV Guardian: Video player fully blocked and destroyed (aggressive mode)');
}

/**
 * Warning action - show overlay warning on video pages
 * For regular elements, just hide them
 */
function applyWarningAction(element: HTMLElement, result: FilterResult): void {
  // Check if this is a video player page
  if (element.id === 'movie_player') {
    blockVideoPlayer(element, result);
  } else {
    const playerContainer = element.closest('#movie_player');
    if (playerContainer instanceof HTMLElement) {
      blockVideoPlayer(playerContainer, result);
    } else {
      // For non-video elements, replace with warning
      applyReplace(element, result);
    }
  }
}

/**
 * Remove blocking from an element (unblock)
 */
export function removeBlocking(element: HTMLElement): void {
  element.style.display = '';
  element.style.filter = '';
  element.style.pointerEvents = '';
  element.style.userSelect = '';
  element.classList.remove(BLOCKED_CLASS);
  element.removeAttribute(BLOCKED_DATA_ATTR);

  // Disconnect all kill observers
  while (killObservers.length > 0) {
    const obs = killObservers.pop();
    if (obs) obs.disconnect();
  }

  // Clear the kill timer if it's still running
  const oldTimer = (window as any).__isshantvKillTimer;
  if (oldTimer) {
    clearInterval(oldTimer);
    (window as any).__isshantvKillTimer = null;
  }

  // Reset blocked flags
  (window as any).__isshantvBlocked = false;

  // Reset document title (let YouTube restore it)
  if (document.title.includes('IsshanTV Guardian')) {
    document.title = 'YouTube';
  }

  // Remove the blocked wrapper if it exists
  const wrapper = document.querySelector('#isshantv-guardian-blocked');
  if (wrapper) {
    wrapper.remove();
  }

  // Remove any warning elements (check both element children and parent siblings)
  const warnings = element.querySelectorAll('.isshantv-guardian-warning');
  warnings.forEach(w => w.remove());
  
  // Also check parent for warning elements (for replaced content)
  const parentWarning = element.parentElement?.querySelector('.isshantv-guardian-warning');
  if (parentWarning) {
    parentWarning.remove();
  }
}

/**
 * Check if an element is blocked
 */
export function isBlocked(element: HTMLElement): boolean {
  return element.getAttribute(BLOCKED_DATA_ATTR) === 'true';
}

/**
 * Remove all blocks from the page
 */
export function removeAllBlocks(): void {
  document.querySelectorAll(`[${BLOCKED_DATA_ATTR}="true"]`).forEach((el) => {
    if (el instanceof HTMLElement) {
      removeBlocking(el);
    }
  });
}

/**
 * Re-scan and re-apply blocks
 */
export function rescanAndBlock(): void {
  // Remove all existing blocks
  removeAllBlocks();

  // Remove warning elements
  document.querySelectorAll('.isshantv-guardian-warning').forEach(el => el.remove());

  // Remove warning styles
  document.getElementById('isshantv-guardian-styles')?.remove();
}
