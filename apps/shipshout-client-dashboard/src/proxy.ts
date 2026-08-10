import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAMES } from './lib/auth/cookies';

function hasSession(request: NextRequest): boolean {
    return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = hasSession(request);
    const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname);
    const isProtected = pathname.startsWith('/dashboard');

    if (isProtected && !session) return NextResponse.redirect(new URL('/login', request.url));
    if (isAuthPage && session) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password'],
};
