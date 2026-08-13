'use client';

import { Badge, Box, For, Link as ChakraLink, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ShoutoutDto } from '../../lib/shoutouts/api';
import { ShoutoutStatusUtils } from '../../lib/shoutouts/shoutout-status.utils';

function triggerTypeLabel(type: string) {
    if (type === 'release') return 'Release';
    if (type === 'tag_push') return 'Tag push';
    if (type === 'branch_push') return 'Branch push';
    return type;
}

export function ShoutoutsClient(props: { shoutouts: ShoutoutDto[] }) {
    const router = useRouter();
    const hasInFlight = props.shoutouts.some((shoutout) => ShoutoutStatusUtils.isInFlight(shoutout.status));

    useEffect(() => {
        if (!hasInFlight) return;
        const intervalId = window.setInterval(() => router.refresh(), 3000);
        return () => window.clearInterval(intervalId);
    }, [hasInFlight, router]);

    if (props.shoutouts.length === 0) {
        return (
            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Text color="fg.muted" fontSize="sm">
                    Shoutouts appear here when a trigger fires on a linked repo.
                </Text>
            </Box>
        );
    }

    return (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
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
                                const status = ShoutoutStatusUtils.badge(shoutout.status);
                                return (
                                    <Table.Row key={shoutout.id}>
                                    <Table.Cell fontWeight="600">
                                        <ChakraLink asChild color="brand.fg">
                                            <Link href={`/dashboard/shoutouts/${shoutout.id}`}>{shoutout.title}</Link>
                                        </ChakraLink>
                                    </Table.Cell>
                                    <Table.Cell color="fg.muted">{shoutout.repositoryFullName}</Table.Cell>
                                    <Table.Cell>
                                        <Badge variant="subtle" borderRadius="full">
                                            {triggerTypeLabel(shoutout.triggerType)}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge colorPalette={status.palette} variant="subtle" borderRadius="full">
                                            {status.label}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell color="fg.muted">{new Date(shoutout.createdAt).toLocaleString()}</Table.Cell>
                                    </Table.Row>
                                );
                            }}
                        </For>
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
        </Box>
    );
}
