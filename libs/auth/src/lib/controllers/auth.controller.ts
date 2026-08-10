import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request as ExpressRequest, Response } from 'express';
import { auth } from '../auth.config';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { OkResponseDto } from '../dto/ok-response.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { applyAuthCookies, mapAuthError } from '../utils/auth-http';

type AuthApiResult = {
    headers: Headers;
    response: {
        user?: AuthSessionResponseDto['user'];
        token?: string;
        session?: AuthSessionResponseDto['session'];
        url?: string;
        redirect?: boolean;
    };
};

@ApiTags('auth')
@AllowAnonymous()
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService<typeof auth>) {}

    @Post('register')
    @ApiOperation({ summary: 'Register with email and password' })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({ status: 201, type: AuthSessionResponseDto })
    @ApiResponse({ status: 400, description: 'Validation or auth error' })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async register(@Body() body: RegisterDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<AuthSessionResponseDto> {
        try {
            const result = (await this.authService.api.signUpEmail({
                body: { email: body.email, password: body.password, name: body.name },
                headers: fromNodeHeaders(req.headers),
                returnHeaders: true,
            })) as AuthApiResult;

            applyAuthCookies(res, result.headers);
            return this.toSessionResponse(result.response);
        } catch (error) {
            mapAuthError(error);
        }
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, type: AuthSessionResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() body: LoginDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<AuthSessionResponseDto> {
        try {
            const result = (await this.authService.api.signInEmail({
                body: { email: body.email, password: body.password },
                headers: fromNodeHeaders(req.headers),
                returnHeaders: true,
            })) as AuthApiResult;

            applyAuthCookies(res, result.headers);
            return this.toSessionResponse(result.response);
        } catch (error) {
            mapAuthError(error);
        }
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Request a password reset email' })
    @ApiBody({ type: ForgotPasswordDto })
    @ApiResponse({ status: 200, type: OkResponseDto })
    async forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
        try {
            await this.authService.api.requestPasswordReset({
                body: { email: body.email, redirectTo: body.redirectTo },
                headers: fromNodeHeaders(req.headers),
            });
            return { ok: true };
        } catch (error) {
            mapAuthError(error);
        }
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({ status: 200, type: OkResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async resetPassword(@Body() body: ResetPasswordDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
        try {
            await this.authService.api.resetPassword({
                body: { token: body.token, newPassword: body.newPassword },
                headers: fromNodeHeaders(req.headers),
            });
            return { ok: true };
        } catch (error) {
            mapAuthError(error);
        }
    }

    @Get('google')
    @ApiOperation({ summary: 'Start Google OAuth' })
    @ApiResponse({ status: 302, description: 'Redirect to Google' })
    async google(@Req() req: ExpressRequest, @Res() res: Response): Promise<void> {
        await this.startSocial('google', req, res);
    }

    @Get('github')
    @ApiOperation({ summary: 'Start GitHub OAuth' })
    @ApiResponse({ status: 302, description: 'Redirect to GitHub' })
    async github(@Req() req: ExpressRequest, @Res() res: Response): Promise<void> {
        await this.startSocial('github', req, res);
    }

    private async startSocial(provider: 'google' | 'github', req: ExpressRequest, res: Response): Promise<void> {
        try {
            const result = (await this.authService.api.signInSocial({
                body: { provider, disableRedirect: true },
                headers: fromNodeHeaders(req.headers),
                returnHeaders: true,
            })) as AuthApiResult;

            applyAuthCookies(res, result.headers);
            const url = result.response.url;
            if (!url) throw new Error('Missing OAuth redirect URL');
            res.redirect(url);
        } catch (error) {
            mapAuthError(error);
        }
    }

    private toSessionResponse(payload: AuthApiResult['response']): AuthSessionResponseDto {
        if (!payload.user) throw new Error('Missing user in auth response');
        return {
            user: payload.user,
            session: payload.session ?? { token: payload.token },
        };
    }
}
