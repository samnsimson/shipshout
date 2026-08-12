import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasAuthCookies } from './lib/auth/cookies';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = hasAuthCookies(request);
    const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname);
    const isProtected = pathname.startsWith('/dashboard');

    if (isProtected && !session) return NextResponse.redirect(new URL('/login', request.url));
    if (isAuthPage && session) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password', '/auth/callback'],
};
