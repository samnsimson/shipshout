import { CreateWorkspaceSchema } from './workspace.contracts';

describe('CreateWorkspaceSchema', () => {
    it('rejects empty name', () => {
        expect(CreateWorkspaceSchema.safeParse({ name: '' }).success).toBe(false);
    });
    it('accepts a valid name', () => {
        expect(CreateWorkspaceSchema.safeParse({ name: 'Acme' }).success).toBe(true);
    });
});
