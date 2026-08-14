'use client';

import { Button, Flex, Stack, Text } from '@chakra-ui/react';
import { CheckCircle2, Link2Off } from 'lucide-react';
import { useTransition } from 'react';
import { SectionEyebrow } from '@/components/ui/section-eyebrow';
import { StatusBadge } from '@/components/ui/status-badge';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { disconnectGithub } from '@/lib/repositories/repositories.actions';
import type { GithubConnectionResponseDto } from '@shipshout/api-client';

export function GithubConnectionCard(props: { connection: GithubConnectionResponseDto; linkedCount: number }) {
    const [pending, startTransition] = useTransition();

    return (
        <SurfaceCard>
            <Stack gap="md">
                <SectionEyebrow>GitHub connection</SectionEyebrow>

                <Flex align={{ base: 'stretch', sm: 'center' }} justify="space-between" gap="md" direction={{ base: 'column', sm: 'row' }}>
                    <Flex align="flex-start" gap="sm" flex="1">
                        <Flex align="center" justify="center" boxSize="40px" borderRadius="md" bg="green.subtle" color="green.fg" flexShrink={0}>
                            <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
                        </Flex>
                        <Stack gap="xxs">
                            <Flex align="center" gap="xs" flexWrap="wrap">
                                <StatusBadge label="Connected" palette="green" />
                                <Text fontSize="sm" color="fg.muted">
                                    GitHub account
                                </Text>
                            </Flex>
                            <Text fontSize="md" fontWeight="600">
                                @{props.connection.githubUsername ?? 'unknown'}
                            </Text>
                            <Text color="fg.muted" fontSize="sm">
                                {props.linkedCount === 0
                                    ? 'No repositories linked yet — pick some below.'
                                    : `${props.linkedCount} linked ${props.linkedCount === 1 ? 'repository' : 'repositories'}.`}
                            </Text>
                        </Stack>
                    </Flex>

                    <Button
                        variant="outline"
                        borderColor="red.muted"
                        color="red.fg"
                        borderRadius="lg"
                        gap="xs"
                        onClick={() =>
                            startTransition(() => {
                                disconnectGithub().then((res) => {
                                    if (!res.ok) Toaster.error({ title: 'Could not disconnect GitHub', description: res.error });
                                });
                            })
                        }
                        loading={pending}
                        alignSelf={{ base: 'flex-start', sm: 'center' }}
                    >
                        <Link2Off size={14} strokeWidth={2} aria-hidden />
                        Disconnect
                    </Button>
                </Flex>
            </Stack>
        </SurfaceCard>
    );
}
