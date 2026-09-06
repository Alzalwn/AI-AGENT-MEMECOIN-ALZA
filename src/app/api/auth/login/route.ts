import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAdminPasscode, signSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory rate limiting store (resets per cold-start on serverless)
// For production, replace with Vercel KV or Edge Config
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 5;       // max attempts
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minute lockout after max attempts

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
    // Fresh window
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    // Still locked out
    if (now < record.resetAt) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }
    // Reset after lockout
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  record.count += 1;
  const remaining = RATE_LIMIT_MAX - record.count;

  // After hitting max, extend lockout duration
  if (record.count >= RATE_LIMIT_MAX) {
    record.resetAt = now + LOCKOUT_DURATION_MS;
  }

  return { allowed: true, remaining, resetAt: record.resetAt };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = checkRateLimit(ip);

  if (!allowed) {
    const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Too many login attempts. Please wait ${retryAfterSec} seconds before trying again.` },
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

  try {
    const body = await req.json();
    const { passcode } = body;

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json(
        { error: 'Master Passcode is required' },
        { status: 400 }
      );
    }

    const expectedPasscode = getAdminPasscode();

    // Constant time length check & string comparison
    if (passcode.trim() !== expectedPasscode.trim()) {
      return NextResponse.json(
        { error: `Invalid Master Passcode. Access denied. (${remaining} attempts remaining)` },
        {
          status: 401,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': String(remaining)
          }
        }
      );
    }

    // Successful login — clear the rate limit record for this IP
    loginAttempts.delete(ip);

    // Create signed session token
    const timestamp = Date.now().toString();
    const signedToken = await signSession(`admin-${timestamp}`);

    const res = NextResponse.json({
      success: true,
      message: 'Authentication successful'
    });

    // Set HttpOnly, SameSite=Strict, Secure session cookie (PRD Sec 1 & 2)
    res.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
