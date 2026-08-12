'use client';

import { Badge, Box, Link as ChakraLink, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { ShoutoutDto } from '../../lib/shoutouts/api';

function triggerTypeLabel(type: string) {
    if (type === 'release') return 'Release';
    if (type === 'tag_push') return 'Tag push';
    if (type === 'branch_push') return 'Branch push';
    return type;
}

export function ShoutoutsClient(props: { shoutouts: ShoutoutDto[] }) {
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
                        <Table.Row bg="bg.canvas">
                            <Table.ColumnHeader>Title</Table.ColumnHeader>
                            <Table.ColumnHeader>Repository</Table.ColumnHeader>
                            <Table.ColumnHeader>Trigger</Table.ColumnHeader>
                            <Table.ColumnHeader>Status</Table.ColumnHeader>
                            <Table.ColumnHeader>Created</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {props.shoutouts.map((shoutout) => (
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
                                    <Badge colorPalette="purple" variant="subtle" borderRadius="full">
                                        Pending AI
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell color="fg.muted">{new Date(shoutout.createdAt).toLocaleString()}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
        </Box>
    );
}
