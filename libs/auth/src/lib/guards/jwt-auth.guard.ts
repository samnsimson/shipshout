import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_OPTIONS } from '../constants/auth.constants';
import { AuthOptions } from '../contracts/types/auth.types';
import { AuthJwtUtils } from '../utils/auth-jwt.utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(@Inject(AUTH_OPTIONS) private readonly authOptions: AuthOptions) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = AuthJwtUtils.extractAccessToken(request);
        if (!token) throw new UnauthorizedException('Missing access token');

        const baseUrl = (this.authOptions.baseUrl ?? '').replace(/\/$/, '');
        const jwksUrl = `${baseUrl}/auth-service/jwks`;
        try {
            request.user = await AuthJwtUtils.verifyAccessToken(token, jwksUrl, baseUrl, baseUrl);
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired access token');
        }
    }
}
