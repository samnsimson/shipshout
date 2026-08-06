import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

type OAuthRequest = Request & {
    session?: { oauthLink?: { userId: string; returnTo: string }; oauthLinkReturnTo?: string };
};
import { IdentityProvider } from '@shipshout/database';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private auth: AuthService,
        private users: UserRepository,
    ) {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/api/auth/google/callback',
            scope: ['profile', 'email'],
            passReqToCallback: true,
        });
    }

    async validate(
        req: OAuthRequest,
        _accessToken: string,
        _refreshToken: string,
        profile: {
            id: string;
            displayName?: string;
            emails?: { value: string; verified?: boolean }[];
            photos?: { value: string }[];
        },
    ) {
        const oauthProfile = {
            providerUserId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            emailVerified: profile.emails?.[0]?.verified ?? true,
        };
        const link = req.session?.oauthLink;
        if (link && req.session) {
            delete req.session.oauthLink;
            await this.auth.linkOAuthIdentity(link.userId, IdentityProvider.Google, oauthProfile);
            req.session.oauthLinkReturnTo = link.returnTo;
            return this.users.findOneByOrFail({ id: link.userId });
        }
        return this.auth.upsertFromOAuth(IdentityProvider.Google, oauthProfile);
    }
}
