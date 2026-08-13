import { NextRequest, NextResponse } from 'next/server';
import { AuthApi } from '@/lib/auth/auth.api';
import { AuthUtils } from '@/lib/auth/auth.utils';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
    if (!token) return NextResponse.redirect(new URL('/login', request.url));

    const response = await AuthApi.fetch('/auth/one-time-token/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });

    if (!response.ok) {
        const message = await AuthApi.readErrorMessage(response);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
    }

    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    AuthUtils.applyToNextResponse(redirect, response);
    return redirect;
}
