import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthUtils } from '@/lib/auth/auth.utils';

export async function GET(request: NextRequest) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    AuthUtils.clearFromNextResponse(response);
    return response;
}
