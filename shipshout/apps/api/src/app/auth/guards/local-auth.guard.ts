import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthError } from '@shipshout/auth';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
    handleRequest<T>(err: Error | AuthError | null, user: T, info: Error | AuthError | undefined): T {
        const authErr = (err ?? info) as AuthError | undefined;
        if (authErr instanceof AuthError) {
            if (authErr.code === 'EMAIL_NOT_VERIFIED') throw authErr;
            throw new UnauthorizedException({ code: authErr.code });
        }
        if (err || !user) throw err ?? new UnauthorizedException();
        return user;
    }
}
