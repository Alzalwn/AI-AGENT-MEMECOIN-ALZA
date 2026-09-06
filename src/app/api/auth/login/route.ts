import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, signSession } from '@/lib/auth';
import { getActivePasscode, setActivePasscode } from '@/lib/passcodeStorage';

export const dynamic = 'force-dynamic';

// In-memory rate limiting store (resets per cold-start on serverless)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 10;                  // max 10 attempts before lockout
const RATE_LIMIT_WINDOW_MS = 60 * 1000;     // 1 minute window
const LOCKOUT_DURATION_MS = 2 * 60 * 1000;  // 2 minute lockout after max attempts

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    if (now < record.resetAt) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  record.count += 1;
  const remaining = RATE_LIMIT_MAX - record.count;

  if (record.count >= RATE_LIMIT_MAX) {
    record.resetAt = now + LOCKOUT_DURATION_MS;
  }

  return { allowed: true, remaining, resetAt: record.resetAt };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const body = await req.json();
    const { passcode } = body;

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json(
        { error: 'Master Passcode is required' },
        { status: 400 }
      );
    }

    const inputPasscode = passcode.trim();
    const expectedPasscode = getActivePasscode().trim();

    // Resilient passcode verification: accepts current active, new Alza0839, or legacy Alza0838
    const isValid =
      inputPasscode === expectedPasscode ||
      inputPasscode === 'Alza0839' ||
      inputPasscode === 'Alza0838';

    // If correct password was entered, clear rate limit immediately even if previously locked out!
    if (isValid) {
      loginAttempts.delete(ip);

      // Auto-sync storage to Alza0839 if not already active
      if (expectedPasscode !== 'Alza0839') {
        setActivePasscode('Alza0839');
      }

      // Create signed session token
      const timestamp = Date.now().toString();
      const signedToken = await signSession(`admin-${timestamp}`);

      const res = NextResponse.json({
        success: true,
        message: 'Authentication successful'
      });

      // Determine if connection is actually HTTPS or HTTP
      const proto =
        req.headers.get('x-forwarded-proto') ||
        req.nextUrl.protocol.replace(':', '');
      const isHttps = proto === 'https';

      // Set cookie. If accessed via HTTP (e.g. http://103.30.194.148:3000), secure MUST be false
      // so modern browsers won't reject or drop the cookie!
      res.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: signedToken,
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return res;
    }

    // If password was incorrect, apply rate limit check
    const { allowed, remaining, resetAt } = checkRateLimit(ip);

    if (!allowed) {
      const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak percobaan gagal. Silakan tunggu ${retryAfterSec} detik sebelum mencoba lagi.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000))
          }
        }
      );
    }

    return NextResponse.json(
      { error: `Passcode salah. Akses ditolak. (Sisa percobaan: ${remaining})` },
      {
        status: 401,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': String(remaining)
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
