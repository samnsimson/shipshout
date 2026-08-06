'use client';

import { useState } from 'react';
import { Button, Card, Collapsible, Flex, Stack, Text } from '@chakra-ui/react';
import { LuChevronDown } from 'react-icons/lu';
import { SecretReveal } from '@/components/secret-reveal';
import { StatusBadge } from '@/components/status-badge';

type Repo = {
    id: string;
    provider: string;
    name: string;
    enabled: boolean;
    lastReleaseAt: string | null;
    lastReleaseStatus: 'received' | 'generating' | 'drafted' | 'failed' | null;
};

const webhookUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/webhooks/github`;

function formatReleaseTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function RepositoryRow({ repo }: { workspaceId: string; repo: Repo }) {
    const [open, setOpen] = useState(false);

    return (
        <Card.Root>
            <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
                <Card.Body>
                    <Flex justify="space-between" align="center">
                        <Stack gap="0">
                            <Card.Title>{repo.name}</Card.Title>
                            <Card.Description>{repo.provider}</Card.Description>
                        </Stack>
                        <Collapsible.Trigger asChild>
                            <Button variant="outline" size="sm">
                                Webhook & status
                                <Collapsible.Indicator transition="transform 0.2s" _open={{ transform: 'rotate(180deg)' }}>
                                    <LuChevronDown />
                                </Collapsible.Indicator>
                            </Button>
                        </Collapsible.Trigger>
                    </Flex>
                    <Collapsible.Content>
                        <Stack gap="4" pt="4">
                            <SecretReveal label="webhook URL" value={webhookUrl} />
                            <Stack gap="2">
                                <Text fontSize="sm" fontWeight="medium">
                                    Setup
                                </Text>
                                <Stack as="ol" fontSize="sm" color="fg.muted" gap="1" ps="4" listStyleType="decimal">
                                    <Text as="li">Open your GitHub repository or GitHub App webhook settings.</Text>
                                    <Text as="li">Set the payload URL to the webhook URL above.</Text>
                                    <Text as="li">Subscribe to release events.</Text>
                                    <Text as="li">Paste the webhook secret shown when you connected this repository.</Text>
                                </Stack>
                                <Text fontSize="sm" color="fg.muted">
                                    If you need the secret again, reconnect the repository.
                                </Text>
                            </Stack>
                            <Stack gap="1">
                                <Text fontSize="sm" fontWeight="medium">
                                    Status
                                </Text>
                                {repo.lastReleaseAt ? (
                                    <Flex align="center" gap="2" wrap="wrap">
                                        <Text fontSize="sm" color="fg.muted">
                                            Last release received {formatReleaseTime(repo.lastReleaseAt)}
                                        </Text>
                                        {repo.lastReleaseStatus && (
                                            <StatusBadge status={repo.lastReleaseStatus} label={repo.lastReleaseStatus} />
                                        )}
                                    </Flex>
                                ) : (
                                    <Text fontSize="sm" color="fg.muted">
                                        Waiting for first release
                                    </Text>
                                )}
                            </Stack>
                        </Stack>
                    </Collapsible.Content>
                </Card.Body>
            </Collapsible.Root>
        </Card.Root>
    );
}
