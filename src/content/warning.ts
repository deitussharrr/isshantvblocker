/**
 * Warning screen module for displaying blocked content messages.
 * Renders a parent-friendly overlay instead of blocked content.
 */

import { DEFAULT_BLOCK_MESSAGE } from '../types';
import type { FilterResult } from '../types';

const WARNING_CLASS = 'isshantv-guardian-warning';
const WARNING_STYLES_ID = 'isshantv-guardian-styles';

/**
 * Create and inject warning styles
 */
function injectWarningStyles(): void {
  if (document.getElementById(WARNING_STYLES_ID)) return;

  const styles = document.createElement('style');
  styles.id = WARNING_STYLES_ID;
  styles.textContent = `
    .${WARNING_CLASS} {
      display: flex !important;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      padding: 24px;
      margin: 8px 0;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 12px;
      text-align: center;
      font-family: 'Roboto', 'Noto', Arial, sans-serif;
      user-select: none;
      pointer-events: none;
      animation: isshantv-fadeIn 0.3s ease;
    }

    .${WARNING_CLASS}-icon {
      width: 40px;
      height: 40px;
      margin-bottom: 12px;
      opacity: 0.6;
    }

    .${WARNING_CLASS}-icon svg {
      width: 100%;
      height: 100%;
    }

    .${WARNING_CLASS}-title {
      font-size: 16px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .${WARNING_CLASS}-message {
      font-size: 14px;
      color: #888;
      max-width: 280px;
      line-height: 1.5;
    }

    .${WARNING_CLASS}-reason {
      font-size: 12px;
      color: #aaa;
      margin-top: 8px;
      font-style: italic;
    }

    /* Dark mode support */
    [dark="true"] .${WARNING_CLASS},
    :root[dark] .${WARNING_CLASS},
    html[dark] .${WARNING_CLASS} {
      background: rgba(255, 255, 255, 0.05);
    }

    [dark="true"] .${WARNING_CLASS}-title,
    :root[dark] .${WARNING_CLASS}-title,
    html[dark] .${WARNING_CLASS}-title {
      color: #999;
    }

    [dark="true"] .${WARNING_CLASS}-message,
    :root[dark] .${WARNING_CLASS}-message,
    html[dark] .${WARNING_CLASS}-message {
      color: #777;
    }

    @keyframes isshantv-fadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Replace mode - full overlay for video player */
    .${WARNING_CLASS}-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #0f0f0f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 40px;
      text-align: center;
    }

    .${WARNING_CLASS}-overlay .${WARNING_CLASS}-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
      opacity: 0.8;
    }

    .${WARNING_CLASS}-overlay .${WARNING_CLASS}-title {
      font-size: 20px;
      color: #fff;
      margin-bottom: 12px;
    }

    .${WARNING_CLASS}-overlay .${WARNING_CLASS}-message {
      font-size: 16px;
      color: #aaa;
      max-width: 400px;
    }
  `;

  document.head.appendChild(styles);
}

/**
 * Shield icon SVG
 */
function getShieldIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`;
}

/**
 * Create a warning element for blocked content
 */
export function createWarningElement(result: FilterResult, message?: string): HTMLElement {
  injectWarningStyles();

  const wrapper = document.createElement('div');
  wrapper.className = WARNING_CLASS;

  const icon = document.createElement('div');
  icon.className = `${WARNING_CLASS}-icon`;
  icon.innerHTML = getShieldIcon();
  wrapper.appendChild(icon);

  const title = document.createElement('div');
  title.className = `${WARNING_CLASS}-title`;
  title.textContent = 'Content Blocked';
  wrapper.appendChild(title);

  const msg = document.createElement('div');
  msg.className = `${WARNING_CLASS}-message`;
  msg.textContent = message || DEFAULT_BLOCK_MESSAGE;
  wrapper.appendChild(msg);

  if (result.reason) {
    const reason = document.createElement('div');
    reason.className = `${WARNING_CLASS}-reason`;
    reason.textContent = `Reason: ${result.reason}`;
    wrapper.appendChild(reason);
  }

  return wrapper;
}

/**
 * Create a full-page overlay warning for video pages
 */
export function createOverlayWarning(result: FilterResult, message?: string, brand?: string): HTMLElement {
  injectWarningStyles();

  const overlay = document.createElement('div');
  overlay.className = `${WARNING_CLASS} ${WARNING_CLASS}-overlay`;

  const icon = document.createElement('div');
  icon.className = `${WARNING_CLASS}-icon`;
  icon.innerHTML = getShieldIcon();
  overlay.appendChild(icon);

  const title = document.createElement('div');
  title.className = `${WARNING_CLASS}-title`;
  title.textContent = 'This content has been blocked by your parent.';
  overlay.appendChild(title);

  const msg = document.createElement('div');
  msg.className = `${WARNING_CLASS}-message`;
  msg.textContent = message || 'Please contact your parent if you believe this is a mistake.';
  overlay.appendChild(msg);

  // Branding footer - always show IsshanTV Guardian
  const brandEl = document.createElement('div');
  brandEl.style.cssText = 'margin-top: 24px; font-size: 12px; color: #4f8cff; font-weight: 600; letter-spacing: 0.5px; opacity: 0.8;';
  brandEl.textContent = brand || 'IsshanTV Guardian';
  overlay.appendChild(brandEl);

  if (result.reason) {
    const reason = document.createElement('div');
    reason.className = `${WARNING_CLASS}-reason`;
    reason.textContent = `Reason: ${result.reason}`;
    reason.style.cssText = 'font-size: 12px; color: #666; margin-top: 12px; font-style: italic;';
    overlay.appendChild(reason);
  }

  return overlay;
}

/**
 * Apply blur effect to an element (blur action)
 */
export function applyBlur(element: HTMLElement): void {
  element.style.filter = 'blur(20px)';
  element.style.pointerEvents = 'none';
  element.style.userSelect = 'none';
  element.style.transition = 'filter 0.3s ease';
}

/**
 * Check if warning styles are injected
 */
export function areWarningStylesInjected(): boolean {
  return !!document.getElementById(WARNING_STYLES_ID);
}
