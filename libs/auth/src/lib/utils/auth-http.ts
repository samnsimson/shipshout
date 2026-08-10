import { BadRequestException, ConflictException, HttpException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { APIError } from 'better-auth/api';

export function applyAuthCookies(res: Response, headers: Headers): void {
    const cookies = headers.getSetCookie?.() ?? [];
    for (const cookie of cookies) res.append('Set-Cookie', cookie);

    if (cookies.length === 0) {
        const single = headers.get('set-cookie');
        if (single) res.append('Set-Cookie', single);
    }
}

export function mapAuthError(error: unknown): never {
    if (error instanceof APIError) {
        const status = typeof error.statusCode === 'number' ? error.statusCode : Number(error.status) || 500;
        const message = error.message || 'Authentication error';
        const code = String((error as { body?: { code?: string } }).body?.code ?? message).toUpperCase();

        if (status === 401 || code.includes('CREDENTIAL') || (code.includes('INVALID') && code.includes('PASSWORD'))) {
            throw new UnauthorizedException(message);
        }
        if (status === 409 || code.includes('EXISTS') || code.includes('ALREADY')) throw new ConflictException(message);
        if (status >= 400 && status < 500) throw new BadRequestException(message);
        throw new HttpException(message, status);
    }

    throw new InternalServerErrorException('Authentication failed');
}
