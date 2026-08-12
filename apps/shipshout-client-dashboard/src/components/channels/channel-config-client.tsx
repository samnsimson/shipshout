'use client';

import { Box, Button, Flex, Link as ChakraLink, NativeSelect, Stack, Text, Textarea } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { RepositoryChannelDto, RepositoryChannelTone } from '../../lib/channels/api';
import { updateRepositoryChannelsAction } from '../../lib/channels/actions';
import { ChannelUtils, type ChannelFormState } from '../../lib/channels/channel.utils';
import { Toaster } from '../../lib/feedback/toaster.utils';

export function ChannelConfigClient(props: { repositoryId: string; repositoryName: string; channel: RepositoryChannelDto }) {
    const router = useRouter();
    const [form, setForm] = useState<ChannelFormState>(() => ChannelUtils.toFormState(props.channel));
    const [pending, startTransition] = useTransition();
    const Icon = ChannelUtils.iconFor(props.channel.channelKey);
    const accent = ChannelUtils.accentFor(props.channel.channelKey);
    const backHref = `/dashboard/channels?repo=${props.repositoryId}`;

    const save = () => {
        startTransition(async () => {
            const result = await updateRepositoryChannelsAction(props.repositoryId, [ChannelUtils.toPatch(props.channel.channelKey, form)]);
            if (!result.ok) {
                Toaster.error({ title: 'Could not save configuration', description: result.error });
                return;
            }
            Toaster.success({ title: 'Channel configuration saved', description: props.channel.displayName });
            router.push(backHref);
        });
    };

    return (
        <Stack gap="lg">
            <ChakraLink asChild color="fg.muted" fontSize="sm" _hover={{ color: 'fg.default' }}>
                <Link href={backHref}>
                    <Flex align="center" gap="xs">
                        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                        Back to channels
                    </Flex>
                </Link>
            </ChakraLink>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="lg">
                    <Flex align="flex-start" gap="md">
                        <Flex align="center" justify="center" boxSize="48px" borderRadius="md" bg={accent.bg} color={accent.color} flexShrink={0}>
                            <Icon size={22} strokeWidth={2} aria-hidden />
                        </Flex>
                        <Stack gap="xxs" flex="1">
                            <Text fontSize="xs" fontWeight="600" color="fg.muted" textTransform="uppercase" letterSpacing="0.125px">
                                {props.repositoryName}
                            </Text>
                            <Text fontSize="xl" fontWeight="700" letterSpacing="-0.125px">
                                {props.channel.displayName}
                            </Text>
                            <Text color="fg.muted" fontSize="sm">
                                {props.channel.description}
                            </Text>
                        </Stack>
                    </Flex>

                    <Stack gap="md">
                        <Stack gap="xs">
                            <Text fontSize="xs" color="fg.muted" fontWeight="600" textTransform="uppercase" letterSpacing="0.125px">
                                Tone
                            </Text>
                            <NativeSelect.Root size="sm" maxW="320px" disabled={pending}>
                                <NativeSelect.Field
                                    value={form.tone}
                                    onChange={(event) => setForm((prev) => ({ ...prev, tone: event.currentTarget.value as RepositoryChannelTone }))}
                                >
                                    {(Object.keys(ChannelUtils.toneLabels) as RepositoryChannelTone[]).map((tone) => (
                                        <option key={tone} value={tone}>
                                            {ChannelUtils.toneLabels[tone]}
                                        </option>
                                    ))}
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Stack>

                        {props.channel.channelKey === 'email_newsletter' ? (
                            <Stack gap="xs">
                                <Text fontSize="xs" color="fg.muted" fontWeight="600" textTransform="uppercase" letterSpacing="0.125px">
                                    Recipients
                                </Text>
                                <Textarea
                                    value={form.recipientsText}
                                    disabled={pending}
                                    onChange={(event) => setForm((prev) => ({ ...prev, recipientsText: event.currentTarget.value }))}
                                    placeholder="team@example.com, list@example.com"
                                    rows={4}
                                    fontSize="sm"
                                />
                                <Text fontSize="xs" color="fg.muted">
                                    Comma-separated email addresses.
                                </Text>
                            </Stack>
                        ) : null}
                    </Stack>

                    <Button colorPalette="blue" borderRadius="full" gap="xs" alignSelf="flex-start" onClick={save} loading={pending}>
                        <Save size={14} strokeWidth={2} aria-hidden />
                        Save configuration
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
}
