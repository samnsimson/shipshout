'use client';

import { Box, Button, Flex, For, Link as ChakraLink, NativeSelect, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { FolderGit2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import type { ChannelCatalogItemDto, RepositoryChannelDto } from '@/lib/channels/api';
import { updateRepositoryChannelsAction } from '@/lib/channels/actions';
import { ChannelUtils, type ChannelFormState } from '@/lib/channels/channel.utils';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { ChannelCard } from './channel-card';

type LinkedRepo = { id: string; fullName: string };

export function ChannelsClient(props: {
    catalog: ChannelCatalogItemDto[];
    linkedRepos: LinkedRepo[];
    channelsByRepo: Record<string, RepositoryChannelDto[]>;
    initialRepoId?: string;
}) {
    const initialRepoId = props.initialRepoId && props.linkedRepos.some((repo) => repo.id === props.initialRepoId) ? props.initialRepoId : props.linkedRepos[0]?.id;
    const [selectedRepoId, setSelectedRepoId] = useState(initialRepoId);
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const [, startTransition] = useTransition();
    const [channelState, setChannelState] = useState<Record<string, Record<string, ChannelFormState>>>(() =>
        Object.fromEntries(
            Object.entries(props.channelsByRepo).map(([repoId, channels]) => [
                repoId,
                Object.fromEntries(channels.map((channel) => [channel.channelKey, ChannelUtils.toFormState(channel)])),
            ]),
        ),
    );

    const repoChannels = useMemo((): RepositoryChannelDto[] => {
        if (!selectedRepoId) return [];
        const configured = props.channelsByRepo[selectedRepoId] ?? [];
        const configuredByKey = Object.fromEntries(configured.map((channel) => [channel.channelKey, channel]));
        return props.catalog.map((item) => {
            const existing = configuredByKey[item.key];
            if (existing) return existing;
            return {
                channelKey: item.key,
                displayName: item.displayName,
                description: item.description,
                kind: item.kind,
                configSchema: item.configSchema,
                availableOnPlan: item.availableOnPlan,
                enabled: false,
                tone: 'professional',
                config: {},
            };
        });
    }, [props.catalog, props.channelsByRepo, selectedRepoId]);

    const toggleEnabled = (channelKey: string, enabled: boolean) => {
        if (!selectedRepoId) return;
        const channel = repoChannels.find((item) => item.channelKey === channelKey);
        const state = channelState[selectedRepoId][channelKey];
        const nextState = { ...state, enabled };
        setChannelState((prev) => ({
            ...prev,
            [selectedRepoId]: { ...prev[selectedRepoId], [channelKey]: nextState },
        }));
        setPendingKey(channelKey);
        startTransition(async () => {
            const result = await updateRepositoryChannelsAction(selectedRepoId, [ChannelUtils.toPatch(channelKey, nextState)]);
            setPendingKey(null);
            if (!result.ok) {
                setChannelState((prev) => ({
                    ...prev,
                    [selectedRepoId]: { ...prev[selectedRepoId], [channelKey]: state },
                }));
                Toaster.error({ title: 'Could not update channel', description: result.error });
                return;
            }
            Toaster.success({
                title: enabled ? 'Channel enabled' : 'Channel disabled',
                description: channel?.displayName,
            });
        });
    };

    if (props.linkedRepos.length === 0) {
        return (
            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md" align="flex-start">
                    <Flex align="center" gap="xs">
                        <FolderGit2 size={16} strokeWidth={2} aria-hidden />
                        <Text fontSize="sm" fontWeight="600">
                            Link a repository first
                        </Text>
                    </Flex>
                    <Text color="fg.muted" fontSize="sm">
                        Channels are configured per repository. Connect GitHub and link a repo to choose where shoutouts are delivered.
                    </Text>
                    <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
                        <Link href="/dashboard/repositories">
                            <Button colorPalette="blue" borderRadius="full">
                                Go to repositories
                            </Button>
                        </Link>
                    </ChakraLink>
                </Stack>
            </Box>
        );
    }

    return (
        <Stack gap="lg">
            <Stack gap="xxs" maxW={{ base: 'full', sm: '360px' }}>
                <Text fontSize="xs" fontWeight="600" color="fg.muted" textTransform="uppercase" letterSpacing="0.125px">
                    Repository
                </Text>
                <NativeSelect.Root size="sm">
                    <NativeSelect.Field value={selectedRepoId} onChange={(event) => setSelectedRepoId(event.currentTarget.value)}>
                        <For each={props.linkedRepos}>
                            {(repo) => (
                                <option key={repo.id} value={repo.id}>
                                    {repo.fullName}
                                </option>
                            )}
                        </For>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
            </Stack>

            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="md">
                <For each={repoChannels}>
                    {(channel) => {
                        const state = selectedRepoId ? channelState[selectedRepoId]?.[channel.channelKey] : undefined;
                        if (!state || !selectedRepoId) return null;
                        return (
                            <ChannelCard
                                key={channel.channelKey}
                                channel={channel}
                                repoId={selectedRepoId}
                                enabled={state.enabled}
                                pending={pendingKey === channel.channelKey}
                                onToggleEnabled={(enabled) => toggleEnabled(channel.channelKey, enabled)}
                            />
                        );
                    }}
                </For>
            </SimpleGrid>
        </Stack>
    );
}
