import { SnakeNamingStrategy } from '../snake-naming.strategy';

describe('SnakeNamingStrategy', () => {
    const strategy = new SnakeNamingStrategy();

    it('maps camelCase properties to snake_case columns', () => {
        expect(strategy.columnName('userId', undefined, [])).toBe('user_id');
        expect(strategy.columnName('githubUserId', undefined, [])).toBe('github_user_id');
        expect(strategy.columnName('createdAt', undefined, [])).toBe('created_at');
    });

    it('respects explicit custom column names', () => {
        expect(strategy.columnName('linkedAt', 'linked_at', [])).toBe('linked_at');
    });
});
