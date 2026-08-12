'use client';

import { Alert, Badge, Box, Button, Checkbox, Flex, Link as ChakraLink, Stack, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink, Webhook } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { RepositoryChannelDto } from '../../lib/channels/api';
import { updateRepositoryTriggersAction } from '../../lib/triggers/actions';
import type { LinkedRepositoryDetailDto, TriggerEventDto } from '../../lib/triggers/api';
import { RepositoryChannelsSection } from './repository-channels-section';

const triggerLabels = {
    release: 'Release published',
    tagPush: 'Git tag push',
    branchPush: 'Push to default branch',
} as const;

function webhookStatusBadge(status: LinkedRepositoryDetailDto['webhook']['status']) {
    if (status === 'active') return { label: 'Active', palette: 'green' as const };
    if (status === 'manual_required') return { label: 'Manual setup required', palette: 'orange' as const };
    if (status === 'error') return { label: 'Error', palette: 'red' as const };
    if (status === 'pending') return { label: 'Pending', palette: 'gray' as const };
    return { label: 'Not configured', palette: 'gray' as const };
}

function triggerTypeLabel(type: string) {
    if (type === 'release') return 'Release';
    if (type === 'tag_push') return 'Tag push';
    if (type === 'branch_push') return 'Branch push';
    return type;
}

async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
}

export function RepositoryDetailClient(props: { repository: LinkedRepositoryDetailDto; events: TriggerEventDto[]; channels: RepositoryChannelDto[] }) {
    const [triggers, setTriggers] = useState(props.repository.triggers);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const status = webhookStatusBadge(props.repository.webhook.status);
    const webhook = props.repository.webhook;

    const save = () => {
        startTransition(async () => {
            setError(null);
            const result = await updateRepositoryTriggersAction(props.repository.id, triggers);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            window.location.reload();
        });
    };

    return (
        <Stack gap="lg">
            <ChakraLink asChild color="fg.muted" fontSize="sm" _hover={{ color: 'fg.default' }}>
                <Link href="/dashboard/repositories">
                    <Flex align="center" gap="xs">
                        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                        Back to repositories
                    </Flex>
                </Link>
            </ChakraLink>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="sm">
                    <Flex align="center" justify="space-between" gap="md" flexWrap="wrap">
                        <Stack gap="xxs">
                            <Text fontSize="xs" fontWeight="600" color="fg.muted" textTransform="uppercase" letterSpacing="0.125px">
                                Repository
                            </Text>
                            <Text fontSize="xl" fontWeight="700">
                                {props.repository.fullName}
                            </Text>
                        </Stack>
                        <Flex align="center" gap="sm">
                            <Badge variant="subtle" borderRadius="full">
                                {props.repository.defaultBranch}
                            </Badge>
                            <ChakraLink href={props.repository.htmlUrl} target="_blank" rel="noreferrer" fontSize="sm" color="brand.fg">
                                <Flex align="center" gap="xs">
                                    GitHub
                                    <ExternalLink size={14} strokeWidth={2} aria-hidden />
                                </Flex>
                            </ChakraLink>
                        </Flex>
                    </Flex>
                </Stack>
            </Box>

            {error ? (
                <Alert.Root status="error" borderRadius="lg">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
            ) : null}

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Text fontSize="sm" fontWeight="600">
                        Trigger configuration
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                        No triggers are enabled by default. Turn on at least one to start receiving events.
                    </Text>
                    <Stack gap="sm">
                        {(Object.keys(triggerLabels) as Array<keyof typeof triggerLabels>).map((key) => (
                            <Checkbox.Root
                                key={key}
                                checked={triggers[key]}
                                onCheckedChange={(details) => setTriggers((prev) => ({ ...prev, [key]: Boolean(details.checked) }))}
                            >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                                <Checkbox.Label fontSize="sm">{triggerLabels[key]}</Checkbox.Label>
                            </Checkbox.Root>
                        ))}
                    </Stack>
                    <Button colorPalette="blue" borderRadius="full" alignSelf="flex-start" onClick={save} loading={pending}>
                        Save triggers
                    </Button>
                </Stack>
            </Box>

            <RepositoryChannelsSection repositoryId={props.repository.id} channels={props.channels} />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Flex align="center" gap="xs">
                        <Webhook size={16} strokeWidth={2} aria-hidden />
                        <Text fontSize="sm" fontWeight="600">
                            Webhook status
                        </Text>
                        <Badge colorPalette={status.palette} variant="subtle" borderRadius="full">
                            {status.label}
                        </Badge>
                    </Flex>
                    {webhook.lastDeliveryAt ? (
                        <Text color="fg.muted" fontSize="sm">
                            Last delivery: {new Date(webhook.lastDeliveryAt).toLocaleString()}
                        </Text>
                    ) : null}
                    {webhook.lastError ? (
                        <Text color={webhook.status === 'error' ? 'red.fg' : 'fg.muted'} fontSize="sm">
                            {webhook.lastError}
                        </Text>
                    ) : null}
                    {webhook.manualSetup ? (
                        <Stack gap="sm" p="md" bg="bg.canvas" borderRadius="md" borderWidth="1px" borderColor="border.hairline">
                            <Text fontSize="sm" fontWeight="600">
                                Manual setup
                            </Text>
                            <Text fontSize="sm" color="fg.muted">
                                {webhook.manualSetup.instructions}
                            </Text>
                            <Stack gap="xs">
                                <Text fontSize="xs" color="fg.muted">
                                    Payload URL
                                </Text>
                                <Flex align="center" gap="sm">
                                    <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                                        {webhook.manualSetup.url}
                                    </Text>
                                    <Button size="xs" variant="outline" onClick={() => copyText(webhook.manualSetup!.url)}>
                                        <Copy size={12} strokeWidth={2} aria-hidden />
                                    </Button>
                                </Flex>
                            </Stack>
                            <Stack gap="xs">
                                <Text fontSize="xs" color="fg.muted">
                                    Secret
                                </Text>
                                <Flex align="center" gap="sm">
                                    <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                                        {webhook.manualSetup.secret}
                                    </Text>
                                    <Button size="xs" variant="outline" onClick={() => copyText(webhook.manualSetup!.secret)}>
                                        <Copy size={12} strokeWidth={2} aria-hidden />
                                    </Button>
                                </Flex>
                            </Stack>
                        </Stack>
                    ) : null}
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
                <Box px="lg" pt="lg" pb="md">
                    <Text fontSize="sm" fontWeight="600">
                        Recent events
                    </Text>
                </Box>
                {props.events.length === 0 ? (
                    <Box px="lg" pb="lg">
                        <Text color="fg.muted" fontSize="sm">
                            No events yet. Enable a trigger and publish a release.
                        </Text>
                    </Box>
                ) : (
                    <Table.ScrollArea borderTopWidth="1px" borderTopColor="border.hairline">
                        <Table.Root size="sm" variant="line">
                            <Table.Header>
                                <Table.Row bg="bg.canvas">
                                    <Table.ColumnHeader>Type</Table.ColumnHeader>
                                    <Table.ColumnHeader>Summary</Table.ColumnHeader>
                                    <Table.ColumnHeader>When</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="end">Result</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {props.events.map((event) => (
                                    <Table.Row key={event.id}>
                                        <Table.Cell>{triggerTypeLabel(event.triggerType)}</Table.Cell>
                                        <Table.Cell>{event.summary}</Table.Cell>
                                        <Table.Cell color="fg.muted">{new Date(event.createdAt).toLocaleString()}</Table.Cell>
                                        <Table.Cell textAlign="end">
                                            {event.status === 'limit_exceeded' ? (
                                                <Text fontSize="sm" color="orange.fg">
                                                    Limit reached
                                                </Text>
                                            ) : event.shoutoutId ? (
                                                <ChakraLink asChild fontSize="sm" color="brand.fg">
                                                    <Link href={`/dashboard/shoutouts/${event.shoutoutId}`}>View shoutout</Link>
                                                </ChakraLink>
                                            ) : (
                                                <Text fontSize="sm" color="fg.muted">
                                                    Ignored
                                                </Text>
                                            )}
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    </Table.ScrollArea>
                )}
            </Box>
        </Stack>
    );
}
