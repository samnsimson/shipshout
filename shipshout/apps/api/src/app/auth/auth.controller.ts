import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
    @Get('github')
    @UseGuards(AuthGuard('github'))
    login() {
        /* redirect handled by passport */
    }

    @Get('github/callback')
    @UseGuards(AuthGuard('github'))
    callback(@Req() req: Request, @Res() res: Response) {
        req.session.userId = req.user.id;
        res.redirect(process.env.WEB_BASE_URL ?? '/');
    }

    @Get('me')
    me(@Req() req: Request) {
        return req.user ?? null;
    }

    @Post('logout')
    logout(@Req() req: Request) {
        return new Promise((resolve) => req.session.destroy(() => resolve({ ok: true })));
    }
}
