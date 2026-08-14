import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import passport from 'passport';
import { loginUrl } from '../../repositories/utils/github-repo-connect-urls';

@Injectable()
export class GithubOAuthLoginService {
    private readonly log = new Logger(GithubOAuthLoginService.name);

    handleCallback(req: Request, res: Response): void {
        passport.authenticate('github', (err: Error | null, user?: { id: string }) => {
            this.redirectAfterLogin(req, res, err, user);
        })(req, res);
    }

    private redirectAfterLogin(req: Request, res: Response, err: Error | null, user?: { id: string }) {
        if (err) {
            this.log.error(`GitHub auth failed: ${err.message}`);
            return res.redirect(loginUrl('github_auth_failed'));
        }
        if (!user) return res.redirect(loginUrl('github_auth_failed'));

        const returnTo = req.session.oauthLinkReturnTo;
        if (returnTo) {
            delete req.session.oauthLinkReturnTo;
            req.session.userId = user.id;
            return this.saveSession(req, res, `${returnTo}?linked=github`, 'session_failed');
        }

        req.session.userId = user.id;
        this.saveSession(req, res, loginUrl(), 'session_failed');
    }

    private saveSession(req: Request, res: Response, successUrl: string, errorCode: string) {
        req.session.save((saveErr) => {
            if (saveErr) {
                this.log.error(`Session save failed: ${saveErr.message}`);
                return res.redirect(loginUrl(errorCode));
            }
            res.redirect(successUrl);
        });
    }
}
