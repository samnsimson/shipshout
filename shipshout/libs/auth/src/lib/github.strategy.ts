import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(private auth: AuthService) {
        super({
            clientID: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            callbackURL: process.env.GITHUB_CALLBACK_URL!,
            scope: ['user:email'],
        });
    }
    async validate(_at: string, _rt: string, profile: Parameters<AuthService['upsertFromGithub']>[0]) {
        return this.auth.upsertFromGithub(profile);
    }
}
