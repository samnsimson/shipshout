'use client';

import { Badge, Box, Button, Flex, IconButton, Link as ChakraLink, Show, Stack, Switch, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import type { RepositoryChannelDto } from '@/lib/channels/channels.api';
import { ChannelUtils } from '@/lib/channels/channels.utils';

export function ChannelCard(props: {
    channel: RepositoryChannelDto;
    repoId: string;
    enabled: boolean;
    pending: boolean;
    onToggleEnabled: (enabled: boolean) => void;
}) {
    const { channel } = props;
    const Icon = ChannelUtils.iconFor(channel.channelKey);
    const accent = ChannelUtils.accentFor(channel.channelKey);
    const configureHref = `/dashboard/channels/${channel.channelKey}?repo=${props.repoId}`;

    return (
        <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor={props.enabled && channel.availableOnPlan ? 'brand.muted' : 'border.hairline'}
            borderRadius="lg"
            p="lg"
            h="full"
            display="flex"
            flexDirection="column"
            gap="md"
            transition="border-color 0.15s ease"
            _hover={{ borderColor: channel.availableOnPlan ? 'brand.muted' : 'border.hairline' }}
        >
            <Flex align="flex-start" justify="space-between" gap="sm">
                <Flex
                    align="center"
                    justify="center"
                    boxSize="44px"
                    borderRadius="md"
                    bg={accent.bg}
                    color={accent.color}
                    flexShrink={0}
                >
                    <Icon size={20} strokeWidth={2} aria-hidden />
                </Flex>
                <Stack gap="sm" align="flex-end">
                    <Badge variant="subtle" borderRadius="full" colorPalette={channel.kind === 'notify' ? 'blue' : 'purple'}>
                        {ChannelUtils.kindLabels[channel.kind]}
                    </Badge>
                    <Show
                        when={channel.availableOnPlan}
                        fallback={
                            <Badge variant="subtle" borderRadius="full" colorPalette="orange">
                                Upgrade required
                            </Badge>
                        }
                    >
                        <Switch.Root
                            size="sm"
                            colorPalette="blue"
                            checked={props.enabled}
                            disabled={props.pending}
                            onCheckedChange={(details) => props.onToggleEnabled(Boolean(details.checked))}
                        >
                            <Switch.HiddenInput />
                            <Switch.Control>
                                <Switch.Thumb />
                            </Switch.Control>
                        </Switch.Root>
                    </Show>
                </Stack>
            </Flex>

            <Stack gap="xs" flex="1">
                <Text fontSize="md" fontWeight="700" letterSpacing="-0.125px">
                    {channel.displayName}
                </Text>
                <Text color="fg.muted" fontSize="sm" lineHeight="1.5">
                    {channel.description}
                </Text>
            </Stack>

            <Flex align="center" justify="flex-end" gap="sm" pt="xs">
                <Show
                    when={channel.availableOnPlan}
                    fallback={
                        <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
                            <Link href="/dashboard/settings">
                                <Button size="sm" variant="outline" borderColor="border.hairline" borderRadius="full">
                                    View plans
                                </Button>
                            </Link>
                        </ChakraLink>
                    }
                >
                    <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
                        <Link href={configureHref}>
                            <IconButton aria-label={`Configure ${channel.displayName}`} variant="outline" borderColor="border.hairline" borderRadius="md" size="sm">
                                <Settings2 size={16} strokeWidth={2} />
                            </IconButton>
                        </Link>
                    </ChakraLink>
                </Show>
            </Flex>
        </Box>
    );
}
