'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Checkbox, Show, Stack, Text } from '@chakra-ui/react';
import { PageHeader } from '@/components/page-header';
import { toaster } from '@/components/ui/toaster';
import { handleForbiddenClient } from '../../../../../../lib/forbidden';
import { importGithubRepos, listPendingGithubRepos } from '../../../../../../lib/repositories';

type Repo = { id: number; full_name: string };

export function RepoPicker({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const [repos, setRepos] = useState<Repo[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        listPendingGithubRepos(workspaceId)
            .then((data: { repos: Repo[] }) => {
                setRepos(data.repos);
                setSelected(new Set(data.repos.map((r) => r.id)));
            })
            .catch((error) => {
                if (handleForbiddenClient(error, router.push)) return;
                router.replace(`/${workspaceId}/settings/repositories?error=connect_failed`);
            })
            .finally(() => setLoading(false));
    }, [workspaceId, router]);

    const toggle = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <>
            <PageHeader title="Choose repositories" description="Select which GitHub repositories ShipShout should watch for releases." />
            <Card.Root maxW="2xl">
                <Card.Body>
                    <Show when={!loading} fallback={<Text color="fg.muted">Loading your GitHub repositories…</Text>}>
                        <Show
                            when={repos.length > 0}
                            fallback={<Text color="fg.muted">No new repositories available to connect.</Text>}
                        >
                            <Stack gap="3">
                                {repos.map((repo) => (
                                    <Checkbox.Root
                                        key={repo.id}
                                        checked={selected.has(repo.id)}
                                        onCheckedChange={() => toggle(repo.id)}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control>
                                            <Checkbox.Indicator />
                                        </Checkbox.Control>
                                        <Checkbox.Label>{repo.full_name}</Checkbox.Label>
                                    </Checkbox.Root>
                                ))}
                            </Stack>
                            <Button
                                mt="6"
                                colorPalette="signal"
                                loading={submitting}
                                disabled={selected.size === 0}
                                onClick={async () => {
                                    setSubmitting(true);
                                    try {
                                        const result = await importGithubRepos(workspaceId, [...selected]);
                                        if (result.imported > 0) {
                                            toaster.create({
                                                type: 'success',
                                                title: `Connected ${result.imported} ${result.imported === 1 ? 'repository' : 'repositories'}`,
                                            });
                                        } else if (result.failed > 0) {
                                            toaster.create({
                                                type: 'error',
                                                title: "Couldn't connect repositories",
                                                description: 'Your plan may have reached its repository limit.',
                                            });
                                        } else {
                                            toaster.create({ type: 'info', title: 'Repositories already connected' });
                                        }
                                        router.push(`/${workspaceId}/settings/repositories`);
                                        router.refresh();
                                    } catch (error) {
                                        if (handleForbiddenClient(error, router.push)) return;
                                        toaster.create({ type: 'error', title: "Couldn't connect repositories" });
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                Connect selected
                            </Button>
                        </Show>
                    </Show>
                </Card.Body>
            </Card.Root>
        </>
    );
}
