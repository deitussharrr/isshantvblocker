/**
 * Options page - Main React dashboard for IsshanTV Guardian.
 * Full settings panel with navigation, categories, blocklist management,
 * import/export, logging, and statistics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider, useToast } from './components/Toast';
import './options.css';

// ========================
// SVG Icons
// ========================

const Icons = {
  shield: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  categories: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/><path d="M4 19v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 19v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/></svg>,
  channels: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  keywords: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  import: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  export: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  logs: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  password: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  search: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  trash: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  plus: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  download: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  clock: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ========================
// Types
// ========================

type NavPage = 'dashboard' | 'categories' | 'channels' | 'keywords' | 'import-export' | 'logs' | 'settings' | 'password';

interface BlocklistData {
  channels: any[];
  keywords: any[];
  videos: any[];
  playlists: any[];
  regex: any[];
  allowlist: any[];
}

interface StatsData {
  totalChannels: number;
  totalKeywords: number;
  totalVideos: number;
  totalRegex: number;
  totalLogs: number;
  blockedToday: number;
  enabledCategories: number;
}

// ========================
// Message Helper
// ========================

async function sendMessage(type: string, payload?: any): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, resolve);
  });
}

// ========================
// Main App Component
// ========================

function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockRemaining, setUnlockRemaining] = useState(0);
  const [passwordCreated, setPasswordCreated] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const pwResp = await sendMessage('PASSWORD_CREATED');
      setPasswordCreated(pwResp?.data?.created ?? false);

      if (!pwResp?.data?.created) {
        setLoading(false);
        return;
      }

      const unlockResp = await sendMessage('CHECK_UNLOCK');
      const u = unlockResp?.data?.unlocked ?? false;
      setUnlocked(u);
      setUnlockRemaining(unlockResp?.data?.remaining ?? 0);

      if (u) {
        setPasswordVerified(true);
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  function handlePasswordVerified() {
    setPasswordVerified(true);
    setUnlocked(true);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading IsshanTV Guardian...</p>
      </div>
    );
  }

  if (!passwordCreated) {
    return <SetupPassword onComplete={handlePasswordVerified} />;
  }

  if (!passwordVerified) {
    return <UnlockScreen onVerified={handlePasswordVerified} />;
  }

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} unlockRemaining={unlockRemaining} />
      <main className="main-content">
        {unlockRemaining > 0 && (
          <UnlockBanner remaining={unlockRemaining} onLock={() => { setPasswordVerified(false); setUnlocked(false); }} />
        )}
        <PageContent currentPage={currentPage} />
      </main>
    </div>
  );
}

// ========================
// Setup Password
// ========================

function SetupPassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();

  async function handleSubmit() {
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    const resp = await sendMessage('SET_PASSWORD', { password });
    if (resp?.success) {
      addToast('success', 'Password created successfully');
      onComplete();
    } else {
      setError(resp?.error || 'Failed to create password');
    }
  }

  return (
    <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-light)', borderRadius: 16 }}>
            {Icons.shield}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>IsshanTV Guardian</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Create a parent password to protect your settings</p>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 4 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" className="form-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleSubmit}>Create Password</button>
        </div>
      </div>
    </div>
  );
}

// ========================
// Unlock Screen
// ========================

function UnlockScreen({ onVerified }: { onVerified: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();

  async function handleUnlock() {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    const verifyResp = await sendMessage('VERIFY_PASSWORD', { password });
    if (!verifyResp?.success) {
      setError('Incorrect password');
      return;
    }

    const unlockResp = await sendMessage('TEMPORARY_UNLOCK', { password, duration: 60 * 60 * 1000 });
    if (unlockResp?.success) {
      addToast('success', 'Unlocked for 1 hour');
      onVerified();
    } else {
      setError(unlockResp?.error || 'Failed to unlock');
    }
  }

  return (
    <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: 360, width: '100%', padding: 40, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 16px', opacity: 0.5 }}>
          {Icons.shield}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Enter Password</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>This dashboard is password-protected</p>
        <input type="password" className="form-input" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Parent password" onKeyDown={e => e.key === 'Enter' && handleUnlock()} />
        {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 16 }} onClick={handleUnlock}>Unlock</button>
      </div>
    </div>
  );
}

// ========================
// Unlock Banner
// ========================

function UnlockBanner({ remaining, onLock }: { remaining: number; onLock: () => void }) {
  const mins = Math.floor(remaining / 60000);
  const hours = Math.floor(mins / 60);

  return (
    <div className="unlock-timer" style={{ margin: '16px 40px 0' }}>
      {Icons.clock}
      <span>Unlocked — {hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`} remaining</span>
      <button onClick={onLock}>Lock now</button>
    </div>
  );
}

// ========================
// Sidebar
// ========================

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  unlockRemaining: number;
}

const navItems: Array<{ page: NavPage; label: string; icon: JSX.Element; badge?: string }> = [
  { page: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { page: 'categories', label: 'Categories', icon: Icons.categories },
  { page: 'channels', label: 'Channels', icon: Icons.channels },
  { page: 'keywords', label: 'Keywords', icon: Icons.keywords },
  { page: 'import-export', label: 'Import / Export', icon: Icons.import },
  { page: 'logs', label: 'Activity Log', icon: Icons.logs },
  { page: 'password', label: 'Password', icon: Icons.password },
  { page: 'settings', label: 'Settings', icon: Icons.settings },
];

function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">{Icons.shield}</div>
        <div className="sidebar-brand-text">
          <h1>IsshanTV Guardian</h1>
          <span>Parental Control</span>
        </div>
      </div>

      <div className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.page}
            className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
            onClick={() => onNavigate(item.page)}
          >
            {item.icon}
            {item.label}
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={() => sendMessage('LOCK').then(() => window.location.reload())}>
          {Icons.x}
          Lock & Exit
        </button>
      </div>
    </nav>
  );
}

// ========================
// Page Content Router
// ========================

function PageContent({ currentPage }: { currentPage: NavPage }) {
  switch (currentPage) {
    case 'dashboard': return <DashboardPage />;
    case 'categories': return <CategoriesPage />;
    case 'channels': return <BlocklistPage type="channels" />;
    case 'keywords': return <BlocklistPage type="keywords" />;
    case 'import-export': return <ImportExportPage />;
    case 'logs': return <LogsPage />;
    case 'password': return <PasswordPage />;
    case 'settings': return <SettingsPage />;
    default: return <DashboardPage />;
  }
}

// ========================
// Dashboard Page
// ========================

function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const resp = await sendMessage('GET_STATS');
    if (resp?.success) setStats(resp.data);
  }

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your IsshanTV Guardian protection</p>
      </div>
      <div className="page-body">
        <div className="stats-grid-large">
          <div className="stat-card">
            <div className="stat-card-icon">{Icons.shield}</div>
            <div className="stat-card-number">{stats?.blockedToday ?? '—'}</div>
            <div className="stat-card-label">Blocked Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">{Icons.channels}</div>
            <div className="stat-card-number">{stats?.totalChannels ?? '—'}</div>
            <div className="stat-card-label">Blocked Channels</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">{Icons.keywords}</div>
            <div className="stat-card-number">{stats?.totalKeywords ?? '—'}</div>
            <div className="stat-card-label">Blocked Keywords</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">{Icons.categories}</div>
            <div className="stat-card-number">{stats?.enabledCategories ?? '—'}</div>
            <div className="stat-card-label">Active Categories</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">{Icons.logs}</div>
            <div className="stat-card-number">{stats?.totalLogs ?? '—'}</div>
            <div className="stat-card-label">Total Log Entries</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">{Icons.settings}</div>
            <div className="stat-card-number">{stats?.totalRegex ?? '—'}</div>
            <div className="stat-card-label">Regex Rules</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Quick Actions</div>
              <div className="card-subtitle">Common tasks to manage your protection</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => chrome.runtime.openOptionsPage()}>
              {Icons.settings} Open Dashboard
            </button>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              await sendMessage('UPDATE_SETTINGS', { general: { enabled: true } });
              window.location.reload();
            }}>
              {Icons.check} Enable Protection
            </button>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              await sendMessage('CLEAR_LOGS');
              window.location.reload();
            }}>
              {Icons.trash} Clear Logs
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ========================
// Categories Page
// ========================

const CATEGORIES = [
  { key: 'nursery', label: 'Nursery Rhymes', desc: 'Cocomelon, Baby Shark, nursery content' },
  { key: 'educational', label: 'Educational', desc: 'Learning content for children' },
  { key: 'kids', label: 'Kids Content', desc: 'Ryan\'s World, Nastya, Diana' },
  { key: 'cartoons', label: 'Cartoons', desc: 'Peppa Pig, Bluey, cartoons' },
  { key: 'toyReviews', label: 'Toy Reviews', desc: 'Toy unboxing and review channels' },
  { key: 'brainrot', label: 'Brainrot', desc: 'General brainrot content' },
  { key: 'italianBrainrot', label: 'Italian Brainrot', desc: 'Bombardino, patapim, ambalabu' },
  { key: 'gaming', label: 'Gaming', desc: 'Video game content' },
  { key: 'music', label: 'Music', desc: 'Music videos and songs' },
  { key: 'shorts', label: 'Shorts', desc: 'YouTube Shorts content' },
  { key: 'familyVlogs', label: 'Family Vlogs', desc: 'Family vlogging channels' },
  { key: 'clickbait', label: 'Clickbait', desc: 'Clickbait titles and thumbnails' },
  { key: 'memeCulture', label: 'Meme Culture', desc: 'Skibidi, sigma, rizz, gyatt' },
  { key: 'aiKidsContent', label: 'AI Kids Content', desc: 'AI-generated children\'s content' },
  { key: 'pretendPlay', label: 'Pretend Play', desc: 'Play-Doh, pretend play videos' },
  { key: 'slime', label: 'Slime', desc: 'Slime challenges and ASMR' },
  { key: 'surpriseEggs', label: 'Surprise Eggs', desc: 'Surprise egg unboxing' },
];

function CategoriesPage() {
  const [categoryStates, setCategoryStates] = useState<Record<string, boolean>>({});
  const { addToast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const resp = await sendMessage('GET_SETTINGS');
    if (resp?.success && resp.data?.categories) {
      const states: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(resp.data.categories)) {
        states[key] = (val as any).enabled;
      }
      setCategoryStates(states);
    }
  }

  async function toggleCategory(key: string) {
    const newState = !categoryStates[key];
    setCategoryStates(prev => ({ ...prev, [key]: newState }));

    await sendMessage('UPDATE_SETTINGS', {
      categories: { [key]: { enabled: newState, action: 'hide' } },
    });

    addToast(newState ? 'success' : 'warning', `${CATEGORIES.find(c => c.key === key)?.label} ${newState ? 'enabled' : 'disabled'}`);
  }

  return (
    <>
      <div className="page-header">
        <h2>Categories</h2>
        <p>Enable or disable entire content categories</p>
      </div>
      <div className="page-body">
        <div className="categories-grid">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className={`category-card ${categoryStates[cat.key] === false ? 'disabled' : ''}`}>
              <div className="category-card-info">
                <h4>{cat.label}</h4>
                <p>{cat.desc}</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={categoryStates[cat.key] !== false}
                  onChange={() => toggleCategory(cat.key)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ========================
// Blocklist Page (Channels / Keywords)
// ========================

function BlocklistPage({ type }: { type: 'channels' | 'keywords' }) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addCategory, setAddCategory] = useState('custom');
  const { addToast } = useToast();

  useEffect(() => {
    loadItems();
  }, [type]);

  async function loadItems() {
    const resp = await sendMessage('GET_BLOCKLISTS');
    if (resp?.success) {
      setItems(resp.data[type] || []);
    }
  }

  const filtered = items.filter(item => {
    const name = item.name || item.keyword || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      (item.id && item.id.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (filter === 'enabled' && !item.enabled) return false;
    if (filter === 'disabled' && item.enabled) return false;
    return true;
  });

  function toggleSelect(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((item: any) => item.id || item.keyword)));
    }
  }

  async function toggleItem(item: any) {
    const key = item.id || item.keyword;
    await sendMessage('TOGGLE_BLOCKLIST_ITEM', { list: type, key, field: 'enabled' });
    await loadItems();
  }

  async function deleteSelected() {
    for (const key of selected) {
      await sendMessage('REMOVE_BLOCKLIST_ITEM', { list: type, key });
    }
    setSelected(new Set());
    await loadItems();
    addToast('success', `Removed ${selected.size} items`);
  }

  async function addItem() {
    if (!addValue.trim()) return;

    const key = type === 'channels' ? 'id' : 'keyword';
    const item = {
      [key]: addValue.trim(),
      name: addValue.trim(),
      category: type === 'keywords' ? addCategory : 'custom',
      enabled: true,
      builtin: false,
    };

    await sendMessage('ADD_BLOCKLIST_ITEM', { list: type, item });
    setAddValue('');
    setAddCategory('custom');
    setShowAdd(false);
    await loadItems();
    addToast('success', 'Item added');
  }

  const label = type === 'channels' ? 'Channels' : 'Keywords';
  const caption = type === 'channels'
    ? 'Block entire YouTube channels by their channel ID'
    : 'Block videos containing specific keywords in their title or description';

  return (
    <>
      <div className="page-header">
        <h2>{label}</h2>
        <p>{caption}</p>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
            {Icons.search}
            <input placeholder={`Search ${label.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>{Icons.plus} Add</button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">{type === 'channels' ? 'Channel ID or Name' : 'Keyword'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={addValue} onChange={e => setAddValue(e.target.value)} placeholder={type === 'channels' ? 'UC...' : 'Enter keyword'} onKeyDown={e => e.key === 'Enter' && addItem()} style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={addItem}>Add</button>
                <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setAddValue(''); }}>Cancel</button>
              </div>
            </div>
            {type === 'keywords' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category</label>
                <select className="form-select" value={addCategory} onChange={e => setAddCategory(e.target.value)}>
                  <option value="nursery">Nursery Rhymes</option>
                  <option value="educational">Educational</option>
                  <option value="kids">Kids Content</option>
                  <option value="cartoons">Cartoons</option>
                  <option value="toyReviews">Toy Reviews</option>
                  <option value="brainrot">Brainrot</option>
                  <option value="italianBrainrot">Italian Brainrot</option>
                  <option value="gaming">Gaming</option>
                  <option value="music">Music</option>
                  <option value="shorts">Shorts</option>
                  <option value="familyVlogs">Family Vlogs</option>
                  <option value="clickbait">Clickbait</option>
                  <option value="memeCulture">Meme Culture</option>
                  <option value="aiKidsContent">AI Kids Content</option>
                  <option value="pretendPlay">Pretend Play</option>
                  <option value="slime">Slime</option>
                  <option value="surpriseEggs">Surprise Eggs</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div className="filter-bar">
          <span className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({items.length})</span>
          <span className={`filter-chip ${filter === 'enabled' ? 'active' : ''}`} onClick={() => setFilter('enabled')}>Enabled</span>
          <span className={`filter-chip ${filter === 'disabled' ? 'active' : ''}`} onClick={() => setFilter('disabled')}>Disabled</span>
          {items.length > 0 && (
            <span className="filter-chip" onClick={selectAll}>
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
            </span>
          )}
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar">
            <span>{selected.size} selected</span>
            <button className="btn btn-danger btn-sm" onClick={deleteSelected}>{Icons.trash} Delete</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }}>
              {type === 'channels' ? Icons.channels : Icons.keywords}
            </div>
            <h3>No {label.toLowerCase()} found</h3>
            <p>{search ? 'Try a different search term' : `Add ${label.toLowerCase()} to start blocking`}</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="list-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" onChange={selectAll} checked={selected.size === filtered.length && filtered.length > 0} style={{ accentColor: 'var(--accent)' }} />
                  </th>
                  <th>Name</th>
                  {type === 'channels' && <th>ID</th>}
                  <th>Category</th>
                  <th style={{ width: 80 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => {
                  const key = item.id || item.keyword;
                  return (
                    <tr key={key}>
                      <td>
                        <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(key)} style={{ accentColor: 'var(--accent)' }} />
                      </td>
                      <td>{item.name || item.keyword}</td>
                      {type === 'channels' && <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{item.id}</td>}
                      <td><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.category}</span></td>
                      <td>
                        <label className="toggle">
                          <input type="checkbox" checked={item.enabled} onChange={() => toggleItem(item)} />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ========================
// Import / Export Page
// ========================

function ImportExportPage() {
  const { addToast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  async function handleExportJSON() {
    const resp = await sendMessage('EXPORT_DATA');
    if (resp?.success) {
      const json = JSON.stringify(resp.data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guardian-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Data exported successfully');
    }
  }

  async function handleExportCSV() {
    const resp = await sendMessage('EXPORT_DATA');
    if (resp?.success) {
      const data = resp.data;
      const channels = data.channels?.map((c: any) => `channel,${c.id},${c.name},${c.category}`).join('\n') || '';
      const keywords = data.keywords?.map((k: any) => `keyword,${k.keyword},,${k.category}`).join('\n') || '';
      const csv = `type,value,label,category\n${channels}\n${keywords}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guardian-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'CSV exported successfully');
    }
  }

  async function handleFileImport(file: File) {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      addToast('error', 'Invalid JSON file');
      return;
    }

    const resp = await sendMessage('IMPORT_DATA', data);
    if (resp?.success) {
      const result = resp.data;
      setImportResult(result);
      addToast('success', `Imported: ${result.imported?.channels || 0} channels, ${result.imported?.keywords || 0} keywords`);
    } else {
      addToast('error', 'Import failed: ' + (resp?.error || 'Unknown error'));
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileImport(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileImport(file);
  }

  return (
    <>
      <div className="page-header">
        <h2>Import / Export</h2>
        <p>Backup, restore, and transfer your blocklist data</p>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Export Data</div>
              <div className="card-subtitle">Download your blocklists and settings</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleExportJSON}>
              {Icons.download} Export JSON
            </button>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              {Icons.download} Export CSV
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Import Data</div>
              <div className="card-subtitle">Restore from a backup file</div>
            </div>
          </div>
          <div
            className={`import-zone ${dragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="import-zone-icon">{Icons.upload}</div>
            <h3>Drop your file here</h3>
            <p>or click to select a file</p>
            <div className="import-formats">
              <span className="format-badge">JSON</span>
              <span className="format-badge">CSV</span>
              <span className="format-badge">TXT</span>
            </div>
            <input type="file" id="fileInput" accept=".json,.csv,.txt" style={{ display: 'none' }} onChange={handleFileSelect} />
          </div>
        </div>

        {importResult && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Import Result</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="stat-item" style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div className="stat-number" style={{ fontSize: 18, color: 'var(--success)' }}>{importResult.imported?.channels || 0}</div>
                <div className="stat-label">Channels</div>
              </div>
              <div className="stat-item" style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div className="stat-number" style={{ fontSize: 18, color: 'var(--success)' }}>{importResult.imported?.keywords || 0}</div>
                <div className="stat-label">Keywords</div>
              </div>
            </div>
            {importResult.errors?.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--danger-light)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: 13 }}>
                {importResult.errors.map((err: string, i: number) => <div key={i}>{err}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ========================
// Logs Page
// ========================

function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const resp = await sendMessage('GET_LOGS');
    if (resp?.success) setLogs(resp.data || []);
  }

  async function handleClear() {
    await sendMessage('CLEAR_LOGS');
    setLogs([]);
    addToast('success', 'Logs cleared');
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Activity Log</h2>
            <p>Record of all blocked content</p>
          </div>
          {logs.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleClear}>{Icons.trash} Clear Logs</button>
          )}
        </div>
      </div>
      <div className="page-body">
        {logs.length === 0 ? (
          <div className="empty-state">
            <div style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }}>{Icons.logs}</div>
            <h3>No activity yet</h3>
            <p>Blocked content will appear here</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '0 16px' }}>
              {logs.map((log: any, i: number) => {
                const date = new Date(log.timestamp);
                const timeStr = date.toLocaleTimeString();
                const catClass = log.category || 'default';
                return (
                  <div key={i} className="log-entry">
                    <span className="log-time">{timeStr}</span>
                    <div className="log-content">
                      <div className="log-title">{log.videoTitle || 'Unknown video'}</div>
                      <div className="log-reason">{log.reason}</div>
                    </div>
                    <span className={`log-category ${catClass}`}>{catClass}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ========================
// Password Page
// ========================

function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();

  async function handleChange() {
    if (!currentPassword) { setError('Enter your current password'); return; }
    if (newPassword.length < 4) { setError('New password must be at least 4 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    const resp = await sendMessage('CHANGE_PASSWORD', { oldPassword: currentPassword, newPassword });
    if (resp?.success) {
      addToast('success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    } else {
      setError(resp?.error || 'Failed to change password');
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Password</h2>
        <p>Change your parent password</p>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 400 }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 4 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-primary" onClick={handleChange}>Change Password</button>
        </div>
      </div>
    </>
  );
}

// ========================
// Settings Page
// ========================

function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const resp = await sendMessage('GET_SETTINGS');
    if (resp?.success) setSettings(resp.data);
  }

  async function updateSetting(path: string, value: any) {
    // Build nested update object
    const parts = path.split('.');
    const update: any = {};
    let current = update;
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    await sendMessage('UPDATE_SETTINGS', update);
    await loadSettings();
    addToast('success', 'Setting updated');
  }

  if (!settings) return null;

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
        <p>General extension configuration</p>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">General</div>
              <div className="card-subtitle">Core extension behavior</div>
            </div>
          </div>

          <div className="form-row">
            <div>
              <div className="form-row-label">Enable Protection</div>
              <div className="form-row-desc">Globally enable or disable content blocking</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={settings.general?.enabled ?? true} onChange={e => updateSetting('general.enabled', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-row">
            <div>
              <div className="form-row-label">Block Shorts</div>
              <div className="form-row-desc">Remove YouTube Shorts from all surfaces</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={settings.general?.blockShorts ?? true} onChange={e => updateSetting('general.blockShorts', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-row">
            <div>
              <div className="form-row-label">Enable Logging</div>
              <div className="form-row-desc">Record blocked content for review</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={settings.general?.enableLogging ?? false} onChange={e => updateSetting('general.enableLogging', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-row">
            <div>
              <div className="form-row-label">Show Warning Screen</div>
              <div className="form-row-desc">Display a warning message for blocked content</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={settings.general?.showWarning ?? true} onChange={e => updateSetting('general.showWarning', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Default Blocking Action</label>
            <select className="form-select" value={settings.general?.blockingAction ?? 'hide'} onChange={e => updateSetting('general.blockingAction', e.target.value)}>
              <option value="hide">Hide (Completely remove)</option>
              <option value="blur">Blur (Obscure content)</option>
              <option value="replace">Replace (Show warning)</option>
              <option value="redirect">Redirect (Go to homepage)</option>
              <option value="warning">Warning (Overlay message)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Log Retention (days)</label>
            <input type="number" className="form-input" value={settings.general?.logRetentionDays ?? 30} min={1} max={365} onChange={e => updateSetting('general.logRetentionDays', parseInt(e.target.value))} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">UI Preferences</div>
              <div className="card-subtitle">Extension interface settings</div>
            </div>
          </div>

          <div className="form-row">
            <div>
              <div className="form-row-label">Show Statistics</div>
              <div className="form-row-desc">Display blocking statistics on the dashboard</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={settings.ui?.showStats ?? true} onChange={e => updateSetting('ui.showStats', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="form-row">
            <div>
              <div className="form-row-label">Compact Mode</div>
              <div className="form-row-desc">Use a more compact layout</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={settings.ui?.compactMode ?? false} onChange={e => updateSetting('ui.compactMode', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

// ========================
// Mount
// ========================

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
