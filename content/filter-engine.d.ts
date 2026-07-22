/**
 * Centralized filtering engine for IsshanTV Guardian.
 * Every YouTube object passes through this single engine.
 * Checks channels, keywords, videos, playlists, regex, categories, and allowlist.
 */
import type { FilterResult, YouTubePageData, ChannelEntry, KeywordEntry, VideoEntry, PlaylistEntry, RegexEntry, AllowlistEntry, AppSettings } from '../types';
/**
 * FilterEngine class - singleton filtering engine.
 * Pre-loads all blocklists into memory-efficient structures.
 */
export declare class FilterEngine {
    private static instance;
    private channels;
    private keywordTrie;
    private videos;
    private playlists;
    private regexRules;
    private allowlistChannels;
    private allowlistVideos;
    private allowlistKeywords;
    private settings;
    private compiledRegexCache;
    private initialized;
    private constructor();
    static getInstance(): FilterEngine;
    /**
     * Initialize the engine with all blocklist data
     */
    initialize(channels: ChannelEntry[], keywords: KeywordEntry[], videos: VideoEntry[], playlists: PlaylistEntry[], regex: RegexEntry[], allowlist: AllowlistEntry[], settings: AppSettings): Promise<void>;
    /**
     * Check if allowlist contains a specific value
     */
    private isAllowlisted;
    /**
     * Main filtering method - check all rules
     */
    check(data: YouTubePageData): FilterResult;
    /**
     * Check if a category is enabled and get its action
     */
    private getCategoryAction;
    /**
     * Search for channel by name (partial match)
     */
    private findChannelByName;
    /**
     * Compile regex with caching
     */
    private compileRegex;
    /**
     * Update settings without full reinitialization
     */
    updateSettings(settings: AppSettings): void;
    /**
     * Check if engine is initialized
     */
    isInitialized(): boolean;
    /**
     * Clear all cached data
     */
    clear(): void;
}
//# sourceMappingURL=filter-engine.d.ts.map