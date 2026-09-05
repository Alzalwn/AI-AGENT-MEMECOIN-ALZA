/**
 * Grok Trencher - Admin Session & Passcode Authentication Engine
 * Operates natively via Web Crypto API (compatible with Edge Middleware & Node runtime).
 */

export const AUTH_COOKIE_NAME = 'gt_admin_session';

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
 * Verify HMAC SHA-256 session token
 */
export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token || !token.includes('.')) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  try {
    const expectedToken = await signSession(payload);
    const [, expectedSig] = expectedToken.split('.');
    return signature === expectedSig;
  } catch {
    return false;
  }
}
