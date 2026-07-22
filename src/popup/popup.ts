/**
 * Popup script for IsshanTV Guardian.
 * Shows status, quick actions, and lock screen.
 */

import './popup.css';

interface AppState {
  locked: boolean;
  passwordCreated: boolean;
  enabled: boolean;
  stats: {
    totalChannels: number;
    totalKeywords: number;
    blockedToday: number;
    enabledCategories: number;
  } | null;
  unlockRemaining: number;
}

let state: AppState = {
  locked: true,
  passwordCreated: false,
  enabled: false,
  stats: null,
  unlockRemaining: 0,
};

// ========================
// Message helpers
// ========================

async function sendMessage(type: string, payload?: any): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, resolve);
  });
}

// ========================
// Extension ID for externally_connectable
// ========================
function getExtensionId(): string {
  return chrome.runtime.id;
}

// ========================
// SVG Icons
// ========================

const ICONS = {
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`,
  unlock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>`,
  stats: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>`,
  pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>`,
  play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`,
};

// ========================
// App Renderer
// ========================

async function init(): Promise<void> {
  // Check password state
  const passwordResp = await sendMessage('PASSWORD_CREATED');
  state.passwordCreated = passwordResp?.data?.created ?? false;

  if (!state.passwordCreated) {
    renderSetup();
    return;
  }

  // Check if temporarily unlocked
  const unlockResp = await sendMessage('CHECK_UNLOCK');
  const unlocked = unlockResp?.data?.unlocked ?? false;
  state.unlockRemaining = unlockResp?.data?.remaining ?? 0;

  if (!unlocked) {
    renderLockScreen();
    return;
  }

  // Load main app
  await loadMainApp();
}

function renderSetup(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="setup-screen fade-in">
      <div class="lock-icon">${ICONS.shield}</div>
      <div class="setup-title">Set Up IsshanTV Guardian</div>
      <div class="setup-subtitle">Create a parent password to protect your settings</div>
      <input type="password" class="setup-input" id="newPassword" placeholder="Create password (min 4 characters)" />
      <input type="password" class="setup-input" id="confirmPassword" placeholder="Confirm password" />
      <div id="setupError" class="lock-error"></div>
      <button class="setup-btn" id="createPasswordBtn">Create Password</button>
    </div>
  `;

  document.getElementById('createPasswordBtn')?.addEventListener('click', handleCreatePassword);
  document.getElementById('newPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCreatePassword();
  });
}

async function handleCreatePassword(): Promise<void> {
  const newPw = (document.getElementById('newPassword') as HTMLInputElement)?.value;
  const confirmPw = (document.getElementById('confirmPassword') as HTMLInputElement)?.value;
  const errorEl = document.getElementById('setupError');

  if (!newPw || newPw.length < 4) {
    if (errorEl) errorEl.textContent = 'Password must be at least 4 characters';
    return;
  }

  if (newPw !== confirmPw) {
    if (errorEl) errorEl.textContent = 'Passwords do not match';
    return;
  }

  const resp = await sendMessage('SET_PASSWORD', { password: newPw });
  if (resp?.success) {
    state.passwordCreated = true;
    // Auto-unlock after password creation
    await sendMessage('TEMPORARY_UNLOCK', {
      password: newPw,
      duration: 60 * 60 * 1000,
    });
    await loadMainApp();
  } else {
    if (errorEl) errorEl.textContent = resp?.error || 'Failed to create password';
  }
}

function renderLockScreen(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="lock-screen fade-in">
      <div class="lock-icon">${ICONS.lock}</div>
      <div class="lock-title">IsshanTV Guardian</div>
      <div class="lock-subtitle">Enter your parent password to access settings</div>
      <input type="password" class="lock-input" id="passwordInput" placeholder="Enter password" />
      <div id="lockError" class="lock-error"></div>
      <button class="lock-btn" id="unlockBtn">Unlock</button>
    </div>
  `;

  document.getElementById('unlockBtn')?.addEventListener('click', handleUnlock);
  document.getElementById('passwordInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlock();
  });

  // Focus the password input
  setTimeout(() => {
    (document.getElementById('passwordInput') as HTMLInputElement)?.focus();
  }, 100);
}

async function handleUnlock(): Promise<void> {
  const password = (document.getElementById('passwordInput') as HTMLInputElement)?.value;
  const errorEl = document.getElementById('lockError');

  if (!password) {
    if (errorEl) errorEl.textContent = 'Please enter your password';
    return;
  }

  const resp = await sendMessage('VERIFY_PASSWORD', { password });
  if (resp?.success) {
    // Temporary unlock for 10 minutes
    const unlockResp = await sendMessage('TEMPORARY_UNLOCK', {
      password,
      duration: 10 * 60 * 1000,
    });
    if (unlockResp?.success) {
      await loadMainApp();
    } else {
      if (errorEl) errorEl.textContent = unlockResp?.error || 'Failed to unlock';
    }
  } else {
    if (errorEl) errorEl.textContent = 'Incorrect password';
  }
}

async function loadMainApp(): Promise<void> {
  // Get settings and stats
  const [settingsResp, statsResp] = await Promise.all([
    sendMessage('GET_SETTINGS'),
    sendMessage('GET_STATS'),
  ]);

  state.enabled = settingsResp?.data?.general?.enabled ?? false;
  state.stats = statsResp?.data ?? null;

  renderMainApp();
}

function renderMainApp(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const stats = state.stats;
  const remaining = state.unlockRemaining;

  app.innerHTML = `
    <div class="fade-in">
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <div class="header-icon">${ICONS.shield}</div>
          <div>
            <div class="header-title">IsshanTV Guardian</div>
            <div class="header-subtitle">${getRemainingTime(remaining)}</div>
          </div>
        </div>
        <button class="btn-icon" id="lockBtn" title="Lock now">${ICONS.lock}</button>
      </div>

      <!-- Status -->
      <div class="status-card">
        <div class="status-row">
          <span class="status-label">Protection</span>
          <label class="toggle">
            <input type="checkbox" id="toggleProtection" ${state.enabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="status-row">
          <span class="status-label">YouTube Pages</span>
          <span class="status-value active">● Active</span>
        </div>
        <div class="status-row">
          <span class="status-label">Blocking mode</span>
          <span class="status-value">${getBlockingMode()}</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">${stats?.blockedToday ?? '—'}</div>
          <div class="stat-label">Blocked Today</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${stats?.totalChannels ?? '—'}</div>
          <div class="stat-label">Channels</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${stats?.totalKeywords ?? '—'}</div>
          <div class="stat-label">Keywords</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${stats?.enabledCategories ?? '—'}</div>
          <div class="stat-label">Categories</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="action-btn" id="openSettingsBtn">
          ${ICONS.settings}
          <span class="action-btn-label">Settings</span>
        </button>
        <button class="action-btn" id="unlockTimeBtn">
          ${ICONS.unlock}
          <span class="action-btn-label">Extend Time</span>
        </button>
      </div>

      <!-- Dashboard Card -->
      <div class="dashboard-card" id="dashboardCard">
        <div class="dashboard-card-header">
          <span class="dashboard-card-title">🌐 Remote Control Dashboard</span>
          <span class="dashboard-status-badge" id="dashboardStatusBadge">📡 Self-Hosted</span>
        </div>
        <div class="dashboard-info">
          <div class="dashboard-id-box">
            <span class="dashboard-id-label">Extension ID:</span>
            <code class="dashboard-id-value" id="extensionIdDisplay">loading...</code>
            <button class="btn btn-sm btn-secondary" id="copyIdBtn" title="Copy Extension ID">📋 Copy</button>
          </div>
          <div class="dashboard-steps">
            <div class="dashboard-step">
              <span class="dashboard-step-num">1</span>
              <span>Run <code>start-server.bat</code> from extension folder</span>
            </div>
            <div class="dashboard-step">
              <span class="dashboard-step-num">2</span>
              <span>Enter Extension ID when prompted (once)</span>
            </div>
            <div class="dashboard-step">
              <span class="dashboard-step-num">3</span>
              <span>Open <code>http://YOUR_IP:8080</code> from any device (run <code>ipconfig</code> to find your IP)</span>
            </div>
          </div>
        </div>
        
        <!-- Autostart Section -->
        <div class="autostart-section">
          <div class="autostart-header">
            <span class="autostart-icon">🔄</span>
            <span class="autostart-title">Auto-Start on Login</span>
          </div>
          <div class="autostart-info">
            <div class="autostart-status-text">
              Make the server start automatically every time Windows starts.
              Run this once and you'll never have to think about it again.
            </div>
            <div class="autostart-actions">
              <button class="btn btn-sm btn-primary" id="copyAutostartCmdBtn">📋 Copy Install Command</button>
            </div>
          </div>
        </div>
        
        <div class="dashboard-actions" id="dashboardActions">
          <button class="btn btn-sm btn-primary" id="openDashboardBtn">🚀 Open Dashboard</button>
          <button class="btn btn-sm btn-secondary" id="copyFullIdBtn">📋 Copy Full Setup</button>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <a href="#" class="footer-link" id="openOptionsLink">Open Full Dashboard →</a>
      </div>
    </div>
  `;

  // Bind events
  document.getElementById('toggleProtection')?.addEventListener('change', handleToggleProtection);
  document.getElementById('lockBtn')?.addEventListener('click', handleLock);
  document.getElementById('openSettingsBtn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
  document.getElementById('openOptionsLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('unlockTimeBtn')?.addEventListener('click', handleExtendUnlock);
  document.getElementById('openDashboardBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8080' });
  });
  document.getElementById('copyIdBtn')?.addEventListener('click', copyExtensionId);
  document.getElementById('copyFullIdBtn')?.addEventListener('click', copyFullSetup);
  document.getElementById('copyAutostartCmdBtn')?.addEventListener('click', copyAutostartCommand);

  // Show extension ID
  showExtensionId();
}

function getRemainingTime(ms: number): string {
  if (ms <= 0) return 'Session expired';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min remaining`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m remaining`;
}

function getBlockingMode(): string {
  return 'Active';
}

async function handleToggleProtection(): Promise<void> {
  const enabled = (document.getElementById('toggleProtection') as HTMLInputElement)?.checked ?? false;
  state.enabled = enabled;
  await sendMessage('UPDATE_SETTINGS', { general: { enabled } });
}

async function handleLock(): Promise<void> {
  await sendMessage('LOCK');
  state.locked = true;
  renderLockScreen();
}

async function handleExtendUnlock(): Promise<void> {
  const duration = 30 * 60 * 1000; // 30 minutes
  const password = prompt('Enter your password to extend unlock time:');
  if (!password) return;

  const resp = await sendMessage('TEMPORARY_UNLOCK', { password, duration });
  if (resp?.success) {
    state.unlockRemaining = duration;
    const subtitle = document.querySelector('.header-subtitle');
    if (subtitle) subtitle.textContent = getRemainingTime(duration);
  } else {
    alert('Incorrect password');
  }
}

// ========================
// Dashboard Card
// ========================

function showExtensionId(): void {
  const el = document.getElementById('extensionIdDisplay');
  if (el) {
    el.textContent = getExtensionId();
  }
}

async function copyExtensionId(): Promise<void> {
  const id = getExtensionId();
  try {
    await navigator.clipboard.writeText(id);
    const btn = document.getElementById('copyIdBtn');
    if (btn) {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
    }
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = id;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

async function copyFullSetup(): Promise<void> {
  const id = getExtensionId();
  const text = `IsshanTV Guardian Remote Setup

1. Run: start-server.bat (from extension folder)
2. When prompted, enter Extension ID: ${id}
3. Find your computer's IP with: ipconfig
4. Open http://YOUR_IP:8080 from any device on your network

Extension ID: ${id}`;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyFullIdBtn');
    if (btn) {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Full Setup'; }, 2000);
    }
  } catch {
    alert(text);
  }
}

// ========================
// Autostart
// ========================

async function copyAutostartCommand(): Promise<void> {
  const text = `How to install autostart for IsshanTV Guardian:

1. Open the extension folder on your computer
   (the 'dist' folder you loaded in chrome://extensions)
2. Go into the 'scripts' subfolder
3. Double-click: install-autostart.bat
4. Done! The server will start automatically every login.`;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyAutostartCmdBtn');
    if (btn) {
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Install Command'; }, 3000);
    }
  } catch {
    alert(text);
  }
}

// Initialize
init();
