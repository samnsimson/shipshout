import { NextRequest, NextResponse } from 'next/server';
import { AuthApi } from '@/lib/auth/auth.api';
import { AuthUtils } from '@/lib/auth/auth.utils';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
    if (!token) return NextResponse.redirect(new URL('/login', request.url));

    const result = await AuthApi.verifyOneTimeToken({ token });

    if (!result.response?.ok) {
        const message = AuthApi.readErrorMessage(result);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url));
    }

    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    if (result.response) AuthUtils.applyToNextResponse(redirect, result.response);
    return redirect;
}
