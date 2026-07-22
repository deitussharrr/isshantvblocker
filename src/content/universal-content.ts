/**
 * Universal Content Script for IsshanTV Guardian.
 * Injects into EVERY website (except YouTube — it has its own content script).
 * 
 * Scans page URL, title, and visible text against the user's keyword/video/regex
 * blocklists. If ANY match is found, blocks the entire page with an overlay.
 * 
 * Layers:
 * 1. Pre-block CSS at document_start — hides ALL content before anything renders
 * 2. URL + title check (immediate, no DOM needed)
 * 3. Visible text scan (after DOMContentLoaded)
 * 4. Full-page block overlay if anything matched
 * 5. SPA navigation detection (pushState, popstate, hashchange)
 * 6. REINITIALIZE on blocklist change
 */

const PRE_BLOCK_STYLE_ID = 'isshantv-universal-css';

// ========================
// LAYER 1: PRE-BLOCK at document_start
// ========================

function injectPreBlockCSS(): void {
  if (document.getElementById(PRE_BLOCK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRE_BLOCK_STYLE_ID;
  style.textContent = `html { visibility: hidden !important; } body { visibility: hidden !important; }`;
  document.documentElement.appendChild(style);
}

function removePreBlockCSS(): void {
  const style = document.getElementById(PRE_BLOCK_STYLE_ID);
  if (style) style.remove();
}

injectPreBlockCSS();

// ========================
// LAYER 2: Full-page block overlay
// ========================

function blockPage(reason: string, details: string): void {
  removePreBlockCSS();
  if (document.getElementById('isshantv-universal-blocked')) return;

  // Kill all media
  document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(m => {
    try { m.pause(); m.muted = true; m.removeAttribute('src'); (m as any).srcObject = null; m.load(); } catch {}
  });

  const div = document.createElement('div');
  div.id = 'isshantv-universal-blocked';
  div.style.cssText = 'position:fixed!important;top:0;left:0;width:100vw;height:100vh;background:#0f0f0f;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif!important;';

  const inner = document.createElement('div');
  inner.style.cssText = 'text-align:center;max-width:480px;padding:40px 20px;';

  // Shield icon
  const icon = document.createElement('div');
  icon.style.cssText = 'width:64px;height:64px;margin:0 auto 24px;opacity:.7;';
  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  inner.appendChild(icon);

  const title = document.createElement('div');
  title.textContent = 'This content is blocked';
  title.style.cssText = 'font-size:24px;font-weight:600;color:#fff;margin-bottom:12px;';
  inner.appendChild(title);

  const rEl = document.createElement('div');
  rEl.textContent = reason;
  rEl.style.cssText = 'font-size:16px;color:#aaa;line-height:1.5;margin-bottom:8px;';
  inner.appendChild(rEl);

  if (details) {
    const dEl = document.createElement('div');
    dEl.textContent = details;
    dEl.style.cssText = 'font-size:14px;color:#888;line-height:1.5;';
    inner.appendChild(dEl);
  }

  const contact = document.createElement('div');
  contact.textContent = 'Please contact your parent if you believe this is a mistake.';
  contact.style.cssText = 'font-size:14px;color:#666;line-height:1.5;margin-top:16px;';
  inner.appendChild(contact);

  const brand = document.createElement('div');
  brand.textContent = 'IsshanTV Guardian';
  brand.style.cssText = 'margin-top:32px;font-size:12px;color:#4f8cff;font-weight:600;letter-spacing:.5px;opacity:.8;';
  inner.appendChild(brand);

  div.appendChild(inner);
  document.documentElement.appendChild(div);

  // Persistent observer to re-block if removed
  const obs = new MutationObserver(() => {
    if (!document.getElementById('isshantv-universal-blocked')) {
      document.documentElement.appendChild(div.cloneNode(true));
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

// ========================
// LAYER 3: Check page content against blocklists
// ========================

async function checkPageContent(): Promise<void> {
  try {
    const url = window.location.href;
    const pageTitle = document.title || '';
    
    // Get visible text from the page body (after DOM is ready)
    let visibleText = '';
    const body = document.body;
    if (body) {
      visibleText = (body.textContent || '').substring(0, 10000); // First 10k chars
    }

    // Ask background to check URL + title + visible text against keywords/regex/videos
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_PAGE',
      payload: { url, pageTitle, pageText: visibleText },
    });

    if (!response?.success) {
      removePreBlockCSS();
      return;
    }

    const result = response.data as {
      blocked: boolean;
      reason: string;
      details: string;
      settingsEnabled: boolean;
    };

    if (!result.settingsEnabled) {
      removePreBlockCSS();
      return;
    }

    if (result.blocked) {
      blockPage(result.reason, result.details);
      return;
    }

    removePreBlockCSS();
  } catch {
    removePreBlockCSS();
  }
}

// ========================
// LAYER 4: SPA navigation detection
// ========================

let lastUrl = window.location.href;

function observeUrlChanges(): void {
  window.addEventListener('popstate', onNav);
  window.addEventListener('hashchange', onNav);

  const origPush = history.pushState.bind(history);
  history.pushState = ((...args: any[]) => {
    (origPush as Function).apply(history, args);
    onNav();
  }) as typeof history.pushState;

  const origReplace = history.replaceState.bind(history);
  history.replaceState = ((...args: any[]) => {
    (origReplace as Function).apply(history, args);
    onNav();
  }) as typeof history.replaceState;

  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      onNav();
    }
  }, 5000);
}

function onNav(): void {
  lastUrl = window.location.href;
  injectPreBlockCSS();
  checkPageContent();
}

// ========================
// LAYER 5: Run checks
// ========================

// Immediate check with URL only (at document_start)
checkPageContent().then(() => observeUrlChanges());

// Recheck with full page text once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => checkPageContent());
} else {
  checkPageContent();
}

// Listen for reinit messages
chrome.runtime.onMessage.addListener((msg: any, _sender, sendRes: any) => {
  if (msg.type === 'REINITIALIZE_UNIVERSAL') {
    injectPreBlockCSS();
    checkPageContent().then(() => sendRes({ success: true }));
    return true;
  }
  return false;
});

export {};
