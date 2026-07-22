/**
 * Centralized filtering engine for IsshanTV Guardian.
 * Every YouTube object passes through this single engine.
 * Checks channels, keywords, videos, playlists, regex, categories, and allowlist.
 */

import type {
  FilterResult,
  YouTubePageData,
  ChannelEntry,
  KeywordEntry,
  VideoEntry,
  PlaylistEntry,
  RegexEntry,
  AllowlistEntry,
  AppSettings,
  BlockCategory,
  BlockAction,
} from '../types';
import { KeywordTrie, IdSet } from '../utils/trie';

/**
 * FilterEngine class - singleton filtering engine.
 * Pre-loads all blocklists into memory-efficient structures.
 */
export class FilterEngine {
  private static instance: FilterEngine;

  private channels: IdSet = new IdSet();
  private keywordTrie: KeywordTrie = new KeywordTrie();
  private videos: Set<string> = new Set();
  private playlists: Set<string> = new Set();
  private regexRules: Array<{ pattern: RegExp; category: BlockCategory; description: string }> = [];
  private allowlistChannels: Set<string> = new Set();
  private allowlistVideos: Set<string> = new Set();
  private allowlistKeywords: string[] = [];
  private settings: AppSettings | null = null;
  private compiledRegexCache: Map<string, RegExp> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): FilterEngine {
    if (!FilterEngine.instance) {
      FilterEngine.instance = new FilterEngine();
    }
    return FilterEngine.instance;
  }

  /**
   * Initialize the engine with all blocklist data
   */
  async initialize(
    channels: ChannelEntry[],
    keywords: KeywordEntry[],
    videos: VideoEntry[],
    playlists: PlaylistEntry[],
    regex: RegexEntry[],
    allowlist: AllowlistEntry[],
    settings: AppSettings,
  ): Promise<void> {
    // Build channels lookup
    this.channels = new IdSet();
    for (const channel of channels.filter(c => c.enabled)) {
      this.channels.add(channel.id, {
        name: channel.name,
        category: channel.category,
        enabled: channel.enabled,
        builtin: channel.builtin,
      });
    }

    // Build keyword trie
    this.keywordTrie = KeywordTrie.fromKeywords(
      keywords.filter(k => k.enabled)
    );

    // Build videos set
    this.videos = new Set(
      videos.filter(v => v.enabled).map(v => v.id)
    );

    // Build playlists set
    this.playlists = new Set(
      playlists.filter(p => p.enabled).map(p => p.id)
    );

    // Build regex rules
    this.regexRules = regex
      .filter(r => r.enabled)
      .map(r => ({
        pattern: this.compileRegex(r.pattern, r.flags),
        category: r.category as BlockCategory,
        description: r.description,
      }));

    // Build allowlist
    this.allowlistChannels = new Set(
      allowlist
        .filter(a => a.enabled && a.type === 'channel')
        .map(a => a.value)
    );
    this.allowlistVideos = new Set(
      allowlist
        .filter(a => a.enabled && a.type === 'video')
        .map(a => a.value)
    );
    this.allowlistKeywords = allowlist
      .filter(a => a.enabled && (a.type === 'keyword' || a.type === 'regex'))
      .map(a => a.value.toLowerCase());

    this.settings = settings;
    this.initialized = true;
  }

  /**
   * Check if allowlist contains a specific value
   */
  private isAllowlisted(data: YouTubePageData): boolean {
    if (data.channelId && this.allowlistChannels.has(data.channelId)) return true;
    if (data.videoId && this.allowlistVideos.has(data.videoId)) return true;
    if (data.channelName) {
      const lower = data.channelName.toLowerCase();
      if (this.allowlistKeywords.some(kw => lower.includes(kw))) return true;
    }
    return false;
  }

  /**
   * Main filtering method - check all rules
   */
  check(data: YouTubePageData): FilterResult {
    if (!this.initialized || !this.settings?.general.enabled) {
      return { blocked: false };
    }

    // Allowlist check first - overrides everything
    if (this.isAllowlisted(data)) {
      return { blocked: false };
    }

    // Check shorts
    if (data.isShorts && this.settings.general.blockShorts) {
      return {
        blocked: true,
        reason: 'Shorts are blocked',
        category: 'shorts',
        action: 'hide',
      };
    }

    // Check channel ID
    if (data.channelId) {
      const channelData = this.channels.get(data.channelId);
      if (channelData) {
        const categoryAction = this.getCategoryAction(channelData.category);
        return {
          blocked: true,
          reason: `Channel blocked: ${channelData.name}`,
          category: channelData.category as BlockCategory,
          action: categoryAction,
        };
      }
    }

    // Check channel name
    if (data.channelName) {
      const channelMatch = this.findChannelByName(data.channelName);
      if (channelMatch) {
        const categoryAction = this.getCategoryAction(channelMatch.category);
        return {
          blocked: true,
          reason: `Channel blocked: ${channelMatch.name}`,
          category: channelMatch.category as BlockCategory,
          action: categoryAction,
        };
      }
    }

    // Check video ID
    if (data.videoId && this.videos.has(data.videoId)) {
      return {
        blocked: true,
        reason: 'Video is blocked',
        category: 'custom',
        action: this.getCategoryAction('custom'),
      };
    }

    // Check playlist ID
    if (data.playlistId && this.playlists.has(data.playlistId)) {
      return {
        blocked: true,
        reason: 'Playlist is blocked',
        category: 'custom',
        action: this.getCategoryAction('custom'),
      };
    }

    // Check video title with keyword trie
    if (data.videoTitle) {
      const keywordMatch = this.keywordTrie.findMatch(data.videoTitle);
      if (keywordMatch && keywordMatch.enabled) {
        const categoryAction = this.getCategoryAction(keywordMatch.category as BlockCategory);
        return {
          blocked: true,
          reason: `Keyword matched in title: ${keywordMatch.keyword}`,
          category: keywordMatch.category as BlockCategory,
          action: categoryAction,
        };
      }
    }

    // Check description with keyword trie
    if (data.description) {
      const keywordMatch = this.keywordTrie.findMatch(data.description);
      if (keywordMatch && keywordMatch.enabled) {
        const categoryAction = this.getCategoryAction(keywordMatch.category as BlockCategory);
        return {
          blocked: true,
          reason: `Keyword matched in description: ${keywordMatch.keyword}`,
          category: keywordMatch.category as BlockCategory,
          action: categoryAction,
        };
      }
    }

    // Check search query
    if (data.searchQuery) {
      const keywordMatch = this.keywordTrie.findMatch(data.searchQuery);
      if (keywordMatch && keywordMatch.enabled) {
        const categoryAction = this.getCategoryAction(keywordMatch.category as BlockCategory);
        return {
          blocked: true,
          reason: `Keyword matched in search: ${keywordMatch.keyword}`,
          category: keywordMatch.category as BlockCategory,
          action: categoryAction,
        };
      }
    }

    // Check tags
    if (data.tags) {
      for (const tag of data.tags) {
        const keywordMatch = this.keywordTrie.findMatch(tag);
        if (keywordMatch && keywordMatch.enabled) {
          const categoryAction = this.getCategoryAction(keywordMatch.category as BlockCategory);
          return {
            blocked: true,
            reason: `Keyword matched in tags: ${keywordMatch.keyword}`,
            category: keywordMatch.category as BlockCategory,
            action: categoryAction,
          };
        }
      }
    }

    // Check regex rules against all text fields
    const textToCheck = [
      data.videoTitle,
      data.channelName,
      data.description,
      data.searchQuery,
      data.url,
    ].filter(Boolean).join(' ');

    if (textToCheck) {
      for (const rule of this.regexRules) {
        if (rule.pattern.test(textToCheck)) {
          const categoryAction = this.getCategoryAction(rule.category);
          return {
            blocked: true,
            reason: `Regex matched: ${rule.description}`,
            category: rule.category,
            action: categoryAction,
          };
        }
      }
    }

    return { blocked: false };
  }

  /**
   * Check if a category is enabled and get its action
   */
  private getCategoryAction(category: BlockCategory | string): BlockAction {
    if (!this.settings) return 'hide';

    const catSettings = this.settings.categories[category as BlockCategory];
    if (!catSettings || !catSettings.enabled) {
      return this.settings.general.blockingAction;
    }

    return catSettings.action;
  }

  /**
   * Search for channel by name (partial match)
   */
  private findChannelByName(name: string): { id: string; name: string; category: string } | null {
    const lower = name.toLowerCase();
    const channels = this.channels.values();

    for (const channel of channels) {
      if (lower.includes(channel.name.toLowerCase()) ||
          channel.name.toLowerCase().includes(lower)) {
        return channel;
      }
    }

    return null;
  }

  /**
   * Compile regex with caching
   */
  private compileRegex(pattern: string, flags: string): RegExp {
    const key = `${flags}:${pattern}`;
    const cached = this.compiledRegexCache.get(key);
    if (cached) return cached;

    const regex = new RegExp(pattern, flags);
    this.compiledRegexCache.set(key, regex);
    return regex;
  }

  /**
   * Update settings without full reinitialization
   */
  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.channels = new IdSet();
    this.keywordTrie = new KeywordTrie();
    this.videos = new Set();
    this.playlists = new Set();
    this.regexRules = [];
    this.allowlistChannels = new Set();
    this.allowlistVideos = new Set();
    this.allowlistKeywords = [];
    this.settings = null;
    this.compiledRegexCache.clear();
    this.initialized = false;
  }
}
