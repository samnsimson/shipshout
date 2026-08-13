import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { isEmail } from 'class-validator';
import { IncomingHttpHeaders } from 'node:http';
import { AUTH_OPTIONS } from '../constants/auth.constants';
import { auth } from '../auth.config';
import {
    AuthApiPayload,
    AuthLoginResult,
    AuthLogoutResult,
    AuthRedirectResult,
    AuthRefreshResult,
    AuthSessionResult,
    AuthTokenIssueResult,
    SocialRedirectResult,
} from '../contracts/types/auth-api.types';
import { AuthOptions } from '../contracts/types/auth.types';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { OkResponseDto } from '../dto/ok-response.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UsernameAvailableDto } from '../dto/username-available.dto';
import { UsernameAvailableResponseDto } from '../dto/username-available-response.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { VerifyOneTimeTokenDto } from '../dto/verify-one-time-token.dto';
import { CreateBillingPortalDto } from '../dto/create-billing-portal.dto';
import { StripeRedirectUrlResponseDto } from '../dto/stripe-redirect-url-response.dto';
import { UpgradeSubscriptionDto } from '../dto/upgrade-subscription.dto';
import { AuthJwtUtils } from '../utils/auth-jwt.utils';
import { AuthUtils } from '../utils/auth-http';

@Injectable()
export class AuthService {
    constructor(
        private readonly betterAuth: BetterAuthService<typeof auth>,
        @Inject(AUTH_OPTIONS) private readonly authOptions: AuthOptions,
    ) {}

    async register(body: RegisterDto, requestHeaders: IncomingHttpHeaders): Promise<AuthSessionResult> {
        try {
            const payload = { email: body.email, password: body.password, name: body.name, username: body.username, displayUsername: body.displayUsername };
            const result = await this.betterAuth.api.signUpEmail({ body: payload, headers: fromNodeHeaders(requestHeaders), returnHeaders: true });
            return this.toAuthTokenResponse(result.headers, result.response as AuthApiPayload);
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async login(body: LoginDto, requestHeaders: IncomingHttpHeaders): Promise<AuthLoginResult> {
        return isEmail(body.login) ? this.signInWithEmail(body, requestHeaders) : this.signInWithUsername(body, requestHeaders);
    }

    private async signInWithUsername(body: LoginDto, requestHeaders: IncomingHttpHeaders): Promise<AuthLoginResult> {
        try {
            const payload = { username: body.login, password: body.password };
            const result = await this.betterAuth.api.signInUsername({ body: payload, headers: fromNodeHeaders(requestHeaders), returnHeaders: true });
            return this.toAuthTokenResponse(result.headers, result.response as AuthApiPayload);
        } catch (error) {
            if (AuthUtils.isEmailNotVerifiedError(error)) return { redirectUrl: this.verifyEmailRedirectUrl() };
            AuthUtils.mapAuthError(error);
        }
    }

    private async signInWithEmail(body: LoginDto, requestHeaders: IncomingHttpHeaders): Promise<AuthLoginResult> {
        try {
            const payload = { email: body.login, password: body.password };
            const result = await this.betterAuth.api.signInEmail({ body: payload, headers: fromNodeHeaders(requestHeaders), returnHeaders: true });
            return this.toAuthTokenResponse(result.headers, result.response as AuthApiPayload);
        } catch (error) {
            if (AuthUtils.isEmailNotVerifiedError(error)) return { redirectUrl: this.verifyEmailRedirectUrl(body.login) };
            AuthUtils.mapAuthError(error);
        }
    }

    async getSession(requestHeaders: IncomingHttpHeaders): Promise<AuthSessionResponseDto | null> {
        const accessToken = AuthJwtUtils.extractAccessToken({ headers: requestHeaders });
        if (!accessToken) return null;
        try {
            const user = await this.verifyAccessToken(accessToken);
            return { user, accessToken };
        } catch {
            return null;
        }
    }

    async refresh(requestHeaders: IncomingHttpHeaders): Promise<AuthRefreshResult> {
        const refreshToken = AuthJwtUtils.extractRefreshToken({ headers: requestHeaders });
        if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

        try {
            const sessionHeaders = fromNodeHeaders({ cookie: AuthJwtUtils.refreshCookieHeader(refreshToken, this.cookieOpts()) });
            const tokenResult = await this.betterAuth.api.getToken({ headers: sessionHeaders });
            const accessToken = (tokenResult as { token: string }).token;
            if (!accessToken) throw new UnauthorizedException('Unable to refresh access token');
            return { body: { accessToken }, tokens: { accessToken, refreshToken } };
        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;
            AuthUtils.mapAuthError(error);
        }
    }

    async logout(requestHeaders: IncomingHttpHeaders): Promise<AuthLogoutResult> {
        try {
            const refreshToken = AuthJwtUtils.extractRefreshToken({ headers: requestHeaders });
            const headers = refreshToken
                ? fromNodeHeaders({ cookie: AuthJwtUtils.refreshCookieHeader(refreshToken, this.cookieOpts()) })
                : fromNodeHeaders(requestHeaders);
            const result = await this.betterAuth.api.signOut({ headers, returnHeaders: true });
            return { headers: result.headers ?? new Headers(), body: { ok: true } };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async isUsernameAvailable(body: UsernameAvailableDto, requestHeaders: IncomingHttpHeaders): Promise<UsernameAvailableResponseDto> {
        try {
            const result = await this.betterAuth.api.isUsernameAvailable({ body: { username: body.username }, headers: fromNodeHeaders(requestHeaders) });
            return { available: Boolean(result?.available) };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async forgotPassword(body: ForgotPasswordDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
        try {
            const payload = { email: body.email, redirectTo: body.redirectTo };
            await this.betterAuth.api.requestPasswordReset({ body: payload, headers: fromNodeHeaders(requestHeaders) });
            return { ok: true };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async resetPassword(body: ResetPasswordDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
        try {
            const payload = { token: body.token, newPassword: body.newPassword };
            await this.betterAuth.api.resetPassword({ body: payload, headers: fromNodeHeaders(requestHeaders) });
            return { ok: true };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async verifyEmail(body: VerifyEmailDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
        try {
            await this.betterAuth.api.verifyEmail({ query: { token: body.token }, headers: fromNodeHeaders(requestHeaders) });
            return { ok: true };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async resendVerification(body: ResendVerificationDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
        try {
            await this.betterAuth.api.sendVerificationEmail({ body: { email: body.email }, headers: fromNodeHeaders(requestHeaders) });
        } catch {
            // Intentionally swallow — do not reveal account existence / state
        }
        return { ok: true };
    }

    async startSocial(provider: 'google' | 'github', requestHeaders: IncomingHttpHeaders): Promise<SocialRedirectResult> {
        try {
            const payload = { provider, disableRedirect: true, callbackURL: this.oauthBridgeUrl() };
            const result = await this.betterAuth.api.signInSocial({ body: payload, headers: fromNodeHeaders(requestHeaders), returnHeaders: true });
            const url = (result.response as AuthApiPayload).url;
            if (!url) throw new Error('Missing OAuth redirect URL');
            return { headers: result.headers, url };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async oauthBridge(requestHeaders: IncomingHttpHeaders): Promise<AuthRedirectResult> {
        try {
            const session = await this.betterAuth.api.getSession({ headers: fromNodeHeaders(requestHeaders) });
            if (!session?.session) return { redirectUrl: `${this.clientAppBaseUrl()}/login` };

            const result = await this.betterAuth.api.generateOneTimeToken({ headers: fromNodeHeaders(requestHeaders) });
            const token = (result as { token?: string })?.token;
            if (!token) return { redirectUrl: `${this.clientAppBaseUrl()}/login` };
            return { redirectUrl: `${this.clientAppBaseUrl()}/auth/callback?token=${encodeURIComponent(token)}` };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async verifyOneTimeToken(body: VerifyOneTimeTokenDto, requestHeaders: IncomingHttpHeaders): Promise<AuthSessionResult> {
        try {
            const result = await this.betterAuth.api.verifyOneTimeToken({
                body: { token: body.token },
                headers: fromNodeHeaders(requestHeaders),
                returnHeaders: true,
            });
            return this.toAuthTokenResponse(result.headers, result.response as AuthApiPayload);
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async upgradeSubscription(body: UpgradeSubscriptionDto, requestHeaders: IncomingHttpHeaders): Promise<StripeRedirectUrlResponseDto> {
        try {
            const result = await this.betterAuth.api.upgradeSubscription({
                body: {
                    plan: body.plan,
                    successUrl: body.successUrl,
                    cancelUrl: body.cancelUrl,
                    disableRedirect: body.disableRedirect,
                    customerType: body.customerType ?? 'user',
                },
                headers: fromNodeHeaders(requestHeaders),
            });
            return AuthService.toStripeRedirectUrl(result);
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async createBillingPortal(body: CreateBillingPortalDto, requestHeaders: IncomingHttpHeaders): Promise<StripeRedirectUrlResponseDto> {
        try {
            const result = await this.betterAuth.api.createBillingPortal({
                body: {
                    returnUrl: body.returnUrl,
                    disableRedirect: body.disableRedirect,
                    customerType: body.customerType ?? 'user',
                },
                headers: fromNodeHeaders(requestHeaders),
            });
            return AuthService.toStripeRedirectUrl(result);
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    cookieOpts(): Pick<AuthOptions, 'cookieDomain' | 'baseUrl'> {
        return { baseUrl: this.authOptions.baseUrl, cookieDomain: this.authOptions.cookieDomain };
    }

    private async toAuthTokenResponse(baHeaders: Headers, payload: AuthApiPayload): Promise<AuthTokenIssueResult> {
        const user = payload.user;
        if (!user) throw new BadRequestException('Missing user in auth response');

        const refreshToken = AuthJwtUtils.parseSessionTokenFromHeaders(baHeaders);
        if (!refreshToken) throw new BadRequestException('Missing session after sign-in');

        const sessionHeaders = fromNodeHeaders({ cookie: `better-auth.session_token=${refreshToken}` });
        const tokenResult = await this.betterAuth.api.getToken({ headers: sessionHeaders });
        const accessToken = (tokenResult as { token: string }).token;
        if (!accessToken) throw new BadRequestException('Missing JWT from token endpoint');

        return {
            headers: baHeaders,
            tokens: { accessToken, refreshToken },
            body: { user, accessToken },
        };
    }

    private async verifyAccessToken(accessToken: string): Promise<AuthSessionResponseDto['user']> {
        const baseUrl = (this.authOptions.baseUrl ?? '').replace(/\/$/, '');
        const jwksUrl = `${baseUrl}/auth-service/jwks`;
        const payload = await AuthJwtUtils.verifyAccessToken(accessToken, jwksUrl, baseUrl, baseUrl);
        return { id: payload.sub, email: payload.email, name: payload.name, username: payload.username ?? null };
    }

    private clientAppBaseUrl(): string {
        return this.authOptions.clientAppUrl.replace(/\/$/, '');
    }

    private apiBaseUrl(): string {
        return (this.authOptions.baseUrl ?? '').replace(/\/$/, '');
    }

    private oauthBridgeUrl(): string {
        return `${this.apiBaseUrl()}/auth/oauth/bridge`;
    }

    private verifyEmailRedirectUrl(email?: string): string {
        const base = this.clientAppBaseUrl();
        if (email) return `${base}/verify-email?email=${encodeURIComponent(email)}`;
        return `${base}/verify-email`;
    }

    private static toStripeRedirectUrl(result: unknown): StripeRedirectUrlResponseDto {
        const url = AuthService.readStripeRedirectUrl(result);
        if (!url) throw new BadRequestException('Missing Stripe redirect URL');
        return { url };
    }

    private static readStripeRedirectUrl(result: unknown): string | null {
        if (!result || typeof result !== 'object') return null;
        const direct = (result as { url?: unknown }).url;
        if (typeof direct === 'string' && direct) return direct;
        const nested = (result as { data?: { url?: unknown } }).data?.url;
        if (typeof nested === 'string' && nested) return nested;
        return null;
    }
}
