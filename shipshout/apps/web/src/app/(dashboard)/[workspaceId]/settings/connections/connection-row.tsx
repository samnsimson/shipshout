'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Flex, HStack, Input, Stack, Text } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { LuLinkedin, LuMail, LuTwitter } from 'react-icons/lu';
import { SiBuffer, SiMailchimp } from 'react-icons/si';
import { StatusBadge } from '@/components/status-badge';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { connectEmail, connectUrl } from '../../../../../lib/connections';
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

export function ConnectionRow({
    workspaceId,
    channel,
    connected,
    oauthEnabled,
}: {
    workspaceId: string;
    channel: string;
    connected: boolean;
    oauthEnabled: boolean;
}) {
    const [connecting, setConnecting] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const router = useRouter();
    const Icon = ICONS[channel] ?? LuMail;
    const label = LABELS[channel] ?? channel;
    const isEmail = channel === 'email';

    return (
        <Card.Root>
            <Card.Body>
                <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                    <HStack gap="3">
                        <Icon />
                        <Card.Title>{label}</Card.Title>
                        <StatusBadge status={connected ? 'connected' : 'not_connected'} label={connected ? 'Connected' : 'Not connected'} />
                    </HStack>
                    {isEmail ? (
                        <Stack gap="2" minW="xs" flex="1" maxW="md">
                            <Field label="Resend API key">
                                <Input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="re_..."
                                    disabled={connected}
                                />
                            </Field>
                            <Button
                                size="sm"
                                colorPalette="brand"
                                alignSelf="flex-start"
                                loading={connecting}
                                disabled={connected || !apiKey.trim()}
                                onClick={async () => {
                                    setConnecting(true);
                                    try {
                                        await connectEmail(workspaceId, apiKey.trim());
                                        setApiKey('');
                                        router.refresh();
                                        toaster.create({ type: 'success', title: 'Email connected.' });
                                    } catch (error) {
                                        if (handleForbiddenClient(error, router.push)) return;
                                        toaster.create({ type: 'error', title: 'Invalid Resend API key.' });
                                    } finally {
                                        setConnecting(false);
                                    }
                                }}
                            >
                                Connect
                            </Button>
                        </Stack>
                    ) : (
                        <Stack gap="1" align="flex-end">
                            {oauthEnabled ? (
                                <Button asChild size="sm" variant="outline">
                                    <a href={connectUrl(workspaceId, channel)}>Connect</a>
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" disabled>
                                    Connect
                                </Button>
                            )}
                            {!oauthEnabled && (
                                <Text fontSize="xs" color="fg.muted">
                                    {label} OAuth is not configured on this server.
                                </Text>
                            )}
                        </Stack>
                    )}
                </Flex>
            </Card.Body>
        </Card.Root>
    );
}
