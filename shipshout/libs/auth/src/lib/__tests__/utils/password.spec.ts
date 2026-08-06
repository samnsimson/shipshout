import { hashPassword, verifyPassword } from '../../utils/password';

describe('password utils', () => {
    it('hashPassword verifies correctly', async () => {
        const hash = await hashPassword('secret1234');
        expect(await verifyPassword('secret1234', hash)).toBe(true);
        expect(await verifyPassword('wrong', hash)).toBe(false);
    });
});
