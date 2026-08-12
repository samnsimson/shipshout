import { DataSource } from 'typeorm';
import { AuthSubscriptionRepository } from '../repositories/auth-subscription.repository';

describe('AuthSubscriptionRepository', () => {
    it('queries auth.subscription with Better Auth column names', async () => {
        const query = jest.fn().mockResolvedValue([
            {
                plan: 'starter',
                status: 'trialing',
                periodEnd: new Date('2030-01-01T00:00:00.000Z'),
                stripeSubscriptionId: 'sub_1',
            },
        ]);
        const repository = new AuthSubscriptionRepository({ query } as unknown as DataSource);

        await expect(repository.findActiveForUser('user-1')).resolves.toEqual({
            plan: 'starter',
            status: 'trialing',
            periodEnd: '2030-01-01T00:00:00.000Z',
            stripeSubscriptionId: 'sub_1',
        });

        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('FROM auth.subscription'),
            ['user-1'],
        );
        expect(query.mock.calls[0][0]).toContain('"referenceId"');
    });

    it('returns null when query fails', async () => {
        const query = jest.fn().mockRejectedValue(new Error('relation does not exist'));
        const repository = new AuthSubscriptionRepository({ query } as unknown as DataSource);
        await expect(repository.findActiveForUser('user-1')).resolves.toBeNull();
    });
});
