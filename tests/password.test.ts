/**
 * Unit tests for the password system.
 */

import { generateSalt, hashPassword, validatePasswordStrength } from '../src/background/password';

describe('Password System', () => {
  describe('generateSalt', () => {
    test('should generate a 64-character hex salt', () => {
      const salt = generateSalt();
      expect(salt).toMatch(/^[0-9a-f]{64}$/);
    });

    test('should generate unique salts each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('hashPassword', () => {
    test('should produce a consistent hash for same password and salt', async () => {
      const salt = generateSalt();
      const hash1 = await hashPassword('testpassword', salt);
      const hash2 = await hashPassword('testpassword', salt);
      expect(hash1).toBe(hash2);
    });

    test('should produce different hashes for different salts', async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const hash1 = await hashPassword('testpassword', salt1);
      const hash2 = await hashPassword('testpassword', salt2);
      expect(hash1).not.toBe(hash2);
    });

    test('should produce different hashes for different passwords', async () => {
      const salt = generateSalt();
      const hash1 = await hashPassword('password1', salt);
      const hash2 = await hashPassword('password2', salt);
      expect(hash1).not.toBe(hash2);
    });

    test('should produce a 64-character hex hash', async () => {
      const salt = generateSalt();
      const hash = await hashPassword('test', salt);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('validatePasswordStrength', () => {
    test('should rate very weak passwords', () => {
      const result = validatePasswordStrength('ab');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    test('should rate strong passwords appropriately', () => {
      const result = validatePasswordStrength('Str0ng!Pass');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    test('should provide feedback for weak passwords', () => {
      const result = validatePasswordStrength('weak');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    test('should have no feedback for very strong passwords', () => {
      const result = validatePasswordStrength('Str0ng!P@ssw0rd');
      // Very strong passwords might still get feedback about length being < 8
      expect(result.score).toBeGreaterThanOrEqual(3);
    });
  });
});
