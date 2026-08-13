'use client';

import { Badge, Flex, For, IconButton, Link as ChakraLink, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import type { RepositoryChannelDto } from '@/lib/channels/channels.api';
import { ChannelUtils } from '@/lib/channels/channels.utils';

export function RepositoryChannelsSummary(props: { repositoryId: string; channels: RepositoryChannelDto[] }) {
    const enabled = props.channels.filter((channel) => channel.enabled && channel.availableOnPlan);

    if (enabled.length === 0) {
        return (
            <Text color="fg.muted" fontSize="sm" px="lg" pb="lg">
                No channels enabled yet.
            </Text>
        );
    }

    return (
        <Table.ScrollArea borderTopWidth="1px" borderTopColor="border.hairline">
            <Table.Root size="sm" variant="line">
                <Table.Header>
                    <Table.Row bg="bg.soft">
                        <Table.ColumnHeader>Channel</Table.ColumnHeader>
                        <Table.ColumnHeader>Type</Table.ColumnHeader>
                        <Table.ColumnHeader>Tone</Table.ColumnHeader>
                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    <For each={enabled}>
                        {(channel) => {
                            const Icon = ChannelUtils.iconFor(channel.channelKey);
                            const accent = ChannelUtils.accentFor(channel.channelKey);
                            return (
                                <Table.Row key={channel.channelKey}>
                                <Table.Cell>
                                    <Flex align="center" gap="sm">
                                        <Flex align="center" justify="center" boxSize="28px" borderRadius="md" bg={accent.bg} color={accent.color} flexShrink={0}>
                                            <Icon size={14} strokeWidth={2} aria-hidden />
                                        </Flex>
                                        <Text fontSize="sm" fontWeight="600">
                                            {channel.displayName}
                                        </Text>
                                    </Flex>
                                </Table.Cell>
                                <Table.Cell color="fg.muted">{ChannelUtils.kindLabels[channel.kind]}</Table.Cell>
                                <Table.Cell color="fg.muted">{ChannelUtils.toneLabels[channel.tone]}</Table.Cell>
                                <Table.Cell>
                                    <Badge variant="subtle" borderRadius="full" colorPalette="green">
                                        Enabled
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell textAlign="end">
                                    <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
                                        <Link href={`/dashboard/channels/${channel.channelKey}?repo=${props.repositoryId}`}>
                                            <IconButton aria-label={`Configure ${channel.displayName}`} size="xs" variant="outline" borderColor="border.hairline">
                                                <Settings2 size={14} strokeWidth={2} />
                                            </IconButton>
                                        </Link>
                                    </ChakraLink>
                                </Table.Cell>
                                </Table.Row>
                            );
                        }}
                    </For>
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}
