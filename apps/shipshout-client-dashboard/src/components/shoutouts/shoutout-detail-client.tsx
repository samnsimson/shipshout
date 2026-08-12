'use client';

import { Alert, Badge, Box, Button, Field, Link as ChakraLink, Stack, Table, Tabs, Text, Textarea } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { publishShoutoutAction, retryShoutoutGenerationAction, updateShoutoutDraftAction } from '../../lib/shoutouts/actions';
import type { ShoutoutDetailDto, ShoutoutDraftDto, ShoutoutStreamEvent } from '../../lib/shoutouts/api';
import { ShoutoutStatusUtils } from '../../lib/shoutouts/shoutout-status.utils';

function triggerTypeLabel(type: string) {
    if (type === 'release') return 'Release';
    if (type === 'tag_push') return 'Tag push';
    if (type === 'branch_push') return 'Branch push';
    return type;
}

function channelLabel(channelKey: string) {
    return channelKey
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function dispatchStatusBadge(status: string) {
    if (status === 'sent') return { label: 'Sent', palette: 'green' as const };
    if (status === 'failed') return { label: 'Failed', palette: 'red' as const };
    if (status === 'skipped') return { label: 'Skipped', palette: 'gray' as const };
    return { label: status, palette: 'gray' as const };
}

function draftsToState(drafts: ShoutoutDraftDto[]): Record<string, { title: string; body: string }> {
    return Object.fromEntries(drafts.map((draft) => [draft.channelKey, { title: draft.title, body: draft.body }]));
}

function parseSseEvents(chunk: string, onEvent: (event: ShoutoutStreamEvent) => void): string {
    const parts = chunk.split('\n\n');
    const remainder = parts.pop() ?? '';

    for (const part of parts) {
        const dataLine = part
            .split('\n')
            .find((line) => line.startsWith('data:'));
        if (!dataLine) continue;
        const payload = dataLine.slice(5).trim();
        if (!payload) continue;
        try {
            onEvent(JSON.parse(payload) as ShoutoutStreamEvent);
        } catch {
            // ignore malformed events
        }
    }

    return remainder;
}

function useShoutoutEvents(shoutoutId: string, enabled: boolean, onEvent: (event: ShoutoutStreamEvent) => void) {
    const router = useRouter();

    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        let pollIntervalId: number | undefined;
        const controller = new AbortController();

        const startPolling = () => {
            if (pollIntervalId !== undefined) return;
            pollIntervalId = window.setInterval(() => router.refresh(), 3000);
        };

        const connect = async () => {
            try {
                const response = await fetch(`/api/shoutouts/${shoutoutId}/events`, {
                    credentials: 'include',
                    signal: controller.signal,
                });
                if (!response.ok || !response.body) throw new Error('SSE unavailable');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (!cancelled) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    buffer = parseSseEvents(buffer, onEvent);
                }

                if (!cancelled) startPolling();
            } catch {
                if (!cancelled) startPolling();
            }
        };

        void connect();

        return () => {
            cancelled = true;
            controller.abort();
            if (pollIntervalId !== undefined) window.clearInterval(pollIntervalId);
        };
    }, [enabled, onEvent, router, shoutoutId]);
}

function DraftEditor(props: {
    shoutoutId: string;
    drafts: ShoutoutDraftDto[];
    editable: boolean;
    onSaved: (shoutout: ShoutoutDetailDto) => void;
}) {
    const [draftState, setDraftState] = useState(() => draftsToState(props.drafts));
    const [activeTab, setActiveTab] = useState<string | null>(props.drafts[0]?.channelKey ?? null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        setDraftState(draftsToState(props.drafts));
    }, [props.drafts]);

    useEffect(() => {
        if (activeTab && props.drafts.some((draft) => draft.channelKey === activeTab)) return;
        setActiveTab(props.drafts[0]?.channelKey ?? null);
    }, [activeTab, props.drafts]);

    const saveDraft = (channelKey: string) => {
        const draft = draftState[channelKey];
        if (!draft) return;

        startTransition(async () => {
            setError(null);
            const result = await updateShoutoutDraftAction(props.shoutoutId, channelKey, draft);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            props.onSaved(result.shoutout);
        });
    };

    if (props.drafts.length === 0) {
        return (
            <Text color="fg.muted" fontSize="sm">
                Drafts will appear here once generation completes.
            </Text>
        );
    }

    return (
        <Stack gap="md">
            {error ? (
                <Alert.Root status="error" borderRadius="lg">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
            ) : null}
            <Tabs.Root value={activeTab} onValueChange={(details) => setActiveTab(details.value)}>
                <Tabs.List flexWrap="wrap">
                    {props.drafts.map((draft) => (
                        <Tabs.Trigger key={draft.channelKey} value={draft.channelKey}>
                            {channelLabel(draft.channelKey)}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>
                {props.drafts.map((draft) => {
                    const state = draftState[draft.channelKey] ?? { title: draft.title, body: draft.body };
                    return (
                        <Tabs.Content key={draft.channelKey} value={draft.channelKey} pt="md">
                            <Stack gap="md">
                                <Field.Root gap="xs">
                                    <Field.Label fontSize="sm">Title</Field.Label>
                                    <Textarea
                                        value={state.title}
                                        onChange={(event) =>
                                            setDraftState((prev) => ({
                                                ...prev,
                                                [draft.channelKey]: { ...state, title: event.target.value },
                                            }))
                                        }
                                        disabled={!props.editable}
                                        rows={2}
                                    />
                                </Field.Root>
                                <Field.Root gap="xs">
                                    <Field.Label fontSize="sm">Body</Field.Label>
                                    <Textarea
                                        value={state.body}
                                        onChange={(event) =>
                                            setDraftState((prev) => ({
                                                ...prev,
                                                [draft.channelKey]: { ...state, body: event.target.value },
                                            }))
                                        }
                                        disabled={!props.editable}
                                        rows={10}
                                    />
                                </Field.Root>
                                {props.editable ? (
                                    <Button colorPalette="blue" borderRadius="full" alignSelf="flex-start" onClick={() => saveDraft(draft.channelKey)} loading={pending}>
                                        Save draft
                                    </Button>
                                ) : null}
                            </Stack>
                        </Tabs.Content>
                    );
                })}
            </Tabs.Root>
        </Stack>
    );
}

export function ShoutoutDetailClient(props: { shoutout: ShoutoutDetailDto }) {
    const router = useRouter();
    const [shoutout, setShoutout] = useState(props.shoutout);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        setShoutout(props.shoutout);
    }, [props.shoutout]);

    const onStreamEvent = useCallback(
        (_event: ShoutoutStreamEvent) => {
            router.refresh();
        },
        [router],
    );

    useShoutoutEvents(shoutout.id, ShoutoutStatusUtils.isInFlight(shoutout.status), onStreamEvent);

    const status = ShoutoutStatusUtils.badge(shoutout.status);
    const canEdit = shoutout.status === 'ready_for_review';
    const canPublish = shoutout.status === 'ready_for_review';
    const canRetry = shoutout.status === 'generation_failed';

    const publish = () => {
        startTransition(async () => {
            setError(null);
            const result = await publishShoutoutAction(shoutout.id);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            router.refresh();
        });
    };

    const retry = () => {
        startTransition(async () => {
            setError(null);
            const result = await retryShoutoutGenerationAction(shoutout.id);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            router.refresh();
        });
    };

    return (
        <Stack gap="lg">
            <ChakraLink asChild color="fg.muted" fontSize="sm" _hover={{ color: 'fg.default' }}>
                <Link href="/dashboard/shoutouts">
                    <Stack direction="row" align="center" gap="xs">
                        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                        Back to shoutouts
                    </Stack>
                </Link>
            </ChakraLink>

            {error ? (
                <Alert.Root status="error" borderRadius="lg">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                </Alert.Root>
            ) : null}

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Stack gap="xs">
                        <Text fontSize="xs" fontWeight="600" color="fg.muted" textTransform="uppercase" letterSpacing="0.125px">
                            Shoutout
                        </Text>
                        <Text fontSize="2xl" fontWeight="700">
                            {shoutout.title}
                        </Text>
                    </Stack>
                    <Stack direction="row" gap="sm" flexWrap="wrap">
                        <Badge variant="subtle" borderRadius="full">
                            {triggerTypeLabel(shoutout.triggerType)}
                        </Badge>
                        <Badge colorPalette={status.palette} variant="subtle" borderRadius="full">
                            {status.label}
                        </Badge>
                    </Stack>
                    <Text color="fg.muted" fontSize="sm">
                        Created {new Date(shoutout.createdAt).toLocaleString()} from {shoutout.repositoryFullName}
                    </Text>
                    <Stack direction="row" gap="sm" flexWrap="wrap">
                        {canPublish ? (
                            <Button colorPalette="blue" borderRadius="full" onClick={publish} loading={pending}>
                                Publish
                            </Button>
                        ) : null}
                        {canRetry ? (
                            <Button colorPalette="blue" borderRadius="full" onClick={retry} loading={pending}>
                                Retry generation
                            </Button>
                        ) : null}
                        <ChakraLink asChild fontSize="sm" color="brand.fg" alignSelf="center">
                            <Link href={`/dashboard/repositories/${shoutout.linkedRepositoryId}`}>View repository triggers</Link>
                        </ChakraLink>
                    </Stack>
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Text fontSize="sm" fontWeight="600">
                        Channel drafts
                    </Text>
                    <DraftEditor shoutoutId={shoutout.id} drafts={shoutout.drafts} editable={canEdit} onSaved={setShoutout} />
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="sm">
                    <Text fontSize="sm" fontWeight="600">
                        Source summary
                    </Text>
                    <Box as="pre" fontSize="xs" p="md" bg="bg.canvas" borderRadius="md" overflowX="auto" whiteSpace="pre-wrap">
                        {JSON.stringify(shoutout.sourceSummary, null, 2)}
                    </Box>
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
                <Stack gap="md" p="lg">
                    <Text fontSize="sm" fontWeight="600">
                        Dispatch log
                    </Text>
                    {shoutout.dispatchLogs.length === 0 ? (
                        <Text color="fg.muted" fontSize="sm">
                            Dispatch attempts will appear here after you publish.
                        </Text>
                    ) : (
                        <Table.ScrollArea>
                            <Table.Root size="sm" variant="line">
                                <Table.Header>
                                    <Table.Row bg="bg.canvas">
                                        <Table.ColumnHeader>Channel</Table.ColumnHeader>
                                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                                        <Table.ColumnHeader>Sent</Table.ColumnHeader>
                                        <Table.ColumnHeader>Error</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {shoutout.dispatchLogs.map((log) => {
                                        const logStatus = dispatchStatusBadge(log.status);
                                        return (
                                            <Table.Row key={`${log.channelKey}-${log.sentAt ?? log.status}`}>
                                                <Table.Cell>{channelLabel(log.channelKey)}</Table.Cell>
                                                <Table.Cell>
                                                    <Badge colorPalette={logStatus.palette} variant="subtle" borderRadius="full">
                                                        {logStatus.label}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell color="fg.muted">{log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}</Table.Cell>
                                                <Table.Cell color={log.error ? 'red.fg' : 'fg.muted'} fontSize="sm">
                                                    {log.error ?? '—'}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
}
