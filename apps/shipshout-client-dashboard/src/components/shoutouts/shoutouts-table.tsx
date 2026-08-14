'use client';

import { Box, For, Link as ChakraLink, Table } from '@chakra-ui/react';
import Link from 'next/link';
import { EmptyStateText } from '@/components/ui/empty-state-text';
import { StatusBadge } from '@/components/ui/status-badge';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { ShoutoutDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';
import { TriggerUtils } from '@/lib/triggers/triggers.utils';

export function ShoutoutsTable(props: { shoutouts: ShoutoutDto[]; emptyMessage?: string; embedded?: boolean }) {
    const emptyMessage = props.emptyMessage ?? 'Shoutouts appear here when a trigger fires on a linked repo.';

    if (props.shoutouts.length === 0) {
        if (props.embedded) {
            return (
                <Box p="lg">
                    <EmptyStateText>{emptyMessage}</EmptyStateText>
                </Box>
            );
        }

        return (
            <SurfaceCard>
                <EmptyStateText>{emptyMessage}</EmptyStateText>
            </SurfaceCard>
        );
    }

    const table = (
        <Table.ScrollArea>
            <Table.Root size="sm" variant="line">
                <Table.Header>
                    <Table.Row bg="bg.soft">
                        <Table.ColumnHeader>Title</Table.ColumnHeader>
                        <Table.ColumnHeader>Repository</Table.ColumnHeader>
                        <Table.ColumnHeader>Trigger</Table.ColumnHeader>
                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                        <Table.ColumnHeader>Created</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    <For each={props.shoutouts}>
                        {(shoutout) => {
                            const status = ShoutoutsUtils.badge(shoutout.status);
                            return (
                                <Table.Row key={shoutout.id}>
                                    <Table.Cell fontWeight="600">
                                        <ChakraLink asChild color="brand.fg">
                                            <Link href={`/dashboard/shoutouts/${shoutout.id}`}>{shoutout.title}</Link>
                                        </ChakraLink>
                                    </Table.Cell>
                                    <Table.Cell color="fg.muted">{shoutout.repositoryFullName}</Table.Cell>
                                    <Table.Cell>
                                        <StatusBadge label={TriggerUtils.triggerTypeLabel(shoutout.triggerType)} />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <StatusBadge label={status.label} palette={status.palette} />
                                    </Table.Cell>
                                    <Table.Cell color="fg.muted">{new Date(shoutout.createdAt).toLocaleString()}</Table.Cell>
                                </Table.Row>
                            );
                        }}
                    </For>
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );

    if (props.embedded) return table;

    return (
        <SurfaceCard flush p="0">
            {table}
        </SurfaceCard>
    );
}
