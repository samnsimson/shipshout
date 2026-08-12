import { AuthSessionResponseDto } from '../../dto/auth-session-response.dto';
import { AuthRefreshResponseDto } from '../../dto/auth-refresh-response.dto';
import { AuthTokenPair } from '../../constants/auth.constants';

export type AuthApiPayload = {
    user?: AuthSessionResponseDto['user'];
    token?: string;
    url?: string;
    redirect?: boolean;
};

export type AuthTokenIssueResult = {
    body: AuthSessionResponseDto;
    tokens: AuthTokenPair;
    headers: Headers;
};

export type AuthSessionResult = AuthTokenIssueResult;

export type AuthEmailVerificationRedirect = {
    redirectUrl: string;
};

export type AuthLoginResult = AuthSessionResult | AuthEmailVerificationRedirect;

export type AuthLogoutResult = {
    body: { ok: true };
    headers: Headers;
};

export type AuthRefreshResult = {
    body: AuthRefreshResponseDto;
    tokens: AuthTokenPair;
};

export type SocialRedirectResult = {
    url: string;
    headers: Headers;
};

export type AuthRedirectResult = {
    redirectUrl: string;
};
