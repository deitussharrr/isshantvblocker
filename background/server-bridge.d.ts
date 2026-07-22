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
export declare function getBridgeStatus(): {
    connected: boolean;
    hostInstalled: boolean;
    hint: string;
};
/**
 * Push a change event (no-op - the dashboard reads directly from extension storage)
 */
export declare function pushChangeToServer(_eventType: string, _data: any): void;
/**
 * No-op: native messaging bridge is not used
 */
export declare function initServerBridge(): void;
/**
 * No-op: native messaging bridge is not used
 */
export declare function disconnectServerBridge(): void;
//# sourceMappingURL=server-bridge.d.ts.map