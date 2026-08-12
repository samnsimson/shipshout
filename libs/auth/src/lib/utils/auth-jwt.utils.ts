import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request as ExpressRequest, Response } from 'express';
import {
    AUTH_ACCESS_MAX_AGE_SEC,
    AUTH_REFRESH_COOKIE,
    AUTH_REFRESH_COOKIE_NAMES,
    AUTH_REFRESH_MAX_AGE_SEC,
    AUTH_TOKEN_COOKIE,
    AUTH_TOKEN_COOKIE_NAMES,
    AuthTokenPair,
    BA_SESSION_COOKIE_NAMES,
    SECURE_AUTH_REFRESH_COOKIE,
    SECURE_AUTH_TOKEN_COOKIE,
} from '../constants/auth.constants';
import { AuthOptions } from '../contracts/types/auth.types';
import { JwtUserPayload } from '../contracts/types/jwt-user.types';

type AuthCookieOptions = Pick<AuthOptions, 'cookieDomain' | 'baseUrl'>;

type RequestWithCookies = Pick<ExpressRequest, 'headers'> & {
    cookies?: Record<string, string | undefined>;
};

export class AuthJwtUtils {
    static parseSessionTokenFromHeaders(headers: Headers): string | null {
        const cookies = headers.getSetCookie?.() ?? [];
        if (cookies.length === 0) {
            const single = headers.get('set-cookie');
            if (single) cookies.push(single);
        }
        for (const header of cookies) {
            const parsed = this.parseSetCookie(header);
            if (!parsed) continue;
            if ((BA_SESSION_COOKIE_NAMES as readonly string[]).includes(parsed.name)) return parsed.value;
        }
        return null;
    }

    static applyAuthTokens(res: Response, tokens: AuthTokenPair, opts: AuthCookieOptions): void {
        const { tokenName, refreshName, secure } = this.cookieNames(opts);
        res.append('Set-Cookie', this.buildSetCookie(tokenName, tokens.accessToken, AUTH_ACCESS_MAX_AGE_SEC, opts, secure));
        res.append('Set-Cookie', this.buildSetCookie(refreshName, tokens.refreshToken, AUTH_REFRESH_MAX_AGE_SEC, opts, secure));
    }

    static clearAuthTokens(res: Response, opts: AuthCookieOptions): void {
        const { tokenName, refreshName, secure } = this.cookieNames(opts);
        res.append('Set-Cookie', this.buildSetCookie(tokenName, '', 0, opts, secure));
        res.append('Set-Cookie', this.buildSetCookie(refreshName, '', 0, opts, secure));
    }

    static extractAccessToken(req: RequestWithCookies): string | null {
        const authHeader = req.headers.authorization;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice('Bearer '.length).trim();
            if (token) return token;
        }
        if (req.cookies) {
            for (const name of AUTH_TOKEN_COOKIE_NAMES) {
                const value = req.cookies[name]?.trim();
                if (value) return value;
            }
        }
        const cookieHeader = req.headers.cookie;
        if (typeof cookieHeader === 'string') return this.extractCookieValue(cookieHeader, AUTH_TOKEN_COOKIE_NAMES);
        return null;
    }

    static extractRefreshToken(req: RequestWithCookies): string | null {
        if (req.cookies) {
            for (const name of AUTH_REFRESH_COOKIE_NAMES) {
                const value = req.cookies[name]?.trim();
                if (value) return value;
            }
        }
        const cookieHeader = req.headers.cookie;
        if (typeof cookieHeader === 'string') return this.extractCookieValue(cookieHeader, AUTH_REFRESH_COOKIE_NAMES);
        return null;
    }

    static refreshCookieHeader(refreshToken: string, opts: AuthCookieOptions): string {
        const { refreshName, secure } = this.cookieNames(opts);
        return this.buildSetCookie(refreshName, refreshToken, AUTH_REFRESH_MAX_AGE_SEC, opts, secure);
    }

    static async verifyAccessToken(token: string, jwksUrl: string, issuer: string, audience: string): Promise<JwtUserPayload> {
        const jwks = createRemoteJWKSet(new URL(jwksUrl));
        const { payload } = await jwtVerify(token, jwks, { issuer, audience });
        if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.name !== 'string') {
            throw new Error('Invalid JWT payload');
        }
        return {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            username: typeof payload.username === 'string' ? payload.username : null,
            stripeCustomerId: typeof payload.stripeCustomerId === 'string' ? payload.stripeCustomerId : null,
        };
    }

    private static cookieNames(opts: AuthCookieOptions): { tokenName: string; refreshName: string; secure: boolean } {
        const secure = (opts.baseUrl ?? '').startsWith('https://');
        return {
            tokenName: secure ? SECURE_AUTH_TOKEN_COOKIE : AUTH_TOKEN_COOKIE,
            refreshName: secure ? SECURE_AUTH_REFRESH_COOKIE : AUTH_REFRESH_COOKIE,
            secure,
        };
    }

    private static buildSetCookie(name: string, value: string, maxAgeSec: number, opts: AuthCookieOptions, secure: boolean): string {
        const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
        if (secure) parts.push('Secure');
        if (opts.cookieDomain) parts.push(`Domain=${opts.cookieDomain}`);
        if (maxAgeSec > 0) parts.push(`Max-Age=${maxAgeSec}`);
        else parts.push('Max-Age=0');
        return parts.join('; ');
    }

    private static parseSetCookie(header: string): { name: string; value: string } | null {
        const parts = header.split(';').map((part) => part.trim());
        const [nameValue] = parts;
        if (!nameValue) return null;
        const eq = nameValue.indexOf('=');
        if (eq <= 0) return null;
        return { name: nameValue.slice(0, eq).trim(), value: nameValue.slice(eq + 1).trim() };
    }

    private static extractCookieValue(cookieHeader: string, names: readonly string[]): string | null {
        for (const part of cookieHeader.split(';')) {
            const trimmed = part.trim();
            const eq = trimmed.indexOf('=');
            if (eq <= 0) continue;
            const name = trimmed.slice(0, eq).trim();
            if (!names.includes(name)) continue;
            const value = trimmed.slice(eq + 1).trim();
            if (value) return value;
        }
        return null;
    }
}
