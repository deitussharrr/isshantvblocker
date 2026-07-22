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
export function parseJSON(json: string): ParsedItem[] {
  try {
    const data = JSON.parse(json);

    if (Array.isArray(data)) {
      return parseItemsArray(data);
    }

    if (typeof data === 'object' && data !== null) {
      const items: ParsedItem[] = [];

      for (const key of ['channels', 'keywords', 'videos', 'playlists', 'regex', 'allowlist']) {
        if (Array.isArray(data[key])) {
          items.push(...parseItemsArray(data[key]));
        }
      }

      return items;
    }

    throw new Error('Invalid JSON format: expected an array or object');
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON syntax');
    }
    throw err;
  }
}

function parseItemsArray(arr: unknown[]): ParsedItem[] {
  const items: ParsedItem[] = [];

  for (const item of arr) {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;

      // Channel entry: has id and name
      if (obj.id && obj.name) {
        items.push({
          type: 'channel',
          value: obj.id as string,
          label: obj.name as string,
          category: obj.category as string || undefined,
        });
        continue;
      }

      // Keyword entry: has keyword field
      if (obj.keyword) {
        items.push({
          type: 'keyword',
          value: obj.keyword as string,
          category: obj.category as string || undefined,
        });
        continue;
      }

      // Video entry: has id and title
      if (obj.id && obj.title) {
        items.push({
          type: 'video',
          value: obj.id as string,
          label: obj.title as string,
          category: obj.category as string || undefined,
        });
        continue;
      }

      // Playlist entry: has id and title (no video id pattern)
      if (obj.id && obj.title && typeof obj.id === 'string' && obj.id.startsWith('PL')) {
        items.push({
          type: 'playlist',
          value: obj.id as string,
          label: obj.title as string,
          category: obj.category as string || undefined,
        });
        continue;
      }

      // Regex entry: has pattern field
      if (obj.pattern) {
        items.push({
          type: 'regex',
          value: obj.pattern as string,
          label: obj.description as string || obj.pattern as string,
          category: obj.category as string || undefined,
        });
        continue;
      }

      // Allowlist entry: has id, type, and value
      if (obj.id && obj.type && obj.value !== undefined) {
        items.push({
          type: 'allowlist',
          value: obj.value as string,
          label: obj.label as string || undefined,
          category: obj.category as string || undefined,
        });
        continue;
      }
    }
  }

  return items;
}

/**
 * Parse CSV import data
 * Expected format (header line): type,value,label,category
 */
export function parseCSV(csv: string): ParsedItem[] {
  const lines = csv.split('\n').filter(line => line.trim());
  const items: ParsedItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header line
    if (i === 0 && line.toLowerCase().includes('type')) {
      continue;
    }

    const parts = parseCSVLine(line);
    if (parts.length >= 2) {
      const type = parts[0].trim().toLowerCase() as ParsedItem['type'];
      const value = parts[1].trim();

      if (isValidType(type) && value) {
        items.push({
          type,
          value,
          label: parts[2]?.trim(),
          category: parts[3]?.trim(),
        });
      }
    }
  }

  return items;
}

function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current);
  return parts;
}

/**
 * Parse TXT import (one item per line)
 * Supported formats:
 * - channel_id
 * - keyword
 * - channel_id, channel_name
 * - type:value
 * - type:value:label
 */
export function parseTXT(txt: string): ParsedItem[] {
  const lines = txt.split('\n').filter(line => line.trim());
  const items: ParsedItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    // Check for type:value format
    const typeMatch = trimmed.match(/^(channel|keyword|video|playlist|regex|allowlist):(.+)$/i);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase() as ParsedItem['type'];
      const value = typeMatch[2].trim();

      if (isValidType(type) && value) {
        items.push({ type, value });
      }
      continue;
    }

    // Check for comma-separated: channel_id, channel_name
    if (trimmed.includes(',')) {
      const [id, ...rest] = trimmed.split(',').map(s => s.trim());
      if (id && id.startsWith('UC')) {
        items.push({
          type: 'channel',
          value: id,
          label: rest.join(', '),
        });
        continue;
      }
    }

    // Default: treat as keyword
    if (trimmed.length > 0) {
      items.push({ type: 'keyword', value: trimmed });
    }
  }

  return items;
}

/**
 * Parse pasted text (auto-detect format)
 */
export function parsePaste(text: string): ParsedItem[] {
  const trimmed = text.trim();

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return parseJSON(trimmed);
    } catch {
      // Not JSON, continue to other formats
    }
  }

  // Check if it looks like CSV (has header-like line)
  const firstLine = trimmed.split('\n')[0].toLowerCase();
  if (firstLine.includes('type,') || firstLine.includes('type,')) {
    return parseCSV(trimmed);
  }

  // Default to TXT format
  return parseTXT(trimmed);
}

function isValidType(type: string): type is ParsedItem['type'] {
  return ['channel', 'keyword', 'video', 'playlist', 'regex', 'allowlist'].includes(type);
}

/**
 * Convert items to CSV format
 */
export function itemsToCSV(items: ParsedItem[]): string {
  const header = 'type,value,label,category';
  const lines = items.map(item => {
    const value = escapeCSV(item.value);
    const label = item.label ? escapeCSV(item.label) : '';
    const category = item.category ? escapeCSV(item.category) : '';
    return `${item.type},${value},${label},${category}`;
  });
  return [header, ...lines].join('\n');
}

/**
 * Convert items to TXT format
 */
export function itemsToTXT(items: ParsedItem[]): string {
  return items
    .map(item => {
      if (item.type === 'channel') {
        return item.label ? `${item.value}, ${item.label}` : item.value;
      }
      return item.label ? `${item.type}:${item.value} # ${item.label}` : `${item.type}:${item.value}`;
    })
    .join('\n');
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Validate a channel ID format (UC + 22 characters)
 */
export function isValidChannelId(id: string): boolean {
  return /^UC[\w-]{22}$/.test(id);
}

/**
 * Validate a video ID format (11 characters)
 */
export function isValidVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

/**
 * Validate a regex pattern
 */
export function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
