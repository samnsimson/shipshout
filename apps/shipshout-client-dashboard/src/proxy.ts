import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthUtils } from './lib/auth/auth.utils';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isProtected = pathname.startsWith('/dashboard');

    if (isProtected && !AuthUtils.hasAuthCookies(request)) return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/register', '/forgot-password', '/auth/callback'],
};
