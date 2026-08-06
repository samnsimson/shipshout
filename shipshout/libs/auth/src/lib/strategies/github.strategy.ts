import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

type OAuthRequest = Request & {
    session?: { oauthLink?: { userId: string; returnTo: string }; oauthLinkReturnTo?: string };
};
import { IdentityProvider } from '@shipshout/database';
import { AuthService, UserRepository } from '@shipshout/auth';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(
        private auth: AuthService,
        private users: UserRepository,
    ) {
        super({
            clientID: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            callbackURL: process.env.GITHUB_CALLBACK_URL!,
            scope: ['read:user'],
            userAgent: 'ShipShout',
            passReqToCallback: true,
        });
    }

    async validate(
        req: OAuthRequest,
        _at: string,
        _rt: string,
        profile: { id: string; username?: string; emails?: { value: string }[]; photos?: { value: string }[] },
    ) {
        const oauthProfile = {
            providerUserId: String(profile.id),
            name: profile.username,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            emailVerified: !!profile.emails?.[0]?.value,
        };
        const link = req.session?.oauthLink;
        if (link && req.session) {
            delete req.session.oauthLink;
            await this.auth.linkOAuthIdentity(link.userId, IdentityProvider.Github, oauthProfile);
            req.session.oauthLinkReturnTo = link.returnTo;
            return this.users.findOneByOrFail({ id: link.userId });
        }
        return this.auth.upsertFromOAuth(IdentityProvider.Github, oauthProfile);
    }
}
