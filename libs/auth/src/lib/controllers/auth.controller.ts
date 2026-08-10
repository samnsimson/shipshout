import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { OkResponseDto } from '../dto/ok-response.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UsernameAvailableDto } from '../dto/username-available.dto';
import { UsernameAvailableResponseDto } from '../dto/username-available-response.dto';
import { AuthService } from '../services/auth.service';
import { AuthUtils } from '../utils/auth-http';

@ApiTags('auth')
@AllowAnonymous()
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register with email, username, and password' })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({ status: 201, type: AuthSessionResponseDto })
    @ApiResponse({ status: 400, description: 'Validation or auth error' })
    @ApiResponse({ status: 409, description: 'Email or username already exists' })
    async register(@Body() body: RegisterDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<AuthSessionResponseDto> {
        const result = await this.authService.register(body, req.headers);
        AuthUtils.applyAuthCookies(res, result.headers);
        return result.body;
    }

    @Post('login')
    @ApiOperation({ summary: 'Login with email or username and password' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, type: AuthSessionResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() body: LoginDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<AuthSessionResponseDto> {
        const result = await this.authService.login(body, req.headers);
        AuthUtils.applyAuthCookies(res, result.headers);
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
}
