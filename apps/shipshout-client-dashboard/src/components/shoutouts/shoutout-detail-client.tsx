'use client';

import { Badge, Box, Button, Field, Flex, For, Link as ChakraLink, Show, Stack, Table, Tabs, Text, Textarea } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { publish as publishShoutout, regenerateDraft, retryGeneration, updateDraft } from '@/lib/shoutouts/shoutouts.actions';
import type { ShoutoutDetailDto, ShoutoutDraftDto, ShoutoutStreamEvent } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';

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
    linkedRepositoryId: string;
    drafts: ShoutoutDraftDto[];
    status: ShoutoutDetailDto['status'];
    editable: boolean;
    onSaved: (shoutout: ShoutoutDetailDto) => void;
}) {
    const defaultValues = useMemo(() => ({ drafts: draftsToState(props.drafts) }), [props.drafts]);
    const { register, getValues, reset } = useForm<{ drafts: Record<string, { title: string; body: string }> }>({ defaultValues });
    const [activeTab, setActiveTab] = useState<string | null>(props.drafts[0]?.channelKey ?? null);
    const [savePending, startSaveTransition] = useTransition();
    const [regeneratePending, startRegenerateTransition] = useTransition();
    const [regeneratingChannelKey, setRegeneratingChannelKey] = useState<string | null>(null);

    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    useEffect(() => {
        if (activeTab && props.drafts.some((draft) => draft.channelKey === activeTab)) return;
        setActiveTab(props.drafts[0]?.channelKey ?? null);
    }, [activeTab, props.drafts]);

    const saveDraft = (channelKey: string) => {
        const draft = getValues(`drafts.${channelKey}`);
        if (!draft) return;

        startSaveTransition(async () => {
            const result = await updateDraft(props.shoutoutId, channelKey, draft);
            if (!result.ok) {
                Toaster.error({ title: 'Could not save draft', description: result.error });
                return;
            }
            Toaster.success({ title: 'Draft saved' });
            props.onSaved(result.shoutout);
        });
    };

    const regenerateChannelDraft = (channelKey: string) => {
        setRegeneratingChannelKey(channelKey);
        startRegenerateTransition(async () => {
            const result = await regenerateDraft(props.shoutoutId, channelKey);
            setRegeneratingChannelKey(null);
            if (!result.ok) {
                Toaster.error({ title: 'Could not regenerate draft', description: result.error });
                return;
            }
            Toaster.success({ title: 'Draft regenerated' });
            reset({ drafts: draftsToState(result.shoutout.drafts) });
            props.onSaved(result.shoutout);
        });
    };

    if (props.drafts.length === 0) {
        if (props.status === 'generating') {
            return (
                <Text color="fg.muted" fontSize="sm">
                    Drafts will appear here once generation completes.
                </Text>
            );
        }

        return (
            <Stack gap="sm">
                <Text color="fg.muted" fontSize="sm">
                    No channel drafts were generated. Enable at least one content channel (such as Email newsletter) on the repository, then retry generation.
                </Text>
                <ChakraLink asChild fontSize="sm" color="brand.fg">
                    <Link href={`/dashboard/repositories/${props.linkedRepositoryId}`}>Configure repository channels</Link>
                </ChakraLink>
            </Stack>
        );
    }

    return (
        <Stack gap="md">
            <Tabs.Root value={activeTab} onValueChange={(details) => setActiveTab(details.value)}>
                <Tabs.List flexWrap="wrap">
                    <For each={props.drafts}>
                        {(draft) => (
                            <Tabs.Trigger key={draft.channelKey} value={draft.channelKey}>
                                {channelLabel(draft.channelKey)}
                            </Tabs.Trigger>
                        )}
                    </For>
                </Tabs.List>
                <For each={props.drafts}>
                    {(draft) => (
                        <Tabs.Content key={draft.channelKey} value={draft.channelKey} pt="md">
                        <Stack gap="md">
                            <Field.Root gap="xs">
                                <Field.Label fontSize="sm">Title</Field.Label>
                                <Textarea {...register(`drafts.${draft.channelKey}.title`)} disabled={!props.editable} rows={2} />
                            </Field.Root>
                            <Field.Root gap="xs">
                                <Field.Label fontSize="sm">Body</Field.Label>
                                <Textarea {...register(`drafts.${draft.channelKey}.body`)} disabled={!props.editable} rows={10} />
                            </Field.Root>
                            <Show when={props.editable}>
                                <Flex gap="sm" flexWrap="wrap">
                                    <Button colorPalette="blue" borderRadius="full" onClick={() => saveDraft(draft.channelKey)} loading={savePending} disabled={regeneratePending}>
                                        Save draft
                                    </Button>
                                    <Button
                                        variant="outline"
                                        borderColor="border.hairline"
                                        borderRadius="full"
                                        gap="xs"
                                        onClick={() => regenerateChannelDraft(draft.channelKey)}
                                        loading={regeneratePending && regeneratingChannelKey === draft.channelKey}
                                        disabled={savePending || (regeneratePending && regeneratingChannelKey !== draft.channelKey)}
                                    >
                                        <RotateCw size={14} strokeWidth={2} aria-hidden />
                                        Regenerate
                                    </Button>
                                </Flex>
                            </Show>
                        </Stack>
                    </Tabs.Content>
                    )}
                </For>
            </Tabs.Root>
        </Stack>
    );
}

function SourceSummaryPanel(props: { triggerType: string; sourceSummary: Record<string, unknown> }) {
    const fields = useMemo(
        () => ShoutoutsUtils.sourceSummaryFields(props.triggerType, props.sourceSummary),
        [props.triggerType, props.sourceSummary],
    );

    return (
        <Stack gap="md">
            <Flex align="center" gap="sm" flexWrap="wrap">
                <Badge variant="subtle" borderRadius="full">
                    {triggerTypeLabel(props.triggerType)}
                </Badge>
            </Flex>
            <Show
                when={fields.length > 0}
                fallback={
                    <Text color="fg.muted" fontSize="sm">
                        No source details available.
                    </Text>
                }
            >
                <Stack gap="md">
                    <For each={fields}>
                        {(field) => (
                            <Stack key={field.label} gap="xxs">
                                <Text fontSize="xs" fontWeight="600" color="fg.muted" letterSpacing="0.125px" textTransform="uppercase">
                                    {field.label}
                                </Text>
                                <Box bg="bg.canvas" borderRadius="md" px="md" py="sm">
                                    <Text fontSize="sm" whiteSpace={field.multiline ? 'pre-wrap' : 'nowrap'} wordBreak={field.multiline ? 'break-word' : 'normal'}>
                                        {field.value}
                                    </Text>
                                </Box>
                            </Stack>
                        )}
                    </For>
                </Stack>
            </Show>
        </Stack>
    );
}

export function ShoutoutDetailClient(props: { shoutout: ShoutoutDetailDto }) {
    const router = useRouter();
    const [shoutout, setShoutout] = useState(props.shoutout);
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

    useShoutoutEvents(shoutout.id, ShoutoutsUtils.isInFlight(shoutout.status), onStreamEvent);

    const status = ShoutoutsUtils.badge(shoutout.status);
    const canEdit = shoutout.status === 'ready_for_review' && shoutout.drafts.length > 0;
    const canPublish = shoutout.status === 'ready_for_review' && shoutout.drafts.length > 0;
    const canRetry =
        shoutout.status === 'generation_failed' ||
        shoutout.status === 'generating' ||
        (shoutout.status === 'ready_for_review' && shoutout.drafts.length === 0);

    const publish = () => {
        startTransition(async () => {
            const result = await publishShoutout(shoutout.id);
            if (!result.ok) {
                Toaster.error({ title: 'Could not publish shoutout', description: result.error });
                return;
            }
            Toaster.success({ title: 'Shoutout published' });
            router.refresh();
        });
    };

    const retry = () => {
        startTransition(async () => {
            const result = await retryGeneration(shoutout.id);
            if (!result.ok) {
                Toaster.error({ title: 'Could not retry generation', description: result.error });
                return;
            }
            Toaster.info({ title: 'Regenerating shoutout drafts' });
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
                        <Show when={canPublish}>
                            <Button colorPalette="blue" borderRadius="full" onClick={publish} loading={pending}>
                                Publish
                            </Button>
                        </Show>
                        <Show when={canRetry}>
                            <Button colorPalette="blue" borderRadius="full" onClick={retry} loading={pending}>
                                Retry generation
                            </Button>
                        </Show>
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
                    <DraftEditor
                        shoutoutId={shoutout.id}
                        linkedRepositoryId={shoutout.linkedRepositoryId}
                        drafts={shoutout.drafts}
                        status={shoutout.status}
                        editable={canEdit}
                        onSaved={setShoutout}
                    />
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Text fontSize="sm" fontWeight="600">
                        Source summary
                    </Text>
                    <SourceSummaryPanel triggerType={shoutout.triggerType} sourceSummary={shoutout.sourceSummary} />
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
                <Stack gap="md" p="lg">
                    <Text fontSize="sm" fontWeight="600">
                        Dispatch log
                    </Text>
                    <Show
                        when={shoutout.dispatchLogs.length > 0}
                        fallback={
                            <Text color="fg.muted" fontSize="sm">
                                Dispatch attempts will appear here after you publish.
                            </Text>
                        }
                    >
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
                                    <For each={shoutout.dispatchLogs}>
                                        {(log) => {
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
                                        }}
                                    </For>
                                </Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
                    </Show>
                </Stack>
            </Box>
        </Stack>
    );
}
