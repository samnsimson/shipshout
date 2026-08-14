export class TriggerUtils {
    static triggerTypeLabel(type: string): string {
        if (type === 'release') return 'Release';
        if (type === 'tag_push') return 'Tag push';
        if (type === 'branch_push') return 'Branch push';
        return type;
    }

    static webhookStatusBadge(status: string): { label: string; palette: 'green' | 'orange' | 'red' | 'gray' } {
        if (status === 'active') return { label: 'Active', palette: 'green' };
        if (status === 'manual_required') return { label: 'Manual setup required', palette: 'orange' };
        if (status === 'error') return { label: 'Error', palette: 'red' };
        if (status === 'pending') return { label: 'Pending', palette: 'gray' };
        return { label: 'Not configured', palette: 'gray' };
    }

    static readonly triggerLabels = {
        release: 'Release published',
        tagPush: 'Git tag push',
        branchPush: 'Push to default branch',
    } as const;

    static readonly triggerKeys = Object.keys(TriggerUtils.triggerLabels) as Array<keyof typeof TriggerUtils.triggerLabels>;
}
