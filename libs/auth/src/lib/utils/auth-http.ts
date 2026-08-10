import { BadRequestException, ConflictException, HttpException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { APIError } from 'better-auth/api';
import { EmailAdapter } from '../email/email-adapter';

export class AuthUtils {
    private static readonly emailAdapter = new EmailAdapter();

    static applyAuthCookies(res: Response, headers: Headers): void {
        const cookies = headers.getSetCookie?.() ?? [];
        for (const cookie of cookies) res.append('Set-Cookie', cookie);
        if (cookies.length === 0) {
            const single = headers.get('set-cookie');
            if (single) res.append('Set-Cookie', single);
        }
    }

    static async sendResetPasswordEmail(user: { email: string }, url: string): Promise<void> {
        await this.emailAdapter.send({
            to: user.email,
            subject: 'Reset your password',
            text: url,
            html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
        });
    }

    static async sendVerificationEmail(user: { email: string }, url: string): Promise<void> {
        await this.emailAdapter.send({
            to: user.email,
            subject: 'Verify your email',
            text: url,
            html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`,
        });
    }

    static mapAuthError(error: unknown): never {
        if (error instanceof HttpException) throw error;

        if (error instanceof APIError) {
            const status = typeof error.statusCode === 'number' ? error.statusCode : Number(error.status) || 500;
            const message = error.message || 'Authentication error';
            const code = String((error as { body?: { code?: string } }).body?.code ?? message).toUpperCase();
            const isUnauthorized = status === 401 || code.includes('CREDENTIAL') || (code.includes('INVALID') && code.includes('PASSWORD'));
            if (isUnauthorized) throw new UnauthorizedException(message);
            const isConflict = status === 409 || code.includes('EXISTS') || code.includes('ALREADY');
            if (isConflict) throw new ConflictException(message);
            const isBadRequest = status >= 400 && status < 500;
            if (isBadRequest) throw new BadRequestException(message);
            throw new HttpException(message, status);
        }

        // Better Auth may throw APIError from a duplicate package copy — detect by shape.
        if (error && typeof error === 'object' && 'statusCode' in error && 'message' in error) {
            const status = Number((error as { statusCode?: number; status?: string | number }).statusCode ?? (error as { status?: string | number }).status) || 500;
            const message = String((error as { message?: string }).message || 'Authentication error');
            if (status === 401) throw new UnauthorizedException(message);
            if (status === 409) throw new ConflictException(message);
            if (status >= 400 && status < 500) throw new BadRequestException(message);
            throw new HttpException(message, status);
        }

        const message = error instanceof Error ? error.message : 'Authentication failed';
        throw new InternalServerErrorException(message);
    }
}
