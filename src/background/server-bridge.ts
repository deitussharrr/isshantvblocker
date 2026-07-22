/**
 * Server Bridge Module
 * 
 * In the current version, remote control is handled through the
 * PowerShell-based HTTP server + externally_connectable chrome.runtime API.
 * 
 * The dashboard served by the PowerShell server communicates directly
 * with the extension via chrome.runtime.sendMessage (externally_connectable).
 * No native messaging host is needed.
 * 
 * This module is kept for backward compatibility but all native messaging
 * functionality has been removed.
 */

/**
 * Get the current state of the bridge
 * Now always returns that the server is managed externally
 */
export function getBridgeStatus(): { connected: boolean; hostInstalled: boolean; hint: string } {
  return {
    connected: false,
    hostInstalled: false,
    hint: '📡 Remote control uses PowerShell HTTP server. Run start-server.bat from the extension folder.',
  };
}

/**
 * Push a change event (no-op - the dashboard reads directly from extension storage)
 */
export function pushChangeToServer(_eventType: string, _data: any): void {
  // No-op: the dashboard uses chrome.runtime.sendMessage directly
  // to query the latest data from the extension
}

/**
 * No-op: native messaging bridge is not used
 */
export function initServerBridge(): void {
  // No-op
}

/**
 * No-op: native messaging bridge is not used
 */
export function disconnectServerBridge(): void {
  // No-op
}
