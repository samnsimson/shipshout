'use client';

import { Box, Button, Flex, For, Link as ChakraLink, NativeSelect, Show, Stack, Text, Textarea } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { RepositoryChannelDto, RepositoryChannelTone } from '@/lib/channels/channels.api';
import { ChannelsActions } from '@/lib/channels/channels.actions';
import { ChannelFormState, ChannelUtils } from '@/lib/channels/channels.utils';
import { Toaster } from '@/lib/feedback/toaster.utils';

const TONE_OPTIONS = Object.keys(ChannelUtils.toneLabels) as RepositoryChannelTone[];

export function ChannelConfigClient(props: { repositoryId: string; repositoryName: string; channel: RepositoryChannelDto; accountEmail: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const { control, register, handleSubmit } = useForm<ChannelFormState>({
        defaultValues: ChannelUtils.toFormState(props.channel),
    });
    const Icon = ChannelUtils.iconFor(props.channel.channelKey);
    const accent = ChannelUtils.accentFor(props.channel.channelKey);
    const backHref = `/dashboard/channels?repo=${props.repositoryId}`;

    const onSubmit = handleSubmit((values) => {
        startTransition(async () => {
            const result = await ChannelsActions.updateRepositoryChannels(props.repositoryId, [ChannelUtils.toPatch(props.channel.channelKey, values)]);
            if (!result.ok) {
                Toaster.error({ title: 'Could not save configuration', description: result.error });
                return;
            }
            Toaster.success({ title: 'Channel configuration saved', description: props.channel.displayName });
            router.push(backHref);
        });
    });

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

            <Box as="form" onSubmit={onSubmit} bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
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
                            <Controller
                                name="tone"
                                control={control}
                                render={({ field }) => (
                                    <NativeSelect.Root size="sm" maxW="320px" disabled={pending}>
                                        <NativeSelect.Field {...field} value={field.value} onChange={(event) => field.onChange(event.target.value as RepositoryChannelTone)}>
                                            <For each={TONE_OPTIONS}>
                                                {(tone) => (
                                                    <option key={tone} value={tone}>
                                                        {ChannelUtils.toneLabels[tone]}
                                                    </option>
                                                )}
                                            </For>
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                )}
                            />
                        </Stack>

                        <Show when={props.channel.channelKey === 'email_alert'}>
                            <Stack gap="xs">
                                <Text fontSize="xs" color="fg.muted" fontWeight="600" textTransform="uppercase" letterSpacing="0.125px">
                                    Account email
                                </Text>
                                <Text fontSize="sm" fontWeight="500">
                                    {props.accountEmail}
                                </Text>
                                <Text fontSize="xs" color="fg.muted">
                                    Alert notifications are sent to this address when a shoutout draft is ready.
                                </Text>
                            </Stack>
                        </Show>

                        <Show when={props.channel.channelKey === 'email_newsletter'}>
                            <Stack gap="xs">
                                <Text fontSize="xs" color="fg.muted" fontWeight="600" textTransform="uppercase" letterSpacing="0.125px">
                                    Recipients
                                </Text>
                                <Textarea {...register('recipientsText')} disabled={pending} placeholder="team@example.com, list@example.com" rows={4} fontSize="sm" />
                                <Text fontSize="xs" color="fg.muted">
                                    Comma-separated email addresses.
                                </Text>
                            </Stack>
                        </Show>
                    </Stack>

                    <Button type="submit" colorPalette="blue" borderRadius="full" gap="xs" alignSelf="flex-start" loading={pending}>
                        <Save size={14} strokeWidth={2} aria-hidden />
                        Save configuration
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
}
