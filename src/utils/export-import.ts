/**
 * Export/Import system for blocklist data.
 * Supports JSON, CSV, TXT formats.
 */

import type {
  ChannelEntry,
  KeywordEntry,
  VideoEntry,
  PlaylistEntry,
  RegexEntry,
  AllowlistEntry,
  AppSettings,
  BlockLog,
  ExportData,
  ImportResult,
} from '../types';
import { itemsToCSV, itemsToTXT } from './parser';

/**
 * Export all data to JSON format
 */
export function exportToJSON(
  channels: ChannelEntry[],
  keywords: KeywordEntry[],
  videos: VideoEntry[],
  playlists: PlaylistEntry[],
  regex: RegexEntry[],
  allowlist: AllowlistEntry[],
  settings: AppSettings,
  logs: BlockLog[],
): string {
  const data: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    channels,
    keywords,
    videos,
    playlists,
    regex,
    allowlist,
    settings,
    logs,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  channels: ChannelEntry[],
  keywords: KeywordEntry[],
  videos: VideoEntry[],
  playlists: PlaylistEntry[],
  regex: RegexEntry[],
): string {
  const sections: string[] = [];

  if (channels.length > 0) {
    sections.push('# CHANNELS');
    sections.push(itemsToCSV(channels.map(c => ({
      type: 'channel' as const,
      value: c.id,
      label: c.name,
      category: c.category,
    }))));
  }

  if (keywords.length > 0) {
    sections.push('# KEYWORDS');
    sections.push(itemsToCSV(keywords.map(k => ({
      type: 'keyword' as const,
      value: k.keyword,
      category: k.category,
    }))));
  }

  if (videos.length > 0) {
    sections.push('# VIDEOS');
    sections.push(itemsToCSV(videos.map(v => ({
      type: 'video' as const,
      value: v.id,
      label: v.title,
      category: v.category,
    }))));
  }

  if (playlists.length > 0) {
    sections.push('# PLAYLISTS');
    sections.push(itemsToCSV(playlists.map(p => ({
      type: 'playlist' as const,
      value: p.id,
      label: p.title,
      category: p.category,
    }))));
  }

  if (regex.length > 0) {
    sections.push('# REGEX');
    sections.push(itemsToCSV(regex.map(r => ({
      type: 'regex' as const,
      value: r.pattern,
      label: r.description,
      category: r.category,
    }))));
  }

  return sections.join('\n\n');
}

/**
 * Export data to TXT format
 */
export function exportToTXT(
  channels: ChannelEntry[],
  keywords: KeywordEntry[],
  videos: VideoEntry[],
  playlists: PlaylistEntry[],
  regex: RegexEntry[],
): string {
  const sections: string[] = [];

  if (channels.length > 0) {
    sections.push('# CHANNELS');
    sections.push(channels.map(c =>
      c.name ? `channel:${c.id} # ${c.name}` : `channel:${c.id}`
    ).join('\n'));
  }

  if (keywords.length > 0) {
    sections.push('# KEYWORDS');
    sections.push(keywords.map(k => `keyword:${k.keyword}`).join('\n'));
  }

  if (videos.length > 0) {
    sections.push('# VIDEOS');
    sections.push(videos.map(v =>
      v.title ? `video:${v.id} # ${v.title}` : `video:${v.id}`
    ).join('\n'));
  }

  if (playlists.length > 0) {
    sections.push('# PLAYLISTS');
    sections.push(playlists.map(p =>
      p.title ? `playlist:${p.id} # ${p.title}` : `playlist:${p.id}`
    ).join('\n'));
  }

  if (regex.length > 0) {
    sections.push('# REGEX');
    sections.push(regex.map(r =>
      r.description ? `regex:${r.pattern} # ${r.description}` : `regex:${r.pattern}`
    ).join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Validate imported data against expected schema
 */
export function validateImportData(data: ExportData): ImportResult {
  const errors: string[] = [];
  const imported = {
    channels: 0,
    keywords: 0,
    videos: 0,
    playlists: 0,
    regex: 0,
    allowlist: 0,
  };

  if (!data || typeof data !== 'object') {
    return {
      success: false,
      imported,
      errors: ['Invalid data format: expected an object'],
    };
  }

  // Validate channels
  if (Array.isArray(data.channels)) {
    for (const channel of data.channels) {
      if (channel.id && channel.name) {
        imported.channels++;
      } else {
        errors.push(`Invalid channel entry: missing id or name (${JSON.stringify(channel)})`);
      }
    }
  }

  // Validate keywords
  if (Array.isArray(data.keywords)) {
    for (const kw of data.keywords) {
      if (kw.keyword) {
        imported.keywords++;
      } else {
        errors.push(`Invalid keyword entry: missing keyword field`);
      }
    }
  }

  // Validate videos
  if (Array.isArray(data.videos)) {
    for (const video of data.videos) {
      if (video.id && video.title !== undefined) {
        imported.videos++;
      } else {
        errors.push(`Invalid video entry: missing id or title`);
      }
    }
  }

  // Validate playlists
  if (Array.isArray(data.playlists)) {
    for (const playlist of data.playlists) {
      if (playlist.id && playlist.title !== undefined) {
        imported.playlists++;
      } else {
        errors.push(`Invalid playlist entry: missing id or title`);
      }
    }
  }

  // Validate regex rules
  if (Array.isArray(data.regex)) {
    for (const rule of data.regex) {
      if (rule.pattern) {
        try {
          new RegExp(rule.pattern, rule.flags);
          imported.regex++;
        } catch {
          errors.push(`Invalid regex pattern: ${rule.pattern}`);
        }
      } else {
        errors.push(`Invalid regex entry: missing pattern`);
      }
    }
  }

  // Validate allowlist
  if (Array.isArray(data.allowlist)) {
    for (const item of data.allowlist) {
      if (item.id && item.type && item.value !== undefined) {
        imported.allowlist++;
      } else {
        errors.push(`Invalid allowlist entry: missing id, type, or value`);
      }
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}

/**
 * Create a backup filename with timestamp
 */
export function generateBackupFilename(prefix: string = 'guardian-backup'): string {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}.json`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Chrome download helper
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read file as text using FileReader
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
