import { LinkedRepositoryEntity } from '@shipshout/database';

export class RepositoryMaintenanceUtils {
    static selectKeeperAndDuplicates(group: LinkedRepositoryEntity[]): {
        keeper: LinkedRepositoryEntity;
        duplicates: LinkedRepositoryEntity[];
    } {
        const sorted = [...group].sort((a, b) => a.linkedAt.getTime() - b.linkedAt.getTime());
        return { keeper: sorted[0], duplicates: sorted.slice(1) };
    }
}
