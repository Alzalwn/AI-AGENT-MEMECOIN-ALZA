/**
 * Grok Trencher - Admin Session & Passcode Authentication Engine
 * Operates natively via Web Crypto API (compatible with Edge Middleware & Node runtime).
 */

export const AUTH_COOKIE_NAME = 'gt_admin_session';

// Session lifetime — must match cookie maxAge
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Fallback secret for hashing if not explicitly provided in environment
const DEFAULT_SECRET = 'grok-trencher-solana-terminal-ultra-secure-key-2026';
const DEFAULT_PASSCODE = 'grok2026'; // Default password if ADMIN_PASSCODE is not set in .env

export function getAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;
}

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

/**
 * Generate HMAC SHA-256 signature for the session
 */
export async function signSession(payload: string): Promise<string> {
  const secret = getAuthSecret();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const hexSignature = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${payload}.${hexSignature}`;
}

/**
 * Verify HMAC SHA-256 session token AND validate timestamp expiry.
 * Payload format: "admin-{timestamp_ms}"
 */
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token || !token.includes('.')) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  try {
    // 1. Verify HMAC signature
    const expectedToken = await signSession(payload);
    const [, expectedSig] = expectedToken.split('.');
    if (signature !== expectedSig) return false;

    // 2. Validate timestamp expiry
    // Payload format: "admin-{timestamp_ms}"
    const match = payload.match(/^admin-(\d+)$/);
    if (!match) return false;

    const issuedAt = parseInt(match[1], 10);
    if (isNaN(issuedAt)) return false;

    const age = Date.now() - issuedAt;
    if (age > SESSION_MAX_AGE_MS || age < 0) {
      // Token expired or timestamp is in the future (clock skew / tampered)
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
