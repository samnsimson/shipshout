'use client';

import { Box, Button, Checkbox, Flex, Link as ChakraLink, NativeSelect, Stack, Text, Textarea } from '@chakra-ui/react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { updateRepositoryChannelsAction } from '../../lib/channels/actions';
import type { PatchRepositoryChannelDto, RepositoryChannelDto, RepositoryChannelTone } from '../../lib/channels/api';

const toneLabels: Record<RepositoryChannelTone, string> = {
    professional: 'Professional',
    dev_focused: 'Developer-focused',
    hype: 'Hype',
};

type ChannelFormState = {
    enabled: boolean;
    tone: RepositoryChannelTone;
    recipientsText: string;
};

function formatRecipients(config: Record<string, unknown>): string {
    const recipients = config.recipients;
    if (!Array.isArray(recipients)) return '';
    return recipients.filter((item): item is string => typeof item === 'string').join(', ');
}

function parseRecipients(value: string): string[] {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function toFormState(channel: RepositoryChannelDto): ChannelFormState {
    return {
        enabled: channel.enabled,
        tone: channel.tone,
        recipientsText: formatRecipients(channel.config),
    };
}

function toPatch(channelKey: string, state: ChannelFormState, includeRecipients: boolean): PatchRepositoryChannelDto {
    const patch: PatchRepositoryChannelDto = {
        channelKey,
        enabled: state.enabled,
        tone: state.tone,
    };
    if (includeRecipients) patch.config = { recipients: parseRecipients(state.recipientsText) };
    return patch;
}

export function RepositoryChannelsSection(props: { repositoryId: string; channels: RepositoryChannelDto[] }) {
    const [channelState, setChannelState] = useState<Record<string, ChannelFormState>>(() =>
        Object.fromEntries(props.channels.map((channel) => [channel.channelKey, toFormState(channel)])),
    );
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const updateChannel = (channelKey: string, update: Partial<ChannelFormState>) => {
        setChannelState((prev) => ({
            ...prev,
            [channelKey]: { ...prev[channelKey], ...update },
        }));
    };

    const save = () => {
        startTransition(async () => {
            setError(null);
            const channels = props.channels.map((channel) =>
                toPatch(channel.channelKey, channelState[channel.channelKey], channel.channelKey === 'email_newsletter'),
            );
            const result = await updateRepositoryChannelsAction(props.repositoryId, channels);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            window.location.reload();
        });
    };

    return (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
            <Stack gap="md">
                <Text fontSize="sm" fontWeight="600">
                    Channel configuration
                </Text>
                <Text color="fg.muted" fontSize="sm">
                    Choose where shoutouts are delivered for this repository. Notification channels alert you; publish channels send to your audience when you publish.
                </Text>
                {error ? (
                    <Text color="red.fg" fontSize="sm">
                        {error}
                    </Text>
                ) : null}
                <Stack gap="md">
                    {props.channels.map((channel) => {
                        const state = channelState[channel.channelKey];
                        const showConfig = state.enabled && channel.availableOnPlan;

                        return (
                            <Stack
                                key={channel.channelKey}
                                gap="sm"
                                p="md"
                                bg="bg.canvas"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="border.hairline"
                            >
                                <Flex align="flex-start" justify="space-between" gap="md" flexWrap="wrap">
                                    <Stack gap="xxs" flex="1">
                                        <Checkbox.Root
                                            checked={state.enabled}
                                            disabled={!channel.availableOnPlan || pending}
                                            onCheckedChange={(details) => updateChannel(channel.channelKey, { enabled: Boolean(details.checked) })}
                                        >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control />
                                            <Checkbox.Label fontSize="sm" fontWeight="600">
                                                {channel.displayName}
                                            </Checkbox.Label>
                                        </Checkbox.Root>
                                        <Text color="fg.muted" fontSize="sm" pl="6">
                                            {channel.description}
                                        </Text>
                                    </Stack>
                                    {!channel.availableOnPlan ? (
                                        <ChakraLink asChild fontSize="sm" color="brand.fg" whiteSpace="nowrap">
                                            <Link href="/dashboard/settings">Upgrade to enable</Link>
                                        </ChakraLink>
                                    ) : null}
                                </Flex>
                                {showConfig ? (
                                    <Stack gap="sm" pl="6">
                                        <Stack gap="xs">
                                            <Text fontSize="xs" color="fg.muted">
                                                Tone
                                            </Text>
                                            <NativeSelect.Root size="sm" maxW="280px">
                                                <NativeSelect.Field
                                                    value={state.tone}
                                                    onChange={(event) =>
                                                        updateChannel(channel.channelKey, { tone: event.currentTarget.value as RepositoryChannelTone })
                                                    }
                                                >
                                                    {(Object.keys(toneLabels) as RepositoryChannelTone[]).map((tone) => (
                                                        <option key={tone} value={tone}>
                                                            {toneLabels[tone]}
                                                        </option>
                                                    ))}
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Stack>
                                        {channel.channelKey === 'email_newsletter' ? (
                                            <Stack gap="xs">
                                                <Text fontSize="xs" color="fg.muted">
                                                    Recipients
                                                </Text>
                                                <Textarea
                                                    value={state.recipientsText}
                                                    onChange={(event) => updateChannel(channel.channelKey, { recipientsText: event.currentTarget.value })}
                                                    placeholder="team@example.com, list@example.com"
                                                    rows={3}
                                                    fontSize="sm"
                                                />
                                                <Text fontSize="xs" color="fg.muted">
                                                    Comma-separated email addresses.
                                                </Text>
                                            </Stack>
                                        ) : null}
                                    </Stack>
                                ) : null}
                            </Stack>
                        );
                    })}
                </Stack>
                <Button colorPalette="blue" borderRadius="full" alignSelf="flex-start" onClick={save} loading={pending}>
                    Save channels
                </Button>
            </Stack>
        </Box>
    );
}
