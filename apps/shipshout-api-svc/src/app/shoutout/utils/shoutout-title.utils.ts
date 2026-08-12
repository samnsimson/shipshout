import { TriggerEventType } from '@shipshout/database';

export class ShoutoutTitleUtils {
    static deriveTitle(triggerType: TriggerEventType, payload: Record<string, unknown>, fullName: string): string {
        if (triggerType === 'release') {
            const release = payload['release'];
            const tag = release && typeof release === 'object' && typeof (release as Record<string, unknown>)['tag_name'] === 'string' ? (release as Record<string, unknown>)['tag_name'] : 'release';
            return `Release ${tag} — ${fullName}`;
        }
        if (triggerType === 'tag_push') {
            const ref = typeof payload.ref === 'string' ? payload.ref : 'tag';
            return `Tag ${ref} — ${fullName}`;
        }
        const ref = typeof payload.ref === 'string' ? payload.ref.replace('refs/heads/', '') : 'branch';
        return `Push to ${ref} — ${fullName}`;
    }

    static buildSourceSummary(triggerType: TriggerEventType, payload: Record<string, unknown>): Record<string, unknown> {
        if (triggerType === 'release') {
            const release = payload['release'];
            if (release && typeof release === 'object') {
                const record = release as Record<string, unknown>;
                return {
                    tagName: record['tag_name'] ?? null,
                    name: record['name'] ?? null,
                    body: record['body'] ?? null,
                };
            }
            return { tagName: null, name: null, body: null };
        }
        if (triggerType === 'tag_push') {
            return {
                ref: payload.ref ?? null,
                refType: payload.ref_type ?? null,
            };
        }
        const commits = Array.isArray(payload.commits) ? payload.commits : [];
        const head = commits[0];
        const headCommit = head && typeof head === 'object' ? (head as Record<string, unknown>) : null;
        return {
            ref: payload.ref ?? null,
            commitMessage: headCommit?.message ?? null,
            commitSha: typeof payload.after === 'string' ? payload.after : null,
        };
    }
}
