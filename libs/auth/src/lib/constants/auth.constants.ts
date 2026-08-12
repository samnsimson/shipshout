export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const AUTH_REFRESH_COOKIE = 'auth_refresh';
export const SECURE_AUTH_TOKEN_COOKIE = '__Secure-auth_token';
export const SECURE_AUTH_REFRESH_COOKIE = '__Secure-auth_refresh';

export const AUTH_TOKEN_COOKIE_NAMES = [AUTH_TOKEN_COOKIE, SECURE_AUTH_TOKEN_COOKIE] as const;
export const AUTH_REFRESH_COOKIE_NAMES = [AUTH_REFRESH_COOKIE, SECURE_AUTH_REFRESH_COOKIE] as const;

export const BA_SESSION_COOKIE_NAMES = ['better-auth.session_token', '__Secure-better-auth.session_token'] as const;

export const AUTH_ACCESS_MAX_AGE_SEC = 15 * 60;
export const AUTH_REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export type AuthTokenPair = {
    accessToken: string;
    refreshToken: string;
};
