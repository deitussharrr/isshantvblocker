/**
 * Unit tests for export/import utilities.
 */

import { validateImportData, generateBackupFilename, formatFileSize } from '../src/utils/export-import';
import type { ExportData } from '../src/types';

describe('Export/Import Utilities', () => {
  describe('validateImportData', () => {
    test('should validate valid data', () => {
      const data: ExportData = {
        version: 1,
        exportedAt: Date.now(),
        channels: [{ id: 'UC123', name: 'Test', category: 'nursery', enabled: true, builtin: true }],
        keywords: [{ keyword: 'test', category: 'nursery', enabled: true, builtin: true }],
        videos: [],
        playlists: [],
        regex: [{ pattern: '.*test.*', flags: 'i', description: 'Test regex', category: 'custom', enabled: true, builtin: true }],
        allowlist: [{ id: '1', type: 'channel', value: 'UC123', enabled: true }],
        settings: {} as any,
        logs: [],
      };

      const result = validateImportData(data);
      expect(result.success).toBe(true);
      expect(result.imported.channels).toBe(1);
      expect(result.imported.keywords).toBe(1);
      expect(result.imported.regex).toBe(1);
    });

    test('should flag invalid data', () => {
      const data = {
        version: 1,
        exportedAt: Date.now(),
        channels: [{ id: 'UC123' }], // Missing name
        keywords: [{}], // Missing keyword
        regex: [{ pattern: '(' }], // Invalid regex
        allowlist: [{ id: '1', type: 'channel' }], // Missing value
      } as any;

      const result = validateImportData(data);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle null/undefined data', () => {
      const result = validateImportData(null as any);
      expect(result.success).toBe(false);
    });
  });

  describe('generateBackupFilename', () => {
    test('should generate filename with timestamp', () => {
      const filename = generateBackupFilename('guardian-backup');
      expect(filename).toMatch(/^guardian-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
    });

    test('should use default prefix', () => {
      const filename = generateBackupFilename();
      expect(filename).toMatch(/^guardian-backup-/);
    });
  });

  describe('formatFileSize', () => {
    test('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    test('should format KB', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    test('should format MB', () => {
      expect(formatFileSize(2097152)).toBe('2.0 MB');
    });
  });
});
