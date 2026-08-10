import { Injectable } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import { auth } from '../auth.config';
import { AuthApiPayload, AuthSessionResult, SocialRedirectResult } from '../contracts/types/auth-api.types';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { OkResponseDto } from '../dto/ok-response.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AuthUtils } from '../utils/auth-http';

@Injectable()
export class AuthService {
    constructor(private readonly betterAuth: BetterAuthService<typeof auth>) {}

    async register(body: RegisterDto, requestHeaders: IncomingHttpHeaders): Promise<AuthSessionResult> {
        try {
            const result = await this.betterAuth.api.signUpEmail({
                body: { email: body.email, password: body.password, name: body.name },
                headers: fromNodeHeaders(requestHeaders),
                returnHeaders: true,
            });

            return {
                headers: result.headers,
                body: this.toSessionResponse(result.response as AuthApiPayload),
            };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async login(body: LoginDto, requestHeaders: IncomingHttpHeaders): Promise<AuthSessionResult> {
        try {
            const result = await this.betterAuth.api.signInEmail({
                body: { email: body.email, password: body.password },
                headers: fromNodeHeaders(requestHeaders),
                returnHeaders: true,
            });

            return {
                headers: result.headers,
                body: this.toSessionResponse(result.response as AuthApiPayload),
            };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async forgotPassword(body: ForgotPasswordDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
        try {
            await this.betterAuth.api.requestPasswordReset({
                body: { email: body.email, redirectTo: body.redirectTo },
                headers: fromNodeHeaders(requestHeaders),
            });
            return { ok: true };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async resetPassword(body: ResetPasswordDto, requestHeaders: IncomingHttpHeaders): Promise<OkResponseDto> {
        try {
            await this.betterAuth.api.resetPassword({
                body: { token: body.token, newPassword: body.newPassword },
                headers: fromNodeHeaders(requestHeaders),
            });
            return { ok: true };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    async startSocial(provider: 'google' | 'github', requestHeaders: IncomingHttpHeaders): Promise<SocialRedirectResult> {
        try {
            const result = await this.betterAuth.api.signInSocial({
                body: { provider, disableRedirect: true },
                headers: fromNodeHeaders(requestHeaders),
                returnHeaders: true,
            });

            const url = (result.response as AuthApiPayload).url;
            if (!url) throw new Error('Missing OAuth redirect URL');

            return { headers: result.headers, url };
        } catch (error) {
            AuthUtils.mapAuthError(error);
        }
    }

    private toSessionResponse(payload: AuthApiPayload): AuthSessionResponseDto {
        if (!payload.user) throw new Error('Missing user in auth response');
        return {
            user: payload.user,
            session: payload.session ?? { token: payload.token },
        };
    }
}
