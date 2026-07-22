/**
 * Unit tests for parser utilities.
 */

import {
  parseJSON,
  parseCSV,
  parseTXT,
  parsePaste,
  itemsToCSV,
  itemsToTXT,
  isValidChannelId,
  isValidVideoId,
  isValidRegex,
} from '../src/utils/parser';

describe('Parser Utilities', () => {
  describe('parseJSON', () => {
    test('should parse array format', () => {
      const json = JSON.stringify([
        { id: 'UC123', name: 'Channel 1', category: 'nursery' },
        { keyword: 'test', category: 'custom' },
      ]);

      const items = parseJSON(json);
      expect(items.length).toBe(2);
      expect(items[0].type).toBe('channel');
      expect(items[1].type).toBe('keyword');
    });

    test('should parse object format with typed arrays', () => {
      const json = JSON.stringify({
        channels: [
          { id: 'UC123', name: 'Channel 1', category: 'nursery' },
        ],
        keywords: [
          { keyword: 'test', category: 'custom' },
        ],
      });

      const items = parseJSON(json);
      expect(items.length).toBe(2);
    });

    test('should throw on invalid JSON', () => {
      expect(() => parseJSON('invalid json')).toThrow('Invalid JSON syntax');
    });
  });

  describe('parseCSV', () => {
    test('should parse CSV with header', () => {
      const csv = 'type,value,label,category\nchannel,UC123,Channel 1,nursery\nkeyword,baby shark,,nursery';
      const items = parseCSV(csv);
      expect(items.length).toBe(2);
      expect(items[0].type).toBe('channel');
      expect(items[0].value).toBe('UC123');
      expect(items[1].type).toBe('keyword');
      expect(items[1].value).toBe('baby shark');
    });

    test('should handle quoted values', () => {
      const csv = 'type,value,label,category\nkeyword,"test, with comma",Test,nursery';
      const items = parseCSV(csv);
      expect(items.length).toBe(1);
      expect(items[0].value).toBe('test, with comma');
    });
  });

  describe('parseTXT', () => {
    test('should parse type:value format', () => {
      const txt = 'keyword:baby shark\nchannel:UC1234567890123456789012';
      const items = parseTXT(txt);
      expect(items.length).toBe(2);
      expect(items[0].type).toBe('keyword');
      expect(items[0].value).toBe('baby shark');
      expect(items[1].type).toBe('channel');
    });

    test('should treat plain lines as keywords', () => {
      const txt = 'cocomelon\nbaby shark\nskibidi toilet';
      const items = parseTXT(txt);
      expect(items.length).toBe(3);
      expect(items[0].type).toBe('keyword');
    });

    test('should skip comments', () => {
      const txt = '# This is a comment\nkeyword:test\n// Another comment\nkeyword:test2';
      const items = parseTXT(txt);
      expect(items.length).toBe(2);
    });

    test('should parse channel with name', () => {
      const txt = 'UC1234567890123456789012, My Channel';
      const items = parseTXT(txt);
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('channel');
      expect(items[0].value).toBe('UC1234567890123456789012');
      expect(items[0].label).toBe('My Channel');
    });
  });

  describe('parsePaste', () => {
    test('should auto-detect JSON', () => {
      const text = JSON.stringify([{ keyword: 'test', category: 'custom' }]);
      const items = parsePaste(text);
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('keyword');
    });

    test('should auto-detect TXT format', () => {
      const items = parsePaste('keyword:test\ncocomelon');
      expect(items.length).toBe(2);
    });
  });

  describe('itemsToCSV', () => {
    test('should produce valid CSV', () => {
      const csv = itemsToCSV([
        { type: 'channel', value: 'UC123', label: 'Channel 1', category: 'nursery' },
        { type: 'keyword', value: 'test' },
      ]);
      expect(csv).toContain('type,value,label,category');
      expect(csv).toContain('channel,UC123,Channel 1,nursery');
      expect(csv).toContain('keyword,test,,');
    });
  });

  describe('itemsToTXT', () => {
    test('should produce valid TXT', () => {
      const txt = itemsToTXT([
        { type: 'channel', value: 'UC123', label: 'Channel 1' },
        { type: 'keyword', value: 'test' },
      ]);
      expect(txt).toContain('UC123, Channel 1');
      expect(txt).toContain('keyword:test');
    });
  });

  describe('Validation', () => {
    test('isValidChannelId', () => {
      expect(isValidChannelId('UC1234567890123456789012')).toBe(true);
      expect(isValidChannelId('invalid')).toBe(false);
      expect(isValidChannelId('')).toBe(false);
    });

    test('isValidVideoId', () => {
      expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
      expect(isValidVideoId('invalidlongid123')).toBe(false);
      expect(isValidVideoId('')).toBe(false);
    });

    test('isValidRegex', () => {
      expect(isValidRegex('.*test.*')).toBe(true);
      expect(isValidRegex('(')).toBe(false);
      expect(isValidRegex('[a-z]')).toBe(true);
    });
  });
});
