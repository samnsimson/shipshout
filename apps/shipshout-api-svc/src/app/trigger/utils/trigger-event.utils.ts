import { TriggerEventType } from '@shipshout/database';

export type RepositoryTriggerConfig = {
    release: boolean;
    tagPush: boolean;
    branchPush: boolean;
};

export type GithubTriggerContext = {
    githubEvent: string;
    payload: Record<string, unknown>;
    defaultBranch: string;
};

export class TriggerEventUtils {
    static hasAnyEnabled(triggers: RepositoryTriggerConfig): boolean {
        return triggers.release || triggers.tagPush || triggers.branchPush;
    }

    static countEnabled(triggers: RepositoryTriggerConfig): number {
        return Number(triggers.release) + Number(triggers.tagPush) + Number(triggers.branchPush);
    }

    static resolveTriggerType(context: GithubTriggerContext): TriggerEventType | null {
        const { githubEvent, payload, defaultBranch } = context;

        if (githubEvent === 'release') {
            if (payload.action !== 'published') return null;
            return 'release';
        }

        if (githubEvent === 'create') {
            if (payload.ref_type !== 'tag') return null;
            return 'tag_push';
        }

        if (githubEvent === 'push') {
            const ref = typeof payload.ref === 'string' ? payload.ref : '';
            if (ref !== `refs/heads/${defaultBranch}`) return null;
            const commits = Array.isArray(payload.commits) ? payload.commits : [];
            if (commits.length === 0) return null;
            return 'branch_push';
        }

        return null;
    }

    static matchesEnabledTrigger(triggerType: TriggerEventType, triggers: RepositoryTriggerConfig): boolean {
        if (triggerType === 'release') return triggers.release;
        if (triggerType === 'tag_push') return triggers.tagPush;
        return triggers.branchPush;
    }

    static buildSummary(triggerType: TriggerEventType, payload: Record<string, unknown>, fullName: string): string {
        if (triggerType === 'release') {
            const release = payload['release'];
            const tag = release && typeof release === 'object' && typeof (release as Record<string, unknown>)['tag_name'] === 'string' ? (release as Record<string, unknown>)['tag_name'] : 'release';
            return `Release ${tag} on ${fullName}`;
        }
        if (triggerType === 'tag_push') {
            const ref = typeof payload.ref === 'string' ? payload.ref : 'tag';
            return `Tag ${ref} on ${fullName}`;
        }
        const ref = typeof payload.ref === 'string' ? payload.ref.replace('refs/heads/', '') : 'branch';
        return `Push to ${ref} on ${fullName}`;
    }
}
