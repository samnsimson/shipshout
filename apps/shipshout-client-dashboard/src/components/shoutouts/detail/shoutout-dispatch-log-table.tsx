'use client';

import { For, Show, Table } from '@chakra-ui/react';
import { EmptyStateText } from '@/components/ui/empty-state-text';
import { StatusBadge } from '@/components/ui/status-badge';
import type { ShoutoutDispatchLogDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';

export function ShoutoutDispatchLogTable(props: { dispatchLogs: ShoutoutDispatchLogDto[] }) {
    return (
        <Show when={props.dispatchLogs.length > 0} fallback={<EmptyStateText>Dispatch attempts will appear here after you publish.</EmptyStateText>}>
            <Table.ScrollArea>
                <Table.Root size="sm" variant="line">
                    <Table.Header>
                        <Table.Row bg="bg.soft">
                            <Table.ColumnHeader>Channel</Table.ColumnHeader>
                            <Table.ColumnHeader>Status</Table.ColumnHeader>
                            <Table.ColumnHeader>Sent</Table.ColumnHeader>
                            <Table.ColumnHeader>Error</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        <For each={props.dispatchLogs}>
                            {(log) => {
                                const logStatus = ShoutoutsUtils.dispatchStatusBadge(log.status);
                                return (
                                    <Table.Row key={`${log.channelKey}-${log.sentAt ?? log.status}`}>
                                        <Table.Cell>{ShoutoutsUtils.channelLabel(log.channelKey)}</Table.Cell>
                                        <Table.Cell>
                                            <StatusBadge label={logStatus.label} palette={logStatus.palette} />
                                        </Table.Cell>
                                        <Table.Cell color="fg.muted">{log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}</Table.Cell>
                                        <Table.Cell color={log.error ? 'red.fg' : 'fg.muted'} fontSize="sm">
                                            {log.error ?? '—'}
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            }}
                        </For>
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
        </Show>
    );
}
