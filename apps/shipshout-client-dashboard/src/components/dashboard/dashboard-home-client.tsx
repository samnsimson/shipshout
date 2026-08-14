'use client';

import { Box, Flex, Link as ChakraLink, Show, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { ActionItem, DashboardStats, SetupState } from '@/lib/dashboard/dashboard-home.utils';
import type { ShoutoutDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsTable } from '@/components/shoutouts/shoutouts-table';
import { DashboardActionItems } from './dashboard-action-items';
import { DashboardStatTiles } from './dashboard-stat-tiles';
import { SetupChecklist } from './setup-checklist';

export function DashboardHomeClient(props: {
    setup: SetupState;
    stats?: DashboardStats;
    actionItems?: ActionItem[];
    recentShoutouts?: ShoutoutDto[];
}) {
    if (!props.setup.complete) return <SetupChecklist setup={props.setup} />;

    const stats = props.stats ?? { linkedRepos: 0, activeTriggers: 0, channelsOn: 0, shoutouts: 0 };
    const actionItems = props.actionItems ?? [];
    const recentShoutouts = props.recentShoutouts ?? [];

    return (
        <Stack gap="lg">
            <DashboardStatTiles stats={stats} />
            <Show when={actionItems.length > 0}>
                <DashboardActionItems items={actionItems} />
            </Show>
            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
                <Flex justify="space-between" align="center" px="lg" py="md" borderBottomWidth="1px" borderColor="border.hairline">
                    <Text fontSize="sm" fontWeight="600">
                        Recent shoutouts
                    </Text>
                    <ChakraLink asChild color="brand.fg" fontSize="sm">
                        <Link href="/dashboard/shoutouts">View all →</Link>
                    </ChakraLink>
                </Flex>
                <ShoutoutsTable
                    shoutouts={recentShoutouts}
                    emptyMessage="Shoutouts will appear here once a trigger fires."
                    embedded
                />
            </Box>
        </Stack>
    );
}
