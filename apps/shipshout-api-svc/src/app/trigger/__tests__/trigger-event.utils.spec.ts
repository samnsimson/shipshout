import { TriggerEventUtils } from '../utils/trigger-event.utils';

describe('TriggerEventUtils', () => {
    const triggers = { release: true, tagPush: false, branchPush: true };

    it('resolves release published events', () => {
        const type = TriggerEventUtils.resolveTriggerType({
            githubEvent: 'release',
            payload: { action: 'published' },
            defaultBranch: 'main',
        });
        expect(type).toBe('release');
    });

    it('ignores draft releases', () => {
        const type = TriggerEventUtils.resolveTriggerType({
            githubEvent: 'release',
            payload: { action: 'draft' },
            defaultBranch: 'main',
        });
        expect(type).toBeNull();
    });

    it('resolves tag push events', () => {
        const type = TriggerEventUtils.resolveTriggerType({
            githubEvent: 'create',
            payload: { ref_type: 'tag', ref: 'v1.0.0' },
            defaultBranch: 'main',
        });
        expect(type).toBe('tag_push');
    });

    it('resolves default branch push events', () => {
        const type = TriggerEventUtils.resolveTriggerType({
            githubEvent: 'push',
            payload: { ref: 'refs/heads/main', commits: [{ message: 'feat: launch' }] },
            defaultBranch: 'main',
        });
        expect(type).toBe('branch_push');
    });

    it('matches enabled trigger toggles', () => {
        expect(TriggerEventUtils.matchesEnabledTrigger('release', triggers)).toBe(true);
        expect(TriggerEventUtils.matchesEnabledTrigger('tag_push', triggers)).toBe(false);
        expect(TriggerEventUtils.matchesEnabledTrigger('branch_push', triggers)).toBe(true);
    });
});
