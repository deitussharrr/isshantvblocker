/**
 * Storage module for IsshanTV Guardian.
 * Uses Chrome Storage API for settings and small data.
 * Uses IndexedDB for large blocklists (10,000+ channels, 100,000+ keywords).
 */
import type { ChannelEntry, KeywordEntry, AppSettings, BlockLog, ExportData } from '../types';
import { KeywordTrie, IdSet } from '../utils/trie';
export declare function isDataLoadAttempted(): boolean;
export declare function waitForDataReady(): Promise<void>;
export declare function openDB(): Promise<IDBDatabase>;
export declare function getAllFromStore<T>(storeName: string): Promise<T[]>;
export declare function getDefaultSettings(): Promise<AppSettings>;
export declare function getSettings(): Promise<AppSettings>;
export declare function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
export declare function getAllChannels(): Promise<ChannelEntry[]>;
export declare function addChannel(channel: ChannelEntry): Promise<void>;
export declare function addChannels(channels: ChannelEntry[]): Promise<void>;
export declare function removeChannel(id: string): Promise<void>;
export declare function clearChannels(): Promise<void>;
export declare function getAllKeywords(): Promise<KeywordEntry[]>;
export declare function addKeyword(keyword: KeywordEntry): Promise<void>;
export declare function addKeywords(keywords: KeywordEntry[]): Promise<void>;
export declare function removeKeyword(keyword: string): Promise<void>;
export declare function clearKeywords(): Promise<void>;
export declare function loadBuiltinData(): Promise<void>;
export declare function buildKeywordTrie(): Promise<KeywordTrie>;
export declare function buildChannelSet(): Promise<IdSet>;
export declare function addToStore(storeName: string, item: any): Promise<void>;
export declare function removeFromStore(storeName: string, key: string): Promise<void>;
export declare function getFromStore(storeName: string, key: string): Promise<any>;
export declare function updateInStore(storeName: string, key: string, updates: any): Promise<any | null>;
export declare function toggleInStore(storeName: string, key: string, field: string): Promise<any | null>;
export declare function addLog(log: BlockLog): Promise<void>;
export declare function getLogs(limit?: number): Promise<BlockLog[]>;
export declare function clearLogs(): Promise<void>;
export declare function exportAllData(): Promise<ExportData>;
export declare function importAllData(data: ExportData): Promise<{
    success: boolean;
    imported: {
        channels: number;
        keywords: number;
        videos: number;
        playlists: number;
        regex: number;
        allowlist: number;
    };
    errors: string[];
}>;
export declare function getStats(): Promise<{
    totalChannels: number;
    totalKeywords: number;
    totalVideos: number;
    totalRegex: number;
    totalLogs: number;
    blockedToday: number;
    enabledCategories: number;
}>;
//# sourceMappingURL=storage.d.ts.map