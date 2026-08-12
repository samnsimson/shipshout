import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthCookieUtils } from '../../../lib/auth/auth-cookie.utils';

export async function GET(request: NextRequest) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    AuthCookieUtils.clearFromNextResponse(response);
    return response;
}
