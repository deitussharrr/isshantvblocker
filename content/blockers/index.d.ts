/**
 * Blocking actions module.
 * Applies different block actions to YouTube elements:
 * - hide: Completely remove from DOM
 * - blur: Blur the content
 * - replace: Replace with warning placeholder
 * - redirect: Redirect to another page (for video pages)
 * - warning: Show warning screen overlay
 */
import type { FilterResult } from '../../types';
/**
 * Apply blocking to a DOM element based on filter result
 */
export declare function applyBlocking(element: HTMLElement, result: FilterResult): void;
/**
 * Aggressively destroy ALL video/audio on the page and replace the player with a blocked warning.
 * Uses multiple layers of defense:
 * 1. Immediately stops all media elements globally
 * 2. Destroys YouTube's internal player API
 * 3. Replaces the player container entirely
 * 4. Runs a kill timer for 10 seconds to catch re-initialized players
 * 5. Prevents YouTube SPA from re-creating the player
 */
export declare function blockVideoPlayer(player: HTMLElement, result: FilterResult): void;
/**
 * Remove blocking from an element (unblock)
 */
export declare function removeBlocking(element: HTMLElement): void;
/**
 * Check if an element is blocked
 */
export declare function isBlocked(element: HTMLElement): boolean;
/**
 * Remove all blocks from the page
 */
export declare function removeAllBlocks(): void;
/**
 * Re-scan and re-apply blocks
 */
export declare function rescanAndBlock(): void;
//# sourceMappingURL=index.d.ts.map