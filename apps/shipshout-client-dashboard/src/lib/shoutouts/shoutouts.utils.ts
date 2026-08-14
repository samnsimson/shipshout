export type ShoutoutStatus =
    | 'generating'
    | 'ready_for_review'
    | 'publishing'
    | 'published'
    | 'partially_published'
    | 'failed'
    | 'generation_failed';

export type SourceSummaryField = {
    label: string;
    value: string;
    multiline?: boolean;
};

export class ShoutoutsUtils {
    static isInFlight(status: string): boolean {
        return status === 'generating' || status === 'publishing';
    }

    static badge(status: string): { label: string; palette: 'purple' | 'blue' | 'orange' | 'green' | 'red' | 'gray' } {
        if (status === 'generating') return { label: 'Generating', palette: 'purple' };
        if (status === 'ready_for_review') return { label: 'Ready for review', palette: 'blue' };
        if (status === 'publishing') return { label: 'Publishing', palette: 'orange' };
        if (status === 'published') return { label: 'Published', palette: 'green' };
        if (status === 'partially_published') return { label: 'Partially published', palette: 'orange' };
        if (status === 'generation_failed') return { label: 'Generation failed', palette: 'red' };
        if (status === 'failed') return { label: 'Failed', palette: 'red' };
        return { label: status, palette: 'gray' };
    }

    static sourceSummaryFields(triggerType: string, sourceSummary: Record<string, unknown>): SourceSummaryField[] {
        const text = (key: string) => {
            const value = sourceSummary[key];
            if (value == null || value === '') return null;
            return String(value);
        };

        if (triggerType === 'release') {
            const fields: SourceSummaryField[] = [];
            const tagName = text('tagName');
            const name = text('name');
            const body = text('body');
            if (tagName) fields.push({ label: 'Tag', value: tagName });
            if (name) fields.push({ label: 'Release name', value: name });
            if (body) fields.push({ label: 'Release notes', value: body, multiline: true });
            return fields;
        }

        if (triggerType === 'tag_push') {
            const fields: SourceSummaryField[] = [];
            const ref = text('ref');
            const refType = text('refType');
            if (ref) fields.push({ label: 'Tag', value: ref.replace(/^refs\/tags\//, '') });
            if (refType) fields.push({ label: 'Reference type', value: refType });
            return fields;
        }

        if (triggerType === 'branch_push') {
            const fields: SourceSummaryField[] = [];
            const ref = text('ref');
            const commitSha = text('commitSha');
            const commitMessage = text('commitMessage');
            if (ref) fields.push({ label: 'Branch', value: ref.replace(/^refs\/heads\//, '') });
            if (commitSha) fields.push({ label: 'Commit', value: commitSha.slice(0, 7) });
            if (commitMessage) fields.push({ label: 'Commit message', value: commitMessage, multiline: true });
            return fields;
        }

        return Object.entries(sourceSummary)
            .filter(([, value]) => value != null && value !== '')
            .map(([key, value]) => ({ label: ShoutoutsUtils.humanizeKey(key), value: String(value) }));
    }

    private static humanizeKey(key: string): string {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (char) => char.toUpperCase())
            .trim();
    }
}
