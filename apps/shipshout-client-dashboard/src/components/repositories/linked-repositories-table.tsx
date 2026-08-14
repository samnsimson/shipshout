'use client';

import { Button, Flex, For, Link as ChakraLink, Show, Stack, Table } from '@chakra-ui/react';
import Link from 'next/link';
import { Link2, Settings2, Unlink } from 'lucide-react';
import { useTransition } from 'react';
import { EmptyStateText } from '@/components/ui/empty-state-text';
import { SectionHeading } from '@/components/ui/section-heading';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { unlinkRepository } from '@/lib/repositories/repositories.actions';
import type { LinkedRepositoryResponseDto } from '@shipshout/api-client';

export function LinkedRepositoriesTable(props: { linked: LinkedRepositoryResponseDto[] }) {
    const [pending, startTransition] = useTransition();

    return (
        <SurfaceCard flush p="0">
            <Stack gap="0" px="lg" pt="lg" pb={props.linked.length === 0 ? 'lg' : 'md'}>
                <Flex align="center" gap="xs">
                    <Link2 size={16} strokeWidth={2} aria-hidden />
                    <SectionHeading>Linked repositories</SectionHeading>
                </Flex>
                <Show when={props.linked.length === 0}>
                    <EmptyStateText mt="md">No repositories linked yet.</EmptyStateText>
                </Show>
            </Stack>

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
                                                        <Button size="sm" variant="outline" borderColor="border.hairline" borderRadius="lg" gap="xs">
                                                            <Settings2 size={14} strokeWidth={2} aria-hidden />
                                                            Configure
                                                        </Button>
                                                    </Link>
                                                </ChakraLink>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    borderColor="border.hairline"
                                                    borderRadius="lg"
                                                    gap="xs"
                                                    onClick={() =>
                                                        startTransition(() => {
                                                            unlinkRepository(repo.id).then((res) => {
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
        </SurfaceCard>
    );
}
