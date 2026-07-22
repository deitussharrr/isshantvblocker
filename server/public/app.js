/**
 * IsshanTV Guardian - Remote Control Web UI
 * Full dashboard application for managing the extension over the network.
 */

'use strict';

// ========================
// API Client
// ========================

const API = {
  baseUrl: window.location.origin,
  password: '',

  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.password) {
      headers['Authorization'] = `Bearer ${this.password}`;
    }

    const res = await fetch(this.baseUrl + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return res.json();
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },
};

// ========================
// State
// ========================

const state = {
  unlocked: false,
  settings: null,
  extensionsConnected: true,
  passwordCreated: false,
};

// ========================
// DOM Helpers
// ========================

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function show(id) { $(id)?.classList.remove('hidden'); }
function hide(id) { $(id)?.classList.add('hidden'); }
function toggle(id, cond) { cond ? show(id) : hide(id); }

// ========================
// Toast Notifications
// ========================

function showToast(message, type = 'success') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ========================
// Modal
// ========================

function openModal(title, bodyHTML, footerHTML = '') {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = bodyHTML;
  $('modal-footer').innerHTML = footerHTML;
  show('modal-overlay');
}

function closeModal() {
  hide('modal-overlay');
}

// ========================
// Navigation
// ========================

function navigateTab(tabId) {
  $$('.tab').forEach(t => t.classList.remove('active'));
  $$('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabId}"]`)?.classList.add('active');
  $(tabId)?.classList.add('active');
}

// Tab click handlers
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    navigateTab(tab.dataset.tab);
  });
});

// ========================
// Login/Auth
// ========================

async function checkAuth() {
  try {
    // Check if password exists
    const pwResponse = await API.get('/api/password/created');
    state.passwordCreated = pwResponse.data?.created || false;

    if (!state.passwordCreated) {
      // No password set - show create form
      hide('login-password-form');
      show('login-create-form');
      return false;
    }

    // Check if already unlocked
    const unlockResponse = await API.get('/api/unlock/status');
    if (unlockResponse.data?.unlocked) {
      state.unlocked = true;
      return true;
    }

    // Need password
    hide('login-create-form');
    show('login-password-form');
    return false;
  } catch (err) {
    hide('login-create-form');
    show('login-password-form');
    return false;
  }
}

// Login button
$('login-btn')?.addEventListener('click', async () => {
  const pw = $('login-password').value;
  if (!pw) return;

  const response = await API.post('/api/password/verify', { password: pw });
  if (response.success) {
    // Auto-unlock for 1 hour
    const unlockResponse = await API.post('/api/unlock', { password: pw, duration: 3600000 });
    if (unlockResponse.success) {
      API.password = pw;
      state.unlocked = true;
      enterDashboard();
    }
  } else {
    $('login-error').textContent = '❌ Incorrect password';
    $('login-error').classList.remove('hidden');
    $('login-password').value = '';
  }
});

// Create password button
$('create-password-btn')?.addEventListener('click', async () => {
  const pw = $('create-password').value;
  const confirm = $('create-password-confirm').value;

  if (!pw) { showToast('Please enter a password', 'error'); return; }
  if (pw.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }
  if (pw !== confirm) { showToast('Passwords do not match', 'error'); return; }

  const response = await API.post('/api/password/create', { password: pw });
  if (response.success) {
    API.password = pw;
    state.unlocked = true;
    enterDashboard();
  } else {
    showToast(response.error || 'Failed to create password', 'error');
  }
});

// Lock button
$('lock-btn')?.addEventListener('click', async () => {
  await API.post('/api/lock');
  state.unlocked = false;
  showToast('🔒 Locked', 'info');
  show('login-screen');
  hide('dashboard');
  $('login-password').value = '';
});

// Allow Enter key on password inputs
$('login-password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('login-btn')?.click();
});
$('create-password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('create-password-btn')?.click();
});
$('create-password-confirm')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('create-password-btn')?.click();
});

// ========================
// Dashboard Enter/Exit
// ========================

function enterDashboard() {
  hide('login-screen');
  show('dashboard');
  showToast('🔓 Unlocked', 'success');
  loadDashboard();
}

// ========================
// Dashboard Loading
// ========================

async function loadDashboard() {
  await Promise.all([
    loadStats(),
    loadServerInfo(),
    loadSettings(),
    loadBlocklist(),
    loadLogs(),
    loadMediaStatus(),
  ]);
  hide('login-screen');
  show('dashboard');
}

// ========================
// Stats
// ========================

async function loadStats() {
  try {
    const response = await API.get('/api/stats');
    if (response.success && response.data) {
      $('stat-channels').textContent = response.data.totalChannels || 0;
      $('stat-keywords').textContent = response.data.totalKeywords || 0;
      $('stat-blocked-today').textContent = response.data.blockedToday || 0;
      $('stat-regex').textContent = response.data.totalRegex || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// ========================
// Server Info
// ========================

async function loadServerInfo() {
  try {
    const response = await API.get('/api/status');
    if (response.server) {
      $('server-status').textContent = 'Running';
      const uptime = Math.floor(response.uptime || 0);
      const hours = Math.floor(uptime / 3600);
      const mins = Math.floor((uptime % 3600) / 60);
      $('server-uptime').textContent = `${hours}h ${mins}m`;
      $('extension-status').textContent = response.extensionConnected ? 'Connected ✅' : 'Disconnected ❌';
    }
  } catch (err) {
    $('connection-status').textContent = 'Disconnected';
    $('connection-status').className = 'connection-badge disconnected';
  }
}

// ========================
// Settings
// ========================

let settingsCache = null;

async function loadSettings() {
  try {
    const response = await API.get('/api/settings');
    if (response.success && response.data) {
      settingsCache = response.data;
      applySettingsToUI(response.data);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function applySettingsToUI(settings) {
  // General settings
  const general = settings.general || {};
  setToggle('setting-enabled', general.enabled);
  setSelect('setting-blocking-action', general.blockingAction || 'hide');
  setToggle('setting-show-warning', general.showWarning);
  setToggle('setting-block-shorts', general.blockShorts);
  setToggle('setting-enable-logging', general.enableLogging);
  setToggle('setting-network-block', general.blockAllTraffic || false);

  // Update network block status UI
  const nbStatus = $('network-block-status');
  if (nbStatus) {
    if (general.blockAllTraffic) {
      nbStatus.innerHTML = '🔴 <strong>Network is BLOCKED.</strong> Only the web server (192.168.1.15) is accessible.';
      nbStatus.style.color = '#ef4444';
    } else {
      nbStatus.innerHTML = '🟢 Network is unrestricted. Toggle above to block all traffic.';
      nbStatus.style.color = '#22c55e';
    }
  }

  // Categories
  renderCategories(settings.categories || {});
}

function setToggle(id, value) {
  const el = $(id);
  if (el) el.checked = !!value;
}

function setSelect(id, value) {
  const el = $(id);
  if (el) el.value = value || 'hide';
}

function renderCategories(categories) {
  const container = $('categories-container');
  if (!container) return;

  const categoryNames = {
    nursery: 'Nursery Rhymes', educational: 'Educational', kids: 'Kids Content',
    cartoons: 'Cartoons', toyReviews: 'Toy Reviews', brainrot: 'Brainrot',
    italianBrainrot: 'Italian Brainrot', gaming: 'Gaming', music: 'Music',
    shorts: 'Shorts', familyVlogs: 'Family Vlogs', clickbait: 'Clickbait',
    memeCulture: 'Meme Culture', aiKidsContent: 'AI Kids Content',
    pretendPlay: 'Pretend Play', slime: 'Slime', surpriseEggs: 'Surprise Eggs',
    custom: 'Custom',
  };

  let html = '';
  for (const [key, cat] of Object.entries(categories)) {
    const name = categoryNames[key] || key;
    html += `
      <div class="category-row">
        <span class="category-name">${name}</span>
        <label class="toggle">
          <input type="checkbox" class="category-toggle" data-category="${key}" ${cat.enabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  }
  container.innerHTML = html;

  // Add change listeners to category toggles
  container.querySelectorAll('.category-toggle').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const category = toggle.dataset.category;
      const enabled = toggle.checked;
      if (settingsCache?.categories?.[category]) {
        settingsCache.categories[category].enabled = enabled;
        await saveSettings();
      }
    });
  });
}

// Settings change handlers
document.querySelectorAll('[data-key]').forEach(el => {
  el.addEventListener('change', async () => {
    if (!settingsCache) return;
    const key = el.dataset.key;
    const keys = key.split('.');
    let obj = settingsCache;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    const lastKey = keys[keys.length - 1];

    if (el.type === 'checkbox') {
      obj[lastKey] = el.checked;
    } else {
      obj[lastKey] = el.value;
    }

    await saveSettings();
  });
});

async function saveSettings() {
  if (!settingsCache) return;
  try {
    const response = await API.post('/api/settings', settingsCache);
    if (response.success) {
      showToast('Settings saved ✅', 'success');
    } else {
      showToast('Failed to save settings', 'error');
    }
  } catch (err) {
    showToast('Failed to save settings', 'error');
  }
}

// Network Block Toggle (separate from regular settings)
$('setting-network-block')?.addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  const statusEl = $('network-block-status');
  
  if (enabled) {
    // Double-check with user before enabling
    if (!confirm('⚠️ WARNING: This will BLOCK ALL internet traffic.\n\nOnly the web server (192.168.1.15) will remain accessible.\nYouTube, Google, email, and all websites will stop working.\n\nAre you sure you want to enable this?')) {
      e.target.checked = false;
      return;
    }
  }
  
  try {
    const response = await API.post('/api/settings', {
      general: { blockAllTraffic: enabled }
    });
    
    if (response.success) {
      if (enabled) {
        statusEl.innerHTML = '🔴 <strong>Network is BLOCKED.</strong> Only the web server is accessible.';
        statusEl.style.color = '#ef4444';
        showToast('🌐 Network BLOCKED - only web server is accessible', 'info');
      } else {
        statusEl.innerHTML = '🟢 Network is unrestricted.';
        statusEl.style.color = '#22c55e';
        showToast('🌐 Network unblocked', 'success');
      }
      // Refresh all data on change
      await Promise.all([loadStats(), loadBlocklist(), loadLogs()]);
    } else {
      showToast('Failed to toggle network block', 'error');
      e.target.checked = !enabled;
    }
  } catch (err) {
    showToast('Failed to toggle network block', 'error');
    e.target.checked = !enabled;
  }
});

// Change password modal
$('change-password-btn')?.addEventListener('click', () => {
  openModal('🔑 Change Password', `
    <div class="setting-row">
      <input type="password" id="modal-old-password" class="input" placeholder="Current password">
    </div>
    <div class="setting-row">
      <input type="password" id="modal-new-password" class="input" placeholder="New password">
    </div>
    <div class="setting-row">
      <input type="password" id="modal-confirm-password" class="input" placeholder="Confirm new password">
    </div>
    <div id="modal-pw-error" class="error hidden"></div>
  `, `
    <button class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="changePassword()">Change Password</button>
  `);
});

async function changePassword() {
  const oldPw = $('modal-old-password')?.value;
  const newPw = $('modal-new-password')?.value;
  const confirm = $('modal-confirm-password')?.value;

  if (!oldPw) { showToast('Enter current password', 'error'); return; }
  if (!newPw) { showToast('Enter new password', 'error'); return; }
  if (newPw.length < 4) { showToast('New password must be at least 4 characters', 'error'); return; }
  if (newPw !== confirm) { showToast('Passwords do not match', 'error'); return; }

  const response = await API.post('/api/password/change', { oldPassword: oldPw, newPassword: newPw });
  if (response.success) {
    API.password = newPw;
    closeModal();
    showToast('Password changed ✅', 'success');
  } else {
    showToast(response.error || 'Failed to change password', 'error');
  }
}

// ========================
// Blocklist Manager
// ========================

let currentList = 'channels';
let blocklistData = {};
let blocklistSearchTerm = '';

// Blocklist tab switching
document.querySelectorAll('.bl-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.bl-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentList = tab.dataset.list;
    renderBlocklist();
  });
});

// Blocklist search
$('blocklist-search')?.addEventListener('input', (e) => {
  blocklistSearchTerm = e.target.value.toLowerCase();
  renderBlocklist();
});

async function loadBlocklist() {
  try {
    const response = await API.get('/api/blocklists');
    if (response.success && response.data) {
      blocklistData = response.data;
      renderBlocklist();
    }
  } catch (err) {
    console.error('Failed to load blocklist:', err);
  }
}

function renderBlocklist() {
  const container = $('blocklist-items');
  if (!container) return;

  const items = blocklistData[currentList];
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-state">No items in this list</div>';
    return;
  }

  const filtered = items.filter(item => {
    if (!blocklistSearchTerm) return true;
    const name = (item.name || item.keyword || item.pattern || item.id || '').toLowerCase();
    return name.includes(blocklistSearchTerm);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No matching items</div>';
    return;
  }

  let html = '';
  for (const item of filtered) {
    const name = item.name || item.keyword || item.pattern || item.id || '(unnamed)';
    const meta = item.category ? `Category: ${item.category}` : item.type ? `Type: ${item.type}` : '';
    const enabled = item.enabled !== false;

    html += `
      <div class="blocklist-item">
        <div class="blocklist-item-info">
          <div class="blocklist-item-name">${escapeHtml(name)}</div>
          <div class="blocklist-item-meta">${meta} ${item.builtin ? '• Built-in' : ''}</div>
        </div>
        <div class="blocklist-item-actions">
          <span class="badge ${enabled ? 'badge-enabled' : 'badge-disabled'}">${enabled ? 'ON' : 'OFF'}</span>
          <button class="btn btn-sm ${enabled ? 'btn-outline' : 'btn-primary'}" onclick="toggleBlocklistItem('${currentList}', '${escapeHtml(item.id || item.keyword || item.pattern)}', ${!enabled})">
            ${enabled ? 'Disable' : 'Enable'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="removeBlocklistItem('${currentList}', '${escapeHtml(item.id || item.keyword || item.pattern)}')">🗑️</button>
        </div>
      </div>`;
  }
  container.innerHTML = html;
}

async function toggleBlocklistItem(list, key, newState) {
  // Optimistic update
  const items = blocklistData[list];
  if (items) {
    const item = items.find(i => (i.id || i.keyword || i.pattern) === key);
    if (item) item.enabled = newState;
  }
  renderBlocklist();

  const response = await API.put(`/api/blocklists/${list}/${encodeURIComponent(key)}/toggle`);
  if (!response.success) {
    showToast('Failed to toggle', 'error');
    loadBlocklist();
  }
}

async function removeBlocklistItem(list, key) {
  if (!confirm(`Remove "${key}" from ${list}?`)) return;

  const response = await API.del(`/api/blocklists/${list}/${encodeURIComponent(key)}`);
  if (response.success) {
    showToast('Removed ✅', 'success');
    loadBlocklist();
  } else {
    showToast('Failed to remove', 'error');
  }
}

// Add blocklist item modal
$('blocklist-add-btn')?.addEventListener('click', () => {
  const listType = currentList;
  const placeholders = {
    channels: 'Channel ID or name',
    keywords: 'Keyword to block',
    regex: 'Regex pattern (e.g., skibidi.*)',
    allowlist: 'Channel ID or video ID',
  };

  openModal(`+ Add to ${listType}`, `
    <div class="mb-2">
      <label class="setting-label">${listType === 'channels' ? 'Channel Name/ID' : listType === 'keywords' ? 'Keyword' : listType === 'regex' ? 'Regex Pattern' : 'Value'}</label>
      <input type="text" id="modal-add-value" class="input" placeholder="${placeholders[listType] || 'Value'}">
    </div>
    ${listType !== 'allowlist' ? `
    <div class="mb-2">
      <label class="setting-label">Category</label>
      <select id="modal-add-category" class="select">
        <option value="custom">Custom</option>
        <option value="nursery">Nursery Rhymes</option>
        <option value="brainrot">Brainrot</option>
        <option value="italianBrainrot">Italian Brainrot</option>
        <option value="kids">Kids Content</option>
        <option value="educational">Educational</option>
        <option value="gaming">Gaming</option>
        <option value="shorts">Shorts</option>
      </select>
    </div>` : ''}
    <div id="modal-add-error" class="error hidden"></div>
  `, `
    <button class="btn btn-outline btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="addBlocklistItem()">Add</button>
  `);

  setTimeout(() => $('modal-add-value')?.focus(), 100);
});

async function addBlocklistItem() {
  const value = $('modal-add-value')?.value?.trim();
  if (!value) { showToast('Enter a value', 'error'); return; }

  const category = $('modal-add-category')?.value || 'custom';
  const item = { enabled: true };

  switch (currentList) {
    case 'channels':
      item.name = value;
      item.id = value;
      item.category = category;
      break;
    case 'keywords':
      item.keyword = value.toLowerCase();
      item.category = category;
      break;
    case 'regex':
      item.pattern = value;
      item.category = category;
      item.flags = 'gi';
      item.description = 'Added from remote control';
      break;
    case 'allowlist':
      item.id = value;
      item.type = 'channel';
      item.enabled = true;
      break;
  }

  const response = await API.post(`/api/blocklists/${currentList}`, item);
  if (response.success) {
    closeModal();
    showToast('Added ✅', 'success');
    loadBlocklist();
  } else {
    showToast(response.error || 'Failed to add', 'error');
  }
}

// Import/Export
$('export-blocklist-btn')?.addEventListener('click', exportData);
$('import-btn')?.addEventListener('click', () => $('import-file-input')?.click());
$('import-file-input')?.addEventListener('change', importData);

async function exportData() {
  try {
    const response = await API.get('/api/export');
    if (response.success && response.data) {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `isshantv-guardian-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported ✅', 'success');
    }
  } catch (err) {
    showToast('Export failed', 'error');
  }
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const response = await API.post('/api/import', data);
    if (response.success) {
      showToast(`Imported ✅ (${response.data?.imported?.channels || 0} channels, ${response.data?.imported?.keywords || 0} keywords)`, 'success');
      loadBlocklist();
      loadStats();
    } else {
      showToast('Import failed', 'error');
    }
  } catch (err) {
    showToast('Invalid file', 'error');
  }
  event.target.value = '';
}

// ========================
// Media Controls
// ========================

async function loadMediaStatus() {
  try {
    const response = await API.get('/api/media/status');
    if (response.success && response.data) {
      renderMediaStatus(response.data);
    }
  } catch (err) {
    // Media status not available yet
  }
}

function renderMediaStatus(data) {
  const hasVideo = data.videoId || data.videoTitle;

  toggle('media-no-video', !hasVideo);
  toggle('media-video-info', !!hasVideo);

  if (hasVideo) {
    $('media-title').textContent = data.videoTitle || 'Unknown';
    $('media-channel').textContent = data.channelName || 'Unknown channel';
    $('media-video-id').textContent = `ID: ${data.videoId || 'N/A'}`;

    const isBlocked = data.blocked;
    const statusEl = $('media-playing-status');
    const blockedStatus = $('media-blocked-status');

    if (isBlocked) {
      statusEl.textContent = 'Blocked';
      statusEl.className = 'badge badge-blocked';
      blockedStatus.textContent = '🚫 Blocked';
      blockedStatus.className = 'badge badge-blocked';
    } else {
      statusEl.textContent = 'Playing';
      statusEl.className = 'badge badge-playing';
      blockedStatus.textContent = 'Playing';
      blockedStatus.className = 'badge badge-playing';
    }
  }
}

// Media control buttons
$('media-refresh-btn')?.addEventListener('click', loadMediaStatus);
$('media-pause-btn')?.addEventListener('click', async () => {
  const r = await API.post('/api/media/pause');
  showToast(r.success ? '⏸️ Paused' : 'Failed to pause', r.success ? 'info' : 'error');
});
$('media-resume-btn')?.addEventListener('click', async () => {
  const r = await API.post('/api/media/resume');
  showToast(r.success ? '▶️ Resumed' : 'Failed to resume', r.success ? 'success' : 'error');
});
$('media-block-btn')?.addEventListener('click', async () => {
  const r = await API.post('/api/media/block');
  showToast(r.success ? '🚫 Blocked' : 'Failed to block', r.success ? 'info' : 'error');
  loadMediaStatus();
});

// ========================
// Logs
// ========================

async function loadLogs() {
  try {
    const response = await API.get('/api/logs');
    if (response.success && response.data) {
      renderLogs(response.data);
    }
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
}

function renderLogs(logs) {
  const container = $('logs-container');
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = '<div class="empty-state">No blocking logs yet</div>';
    return;
  }

  let html = '';
  for (const log of logs.slice(0, 200)) {
    const time = new Date(log.timestamp).toLocaleString();
    html += `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-reason">${escapeHtml(log.reason || 'Blocked')}</span>
          <span class="log-time">${time}</span>
        </div>
        <div class="log-details">
          ${log.videoTitle ? `📺 ${escapeHtml(log.videoTitle)}` : ''}
          ${log.channelName ? ` | 📺 ${escapeHtml(log.channelName)}` : ''}
          ${log.category ? ` | 🏷️ ${log.category}` : ''}
          ${log.page ? ` | 📄 ${log.page}` : ''}
        </div>
      </div>`;
  }
  container.innerHTML = html;
}

$('logs-refresh-btn')?.addEventListener('click', loadLogs);
$('logs-clear-btn')?.addEventListener('click', async () => {
  if (!confirm('Clear all logs?')) return;
  const r = await API.del('/api/logs');
  if (r.success) {
    showToast('Logs cleared ✅', 'success');
    loadLogs();
  }
});

// ========================
// Auto-Refresh
// ========================

// Refresh stats and media every 10 seconds
setInterval(() => {
  if (state.unlocked) {
    loadStats();
    loadMediaStatus();
  }
}, 10000);

// ========================
// Utilities
// ========================

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========================
// Initialize
// ========================

async function init() {
  try {
    const authResult = await checkAuth();
    if (authResult) {
      enterDashboard();
    }
  } catch (err) {
    // Server might not be ready yet - show login
    show('login-screen');
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
