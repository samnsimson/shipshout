'use client';

import { Button, Card, Flex, Stack, Text } from '@chakra-ui/react';
import { LuGithub } from 'react-icons/lu';
import { StatusBadge } from '@/components/status-badge';
import { connectGithubUrl } from '../../../../../lib/repositories';

type Repo = {
    id: string;
    provider: string;
    name: string;
    enabled: boolean;
    webhookStatus: 'pending' | 'active' | 'failed';
    lastReleaseAt: string | null;
    lastReleaseStatus: 'received' | 'generating' | 'drafted' | 'failed' | null;
};

function formatReleaseTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function isWebhookHealthy(repo: Repo) {
    return repo.webhookStatus === 'active' || (repo.webhookStatus === 'pending' && !!repo.lastReleaseAt);
}

export function RepositoryRow({ workspaceId, repo }: { workspaceId: string; repo: Repo }) {
    return (
        <Card.Root>
            <Card.Body>
                <Stack gap="4">
                    <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                        <Stack gap="0">
                            <Card.Title>{repo.name}</Card.Title>
                            <Card.Description>{repo.provider}</Card.Description>
                        </Stack>
                        {repo.webhookStatus === 'failed' && (
                            <Button asChild size="sm" variant="outline" colorPalette="brand">
                                <a href={connectGithubUrl(workspaceId)}>
                                    <LuGithub /> Reconnect
                                </a>
                            </Button>
                        )}
                    </Flex>
                    {repo.webhookStatus === 'failed' ? (
                        <Stack gap="1">
                            <StatusBadge status="setup_failed" label="Setup failed" />
                            <Text fontSize="sm" color="fg.muted">
                                Reconnect the repository or check GitHub admin permissions.
                            </Text>
                        </Stack>
                    ) : isWebhookHealthy(repo) ? (
                        <Stack gap="1">
                            <StatusBadge status="webhook_active" label="Webhook active" />
                            <Text fontSize="sm" color="fg.muted">
                                Releases will trigger drafts automatically.
                            </Text>
                            {repo.lastReleaseAt && (
                                <Flex align="center" gap="2" wrap="wrap">
                                    <Text fontSize="sm" color="fg.muted">
                                        Last release received {formatReleaseTime(repo.lastReleaseAt)}
                                    </Text>
                                    {repo.lastReleaseStatus && (
                                        <StatusBadge status={repo.lastReleaseStatus} label={repo.lastReleaseStatus} />
                                    )}
                                </Flex>
                            )}
                        </Stack>
                    ) : (
                        <Text fontSize="sm" color="fg.muted">
                            Waiting for first release
                        </Text>
                    )}
                </Stack>
            </Card.Body>
        </Card.Root>
    );
}
