'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Flex, HStack } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { LuLinkedin, LuMail, LuTwitter } from 'react-icons/lu';
import { SiBuffer, SiMailchimp } from 'react-icons/si';
import { StatusBadge } from '@/components/status-badge';
import { toaster } from '@/components/ui/toaster';
import { mockConnect, connectUrl } from '../../../../../lib/connections';
import { handleForbiddenClient } from '../../../../../lib/forbidden';

const LABELS: Record<string, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    email: 'Email',
    buffer: 'Buffer',
    mailchimp: 'Mailchimp',
};

const ICONS: Record<string, IconType> = {
    x: LuTwitter,
    linkedin: LuLinkedin,
    email: LuMail,
    buffer: SiBuffer,
    mailchimp: SiMailchimp,
};

export function ConnectionRow({ workspaceId, channel, connected }: { workspaceId: string; channel: string; connected: boolean }) {
    const [connecting, setConnecting] = useState(false);
    const router = useRouter();
    const Icon = ICONS[channel] ?? LuMail;

    return (
        <Card.Root>
            <Card.Body>
                <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                    <HStack gap="3">
                        <Icon />
                        <Card.Title>{LABELS[channel] ?? channel}</Card.Title>
                        <StatusBadge status={connected ? 'connected' : 'not_connected'} label={connected ? 'Connected' : 'Not connected'} />
                    </HStack>
                    <HStack gap="2">
                        <Button asChild size="sm" variant="outline">
                            <a href={connectUrl(workspaceId, channel)}>Connect</a>
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            loading={connecting}
                            onClick={async () => {
                                setConnecting(true);
                                try {
                                    await mockConnect(workspaceId, channel);
                                    router.refresh();
                                } catch (error) {
                                    if (handleForbiddenClient(error, router.push)) return;
                                    toaster.create({ type: 'error', title: 'Test connect is disabled in this environment.' });
                                } finally {
                                    setConnecting(false);
                                }
                            }}
                        >
                            Connect (test)
                        </Button>
                    </HStack>
                </Flex>
            </Card.Body>
        </Card.Root>
    );
}
