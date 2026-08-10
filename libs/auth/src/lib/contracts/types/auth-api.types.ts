import { AuthSessionResponseDto } from '../../dto/auth-session-response.dto';

export type AuthApiPayload = {
    user?: AuthSessionResponseDto['user'];
    token?: string;
    session?: AuthSessionResponseDto['session'];
    url?: string;
    redirect?: boolean;
};

export type AuthSessionResult = {
    body: AuthSessionResponseDto;
    headers: Headers;
};

export type AuthLogoutResult = {
    body: { ok: true };
    headers: Headers;
};

export type SocialRedirectResult = {
    url: string;
    headers: Headers;
};
