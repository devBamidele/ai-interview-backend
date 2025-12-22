import * as crypto from 'crypto';

/**
 * Generate a secure random access token for interview access
 * Format: 64 characters hex string (256 bits of entropy)
 */
export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate access token format
 */
export function isValidAccessToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}
