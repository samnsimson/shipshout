'use client';

import { Box, Flex, For, Show, Stack, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { EmptyStateText } from '@/components/ui/empty-state-text';
import { StatusBadge } from '@/components/ui/status-badge';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';
import { TriggerUtils } from '@/lib/triggers/triggers.utils';

export function ShoutoutSourceSummaryPanel(props: { triggerType: string; sourceSummary: Record<string, unknown> }) {
    const fields = useMemo(
        () => ShoutoutsUtils.sourceSummaryFields(props.triggerType, props.sourceSummary),
        [props.triggerType, props.sourceSummary],
    );

    return (
        <Stack gap="md">
            <Flex align="center" gap="sm" flexWrap="wrap">
                <StatusBadge label={TriggerUtils.triggerTypeLabel(props.triggerType)} />
            </Flex>
            <Show when={fields.length > 0} fallback={<EmptyStateText>No source details available.</EmptyStateText>}>
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
