import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySession } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public static assets and auth API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/wallet') ||
    pathname === '/robots.txt' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySession(token);

  // 2. If user is on /login page
  if (pathname === '/login') {
    if (isAuthenticated) {
      // Already logged in, redirect to main terminal
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 3. For all other protected routes (Dashboard, /api/*)
  if (!isAuthenticated) {
    // If request is an API call, return 401 Unauthorized JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Private Grok Trencher Admin Session Required' },
        { status: 401 }
      );
    }

    // For browser pages, redirect to login screen
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
