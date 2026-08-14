'use client';

import { Button, Field, Flex, For, Show, Stack, Tabs, Textarea } from '@chakra-ui/react';
import { RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { regenerateDraft, updateDraft } from '@/lib/shoutouts/shoutouts.actions';
import type { ShoutoutDetailDto, ShoutoutDraftDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';
import { ShoutoutDraftEmptyState } from './shoutout-draft-empty-state';

export function ShoutoutDraftEditor(props: {
    shoutoutId: string;
    linkedRepositoryId: string;
    drafts: ShoutoutDraftDto[];
    status: ShoutoutDetailDto['status'];
    editable: boolean;
    onSaved: (shoutout: ShoutoutDetailDto) => void;
}) {
    const defaultValues = useMemo(() => ({ drafts: ShoutoutsUtils.draftsToFormState(props.drafts) }), [props.drafts]);
    const { register, getValues, reset } = useForm<{ drafts: Record<string, { title: string; body: string }> }>({ defaultValues });
    const [activeTab, setActiveTab] = useState<string | null>(props.drafts[0]?.channelKey ?? null);
    const [savePending, startSaveTransition] = useTransition();
    const [regeneratePending, startRegenerateTransition] = useTransition();
    const [regeneratingChannelKey, setRegeneratingChannelKey] = useState<string | null>(null);
    const [regenerationGuidance, setRegenerationGuidance] = useState<Record<string, string>>({});

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
        const userPrompt = regenerationGuidance[channelKey]?.trim() || undefined;
        startRegenerateTransition(async () => {
            const result = await regenerateDraft(props.shoutoutId, channelKey, userPrompt);
            setRegeneratingChannelKey(null);
            if (!result.ok) {
                Toaster.error({ title: 'Could not regenerate draft', description: result.error });
                return;
            }
            Toaster.success({ title: 'Draft regenerated' });
            reset({ drafts: ShoutoutsUtils.draftsToFormState(result.shoutout.drafts) });
            props.onSaved(result.shoutout);
        });
    };

    if (props.drafts.length === 0) {
        return <ShoutoutDraftEmptyState status={props.status} linkedRepositoryId={props.linkedRepositoryId} />;
    }

    return (
        <Stack gap="md">
            <Tabs.Root value={activeTab} onValueChange={(details) => setActiveTab(details.value)}>
                <Tabs.List flexWrap="wrap">
                    <For each={props.drafts}>
                        {(draft) => (
                            <Tabs.Trigger key={draft.channelKey} value={draft.channelKey}>
                                {ShoutoutsUtils.channelLabel(draft.channelKey)}
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
                                    <Field.Root gap="xs">
                                        <Field.Label fontSize="sm">Regeneration guidance (optional)</Field.Label>
                                        <Textarea
                                            value={regenerationGuidance[draft.channelKey] ?? ''}
                                            onChange={(event) =>
                                                setRegenerationGuidance((current) => ({ ...current, [draft.channelKey]: event.target.value }))
                                            }
                                            disabled={regeneratePending}
                                            rows={3}
                                            placeholder="e.g. emphasize security fixes, keep it shorter"
                                        />
                                        <Field.HelperText fontSize="xs" color="fg.muted">
                                            Hints for tone or emphasis only. Regeneration always stays anchored to this release or commit.
                                        </Field.HelperText>
                                    </Field.Root>
                                    <Flex gap="sm" flexWrap="wrap">
                                        <Button
                                            colorPalette="blue"
                                            borderRadius="lg"
                                            onClick={() => saveDraft(draft.channelKey)}
                                            loading={savePending}
                                            disabled={regeneratePending}
                                        >
                                            Save draft
                                        </Button>
                                        <Button
                                            variant="outline"
                                            borderColor="border.hairline"
                                            borderRadius="lg"
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
