'use client';

import { Box, Flex, For, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { ActionItem } from '@/lib/dashboard/dashboard-home.utils';

export function DashboardActionItems(props: { items: ActionItem[] }) {
    return (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
            <Stack gap="md">
                <Text fontSize="xs" fontWeight="600" color="fg.muted" letterSpacing="0.125px" textTransform="uppercase">
                    Needs attention
                </Text>

                <Stack gap="sm">
                    <For each={props.items}>
                        {(item) => (
                            <Flex key={`${item.href}-${item.message}`} justify="space-between" align="center" gap="md">
                                <Text fontSize="sm" color={item.tone === 'danger' ? 'red.fg' : undefined}>
                                    {item.message}
                                </Text>
                                <ChakraLink asChild color="brand.fg" fontSize="sm" flexShrink={0}>
                                    <Link href={item.href}>View →</Link>
                                </ChakraLink>
                            </Flex>
                        )}
                    </For>
                </Stack>
            </Stack>
        </Box>
    );
}
