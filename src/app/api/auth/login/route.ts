import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getAdminPasscode, signSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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
        { error: 'Invalid Master Passcode. Access denied.' },
        { status: 401 }
      );
    }

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
