import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import passport from 'passport';

function loginRedirect(res: Response, error?: string) {
    const base = process.env.WEB_BASE_URL ?? 'http://localhost:4200';
    const url = error ? `${base}/login?error=${encodeURIComponent(error)}` : base;
    res.redirect(url);
}

@Controller('auth')
export class GoogleOAuthCallbackController {
    private readonly log = new Logger(GoogleOAuthCallbackController.name);

    @Get('google/callback')
    callback(@Req() req: Request, @Res() res: Response) {
        passport.authenticate('google', (err: Error | null, user?: { id: string }) => {
            if (err) {
                this.log.error(`Google auth failed: ${err.message}`);
                return loginRedirect(res, 'google_auth_failed');
            }
            if (!user) return loginRedirect(res, 'google_auth_failed');
            const returnTo = req.session.oauthLinkReturnTo;
            if (returnTo) {
                delete req.session.oauthLinkReturnTo;
                req.session.userId = user.id;
                return req.session.save((saveErr) => {
                    if (saveErr) return loginRedirect(res, 'session_failed');
                    res.redirect(`${returnTo}?linked=google`);
                });
            }
            req.session.userId = user.id;
            req.session.save((saveErr) => {
                if (saveErr) {
                    this.log.error(`Session save failed: ${saveErr.message}`);
                    return loginRedirect(res, 'session_failed');
                }
                loginRedirect(res);
            });
        })(req, res);
    }
}
