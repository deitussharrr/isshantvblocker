/**
 * Export/Import system for blocklist data.
 * Supports JSON, CSV, TXT formats.
 */
import type { ChannelEntry, KeywordEntry, VideoEntry, PlaylistEntry, RegexEntry, AllowlistEntry, AppSettings, BlockLog, ExportData, ImportResult } from '../types';
/**
 * Export all data to JSON format
 */
export declare function exportToJSON(channels: ChannelEntry[], keywords: KeywordEntry[], videos: VideoEntry[], playlists: PlaylistEntry[], regex: RegexEntry[], allowlist: AllowlistEntry[], settings: AppSettings, logs: BlockLog[]): string;
/**
 * Export data to CSV format
 */
export declare function exportToCSV(channels: ChannelEntry[], keywords: KeywordEntry[], videos: VideoEntry[], playlists: PlaylistEntry[], regex: RegexEntry[]): string;
/**
 * Export data to TXT format
 */
export declare function exportToTXT(channels: ChannelEntry[], keywords: KeywordEntry[], videos: VideoEntry[], playlists: PlaylistEntry[], regex: RegexEntry[]): string;
/**
 * Validate imported data against expected schema
 */
export declare function validateImportData(data: ExportData): ImportResult;
/**
 * Create a backup filename with timestamp
 */
export declare function generateBackupFilename(prefix?: string): string;
/**
 * Format file size for display
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Chrome download helper
 */
export declare function downloadFile(content: string, filename: string, mimeType?: string): void;
/**
 * Read file as text using FileReader
 */
export declare function readFileAsText(file: File): Promise<string>;
//# sourceMappingURL=export-import.d.ts.map