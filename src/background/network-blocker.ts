/**
 * Network Blocker Module
 * 
 * Uses Chrome's declarativeNetRequest API to block ALL network traffic
 * when enabled. Traffic to local/private IP addresses is always allowed
 * so the remote control dashboard remains accessible.
 * 
 * Requires "declarativeNetRequest" permission and host_permissions for all URLs.
 */

import { getSettings, updateSettings } from './storage';

const BLOCK_RULE_ID = 10001;
const ALLOW_LOCAL_RULE_ID = 10002;
const ALLOW_PRIVATE_192_RULE_ID = 10003;
const ALLOW_PRIVATE_10_RULE_ID = 10004;

const ALL_RULE_IDS = [
  BLOCK_RULE_ID,
  ALLOW_LOCAL_RULE_ID,
  ALLOW_PRIVATE_192_RULE_ID,
  ALLOW_PRIVATE_10_RULE_ID,
];

/**
 * Initialize on startup - restore previous state
 */
export async function initNetworkBlocker(): Promise<void> {
  try {
    const settings = await getSettings();
    if (settings.general.blockAllTraffic) {
      await enableNetworkBlocking();
    } else {
      await disableNetworkBlocking();
    }
  } catch (err) {
    console.error('IsshanTV Guardian: Network blocker init error:', err);
  }
}

/**
 * Enable network blocking - blocks all HTTP/HTTPS except the web server
 */
export async function enableNetworkBlocking(): Promise<void> {
  try {
    // Remove any existing rules first
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ALL_RULE_IDS,
    });

    // Create allow rules for local/private IPs (higher priority = 2)
    // This ensures the dashboard remains accessible even when traffic is blocked
    const allowRules: any[] = [
      {
        id: ALLOW_LOCAL_RULE_ID,
        priority: 2,
        action: { type: 'allow' },
        condition: {
          urlFilter: 'localhost',
          resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'xmlhttprequest', 'websocket', 'other'],
        },
      },
      {
        id: ALLOW_PRIVATE_192_RULE_ID,
        priority: 2,
        action: { type: 'allow' },
        condition: {
          urlFilter: '192.168.',
          resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'xmlhttprequest', 'websocket', 'other'],
        },
      },
      {
        id: ALLOW_PRIVATE_10_RULE_ID,
        priority: 2,
        action: { type: 'allow' },
        condition: {
          urlFilter: '10.',
          resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'xmlhttprequest', 'websocket', 'other'],
        },
      },
    ];

    // Create block rule for all http traffic (priority 1, lower than allow)
    const blockRule: any = {
      id: BLOCK_RULE_ID,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: 'http',
        resourceTypes: [
          'main_frame', 'sub_frame', 'stylesheet', 'script',
          'image', 'font', 'object', 'xmlhttprequest', 'ping',
          'csp_report', 'media', 'websocket', 'webtransport',
          'webbundle', 'other',
        ],
      },
    };

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [...allowRules, blockRule],
      removeRuleIds: [],
    });

    // Update setting
    const s = await getSettings();
    s.general.blockAllTraffic = true;
    await updateSettings(s);

    console.log('IsshanTV Guardian: Network blocking ENABLED (allowing local/private IPs)');
  } catch (err) {
    console.error('IsshanTV Guardian: Failed to enable network block:', err);
    throw err;
  }
}

/**
 * Disable network blocking - remove all DNR rules
 */
export async function disableNetworkBlocking(): Promise<void> {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ALL_RULE_IDS,
      addRules: [],
    });

    const s = await getSettings();
    s.general.blockAllTraffic = false;
    await updateSettings(s);

    console.log('IsshanTV Guardian: Network blocking DISABLED');
  } catch (err) {
    console.error('IsshanTV Guardian: Failed to disable network block:', err);
    throw err;
  }
}

/**
 * Get current network blocking status
 */
export async function getNetworkBlockingStatus(): Promise<{
  enabled: boolean;
  rulesActive: boolean;
  ruleCount: number;
}> {
  try {
    const settings = await getSettings();
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const hasBlockRule = rules.some((r: any) => r.id === BLOCK_RULE_ID || r.id === ALLOW_LOCAL_RULE_ID);
    return {
      enabled: settings.general.blockAllTraffic || false,
      rulesActive: hasBlockRule,
      ruleCount: rules.length,
    };
  } catch {
    return { enabled: false, rulesActive: false, ruleCount: 0 };
  }
}
