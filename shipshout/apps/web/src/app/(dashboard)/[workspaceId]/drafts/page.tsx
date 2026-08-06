import { PageHeader } from '@/components/page-header';
import { listDrafts } from '../../../../lib/drafts';
import { DraftsList } from './drafts-list';

export default async function DraftsPage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceId: string }>;
    searchParams: Promise<{ generating?: string }>;
}) {
    const { workspaceId } = await params;
    const { generating } = await searchParams;
    const drafts = await listDrafts(workspaceId);
    return (
        <>
            <PageHeader title="Drafts" description="AI-generated posts waiting for your review." />
            <DraftsList workspaceId={workspaceId} initialDrafts={drafts} poll={generating === '1'} />
        </>
    );
}
