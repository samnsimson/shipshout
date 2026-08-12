import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request as ExpressRequest, Response } from 'express';
import { AUTH_OPTIONS } from '../constants/auth.constants';
import { AuthOptions } from '../contracts/types/auth.types';
import { AuthRefreshResponseDto } from '../dto/auth-refresh-response.dto';
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
import { AuthService } from '../services/auth.service';
import { AuthJwtUtils } from '../utils/auth-jwt.utils';
import { AuthUtils } from '../utils/auth-http';

@ApiTags('auth')
@AllowAnonymous()
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        @Inject(AUTH_OPTIONS) private readonly authOptions: AuthOptions,
    ) {}

    @Post('register')
    @ApiOperation({ summary: 'Register with email, username, and password' })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({ status: 201, type: AuthSessionResponseDto })
    @ApiResponse({ status: 400, description: 'Validation or auth error' })
    @ApiResponse({ status: 409, description: 'Email or username already exists' })
    async register(@Body() body: RegisterDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<AuthSessionResponseDto> {
        const result = await this.authService.register(body, req.headers);
        AuthJwtUtils.applyAuthTokens(res, result.tokens, this.cookieOpts());
        return result.body;
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email or username and password' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, type: AuthSessionResponseDto })
    @ApiResponse({ status: 302, description: 'Email not verified — redirect to verify-email' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() body: LoginDto, @Req() req: ExpressRequest, @Res() res: Response): Promise<void> {
        const result = await this.authService.login(body, req.headers);
        if ('redirectUrl' in result) return res.redirect(result.redirectUrl);
        AuthJwtUtils.applyAuthTokens(res, result.tokens, this.cookieOpts());
        res.status(200).json(result.body);
    }

    @Get('session')
    @ApiOperation({ summary: 'Current authenticated user from JWT' })
    @ApiResponse({ status: 200, type: AuthSessionResponseDto })
    @ApiResponse({ status: 200, description: 'Null when unauthenticated' })
    async session(@Req() req: ExpressRequest, @Res() res: Response): Promise<void> {
        const session = await this.authService.getSession(req.headers);
        res.status(200).json(session);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access JWT using refresh cookie' })
    @ApiResponse({ status: 200, type: AuthRefreshResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<AuthRefreshResponseDto> {
        const result = await this.authService.refresh(req.headers);
        AuthJwtUtils.applyAuthTokens(res, result.tokens, this.cookieOpts());
        return result.body;
    }

    @Post('logout')
    @ApiOperation({ summary: 'Sign out' })
    @ApiResponse({ status: 200, type: OkResponseDto })
    async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<OkResponseDto> {
        const result = await this.authService.logout(req.headers);
        AuthJwtUtils.clearAuthTokens(res, this.cookieOpts());
        return result.body;
    }

    @Post('username/available')
    @ApiOperation({ summary: 'Check whether a username is available' })
    @ApiBody({ type: UsernameAvailableDto })
    @ApiResponse({ status: 200, type: UsernameAvailableResponseDto })
    async isUsernameAvailable(@Body() body: UsernameAvailableDto, @Req() req: ExpressRequest): Promise<UsernameAvailableResponseDto> {
        return this.authService.isUsernameAvailable(body, req.headers);
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Request a password reset email' })
    @ApiBody({ type: ForgotPasswordDto })
    @ApiResponse({ status: 200, type: OkResponseDto })
    async forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
        return this.authService.forgotPassword(body, req.headers);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({ status: 200, type: OkResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async resetPassword(@Body() body: ResetPasswordDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
        return this.authService.resetPassword(body, req.headers);
    }

    @Post('verify-email')
    @ApiOperation({ summary: 'Verify email with token' })
    @ApiBody({ type: VerifyEmailDto })
    @ApiResponse({ status: 200, type: OkResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyEmail(@Body() body: VerifyEmailDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
        return this.authService.verifyEmail(body, req.headers);
    }

    @Post('resend-verification')
    @ApiOperation({ summary: 'Resend verification email' })
    @ApiBody({ type: ResendVerificationDto })
    @ApiResponse({ status: 200, type: OkResponseDto })
    async resendVerification(@Body() body: ResendVerificationDto, @Req() req: ExpressRequest): Promise<OkResponseDto> {
        return this.authService.resendVerification(body, req.headers);
    }

    @Get('oauth/bridge')
    @ApiOperation({ summary: 'Bridge OAuth session to the client app via one-time token' })
    @ApiResponse({ status: 302, description: 'Redirect to client /auth/callback with token' })
    async oauthBridge(@Req() req: ExpressRequest, @Res() res: Response): Promise<void> {
        const result = await this.authService.oauthBridge(req.headers);
        res.redirect(result.redirectUrl);
    }

    @Post('one-time-token/verify')
    @ApiOperation({ summary: 'Exchange a one-time token for JWT auth cookies' })
    @ApiBody({ type: VerifyOneTimeTokenDto })
    @ApiResponse({ status: 200, type: AuthSessionResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyOneTimeToken(
        @Body() body: VerifyOneTimeTokenDto,
        @Req() req: ExpressRequest,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthSessionResponseDto> {
        const result = await this.authService.verifyOneTimeToken(body, req.headers);
        AuthJwtUtils.applyAuthTokens(res, result.tokens, this.cookieOpts());
        return result.body;
    }

    @Get('google')
    @ApiOperation({ summary: 'Start Google OAuth' })
    @ApiResponse({ status: 302, description: 'Redirect to Google' })
    async google(@Req() req: ExpressRequest, @Res() res: Response): Promise<void> {
        const result = await this.authService.startSocial('google', req.headers);
        AuthUtils.applyAuthCookies(res, result.headers);
        res.redirect(result.url);
    }

    @Get('github')
    @ApiOperation({ summary: 'Start GitHub OAuth' })
    @ApiResponse({ status: 302, description: 'Redirect to GitHub' })
    async github(@Req() req: ExpressRequest, @Res() res: Response): Promise<void> {
        const result = await this.authService.startSocial('github', req.headers);
        AuthUtils.applyAuthCookies(res, result.headers);
        res.redirect(result.url);
    }

    private cookieOpts(): Pick<AuthOptions, 'cookieDomain' | 'baseUrl'> {
        return { baseUrl: this.authOptions.baseUrl, cookieDomain: this.authOptions.cookieDomain };
    }
}
