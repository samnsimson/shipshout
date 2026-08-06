'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Checkbox, Flex, Input, InputGroup, Show, Stack, Text } from '@chakra-ui/react';
import { LuSearch } from 'react-icons/lu';
import { PageHeader } from '@/components/page-header';
import { toaster } from '@/components/ui/toaster';
import { handleForbiddenClient } from '../../../../../../lib/forbidden';
import { importGithubRepos, listPendingGithubRepos } from '../../../../../../lib/repositories';
import { filterRepos, toggleVisibleSelection, visibleSelectAllState } from './filter-repos';

type Repo = { id: number; full_name: string };

export function RepoPicker({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const [repos, setRepos] = useState<Repo[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const visibleRepos = useMemo(() => filterRepos(repos, query), [repos, query]);
    const selectAllChecked = visibleSelectAllState(visibleRepos, selected);

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

    useEffect(() => {
        if (!loading) searchRef.current?.focus();
    }, [loading]);

    const toggle = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const connectSelected = async () => {
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
                            <Stack gap="4">
                                <InputGroup startElement={<LuSearch aria-hidden />}>
                                    <Input
                                        ref={searchRef}
                                        placeholder="Search repositories…"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        aria-label="Search repositories"
                                    />
                                </InputGroup>

                                <Checkbox.Root
                                    checked={selectAllChecked}
                                    disabled={visibleRepos.length === 0}
                                    onCheckedChange={() => {
                                        const selectAll = selectAllChecked !== true;
                                        setSelected(toggleVisibleSelection(selected, visibleRepos, selectAll));
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control>
                                        <Checkbox.Indicator />
                                    </Checkbox.Control>
                                    <Checkbox.Label>
                                        Select all{' '}
                                        <Text as="span" color="fg.muted">
                                            ({visibleRepos.length} visible)
                                        </Text>
                                    </Checkbox.Label>
                                </Checkbox.Root>

                                <Stack gap="2" maxH="360px" overflowY="auto" pr="1">
                                    <Show
                                        when={visibleRepos.length > 0}
                                        fallback={<Text color="fg.muted">No repositories match your search.</Text>}
                                    >
                                        {visibleRepos.map((repo) => (
                                            <Checkbox.Root
                                                key={repo.id}
                                                checked={selected.has(repo.id)}
                                                onCheckedChange={() => toggle(repo.id)}
                                            >
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control>
                                                    <Checkbox.Indicator />
                                                </Checkbox.Control>
                                                <Checkbox.Label>
                                                    <RepoLabel fullName={repo.full_name} />
                                                </Checkbox.Label>
                                            </Checkbox.Root>
                                        ))}
                                    </Show>
                                </Stack>
                            </Stack>
                        </Show>
                    </Show>
                </Card.Body>
                <Show when={!loading && repos.length > 0}>
                    <Card.Footer borderTopWidth="1px" borderColor="border.muted">
                        <Flex justify="space-between" align="center" gap="4" w="full">
                            <Text color="fg.muted" fontSize="sm">
                                {selected.size === 0
                                    ? 'None selected'
                                    : selected.size === 1
                                      ? '1 repository selected'
                                      : `${selected.size} selected`}
                            </Text>
                            <Button
                                colorPalette="brand"
                                loading={submitting}
                                disabled={selected.size === 0}
                                onClick={connectSelected}
                            >
                                Connect selected
                            </Button>
                        </Flex>
                    </Card.Footer>
                </Show>
            </Card.Root>
        </>
    );
}

function RepoLabel({ fullName }: { fullName: string }) {
    const slash = fullName.indexOf('/');
    if (slash === -1) return <>{fullName}</>;
    return (
        <>
            <Text as="span" color="fg.muted">
                {fullName.slice(0, slash + 1)}
            </Text>
            {fullName.slice(slash + 1)}
        </>
    );
}
