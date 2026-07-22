/**
 * Password system for IsshanTV Guardian.
 * Uses SHA-256 hashing with salt.
 * Never stores plaintext passwords.
 * Never reversible.
 */

import { getSettings, updateSettings } from './storage';

/**
 * Generate a cryptographically random salt
 */
export function generateSalt(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a password with salt using SHA-256
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a password has been set
 */
export async function isPasswordCreated(): Promise<boolean> {
  const settings = await getSettings();
  return settings.password.created;
}

/**
 * Create a new password
 */
export async function createPassword(password: string): Promise<boolean> {
  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }

  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  await updateSettings({
    password: {
      hash,
      salt,
      created: true,
    },
  });

  return true;
}

/**
 * Verify a password against stored hash
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const settings = await getSettings();

  if (!settings.password.created) {
    return false;
  }

  const hash = await hashPassword(password, settings.password.salt);
  return hash === settings.password.hash;
}

/**
 * Change the password (requires old password verification)
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const isValid = await verifyPassword(oldPassword);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  if (newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters long');
  }

  return createPassword(newPassword);
}

/**
 * Temporary unlock verification
 */
export async function isTemporarilyUnlocked(): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.temporaryUnlock.active) return false;

  if (Date.now() >= settings.temporaryUnlock.expiresAt) {
    // Expired, auto-relock
    await updateSettings({
      temporaryUnlock: { active: false, expiresAt: 0 },
    });
    return false;
  }

  return true;
}

/**
 * Set temporary unlock with duration in milliseconds
 */
export async function setTemporaryUnlock(durationMs: number): Promise<boolean> {
  await updateSettings({
    temporaryUnlock: {
      active: true,
      expiresAt: Date.now() + durationMs,
    },
  });
  return true;
}

/**
 * Lock immediately (cancel temporary unlock)
 */
export async function lockNow(): Promise<void> {
  await updateSettings({
    temporaryUnlock: { active: false, expiresAt: 0 },
  });
}

/**
 * Get remaining unlock time in milliseconds
 */
export async function getRemainingUnlockTime(): Promise<number> {
  const settings = await getSettings();
  if (!settings.temporaryUnlock.active) return 0;

  const remaining = settings.temporaryUnlock.expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Validate password strength
 * Returns an object with strength score and feedback
 */
export function validatePasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 4) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length < 4) {
    feedback.push('Password must be at least 4 characters');
  }
  if (password.length < 8 && password.length >= 4) {
    feedback.push('Consider using at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add an uppercase letter for stronger security');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Add a number for stronger security');
  }

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return {
    score,
    label: labels[score] || 'Weak',
    feedback,
  };
}
