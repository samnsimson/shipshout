'use client';

import { useEffect, useState } from 'react';
import { Button, Show, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { LuGithub, LuMegaphone } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { connectGithubUrl } from '@/lib/repositories';
import { DraftCard } from './draft-card';

type Draft = { id: string; channel: string; generatedCopy: string; editedCopy?: string; status: string };

export function DraftsList({ workspaceId, initialDrafts, poll }: { workspaceId: string; initialDrafts: Draft[]; poll?: boolean }) {
    const [drafts, setDrafts] = useState(initialDrafts);
    const [polling, setPolling] = useState(poll && initialDrafts.length === 0);

    useEffect(() => {
        setDrafts(initialDrafts);
        if (initialDrafts.length > 0) setPolling(false);
    }, [initialDrafts]);

    useEffect(() => {
        if (!polling) return;

        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
        const fetchDrafts = async () => {
            const res = await fetch(`${base}/api/workspaces/${workspaceId}/drafts`, { credentials: 'include' });
            if (!res.ok) return;
            const data: Draft[] = await res.json();
            setDrafts(data);
            if (data.length > 0) setPolling(false);
        };

        void fetchDrafts();
        const interval = window.setInterval(() => void fetchDrafts(), 2000);
        const timeout = window.setTimeout(() => setPolling(false), 60000);
        return () => {
            window.clearInterval(interval);
            window.clearTimeout(timeout);
        };
    }, [polling, workspaceId]);

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
