/**
 * Password system for IsshanTV Guardian.
 * Uses SHA-256 hashing with salt.
 * Never stores plaintext passwords.
 * Never reversible.
 */
/**
 * Generate a cryptographically random salt
 */
export declare function generateSalt(): string;
/**
 * Hash a password with salt using SHA-256
 */
export declare function hashPassword(password: string, salt: string): Promise<string>;
/**
 * Check if a password has been set
 */
export declare function isPasswordCreated(): Promise<boolean>;
/**
 * Create a new password
 */
export declare function createPassword(password: string): Promise<boolean>;
/**
 * Verify a password against stored hash
 */
export declare function verifyPassword(password: string): Promise<boolean>;
/**
 * Change the password (requires old password verification)
 */
export declare function changePassword(oldPassword: string, newPassword: string): Promise<boolean>;
/**
 * Temporary unlock verification
 */
export declare function isTemporarilyUnlocked(): Promise<boolean>;
/**
 * Set temporary unlock with duration in milliseconds
 */
export declare function setTemporaryUnlock(durationMs: number): Promise<boolean>;
/**
 * Lock immediately (cancel temporary unlock)
 */
export declare function lockNow(): Promise<void>;
/**
 * Get remaining unlock time in milliseconds
 */
export declare function getRemainingUnlockTime(): Promise<number>;
/**
 * Validate password strength
 * Returns an object with strength score and feedback
 */
export declare function validatePasswordStrength(password: string): {
    score: number;
    label: string;
    feedback: string[];
};
//# sourceMappingURL=password.d.ts.map