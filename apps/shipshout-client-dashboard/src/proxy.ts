import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasAuthCookies } from './lib/auth/cookies';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isProtected = pathname.startsWith('/dashboard');

    if (isProtected && !hasAuthCookies(request)) return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password', '/auth/callback'],
};
