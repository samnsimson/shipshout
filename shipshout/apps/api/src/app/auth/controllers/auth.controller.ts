import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
    UseFilters,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { AuthError, AuthService } from '@shipshout/auth';
import { CounterStore, RateLimiter } from '@shipshout/shared-util';
import { IdentityProvider } from '@shipshout/database';
import { AuthMailService } from '../services/auth-mail.service';
import { ChangePasswordDto, EmailDto, LinkCredentialsDto, RegisterDto, ResetPasswordDto } from '../dto/auth.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { AuthErrorFilter } from '../filters/auth-error.filter';

function redisCounterStore(): CounterStore {
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return {
        incr: (key: string) => redis.incr(key),
        expire: (key: string, seconds: number) => redis.expire(key, seconds).then(() => undefined),
    };
}

function mapAuthError(err: unknown): never {
    if (err instanceof AuthError) {
        const status =
            err.code === 'EMAIL_NOT_VERIFIED'
                ? HttpStatus.FORBIDDEN
                : err.code === 'EMAIL_EXISTS' || err.code === 'IDENTITY_TAKEN'
                  ? HttpStatus.CONFLICT
                  : err.code === 'LAST_IDENTITY' || err.code === 'INVALID_TOKEN' || err.code === 'INVALID_CREDENTIALS'
                    ? HttpStatus.BAD_REQUEST
                    : HttpStatus.BAD_REQUEST;
        throw new HttpException({ code: err.code, message: err.message }, status);
    }
    throw err;
}

@Controller('auth')
@UseFilters(AuthErrorFilter)
export class AuthController {
    private readonly limiter = new RateLimiter(redisCounterStore(), 5, 60);

    constructor(
        private auth: AuthService,
        private mail: AuthMailService,
    ) {}

    @Get('github')
    @UseGuards(AuthGuard('github'))
    githubLogin() {}

    @Get('google')
    @UseGuards(AuthGuard('google'))
    googleLogin() {}

    @Get('me')
    me(@Req() req: Request) {
        return req.user ?? null;
    }

    @Post('logout')
    logout(@Req() req: Request) {
        return new Promise((resolve) => req.session.destroy(() => resolve({ ok: true })));
    }

    @Post('register')
    async register(@Req() req: Request, @Body() dto: RegisterDto) {
        await this.rateLimit(req, 'register');
        try {
            const { user, rawVerifyToken } = await this.auth.registerWithEmail(dto);
            if (user.email) await this.mail.sendVerificationEmail(user.email, rawVerifyToken);
            return { ok: true };
        } catch (err) {
            mapAuthError(err);
        }
    }

    @Post('login')
    @UseGuards(LocalAuthGuard)
    async login(@Req() req: Request) {
        await this.rateLimit(req, 'login');
        req.session.userId = req.user!.id;
        return new Promise((resolve, reject) =>
            req.session.save((err) => (err ? reject(err) : resolve({ ok: true }))),
        );
    }

    @Get('verify-email')
    async verifyEmail(@Query('token') token: string, @Res() res: Response) {
        const web = process.env.WEB_BASE_URL ?? 'http://localhost:4200';
        try {
            await this.auth.verifyEmail(token);
            res.redirect(`${web}/login?verified=1`);
        } catch {
            res.redirect(`${web}/login?error=invalid_token`);
        }
    }

    @Post('resend-verification')
    async resendVerification(@Req() req: Request, @Body() dto: EmailDto) {
        await this.rateLimit(req, 'resend');
        const raw = await this.auth.resendVerificationEmail(dto.email);
        if (raw) await this.mail.sendVerificationEmail(dto.email, raw);
        return { ok: true };
    }

    @Post('forgot-password')
    async forgotPassword(@Req() req: Request, @Body() dto: EmailDto) {
        await this.rateLimit(req, 'forgot');
        const raw = await this.auth.createPasswordResetToken(dto.email);
        if (raw) await this.mail.sendPasswordResetEmail(dto.email, raw);
        return { ok: true };
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        try {
            await this.auth.resetPassword(dto.token, dto.password);
            return { ok: true };
        } catch (err) {
            mapAuthError(err);
        }
    }

    @Get('identities')
    listIdentities(@Req() req: Request) {
        this.requireUser(req);
        return this.auth.listIdentities(req.user!.id);
    }

    @Get('link/github')
    linkGithub(@Req() req: Request, @Res() res: Response, @Query('returnTo') returnTo?: string) {
        const user = this.requireUser(req);
        req.session.oauthLink = { userId: user.id, returnTo: returnTo ?? process.env.WEB_BASE_URL ?? 'http://localhost:4200' };
        req.session.save(() => res.redirect(`${process.env.API_BASE_URL ?? 'http://localhost:3000'}/api/auth/github`));
    }

    @Get('link/google')
    linkGoogle(@Req() req: Request, @Res() res: Response, @Query('returnTo') returnTo?: string) {
        const user = this.requireUser(req);
        req.session.oauthLink = { userId: user.id, returnTo: returnTo ?? process.env.WEB_BASE_URL ?? 'http://localhost:4200' };
        req.session.save(() => res.redirect(`${process.env.API_BASE_URL ?? 'http://localhost:3000'}/api/auth/google`));
    }

    @Post('link/credentials')
    async linkCredentials(@Req() req: Request, @Body() dto: LinkCredentialsDto) {
        const user = this.requireUser(req);
        try {
            await this.auth.linkCredentialsIdentity(user.id, user.email!, dto.password);
            return { ok: true };
        } catch (err) {
            mapAuthError(err);
        }
    }

    @Post('link/credentials/change')
    async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
        const user = this.requireUser(req);
        try {
            await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
            return { ok: true };
        } catch (err) {
            mapAuthError(err);
        }
    }

    @Delete('link/:provider')
    async unlink(@Req() req: Request, @Param('provider') provider: string) {
        const user = this.requireUser(req);
        const p = provider as IdentityProvider;
        if (!Object.values(IdentityProvider).includes(p)) throw new HttpException({ code: 'INVALID_PROVIDER' }, HttpStatus.BAD_REQUEST);
        try {
            await this.auth.unlinkIdentity(user.id, p);
            return { ok: true };
        } catch (err) {
            mapAuthError(err);
        }
    }

    private requireUser(req: Request) {
        if (!req.user) throw new UnauthorizedException();
        return req.user;
    }

    private async rateLimit(req: Request, route: string) {
        const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        const { allowed } = await this.limiter.check(`auth:${route}:${ip}`);
        if (!allowed) throw new HttpException({ code: 'RATE_LIMITED' }, HttpStatus.TOO_MANY_REQUESTS);
    }
}
