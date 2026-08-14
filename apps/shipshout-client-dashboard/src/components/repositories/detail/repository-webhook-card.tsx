'use client';

import { Button, Flex, Show, Stack, Text } from '@chakra-ui/react';
import { Copy, Webhook } from 'lucide-react';
import { SectionHeading } from '@/components/ui/section-heading';
import { StatusBadge } from '@/components/ui/status-badge';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { LinkedRepositoryDetailDto } from '@/lib/triggers/triggers.api';
import { TriggerUtils } from '@/lib/triggers/triggers.utils';

async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
}

export function RepositoryWebhookCard(props: { webhook: LinkedRepositoryDetailDto['webhook'] }) {
    const status = TriggerUtils.webhookStatusBadge(props.webhook.status);

    return (
        <SurfaceCard>
            <Stack gap="md">
                <Flex align="center" gap="xs">
                    <Webhook size={16} strokeWidth={2} aria-hidden />
                    <SectionHeading>Webhook status</SectionHeading>
                    <StatusBadge label={status.label} palette={status.palette} />
                </Flex>
                <Show when={props.webhook.lastDeliveryAt}>
                    {(lastDeliveryAt) => (
                        <Text color="fg.muted" fontSize="sm">
                            Last delivery: {new Date(lastDeliveryAt).toLocaleString()}
                        </Text>
                    )}
                </Show>
                <Show when={props.webhook.lastError}>
                    <Text color={props.webhook.status === 'error' ? 'red.fg' : 'fg.muted'} fontSize="sm">
                        {props.webhook.lastError}
                    </Text>
                </Show>
                <Show when={props.webhook.manualSetup}>
                    {(manualSetup) => (
                        <Stack gap="sm" p="md" bg="bg.canvas" borderRadius="md" borderWidth="1px" borderColor="border.hairline">
                            <Text fontSize="sm" fontWeight="600">
                                Manual setup
                            </Text>
                            <Text fontSize="sm" color="fg.muted">
                                {manualSetup.instructions}
                            </Text>
                            <Stack gap="xs">
                                <Text fontSize="xs" color="fg.muted">
                                    Payload URL
                                </Text>
                                <Flex align="center" gap="sm">
                                    <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                                        {manualSetup.url}
                                    </Text>
                                    <Button size="xs" variant="outline" onClick={() => copyText(manualSetup.url)}>
                                        <Copy size={12} strokeWidth={2} aria-hidden />
                                    </Button>
                                </Flex>
                            </Stack>
                            <Stack gap="xs">
                                <Text fontSize="xs" color="fg.muted">
                                    Secret
                                </Text>
                                <Flex align="center" gap="sm">
                                    <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                                        {manualSetup.secret}
                                    </Text>
                                    <Button size="xs" variant="outline" onClick={() => copyText(manualSetup.secret)}>
                                        <Copy size={12} strokeWidth={2} aria-hidden />
                                    </Button>
                                </Flex>
                            </Stack>
                        </Stack>
                    )}
                </Show>
            </Stack>
        </SurfaceCard>
    );
}
