/**
 * Network Blocker Module
 *
 * Uses Chrome's declarativeNetRequest API to block ALL network traffic
 * when enabled. Traffic to local/private IP addresses is always allowed
 * so the remote control dashboard remains accessible.
 *
 * Requires "declarativeNetRequest" permission and host_permissions for all URLs.
 */
/**
 * Initialize on startup - restore previous state
 */
export declare function initNetworkBlocker(): Promise<void>;
/**
 * Enable network blocking - blocks all HTTP/HTTPS except the web server
 */
export declare function enableNetworkBlocking(): Promise<void>;
/**
 * Disable network blocking - remove all DNR rules
 */
export declare function disableNetworkBlocking(): Promise<void>;
/**
 * Get current network blocking status
 */
export declare function getNetworkBlockingStatus(): Promise<{
    enabled: boolean;
    rulesActive: boolean;
    ruleCount: number;
}>;
//# sourceMappingURL=network-blocker.d.ts.map