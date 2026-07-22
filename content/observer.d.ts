/**
 * Observer module for watching YouTube DOM changes and SPA navigation.
 * Handles:
 * - MutationObserver for dynamic content
 * - History API changes
 * - yt-navigate-finish events
 * - Lazy loading
 * - Infinite scrolling
 */
/**
 * Start observing YouTube page for changes
 */
export declare function startObserving(): void;
/**
 * Stop observing
 */
export declare function stopObserving(): void;
/**
 * Evaluate a single element and block if needed
 */
declare function evaluateAndBlock(element: HTMLElement): Promise<void>;
/**
 * Extract YouTube page data from a DOM element.
 * Uses multiple strategies to find channel IDs, names, and video titles
 * from YouTube's current DOM structure.
 */
declare function extractPageData(element: HTMLElement): {
    videoId?: string;
    channelId?: string;
    channelName?: string;
    videoTitle?: string;
    isShorts: boolean;
    isLive: boolean;
    isPlaylist: boolean;
} | null;
/**
 * Check if the current page is a channel page for a blocked channel.
 * Multi-layered approach:
 * 1. URL-based check for /channel/UC... (no DOM needed)
 * 2. Background service worker fast lookup
 * 3. DOM-based check for /@handle pages
 */
export declare function checkChannelPage(attempt?: number): Promise<void>;
/**
 * Check the current watch page for blocked content.
 * When a user navigates to a video, this checks if the channel/video
 * is blocked and shows an overlay on the player if so.
 * Retries with delays to handle YouTube's lazy DOM rendering on SPA navigation.
 */
export declare function checkWatchPage(attempt?: number): Promise<void>;
export { evaluateAndBlock, extractPageData };
//# sourceMappingURL=observer.d.ts.map