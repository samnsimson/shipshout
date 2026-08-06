import { SimulateReleaseSchema } from './repository.contracts';

describe('SimulateReleaseSchema', () => {
    it('accepts an empty body (all fields optional)', () => {
        expect(SimulateReleaseSchema.safeParse({}).success).toBe(true);
    });
    it('accepts title and notes', () => {
        expect(SimulateReleaseSchema.safeParse({ title: 'v1.0.1', notes: 'Fixed bugs' }).success).toBe(true);
    });
    it('rejects a non-string title', () => {
        expect(SimulateReleaseSchema.safeParse({ title: 42 }).success).toBe(false);
    });
});
