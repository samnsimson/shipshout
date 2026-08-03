import { buildApiTypeOrmOptions } from './typeorm.module';

describe('buildApiTypeOrmOptions', () => {
    it('disables synchronize', () => {
        expect(buildApiTypeOrmOptions().synchronize).toBe(false);
    });
});
