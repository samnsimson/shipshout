'use client';

import { For, Link as ChakraLink, Show, Stack, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { EmptyStateText } from '@/components/ui/empty-state-text';
import { SectionHeading } from '@/components/ui/section-heading';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { TriggerEventDto } from '@/lib/triggers/triggers.api';
import { TriggerUtils } from '@/lib/triggers/triggers.utils';

export function RepositoryEventsTable(props: { events: TriggerEventDto[] }) {
    return (
        <SurfaceCard flush p="0">
            <Stack gap="0" px="lg" pt="lg" pb="md">
                <SectionHeading>Recent events</SectionHeading>
            </Stack>
            <Show
                when={props.events.length > 0}
                fallback={
                    <Stack px="lg" pb="lg">
                        <EmptyStateText>No events yet. Enable a trigger and publish a release.</EmptyStateText>
                    </Stack>
                }
            >
                <Table.ScrollArea borderTopWidth="1px" borderTopColor="border.hairline">
                    <Table.Root size="sm" variant="line">
                        <Table.Header>
                            <Table.Row bg="bg.soft">
                                <Table.ColumnHeader>Type</Table.ColumnHeader>
                                <Table.ColumnHeader>Summary</Table.ColumnHeader>
                                <Table.ColumnHeader>When</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="end">Result</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            <For each={props.events}>
                                {(event) => (
                                    <Table.Row key={event.id}>
                                        <Table.Cell>{TriggerUtils.triggerTypeLabel(event.triggerType)}</Table.Cell>
                                        <Table.Cell>{event.summary}</Table.Cell>
                                        <Table.Cell color="fg.muted">{new Date(event.createdAt).toLocaleString()}</Table.Cell>
                                        <Table.Cell textAlign="end">
                                            <Show
                                                when={event.status === 'limit_exceeded'}
                                                fallback={
                                                    <Show
                                                        when={event.shoutoutId}
                                                        fallback={
                                                            <Text fontSize="sm" color="fg.muted">
                                                                Ignored
                                                            </Text>
                                                        }
                                                    >
                                                        {(shoutoutId) => (
                                                            <ChakraLink asChild fontSize="sm" color="brand.fg">
                                                                <Link href={`/dashboard/shoutouts/${shoutoutId}`}>View shoutout</Link>
                                                            </ChakraLink>
                                                        )}
                                                    </Show>
                                                }
                                            >
                                                <Text fontSize="sm" color="orange.fg">
                                                    Limit reached
                                                </Text>
                                            </Show>
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
