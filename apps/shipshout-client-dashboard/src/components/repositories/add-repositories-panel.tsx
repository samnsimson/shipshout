'use client';

import { Badge, Box, Button, Checkbox, Flex, For, Input, InputGroup, NativeSelect, Show, Stack, Table, Text } from '@chakra-ui/react';
import { Filter, Link2, Plus, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useTransition } from 'react';
import { EmptyStateText } from '@/components/ui/empty-state-text';
import { SectionHeading } from '@/components/ui/section-heading';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { linkRepositories } from '@/lib/repositories/repositories.actions';
import { useRepositoriesLinkStore } from '@/lib/repositories/repositories-link.store';
import type { GithubRepoDto } from '@shipshout/api-client';

const filterControlProps = {
    size: 'sm' as const,
    borderRadius: 'xs',
    borderWidth: '1px',
    borderColor: 'border.hairline',
    bg: 'bg.surface',
    fontSize: 'sm',
};

export class RepositoriesTableUtils {
    static isSelectable(repo: GithubRepoDto): boolean {
        return !repo.claimedByOtherAccount;
    }
}

export function AddRepositoriesPanel(props: { available: GithubRepoDto[] }) {
    const [pending, startTransition] = useTransition();
    const selected = useRepositoriesLinkStore((state) => state.selected);
    const search = useRepositoriesLinkStore((state) => state.search);
    const ownerFilter = useRepositoriesLinkStore((state) => state.ownerFilter);
    const visibilityFilter = useRepositoriesLinkStore((state) => state.visibilityFilter);
    const setSearch = useRepositoriesLinkStore((state) => state.setSearch);
    const setOwnerFilter = useRepositoriesLinkStore((state) => state.setOwnerFilter);
    const setVisibilityFilter = useRepositoriesLinkStore((state) => state.setVisibilityFilter);
    const toggleRow = useRepositoriesLinkStore((state) => state.toggleRow);
    const toggleAll = useRepositoriesLinkStore((state) => state.toggleAll);
    const clearSelected = useRepositoriesLinkStore((state) => state.clearSelected);

    const deferredSearch = useDeferredValue(search);
    const addTableRepos = useMemo(() => props.available.filter((repo) => !repo.linked), [props.available]);
    const owners = useMemo(() => [...new Set(addTableRepos.map((repo) => repo.owner))].sort((a, b) => a.localeCompare(b)), [addTableRepos]);

    const filtered = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();
        return addTableRepos.filter((repo) => {
            if (ownerFilter !== 'all' && repo.owner !== ownerFilter) return false;
            if (visibilityFilter === 'public' && repo.private) return false;
            if (visibilityFilter === 'private' && !repo.private) return false;
            if (!query) return true;
            return (
                repo.fullName.toLowerCase().includes(query) ||
                repo.name.toLowerCase().includes(query) ||
                repo.owner.toLowerCase().includes(query) ||
                repo.defaultBranch.toLowerCase().includes(query)
            );
        });
    }, [addTableRepos, deferredSearch, ownerFilter, visibilityFilter]);

    const selectableFiltered = useMemo(() => filtered.filter(RepositoriesTableUtils.isSelectable), [filtered]);
    const allSelected = selectableFiltered.length > 0 && selectableFiltered.every((repo) => selected.includes(repo.githubId));
    const someSelected = selectableFiltered.some((repo) => selected.includes(repo.githubId)) && !allSelected;

    return (
        <SurfaceCard flush p="0">
            <Box px="lg" pt="lg" pb="md">
                <Stack gap="md">
                    <Flex align="center" gap="xs">
                        <Plus size={16} strokeWidth={2} aria-hidden />
                        <SectionHeading>Add repositories</SectionHeading>
                    </Flex>

                    <Show when={addTableRepos.length > 0}>
                        <Stack direction={{ base: 'column', md: 'row' }} gap="sm" alignItems={{ md: 'center' }}>
                            <InputGroup flex="1" startElement={<Search size={14} strokeWidth={2} aria-hidden />}>
                                <Input
                                    {...filterControlProps}
                                    placeholder="Search repositories"
                                    value={search}
                                    onChange={(event) => setSearch(event.currentTarget.value)}
                                    _placeholder={{ color: 'fg.muted' }}
                                    _focusVisible={{ borderColor: 'brand.500', outline: 'none', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                                />
                            </InputGroup>

                            <NativeSelect.Root {...filterControlProps} width={{ base: 'full', md: '180px' }}>
                                <NativeSelect.Field aria-label="Filter by owner" value={ownerFilter} onChange={(event) => setOwnerFilter(event.currentTarget.value)}>
                                    <option value="all">All owners</option>
                                    <For each={owners}>
                                        {(owner) => (
                                            <option key={owner} value={owner}>
                                                {owner}
                                            </option>
                                        )}
                                    </For>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>

                            <NativeSelect.Root {...filterControlProps} width={{ base: 'full', md: '160px' }}>
                                <NativeSelect.Field
                                    aria-label="Filter by visibility"
                                    value={visibilityFilter}
                                    onChange={(event) => setVisibilityFilter(event.currentTarget.value as typeof visibilityFilter)}
                                >
                                    <option value="all">All visibility</option>
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Stack>
                    </Show>

                    <Show when={addTableRepos.length > 0}>
                        <Flex align="center" gap="xs" color="fg.muted">
                            <Filter size={12} strokeWidth={2} aria-hidden />
                            <Text fontSize="xs">
                                Showing {filtered.length} of {addTableRepos.length} repositories
                            </Text>
                        </Flex>
                    </Show>
                </Stack>
            </Box>

            <Show
                when={addTableRepos.length > 0}
                fallback={
                    <Box px="lg" pb="lg">
                        <EmptyStateText>No available repositories to link.</EmptyStateText>
                    </Box>
                }
            >
                <>
                    <Table.ScrollArea borderTopWidth="1px" borderTopColor="border.hairline" borderRadius="0" maxH="320px" bg="bg.surface">
                        <Table.Root size="sm" variant="line" stickyHeader bg="bg.surface">
                            <Table.Header>
                                <Table.Row bg="bg.soft">
                                    <Table.ColumnHeader w="12">
                                        <Checkbox.Root
                                            size="sm"
                                            aria-label="Select all repositories"
                                            checked={someSelected ? 'indeterminate' : allSelected}
                                            onCheckedChange={(details) => toggleAll(Boolean(details.checked), selectableFiltered.map((repo) => repo.githubId))}
                                            disabled={selectableFiltered.length === 0}
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control />
                                        </Checkbox.Root>
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader>Repository</Table.ColumnHeader>
                                    <Table.ColumnHeader>Owner</Table.ColumnHeader>
                                    <Table.ColumnHeader>Default branch</Table.ColumnHeader>
                                    <Table.ColumnHeader>Visibility</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                <Show
                                    when={filtered.length > 0}
                                    fallback={
                                        <Table.Row bg="bg.surface">
                                            <Table.Cell colSpan={5}>
                                                <EmptyStateText>No repositories match your search or filters.</EmptyStateText>
                                            </Table.Cell>
                                        </Table.Row>
                                    }
                                >
                                    <For each={filtered}>
                                        {(repo) => {
                                            const isSelected = selected.includes(repo.githubId);
                                            const canSelect = RepositoriesTableUtils.isSelectable(repo);
                                            return (
                                                <Table.Row
                                                    key={repo.githubId}
                                                    data-selected={isSelected ? '' : undefined}
                                                    cursor={canSelect ? 'pointer' : 'default'}
                                                    opacity={canSelect ? 1 : 0.6}
                                                    bg="bg.surface"
                                                    onClick={() => canSelect && toggleRow(repo, !isSelected, RepositoriesTableUtils.isSelectable)}
                                                >
                                                    <Table.Cell onClick={(event) => event.stopPropagation()}>
                                                        <Checkbox.Root
                                                            size="sm"
                                                            aria-label={`Select ${repo.fullName}`}
                                                            checked={isSelected}
                                                            disabled={!canSelect}
                                                            onCheckedChange={(details) => toggleRow(repo, Boolean(details.checked), RepositoriesTableUtils.isSelectable)}
                                                        >
                                                            <Checkbox.HiddenInput />
                                                            <Checkbox.Control />
                                                        </Checkbox.Root>
                                                    </Table.Cell>
                                                    <Table.Cell fontWeight={isSelected ? '600' : '400'}>
                                                        <Flex align="center" gap="xs" flexWrap="wrap">
                                                            <Text>{repo.fullName}</Text>
                                                            <Show when={repo.claimedByOtherAccount}>
                                                                <Badge colorPalette="gray" variant="subtle" borderRadius="lg">
                                                                    Linked to another account
                                                                </Badge>
                                                            </Show>
                                                        </Flex>
                                                    </Table.Cell>
                                                    <Table.Cell color="fg.muted">{repo.owner}</Table.Cell>
                                                    <Table.Cell color="fg.muted">{repo.defaultBranch}</Table.Cell>
                                                    <Table.Cell color="fg.muted">{repo.private ? 'Private' : 'Public'}</Table.Cell>
                                                </Table.Row>
                                            );
                                        }}
                                    </For>
                                </Show>
                            </Table.Body>
                        </Table.Root>
                    </Table.ScrollArea>

                    <Box px="lg" py="md">
                        <Button
                            variant="solid"
                            colorPalette="blue"
                            borderRadius="lg"
                            gap="xs"
                            onClick={() =>
                                startTransition(() => {
                                    linkRepositories(selected).then((res) => {
                                        if (!res.ok) Toaster.error({ title: 'Could not link repositories', description: res.error });
                                        else clearSelected();
                                    });
                                })
                            }
                            loading={pending}
                            disabled={selected.length === 0}
                        >
                            <Link2 size={14} strokeWidth={2} aria-hidden />
                            Link selected{selected.length > 0 ? ` (${selected.length})` : ''}
                        </Button>
                    </Box>
                </>
            </Show>
        </SurfaceCard>
    );
}
