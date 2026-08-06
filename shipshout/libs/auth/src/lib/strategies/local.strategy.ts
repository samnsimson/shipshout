import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth.service.js';
import { AuthError } from '../utils/auth-error.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(private auth: AuthService) {
        super({ usernameField: 'email', passwordField: 'password' });
    }

    async validate(email: string, password: string) {
        try {
            return await this.auth.validateCredentials(email, password);
        } catch (err) {
            if (err instanceof AuthError) throw err;
            throw err;
        }
    }
}
