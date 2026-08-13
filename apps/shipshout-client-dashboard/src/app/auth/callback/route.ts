import { NextRequest, NextResponse } from 'next/server';
import { authFetch, readErrorMessage } from '@/lib/auth/api';
import { AuthCookieUtils } from '@/lib/auth/auth-cookie.utils';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
    if (!token) return NextResponse.redirect(new URL('/login', request.url));

    const response = await authFetch('/auth/one-time-token/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });

    if (!response.ok) {
        const message = await readErrorMessage(response);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
    }

    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    AuthCookieUtils.applyToNextResponse(redirect, response);
    return redirect;
}
