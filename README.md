# IsshanTV Guardian 🛡️

**YouTube Parental Control — Chrome Extension**

Turn YouTube into a fully parent-controlled platform. Everything happens locally. No cloud, no servers, no data ever leaves the device.

---

## Features

### 🔒 Full Content Filtering
- **Channel Blocking** — Block entire YouTube channels by ID
- **Keyword Filtering** — Block videos containing specific keywords in titles/descriptions
- **Video Blocking** — Block specific videos by ID
- **Playlist Blocking** — Block specific playlists
- **Regex Rules** — Advanced pattern-based blocking
- **Category System** — Enable/disable entire content categories (Nursery, Brainrot, Meme Culture, etc.)
- **Allowlist** — Override blocks for approved content

### 📦 Built-in Databases (Ship Ready)
The extension comes pre-loaded with comprehensive blocklists:
- **50+ Channels** — Major nursery rhyme, kids content, and brainrot channels
- **200+ Keywords** — Including nursery rhymes, Italian brainrot, meme culture terms, and more
- **28 Regex Rules** — Catch variants automatically
- **17 Categories** — Toggle entire content types on/off

### 🛡️ Password Protection
- SHA-256 hashed password with random salt
- Password change support
- Temporary unlock with auto-relock (10min, 30min, 1hr, 4hr)
- Never stores plaintext passwords
- Never reversible

### 🎯 Blocking Actions
Choose how blocked content is handled:
- **Hide** — Completely remove from DOM (default)
- **Blur** — Obscure content while keeping layout
- **Replace** — Show a parent warning placeholder
- **Redirect** — Redirect to YouTube homepage
- **Warning** — Show overlay message on video pages

### 📊 Full Dashboard
Password-protected settings panel with:
- Statistics overview
- Category management
- Channel and keyword blocklist management
- Bulk import/export (JSON, CSV, TXT)
- Activity log
- Password management
- General settings

### ⚡ Performance Optimized
- **Trie-based keyword matching** — O(k) lookups for 100,000+ keywords
- **Set-based ID lookups** — O(1) channel/video lookups
- **Debounced MutationObserver** — Efficient DOM scanning
- **RegExp caching** — Compiled regex cache
- **IndexedDB storage** — Scales to 10,000+ channels

### 🎨 Modern UI
- Dark mode by default
- Responsive design
- Accessible (ARIA labels, keyboard navigation)
- Smooth animations and transitions
- Professional parental control feel

---

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/isshantv/guardian.git
cd guardian

# Install dependencies
npm install

# Build the extension
npm run build

# The built extension will be in the dist/ directory
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist/` directory
5. The IsshanTV Guardian icon will appear in your toolbar

### First Launch

1. Click the IsshanTV Guardian icon in the toolbar
2. Create a parent password (minimum 4 characters)
3. The built-in blocklists are automatically loaded
4. Protection is active immediately

---

## Usage

### Quick Actions (Popup)
Click the extension icon for quick access:
- View protection status
- See today's blocked count
- Quick toggle protection on/off
- Lock/unlock the extension
- Open full dashboard

### Full Dashboard (Options Page)
Open the full dashboard via right-click → "Options" or from the popup:
- **Dashboard** — Statistics overview
- **Categories** — Toggle 17 content categories
- **Channels** — Manage blocked channels (add, remove, enable/disable)
- **Keywords** — Manage blocked keywords
- **Import/Export** — Backup and restore your blocklists
- **Activity Log** — View blocked content history
- **Password** — Change your password
- **Settings** — General configuration

### Import Formats
The import system supports:
- **JSON** — Full backup format
- **CSV** — `type,value,label,category` format
- **TXT** — One item per line, supports `type:value` format
- **Drag & Drop** — Drop files directly onto the import zone

---

## Architecture

```
src/
├── background/
│   ├── service-worker.ts   # Extension lifecycle & message routing
│   ├── storage.ts           # IndexedDB + Chrome Storage API
│   └── password.ts          # SHA-256 password system
├── content/
│   ├── content.ts           # Content script entry point
│   ├── content.css          # YouTube-injected styles
│   ├── filter-engine.ts     # Centralized filtering engine
│   ├── observer.ts          # MutationObserver & SPA navigation
│   ├── warning.ts           # Warning screen components
│   └── blockers/
│       └── index.ts         # Blocking actions (hide, blur, replace, etc.)
├── data/
│   ├── channels.json        # Built-in blocked channels
│   ├── keywords.json        # Built-in blocked keywords
│   ├── videos.json          # Built-in blocked videos
│   ├── playlists.json       # Built-in blocked playlists
│   ├── regex.json           # Built-in regex rules
│   ├── allowlist.json       # Built-in allowlist
│   └── settings.json        # Default settings
├── popup/
│   ├── popup.html           # Popup HTML
│   ├── popup.ts             # Popup logic
│   └── popup.css            # Popup styles
├── options/
│   ├── options.html         # Dashboard HTML
│   ├── options.tsx          # Dashboard React component
│   ├── options.css          # Dashboard styles
│   └── components/
│       └── Toast.tsx        # Toast notification component
├── types/
│   └── index.ts             # TypeScript type definitions
└── utils/
    ├── trie.ts              # Trie data structure
    ├── parser.ts            # Import parsers (JSON, CSV, TXT)
    └── export-import.ts     # Export/import utilities
```

### Key Design Decisions

1. **Single Filtering Engine** — Every YouTube object passes through one centralized engine
2. **IndexedDB + Chrome Storage** — IndexedDB for large blocklists, Chrome Storage for settings
3. **Trie for Keywords** — Efficient O(k) matching instead of O(n) linear scans
4. **SPA Support** — MutationObserver + yt-navigate-finish events for YouTube's single-page app
5. **No External Dependencies** — Everything is local, no data ever leaves the device

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests cover:
- Keyword trie operations (insert, search, remove, clear, match)
- Channel ID set operations
- Password hashing and validation
- Import format parsing (JSON, CSV, TXT)
- Export/import validation
- Regex validation

---

## Permissions

The extension requests only necessary permissions:

| Permission | Reason |
|------------|--------|
| `storage` | Store settings and blocklists |
| `tabs` | Check YouTube tabs for updates |
| `scripting` | Inject content scripts |
| `unlimitedStorage` | Support large blocklists |
| Host permissions | Only for YouTube domains |

---

## Privacy

**IsshanTV Guardian is privacy-first:**
- ❌ No cloud services
- ❌ No servers
- ❌ No analytics
- ❌ No telemetry
- ❌ No subscriptions
- ❌ No accounts
- ❌ No remote APIs
- ❌ No data ever leaves the device
- ✅ Everything stored locally
- ✅ Open source
- ✅ Offline enabled

---

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Typecheck
npm run typecheck
```

### Requirements
- Node.js 18+
- Chrome 102+

### Build Output
The `dist/` directory contains:
- `manifest.json` — Extension manifest
- `service-worker.js` — Background service worker
- `content.js` — Content script (injected into YouTube)
- `popup.html` + `popup.js` — Popup interface
- `options.html` + `options.js` — Dashboard interface
- `data/` — Built-in JSON databases
- `icons/` — Extension icons

---

## Roadmap

- [ ] Comment filtering
- [ ] Community post filtering
- [ ] Live stream blocking improvements
- [ ] Custom notification sounds
- [ ] Schedule-based blocking (time limits)
- [ ] Multi-language keyword support
- [ ] Per-category custom messages
- [ ] Automated backup reminders
- [ ] Sync across browsers (encrypted)

---

## License

MIT License — See LICENSE file for details.

---

## Support

For issues, feature requests, or contributions:
- GitHub Issues: https://github.com/isshantv/guardian/issues
- Email: support@isshantv.com

---

*Made with ❤️ to keep children safe on YouTube.*
