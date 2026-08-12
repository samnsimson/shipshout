jest.mock('jose', () => ({
    createRemoteJWKSet: jest.fn(),
    jwtVerify: jest.fn(),
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthJwtUtils } from '../utils/auth-jwt.utils';

jest.mock('../utils/auth-jwt.utils', () => ({
    AuthJwtUtils: {
        extractAccessToken: jest.fn(),
        verifyAccessToken: jest.fn(),
    },
}));

describe('JwtAuthGuard', () => {
    const opts = { baseUrl: 'http://localhost:8000' };
    const guard = new JwtAuthGuard(opts);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('allows valid JWT and attaches user', async () => {
        (AuthJwtUtils.extractAccessToken as jest.Mock).mockReturnValue('jwt.valid');
        (AuthJwtUtils.verifyAccessToken as jest.Mock).mockResolvedValue({ sub: 'u1', email: 'a@b.com', name: 'Ada' });
        const req = { headers: {}, cookies: {} };
        await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as never)).resolves.toBe(true);
        expect(req).toEqual(expect.objectContaining({ user: { sub: 'u1', email: 'a@b.com', name: 'Ada' } }));
    });

    it('throws Unauthorized when token missing', async () => {
        (AuthJwtUtils.extractAccessToken as jest.Mock).mockReturnValue(null);
        await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({}) }) } as never)).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
