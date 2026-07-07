import crypto from 'crypto';

/**
 * Generates a cryptographically random password.
 * Excludes visually ambiguous characters: 0, O, 1, l, I
 */
export function generateInitialPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let pwd = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}
