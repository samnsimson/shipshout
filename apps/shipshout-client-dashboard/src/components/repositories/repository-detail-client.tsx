'use client';

import { Badge, Box, Button, Checkbox, Flex, For, Link as ChakraLink, Show, Stack, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink, Webhook } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Toaster } from '../../lib/feedback/toaster.utils';
import { updateRepositoryTriggersAction } from '../../lib/triggers/actions';
import type { RepositoryChannelDto } from '../../lib/channels/api';
import type { LinkedRepositoryDetailDto, TriggerEventDto } from '../../lib/triggers/api';
import { RepositoryChannelsSummary } from './repository-channels-summary';

const triggerLabels = {
    release: 'Release published',
    tagPush: 'Git tag push',
    branchPush: 'Push to default branch',
} as const;

const TRIGGER_KEYS = Object.keys(triggerLabels) as Array<keyof typeof triggerLabels>;

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
    const [pending, startTransition] = useTransition();

    const status = webhookStatusBadge(props.repository.webhook.status);
    const webhook = props.repository.webhook;

    const save = () => {
        startTransition(async () => {
            const result = await updateRepositoryTriggersAction(props.repository.id, triggers);
            if (!result.ok) {
                Toaster.error({ title: 'Could not save triggers', description: result.error });
                return;
            }
            Toaster.success({ title: 'Triggers saved' });
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

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Text fontSize="sm" fontWeight="600">
                        Trigger configuration
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                        No triggers are enabled by default. Turn on at least one to start receiving events.
                    </Text>
                    <Stack gap="sm">
                        <For each={TRIGGER_KEYS}>
                            {(key) => (
                                <Checkbox.Root
                                    key={key}
                                    checked={triggers[key]}
                                    onCheckedChange={(details) => setTriggers((prev) => ({ ...prev, [key]: Boolean(details.checked) }))}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control />
                                    <Checkbox.Label fontSize="sm">{triggerLabels[key]}</Checkbox.Label>
                                </Checkbox.Root>
                            )}
                        </For>
                    </Stack>
                    <Button colorPalette="blue" borderRadius="full" alignSelf="flex-start" onClick={save} loading={pending}>
                        Save triggers
                    </Button>
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
                <Box px="lg" pt="lg" pb="md">
                    <Flex align="center" justify="space-between" gap="md" flexWrap="wrap">
                        <Stack gap="xxs">
                            <Text fontSize="sm" fontWeight="600">
                                Delivery channels
                            </Text>
                            <Text color="fg.muted" fontSize="sm">
                                Channels enabled for this repository.
                            </Text>
                        </Stack>
                        <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
                            <Link href={`/dashboard/channels?repo=${props.repository.id}`}>
                                <Button size="sm" variant="outline" borderColor="border.hairline" borderRadius="full">
                                    Manage channels
                                </Button>
                            </Link>
                        </ChakraLink>
                    </Flex>
                </Box>
                <RepositoryChannelsSummary repositoryId={props.repository.id} channels={props.channels} />
            </Box>

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
                    <Show when={webhook.lastDeliveryAt}>
                        {(lastDeliveryAt) => (
                            <Text color="fg.muted" fontSize="sm">
                                Last delivery: {new Date(lastDeliveryAt).toLocaleString()}
                            </Text>
                        )}
                    </Show>
                    <Show when={webhook.lastError}>
                        <Text color={webhook.status === 'error' ? 'red.fg' : 'fg.muted'} fontSize="sm">
                            {webhook.lastError}
                        </Text>
                    </Show>
                    <Show when={webhook.manualSetup}>
                        {(manualSetup) => (
                            <Stack gap="sm" p="md" bg="bg.canvas" borderRadius="md" borderWidth="1px" borderColor="border.hairline">
                                <Text fontSize="sm" fontWeight="600">
                                    Manual setup
                                </Text>
                                <Text fontSize="sm" color="fg.muted">
                                    {manualSetup.instructions}
                                </Text>
                                <Stack gap="xs">
                                    <Text fontSize="xs" color="fg.muted">
                                        Payload URL
                                    </Text>
                                    <Flex align="center" gap="sm">
                                        <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                                            {manualSetup.url}
                                        </Text>
                                        <Button size="xs" variant="outline" onClick={() => copyText(manualSetup.url)}>
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
                                            {manualSetup.secret}
                                        </Text>
                                        <Button size="xs" variant="outline" onClick={() => copyText(manualSetup.secret)}>
                                            <Copy size={12} strokeWidth={2} aria-hidden />
                                        </Button>
                                    </Flex>
                                </Stack>
                            </Stack>
                        )}
                    </Show>
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
                <Box px="lg" pt="lg" pb="md">
                    <Text fontSize="sm" fontWeight="600">
                        Recent events
                    </Text>
                </Box>
                <Show
                    when={props.events.length > 0}
                    fallback={
                        <Box px="lg" pb="lg">
                            <Text color="fg.muted" fontSize="sm">
                                No events yet. Enable a trigger and publish a release.
                            </Text>
                        </Box>
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
                                        <Table.Cell>{triggerTypeLabel(event.triggerType)}</Table.Cell>
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
            </Box>
        </Stack>
    );
}
