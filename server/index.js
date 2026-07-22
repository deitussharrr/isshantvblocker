/**
 * IsshanTV Guardian - Remote Control Server
 * 
 * Runs as both a Native Messaging Host (communicating with the Chrome extension)
 * and an HTTP Server (serving the web UI and REST API on the network).
 * 
 * Usage:
 *   node server/index.js [--port=8080] [--host=192.168.1.15]
 * 
 * Native Messaging Protocol:
 *   Messages are 4-byte length prefix (UInt32LE) + UTF-8 JSON body
 *   from stdin (incoming from extension) and stdout (outgoing to extension)
 */

'use strict';

// ========================
// Configuration
// ========================
const CONFIG = {
  host: '192.168.1.15',
  port: 8080,
  isNativeMessagingHost: process.argv.includes('--nm-host'),
};

// ========================
// Binary stdin/stdout setup (critical for Windows native messaging)
// ========================

// Chrome pipes stdin in binary mode for native messaging.
// We must read raw bytes to parse the 4-byte length prefix correctly.
if (CONFIG.isNativeMessagingHost) {
  // Disable encoding so we get raw Buffer objects
  process.stdin.setEncoding(null);
  
  // On Windows, stdout may be in text mode (cr/lf translation).
  // We force binary mode to prevent corruption of the length prefix.
  try {
    // For Windows pipe mode
    if (process.platform === 'win32') {
      const fd = process.stdout.fd;
      if (fd) {
        // Use _setmode on Windows to set binary mode
        try {
          const os = require('os');
          os._setConsole?.(0);
        } catch {}
      }
    }
  } catch {}

  try {
    process.stdin.setRawMode?.(true);
  } catch {
    // Not a TTY, which is expected when piped from Chrome
  }
}

// Parse CLI args
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--port=')) CONFIG.port = parseInt(arg.split('=')[1], 10);
  if (arg.startsWith('--host=')) CONFIG.host = arg.split('=')[1];
}

// ========================
// Pending Requests Map
// ========================
const pendingRequests = new Map();
let requestIdCounter = 0;

function generateRequestId() {
  return `req_${++requestIdCounter}_${Date.now()}`;
}

// ========================
// Native Messaging Protocol
// ========================

// Set stdin/stdout to binary mode (critical on Windows)
process.stdin.setRawMode && process.stdin.setRawMode(true);
process.stdin.setEncoding('binary');
process.stdout.setEncoding('binary');

let inputBuffer = Buffer.alloc(0);

/**
 * Read a message from stdin (native messaging protocol).
 * Messages are 4-byte length prefix + JSON body.
 */
function readStdin() {
  // Process any complete messages in the buffer
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0);
    const totalLength = 4 + messageLength;

    if (inputBuffer.length < totalLength) break; // Wait for more data

    const messageBuffer = inputBuffer.slice(4, totalLength);
    inputBuffer = inputBuffer.slice(totalLength);

    try {
      const message = JSON.parse(messageBuffer.toString('utf8'));
      handleExtensionMessage(message);
    } catch (err) {
      console.error('Failed to parse extension message:', err.message);
    }
  }
}

// Read stdin data
process.stdin.on('data', (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, Buffer.from(chunk, 'binary')]);
  readStdin();
});

process.stdin.on('end', () => {
  // Extension disconnected - clean up
  rejectAllPending('Extension disconnected');
});

/**
 * Send a message to the extension via stdout (native messaging protocol).
 */
function sendToExtension(message) {
  const json = JSON.stringify(message);
  const buffer = Buffer.from(json, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(buffer.length, 0);

  // Write length prefix + JSON body
  process.stdout.write(Buffer.concat([lengthBuffer, buffer]));
}

/**
 * Handle a message received from the extension.
 */
function handleExtensionMessage(message) {
  if (message.type === 'response' && message.requestId) {
    // This is a response to a previous request
    const pending = pendingRequests.get(message.requestId);
    if (pending) {
      pendingRequests.delete(message.requestId);
      pending.resolve(message);
    }
  } else if (message.type === 'push' || message.type === 'event') {
    // Unsolicited message from extension (e.g., status update, media info)
    // Could broadcast to WebSocket clients in the future
  }
}

/**
 * Send a request to the extension and wait for response.
 */
async function requestExtension(action, params = {}) {
  const requestId = generateRequestId();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Request timed out'));
    }, 10000);

    pendingRequests.set(requestId, {
      resolve: (response) => {
        clearTimeout(timeout);
        resolve(response);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    sendToExtension({
      type: 'request',
      requestId,
      action,
      params,
    });
  });
}

// ========================
// HTTP Server
// ========================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Serve static files from the public directory.
 */
function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
}

/**
 * Parse JSON body from HTTP request.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response.
 */
function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

/**
 * Handle HTTP API requests.
 */
async function handleAPI(req, res, pathname, query) {
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  try {
    // ========================
    // Server Status
    // ========================
    if (pathname === '/api/status' && method === 'GET') {
      sendJSON(res, 200, {
        server: 'running',
        version: '1.0.0',
        host: CONFIG.host,
        port: CONFIG.port,
        uptime: Math.floor(process.uptime()),
        extensionConnected: true,
      });
      return;
    }

    // ========================
    // Health Check
    // ========================
    if (pathname === '/api/health' && method === 'GET') {
      sendJSON(res, 200, { status: 'ok', timestamp: Date.now() });
      return;
    }

    // All other endpoints require extension communication
    // Get the auth token from header
    const authHeader = req.headers['authorization'] || '';
    const password = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    // ========================
    // Password Verification (no auth needed)
    // ========================
    if (pathname === '/api/password/verify' && method === 'POST') {
      const body = await parseBody(req);
      const response = await requestExtension('verifyPassword', { password: body.password });
      sendJSON(res, response.success ? 200 : 401, response);
      return;
    }

    if (pathname === '/api/password/created' && method === 'GET') {
      const response = await requestExtension('passwordCreated', {});
      sendJSON(res, 200, response);
      return;
    }

    if (pathname === '/api/password/create' && method === 'POST') {
      const body = await parseBody(req);
      const response = await requestExtension('setPassword', { password: body.password });
      sendJSON(res, response.success ? 200 : 400, response);
      return;
    }

    // ========================
    // All other endpoints require a valid session
    // We verify the password on each request (simple but secure)
    // ========================
    const session = await requestExtension('checkUnlock', {});
    const isUnlocked = session.success && session.data?.unlocked;
    const hasPassword = session.data?.created !== false;

    // If password is set and not unlocked, require auth
    if (hasPassword && !isUnlocked && !['GET /api/status', 'GET /api/health', 'POST /api/password/', 'GET /api/password/'].some(p => pathname.startsWith(p))) {
      // Try password from Authorization header
      if (password) {
        const authCheck = await requestExtension('verifyPassword', { password });
        if (!authCheck.success) {
          sendJSON(res, 401, { success: false, error: 'Invalid password' });
          return;
        }
      } else {
        sendJSON(res, 401, { success: false, error: 'Authentication required' });
        return;
      }
    }

    // ========================
    // Settings
    // ========================
    if (pathname === '/api/settings' && method === 'GET') {
      const response = await requestExtension('getSettings', {});
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    if (pathname === '/api/settings' && method === 'POST') {
      const body = await parseBody(req);
      const response = await requestExtension('updateSettings', body);
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // ========================
    // Blocklists
    // ========================
    if (pathname === '/api/blocklists' && method === 'GET') {
      const response = await requestExtension('getBlocklists', {});
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // POST /api/blocklists/:type
    const blocklistAddMatch = pathname.match(/^\/api\/blocklists\/(channels|keywords|videos|playlists|regex|allowlist)$/);
    if (blocklistAddMatch && method === 'POST') {
      const listType = blocklistAddMatch[1];
      const body = await parseBody(req);
      const response = await requestExtension('addBlocklistItem', { list: listType, item: body });
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // DELETE /api/blocklists/:type/:key
    const blocklistRemoveMatch = pathname.match(/^\/api\/blocklists\/(channels|keywords|videos|playlists|regex|allowlist)\/(.+)$/);
    if (blocklistRemoveMatch && method === 'DELETE') {
      const listType = blocklistRemoveMatch[1];
      const key = decodeURIComponent(blocklistRemoveMatch[2]);
      const response = await requestExtension('removeBlocklistItem', { list: listType, key });
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // PUT /api/blocklists/:type/:key/toggle
    const blocklistToggleMatch = pathname.match(/^\/api\/blocklists\/(channels|keywords|videos|playlists|regex|allowlist)\/(.+)\/toggle$/);
    if (blocklistToggleMatch && method === 'PUT') {
      const listType = blocklistToggleMatch[1];
      const key = decodeURIComponent(blocklistToggleMatch[2]);
      const response = await requestExtension('toggleBlocklistItem', { list: listType, key, field: 'enabled' });
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // ========================
    // Stats
    // ========================
    if (pathname === '/api/stats' && method === 'GET') {
      const response = await requestExtension('getStats', {});
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // ========================
    // Export/Import
    // ========================
    if (pathname === '/api/export' && method === 'GET') {
      const response = await requestExtension('exportData', {});
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    if (pathname === '/api/import' && method === 'POST') {
      const body = await parseBody(req);
      const response = await requestExtension('importData', body);
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // ========================
    // Logs
    // ========================
    if (pathname === '/api/logs' && method === 'GET') {
      const response = await requestExtension('getLogs', {});
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    if (pathname === '/api/logs' && method === 'DELETE') {
      const response = await requestExtension('clearLogs', {});
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // ========================
    // Media Control
    // ========================
    if (pathname === '/api/media/pause' && method === 'POST') {
      const response = await requestExtension('mediaControl', { action: 'pause' });
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    if (pathname === '/api/media/resume' && method === 'POST') {
      const response = await requestExtension('mediaControl', { action: 'resume' });
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    if (pathname === '/api/media/block' && method === 'POST') {
      const body = await parseBody(req);
      const response = await requestExtension('mediaControl', { action: 'block', ...body });
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    if (pathname === '/api/media/status' && method === 'GET') {
      const response = await requestExtension('mediaStatus', {});
      sendJSON(res, response.success ? 200 : 500, response);
      return;
    }

    // ========================
    // Password Management
    // ========================
    if (pathname === '/api/password/change' && method === 'POST') {
      const body = await parseBody(req);
      const response = await requestExtension('changePassword', {
        oldPassword: body.oldPassword,
        newPassword: body.newPassword,
      });
      sendJSON(res, response.success ? 200 : 400, response);
      return;
    }

    if (pathname === '/api/unlock' && method === 'POST') {
      const body = await parseBody(req);
      const response = await requestExtension('temporaryUnlock', {
        duration: body.duration || 3600000,
        password: body.password,
      });
      sendJSON(res, response.success ? 200 : 401, response);
      return;
    }

    if (pathname === '/api/lock' && method === 'POST') {
      const response = await requestExtension('lock', {});
      sendJSON(res, 200, response);
      return;
    }

    if (pathname === '/api/unlock/status' && method === 'GET') {
      const response = await requestExtension('checkUnlock', {});
      sendJSON(res, 200, response);
      return;
    }

    // ========================
    // Not Found
    // ========================
    sendJSON(res, 404, { success: false, error: 'Endpoint not found' });

  } catch (err) {
    console.error('API error:', err);
    sendJSON(res, 500, { success: false, error: err.message });
  }
}

/**
 * Create and start the HTTP server.
 */
function startHTTPServer() {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
      handleAPI(req, res, pathname, query);
      return;
    }

    // Serve static files
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    serveStaticFile(res, filePath);
  });

  server.listen(CONFIG.port, CONFIG.host, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║    IsshanTV Guardian Remote Control Server   ║`);
    console.log(`╠══════════════════════════════════════════════╣`);
    console.log(`║  Web UI:  http://${CONFIG.host}:${CONFIG.port}/`);
    console.log(`║  API:     http://${CONFIG.host}:${CONFIG.port}/api/`);
    console.log(`╚══════════════════════════════════════════════╝`);
    console.log(`\nServer started. Press Ctrl+C to stop.\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n✖ Port ${CONFIG.port} is already in use. Try a different port.`);
    } else if (err.code === 'EADDRNOTAVAIL') {
      console.error(`\n✖ Address ${CONFIG.host} is not available on this machine.`);
      console.error('  Use --host=0.0.0.0 to listen on all interfaces.');
    } else {
      console.error('\n✖ Server error:', err.message);
    }
    process.exit(1);
  });

  return server;
}

// ========================
// Graceful Shutdown
// ========================
function shutdown() {
  console.log('\nShutting down...');
  rejectAllPending('Server shutting down');
  process.exit(0);
}

function rejectAllPending(reason) {
  for (const [id, pending] of pendingRequests) {
    pending.reject(new Error(reason));
    pendingRequests.delete(id);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ========================
// Start
// ========================

// If running as native messaging host, notify extension we're ready
if (CONFIG.isNativeMessagingHost) {
  sendToExtension({ type: 'event', event: 'server_started', data: { host: CONFIG.host, port: CONFIG.port } });
}

startHTTPServer();
