import { Show, Stack } from '@chakra-ui/react';
import { Suspense } from 'react';
import { LuGitBranch } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/page-header';
import { listRepositories } from '../../../../../lib/repositories';
import { ConnectGithub } from './connect-github';
import { ConnectGithubToast } from './connect-github-toast';
import { RepositoryRow } from './repository-row';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export default async function RepositoriesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const repos: Repo[] = await listRepositories(workspaceId);
    return (
        <>
            <Suspense>
                <ConnectGithubToast />
            </Suspense>
            <PageHeader title="Repositories" description="Connect a repo to trigger releases." />
            <Stack gap="6" maxW="2xl">
                <Show
                    when={repos.length === 0}
                    fallback={
                        <Stack gap="3">
                            {repos.map((r) => (
                                <RepositoryRow key={r.id} workspaceId={workspaceId} repo={r} />
                            ))}
                        </Stack>
                    }
                >
                    <EmptyState title="No repositories yet" description="Connect GitHub to import your repositories." icon={<LuGitBranch />} />
                </Show>
                <ConnectGithub workspaceId={workspaceId} />
            </Stack>
        </>
    );
}
