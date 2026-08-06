'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Show, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { LuGithub, LuMegaphone } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { connectGithubUrl } from '@/lib/repositories';
import { DraftCard } from './draft-card';

type Draft = { id: string; channel: string; generatedCopy: string; editedCopy?: string; status: string };

export function DraftsList({ workspaceId, poll }: { workspaceId: string; poll?: boolean }) {
    const router = useRouter();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(false);

    const fetchDrafts = useCallback(async () => {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
        const res = await fetch(`${base}/api/workspaces/${workspaceId}/drafts`, { credentials: 'include' });
        if (res.status === 403) {
            router.push('/forbidden');
            return null;
        }
        if (res.status === 401) {
            router.push('/login');
            return null;
        }
        if (!res.ok) return null;
        return (await res.json()) as Draft[];
    }, [router, workspaceId]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            const data = await fetchDrafts();
            if (cancelled || data === null) return;
            setDrafts(data);
            setLoading(false);
            if (poll && data.length === 0) setPolling(true);
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [fetchDrafts, poll]);

    useEffect(() => {
        if (!polling) return;

        const interval = window.setInterval(async () => {
            const data = await fetchDrafts();
            if (data === null) return;
            setDrafts(data);
            setLoading(false);
            if (data.length > 0) setPolling(false);
        }, 2000);

        const timeout = window.setTimeout(() => setPolling(false), 60000);
        return () => {
            window.clearInterval(interval);
            window.clearTimeout(timeout);
        };
    }, [polling, fetchDrafts]);

    if (loading && drafts.length === 0) {
        return (
            <VStack gap="2" py="8" color="fg.muted">
                <Spinner size="md" color="brand.solid" />
                <Text fontSize="sm">{poll ? 'Generating drafts…' : 'Loading drafts…'}</Text>
            </VStack>
        );
    }

    return (
        <Show
            when={drafts.length === 0 && !polling}
            fallback={
                <VStack align="stretch" gap="4">
                    <Show when={polling}>
                        <VStack gap="2" py="8" color="fg.muted">
                            <Spinner size="md" color="brand.solid" />
                            <Text fontSize="sm">Generating drafts…</Text>
                        </VStack>
                    </Show>
                    <Show when={drafts.length > 0}>
                        <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
                            {drafts.map((d) => (
                                <DraftCard key={d.id} workspaceId={workspaceId} draft={d} />
                            ))}
                        </SimpleGrid>
                    </Show>
                </VStack>
            }
        >
            <EmptyState title="No drafts yet" description="Connect a repo and push a release to get started." icon={<LuMegaphone />}>
                <Button asChild colorPalette="brand" mt="2">
                    <a href={connectGithubUrl(workspaceId)}>
                        <LuGithub /> Connect with GitHub
                    </a>
                </Button>
            </EmptyState>
        </Show>
    );
}
