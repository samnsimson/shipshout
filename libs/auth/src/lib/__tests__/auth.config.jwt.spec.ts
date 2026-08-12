jest.mock('pg', () => ({ Pool: jest.fn() }));
jest.mock('better-auth', () => ({ betterAuth: jest.fn((config) => config) }));
jest.mock('better-auth/plugins', () => ({
    username: jest.fn(() => 'username-plugin'),
    oneTimeToken: jest.fn(() => 'ott-plugin'),
    jwt: jest.fn(() => 'jwt-plugin'),
}));
jest.mock('@better-auth/stripe', () => ({ stripe: jest.fn(() => ({ id: 'stripe-plugin' })) }));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({})));
jest.mock('better-auth/api', () => ({ APIError: class APIError extends Error {} }));
jest.mock('@shipshout/email-client', () => ({ EmailClient: jest.fn() }));

import { jwt } from 'better-auth/plugins';
import { createAuth } from '../auth.config';

describe('createAuth jwt plugin', () => {
    it('registers jwt plugin with 15m expiration', () => {
        createAuth({
            databaseUrl: 'postgres://x',
            clientAppUrl: 'http://localhost:3000',
            baseUrl: 'http://localhost:8000',
            resendApiKey: 're_test',
        });
        expect(jwt).toHaveBeenCalledWith(
            expect.objectContaining({
                jwt: expect.objectContaining({ expirationTime: '15m' }),
            }),
        );
    });
});
