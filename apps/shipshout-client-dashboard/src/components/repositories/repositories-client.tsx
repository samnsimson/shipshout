'use client';

import { Badge, Box, Button, Checkbox, Flex, For, Input, InputGroup, Link as ChakraLink, NativeSelect, Show, Stack, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { CheckCircle2, Filter, GitBranch, Link2, Link2Off, Plus, Search, Settings2, Unlink } from 'lucide-react';
import { Toaster } from '../../lib/feedback/toaster.utils';
import { disconnectGithubAction, linkRepositoriesAction, unlinkRepositoryAction } from '../../lib/repositories/actions';
import { QueryBanner } from './query-banner';
import type { GithubConnectionResponseDto, GithubRepoDto, LinkedRepositoryResponseDto } from '@shipshout/api-client';

type VisibilityFilter = 'all' | 'public' | 'private';

const filterControlProps = {
    size: 'sm' as const,
    borderRadius: 'xs',
    borderWidth: '1px',
    borderColor: 'border.hairline',
    bg: 'bg.surface',
    fontSize: 'sm',
};

export function RepositoriesClient(props: {
    connection: GithubConnectionResponseDto;
    available: GithubRepoDto[];
    linked: LinkedRepositoryResponseDto[];
    connectUrl: string;
    githubQuery?: string;
    githubReason?: string;
}) {
    const [selected, setSelected] = useState<number[]>([]);
    const [pending, startTransition] = useTransition();
    const [search, setSearch] = useState('');
    const [ownerFilter, setOwnerFilter] = useState('all');
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
    const deferredSearch = useDeferredValue(search);

    const connected = Boolean(props.connection.connected);
    const selectable = useMemo(() => props.available.filter((repo) => !repo.linked), [props.available]);
    const owners = useMemo(() => [...new Set(selectable.map((repo) => repo.owner))].sort((a, b) => a.localeCompare(b)), [selectable]);

    const filtered = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();
        return selectable.filter((repo) => {
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
    }, [selectable, deferredSearch, ownerFilter, visibilityFilter]);

    const allSelected = filtered.length > 0 && filtered.every((repo) => selected.includes(repo.githubId));
    const someSelected = filtered.some((repo) => selected.includes(repo.githubId)) && !allSelected;

    const toggleRow = (githubId: number, checked: boolean) => {
        setSelected((prev) => {
            if (checked) {
                if (prev.includes(githubId)) return prev;
                return [...prev, githubId];
            }
            return prev.filter((id) => id !== githubId);
        });
    };

    const toggleAll = (checked: boolean) => {
        const visibleIds = filtered.map((repo) => repo.githubId);
        setSelected((prev) => {
            if (checked) return [...new Set([...prev, ...visibleIds])];
            return prev.filter((id) => !visibleIds.includes(id));
        });
    };

    if (!connected) {
        return (
            <Stack gap="lg">
                <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />

                <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                    <Stack gap="md">
                        <Text fontSize="xs" fontWeight="600" color="fg.muted" letterSpacing="0.125px" textTransform="uppercase">
                            GitHub connection
                        </Text>

                        <Flex align="flex-start" gap="sm">
                            <Flex
                                align="center"
                                justify="center"
                                boxSize="40px"
                                borderRadius="md"
                                bg="orange.subtle"
                                color="orange.fg"
                                flexShrink={0}
                            >
                                <GitBranch size={18} strokeWidth={2} aria-hidden />
                            </Flex>
                            <Stack gap="xs" flex="1">
                                <Flex align="center" gap="xs" flexWrap="wrap">
                                    <Badge colorPalette="orange" variant="subtle" borderRadius="full">
                                        Not connected
                                    </Badge>
                                    <Text fontSize="sm" fontWeight="600">
                                        Link repositories from GitHub
                                    </Text>
                                </Flex>
                                <Text color="fg.muted" fontSize="sm">
                                    Authorize Shipshout to read your repos so you can choose which ones to shout about.
                                </Text>
                            </Stack>
                        </Flex>

                        <ChakraLink
                            href={props.connectUrl}
                            display="inline-flex"
                            alignItems="center"
                            justifyContent="center"
                            gap="xs"
                            bg="brand.solid"
                            color="white"
                            borderRadius="full"
                            px="lg"
                            h="44px"
                            fontWeight="500"
                            alignSelf="flex-start"
                            _hover={{ textDecoration: 'none', bg: 'brand.600' }}
                        >
                            <GitBranch size={16} strokeWidth={2} aria-hidden />
                            Connect GitHub
                        </ChakraLink>
                    </Stack>
                </Box>
            </Stack>
        );
    }

    return (
        <Stack gap="lg">
            <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Text fontSize="xs" fontWeight="600" color="fg.muted" letterSpacing="0.125px" textTransform="uppercase">
                        GitHub connection
                    </Text>

                    <Flex align={{ base: 'stretch', sm: 'center' }} justify="space-between" gap="md" direction={{ base: 'column', sm: 'row' }}>
                        <Flex align="flex-start" gap="sm" flex="1">
                            <Flex
                                align="center"
                                justify="center"
                                boxSize="40px"
                                borderRadius="md"
                                bg="green.subtle"
                                color="green.fg"
                                flexShrink={0}
                            >
                                <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
                            </Flex>
                            <Stack gap="xxs">
                                <Flex align="center" gap="xs" flexWrap="wrap">
                                    <Badge colorPalette="green" variant="subtle" borderRadius="full">
                                        Connected
                                    </Badge>
                                    <Text fontSize="sm" color="fg.muted">
                                        GitHub account
                                    </Text>
                                </Flex>
                                <Text fontSize="md" fontWeight="600">
                                    @{props.connection.githubUsername ?? 'unknown'}
                                </Text>
                                <Text color="fg.muted" fontSize="sm">
                                    {props.linked.length === 0
                                        ? 'No repositories linked yet — pick some below.'
                                        : `${props.linked.length} linked ${props.linked.length === 1 ? 'repository' : 'repositories'}.`}
                                </Text>
                            </Stack>
                        </Flex>

                        <Button
                            variant="outline"
                            borderColor="red.muted"
                            color="red.fg"
                            borderRadius="full"
                            gap="xs"
                            onClick={() =>
                                startTransition(() => {
                                    disconnectGithubAction().then((res) => {
                                        if (!res.ok) Toaster.error({ title: 'Could not disconnect GitHub', description: res.error });
                                    });
                                })
                            }
                            loading={pending}
                            alignSelf={{ base: 'flex-start', sm: 'center' }}
                        >
                            <Link2Off size={14} strokeWidth={2} aria-hidden />
                            Disconnect
                        </Button>
                    </Flex>
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden" p="0">
                <Box px="lg" pt="lg" pb={props.linked.length === 0 ? 'lg' : 'md'}>
                    <Flex align="center" gap="xs">
                        <Link2 size={16} strokeWidth={2} aria-hidden />
                        <Text fontSize="sm" fontWeight="600">
                            Linked repositories
                        </Text>
                    </Flex>
                    <Show when={props.linked.length === 0}>
                        <Text color="fg.muted" fontSize="sm" mt="md">
                            No repositories linked yet.
                        </Text>
                    </Show>
                </Box>

                <Show when={props.linked.length > 0}>
                    <Table.ScrollArea borderTopWidth="1px" borderTopColor="border.hairline" borderRadius="0" bg="bg.surface">
                        <Table.Root size="sm" variant="line" bg="bg.surface">
                            <Table.Header>
                                <Table.Row bg="bg.soft">
                                    <Table.ColumnHeader>Repository</Table.ColumnHeader>
                                    <Table.ColumnHeader>Owner</Table.ColumnHeader>
                                    <Table.ColumnHeader>Visibility</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                <For each={props.linked}>
                                    {(repo) => (
                                        <Table.Row key={repo.id} bg="bg.surface">
                                        <Table.Cell fontWeight="600">{repo.fullName}</Table.Cell>
                                        <Table.Cell color="fg.muted">{repo.owner}</Table.Cell>
                                        <Table.Cell color="fg.muted">{repo.private ? 'Private' : 'Public'}</Table.Cell>
                                        <Table.Cell textAlign="end">
                                            <Flex justify="flex-end" gap="xs" flexWrap="wrap">
                                                <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
                                                    <Link href={`/dashboard/repositories/${repo.id}`}>
                                                        <Button size="sm" variant="outline" borderColor="border.hairline" borderRadius="full" gap="xs">
                                                            <Settings2 size={14} strokeWidth={2} aria-hidden />
                                                            Configure
                                                        </Button>
                                                    </Link>
                                                </ChakraLink>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    borderColor="border.hairline"
                                                    borderRadius="full"
                                                    gap="xs"
                                                    onClick={() =>
                                                        startTransition(() => {
                                                            unlinkRepositoryAction(repo.id).then((res) => {
                                                                if (!res.ok) Toaster.error({ title: 'Could not unlink repository', description: res.error });
                                                            });
                                                        })
                                                    }
                                                    loading={pending}
                                                >
                                                    <Unlink size={14} strokeWidth={2} aria-hidden />
                                                    Unlink
                                                </Button>
                                            </Flex>
                                        </Table.Cell>
                                        </Table.Row>
                                    )}
                                </For>
                            </Table.Body>
                        </Table.Root>
                    </Table.ScrollArea>
                </Show>
            </Box>

            <Box borderTopWidth="1px" borderTopColor="border.hairline" />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden" p="0">
                <Box px="lg" pt="lg" pb="md">
                    <Stack gap="md">
                        <Flex align="center" gap="xs">
                            <Plus size={16} strokeWidth={2} aria-hidden />
                            <Text fontSize="sm" fontWeight="600">
                                Add repositories
                            </Text>
                        </Flex>

                        <Show when={selectable.length > 0}>
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
                                    <NativeSelect.Field
                                        aria-label="Filter by owner"
                                        value={ownerFilter}
                                        onChange={(event) => setOwnerFilter(event.currentTarget.value)}
                                    >
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
                                        onChange={(event) => setVisibilityFilter(event.currentTarget.value as VisibilityFilter)}
                                    >
                                        <option value="all">All visibility</option>
                                        <option value="public">Public</option>
                                        <option value="private">Private</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Stack>
                        </Show>

                        <Show when={selectable.length > 0}>
                            <Flex align="center" gap="xs" color="fg.muted">
                                <Filter size={12} strokeWidth={2} aria-hidden />
                                <Text fontSize="xs">
                                    Showing {filtered.length} of {selectable.length} repositories
                                </Text>
                            </Flex>
                        </Show>
                    </Stack>
                </Box>

                <Show
                    when={selectable.length > 0}
                    fallback={
                        <Box px="lg" pb="lg">
                            <Text color="fg.muted" fontSize="sm">
                                No available repositories to link.
                            </Text>
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
                                                onCheckedChange={(details) => toggleAll(Boolean(details.checked))}
                                                disabled={filtered.length === 0}
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
                                                    <Text color="fg.muted" fontSize="sm">
                                                        No repositories match your search or filters.
                                                    </Text>
                                                </Table.Cell>
                                            </Table.Row>
                                        }
                                    >
                                        <For each={filtered}>
                                            {(repo) => {
                                                const isSelected = selected.includes(repo.githubId);
                                                return (
                                                    <Table.Row
                                                        key={repo.githubId}
                                                        data-selected={isSelected ? '' : undefined}
                                                        cursor="pointer"
                                                        bg="bg.surface"
                                                        onClick={() => toggleRow(repo.githubId, !isSelected)}
                                                    >
                                                    <Table.Cell onClick={(event) => event.stopPropagation()}>
                                                        <Checkbox.Root
                                                            size="sm"
                                                            aria-label={`Select ${repo.fullName}`}
                                                            checked={isSelected}
                                                            onCheckedChange={(details) => toggleRow(repo.githubId, Boolean(details.checked))}
                                                        >
                                                            <Checkbox.HiddenInput />
                                                            <Checkbox.Control />
                                                        </Checkbox.Root>
                                                    </Table.Cell>
                                                    <Table.Cell fontWeight={isSelected ? '600' : '400'}>{repo.fullName}</Table.Cell>
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
                                borderRadius="full"
                                gap="xs"
                                onClick={() =>
                                    startTransition(() => {
                                        linkRepositoriesAction(selected).then((res) => {
                                            if (!res.ok) Toaster.error({ title: 'Could not link repositories', description: res.error });
                                            else setSelected([]);
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
            </Box>
        </Stack>
    );
}
