import { buildTypeOrmOptions } from '../../config/typeorm.config.js';

describe('buildTypeOrmOptions', () => {
    it('never enables synchronize and uses migrations', () => {
        const opts = buildTypeOrmOptions('postgres://u:p@localhost:5432/db');
        expect(opts.synchronize).toBe(false);
        expect(opts.type).toBe('postgres');
        expect(Array.isArray(opts.entities)).toBe(true);
    });
});
