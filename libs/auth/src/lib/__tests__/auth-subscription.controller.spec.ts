jest.mock('../services/auth.service', () => ({
    AuthService: class AuthService {},
}));
jest.mock('@thallesp/nestjs-better-auth', () => ({
    AllowAnonymous: () => () => undefined,
    AuthService: class BetterAuthService {},
}));
jest.mock('../guards/jwt-auth.guard', () => ({
    JwtAuthGuard: class JwtAuthGuard {},
}));

import { AuthSubscriptionController } from '../controllers/auth-subscription.controller';
import { AuthService } from '../services/auth.service';

describe('AuthSubscriptionController', () => {
    const authService = {
        upgradeSubscription: jest.fn(),
        createBillingPortal: jest.fn(),
    };
    const controller = new AuthSubscriptionController(authService as unknown as AuthService);
    const req = { headers: { cookie: 'auth_token=jwt.access' } } as never;

    beforeEach(() => jest.clearAllMocks());

    it('upgrade delegates to AuthService', async () => {
        authService.upgradeSubscription.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
        const body = {
            plan: 'starter' as const,
            successUrl: 'http://localhost:3000/dashboard/settings?billing=success',
            cancelUrl: 'http://localhost:3000/dashboard/settings?billing=cancelled',
            disableRedirect: true,
            customerType: 'user' as const,
        };

        await expect(controller.upgrade(body, req)).resolves.toEqual({ url: 'https://checkout.stripe.com/test' });
        expect(authService.upgradeSubscription).toHaveBeenCalledWith(body, req.headers);
    });

    it('billingPortal delegates to AuthService', async () => {
        authService.createBillingPortal.mockResolvedValue({ url: 'https://billing.stripe.com/test' });
        const body = {
            returnUrl: 'http://localhost:3000/dashboard/settings',
            disableRedirect: true,
            customerType: 'user' as const,
        };

        await expect(controller.billingPortal(body, req)).resolves.toEqual({ url: 'https://billing.stripe.com/test' });
        expect(authService.createBillingPortal).toHaveBeenCalledWith(body, req.headers);
    });
});
