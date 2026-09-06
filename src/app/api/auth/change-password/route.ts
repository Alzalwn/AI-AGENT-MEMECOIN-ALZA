import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySession, signSession } from '@/lib/auth';
import { getActivePasscode, setActivePasscode } from '@/lib/passcodeStorage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/change-password
 * Checks authentication status and provides security metadata (without exposing password)
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySession(token);

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Sesi admin diperlukan.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    message: 'Admin session verified'
  });
}

/**
 * POST /api/auth/change-password
 * Allows the authenticated administrator to update their master terminal password.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySession(token);

  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Sesi admin tidak valid atau telah kedaluwarsa. Silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { currentPasscode, newPasscode, confirmPasscode } = body;

    // 1. Basic validation
    if (!currentPasscode || typeof currentPasscode !== 'string') {
      return NextResponse.json(
        { error: 'Password saat ini wajib diisi.' },
        { status: 400 }
      );
    }

    if (!newPasscode || typeof newPasscode !== 'string') {
      return NextResponse.json(
        { error: 'Password baru wajib diisi.' },
        { status: 400 }
      );
    }

    if (newPasscode.trim().length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal harus 6 karakter.' },
        { status: 400 }
      );
    }

    if (newPasscode.trim() !== (confirmPasscode || '').trim()) {
      return NextResponse.json(
        { error: 'Konfirmasi password baru tidak cocok.' },
        { status: 400 }
      );
    }

    // 2. Verify current passcode
    const activePasscode = getActivePasscode();
    if (currentPasscode.trim() !== activePasscode.trim()) {
      return NextResponse.json(
        { error: 'Password saat ini salah. Periksa kembali kata sandi lama Anda.' },
        { status: 403 }
      );
    }

    // 3. Prevent setting same passcode
    if (newPasscode.trim() === activePasscode.trim()) {
      return NextResponse.json(
        { error: 'Password baru tidak boleh sama dengan password saat ini.' },
        { status: 400 }
      );
    }

    // 4. Save and persist new passcode
    const saveResult = setActivePasscode(newPasscode.trim());

    // 5. Issue fresh session cookie
    const timestamp = Date.now().toString();
    const signedToken = await signSession(`admin-${timestamp}`);

    const res = NextResponse.json({
      success: true,
      message: 'Password master terminal berhasil diperbarui.',
      persisted: saveResult.persisted
    });

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
      { error: 'Terjadi kesalahan pada server saat mengubah password.' },
      { status: 500 }
    );
  }
}
