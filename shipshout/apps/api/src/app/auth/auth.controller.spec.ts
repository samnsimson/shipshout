import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('me returns the request user', () => {
    const c = new AuthController();
    expect(c.me({ user: { id: 'u1' } } as any)).toEqual({ id: 'u1' });
  });
});
