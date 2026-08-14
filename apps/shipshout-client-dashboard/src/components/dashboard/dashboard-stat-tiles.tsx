'use client';

import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import type { DashboardStats } from '@/lib/dashboard/dashboard-home.utils';

const TILES: { label: string; key: keyof DashboardStats }[] = [
    { label: 'Linked repos', key: 'linkedRepos' },
    { label: 'Active triggers', key: 'activeTriggers' },
    { label: 'Channels on', key: 'channelsOn' },
    { label: 'Shoutouts', key: 'shoutouts' },
];

export function DashboardStatTiles(props: { stats: DashboardStats }) {
    return (
        <SimpleGrid columns={{ base: 2, lg: 4 }} gap="md">
            {TILES.map((tile) => (
                <Box key={tile.key} bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                    <Stack gap="xs">
                        <Text fontSize="xs" fontWeight="600" color="fg.muted" letterSpacing="0.125px" textTransform="uppercase">
                            {tile.label}
                        </Text>
                        <Text fontSize="2xl" fontWeight="700" letterSpacing="-0.625px">
                            {props.stats[tile.key]}
                        </Text>
                    </Stack>
                </Box>
            ))}
        </SimpleGrid>
    );
}
