import { LinkedRepositoryEntity } from '@shipshout/database';
import { RepositoryMaintenanceUtils } from '../utils/repository-maintenance.utils';

describe('RepositoryMaintenanceUtils', () => {
    const row = (id: string, linkedAt: Date): LinkedRepositoryEntity => ({ id, linkedAt }) as LinkedRepositoryEntity;

    it('keeps earliest linkedAt and marks later rows as duplicates', () => {
        const group = [row('b', new Date('2026-08-02')), row('a', new Date('2026-08-01')), row('c', new Date('2026-08-03'))];
        const { keeper, duplicates } = RepositoryMaintenanceUtils.selectKeeperAndDuplicates(group);
        expect(keeper.id).toBe('a');
        expect(duplicates.map((r) => r.id)).toEqual(['b', 'c']);
    });
});
