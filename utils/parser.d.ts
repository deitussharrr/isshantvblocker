/**
 * Parser utilities for importing blocklist data from various formats.
 * Supports JSON, CSV, TXT, and paste formats.
 */
export interface ParsedItem {
    type: 'channel' | 'keyword' | 'video' | 'playlist' | 'regex' | 'allowlist';
    value: string;
    label?: string;
    category?: string;
}
/**
 * Parse JSON import data
 */
export declare function parseJSON(json: string): ParsedItem[];
/**
 * Parse CSV import data
 * Expected format (header line): type,value,label,category
 */
export declare function parseCSV(csv: string): ParsedItem[];
/**
 * Parse TXT import (one item per line)
 * Supported formats:
 * - channel_id
 * - keyword
 * - channel_id, channel_name
 * - type:value
 * - type:value:label
 */
export declare function parseTXT(txt: string): ParsedItem[];
/**
 * Parse pasted text (auto-detect format)
 */
export declare function parsePaste(text: string): ParsedItem[];
/**
 * Convert items to CSV format
 */
export declare function itemsToCSV(items: ParsedItem[]): string;
/**
 * Convert items to TXT format
 */
export declare function itemsToTXT(items: ParsedItem[]): string;
/**
 * Validate a channel ID format (UC + 22 characters)
 */
export declare function isValidChannelId(id: string): boolean;
/**
 * Validate a video ID format (11 characters)
 */
export declare function isValidVideoId(id: string): boolean;
/**
 * Validate a regex pattern
 */
export declare function isValidRegex(pattern: string): boolean;
//# sourceMappingURL=parser.d.ts.map