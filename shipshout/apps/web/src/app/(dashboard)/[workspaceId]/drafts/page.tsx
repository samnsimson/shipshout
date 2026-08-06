import { Button, Show, SimpleGrid } from '@chakra-ui/react';
import { LuGithub, LuMegaphone } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/page-header';
import { listDrafts } from '../../../../lib/drafts';
import { connectGithubUrl } from '../../../../lib/repositories';
import { DraftCard } from './draft-card';

export default async function DraftsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const drafts = await listDrafts(workspaceId);
    return (
        <>
            <PageHeader title="Drafts" description="AI-generated posts waiting for your review." />
            <Show
                when={drafts.length === 0}
                fallback={
                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
                        {drafts.map((d: { id: string }) => (
                            <DraftCard key={d.id} workspaceId={workspaceId} draft={d as any} />
                        ))}
                    </SimpleGrid>
                }
            >
                <EmptyState title="No drafts yet" description="Connect a repo and push a release to get started." icon={<LuMegaphone />}>
                    <Button asChild colorPalette="signal" mt="2">
                        <a href={connectGithubUrl(workspaceId)}>
                            <LuGithub /> Connect with GitHub
                        </a>
                    </Button>
                </EmptyState>
            </Show>
        </>
    );
}
