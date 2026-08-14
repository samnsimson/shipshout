'use client';

import { Button, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { authApi, linkOAuthUrl } from '@/lib/auth-api';
import { toaster } from '@/components/ui/toaster';

type Identity = { provider: string; providerUserId: string };

export function ConnectedAccounts({ workspaceId }: { workspaceId: string }) {
    const returnTo = typeof window !== 'undefined' ? `${window.location.origin}/${workspaceId}/settings/account` : '';
    const [identities, setIdentities] = useState<Identity[]>([]);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        try {
            setIdentities(await authApi.identities());
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh().catch(() => undefined);
        const params = new URLSearchParams(window.location.search);
        const linked = params.get('linked');
        if (linked) toaster.create({ type: 'success', title: `${linked} account connected` });
    }, []);

    async function unlink(provider: string) {
        try {
            await authApi.unlink(provider);
            await refresh();
            toaster.create({ type: 'success', title: 'Account disconnected' });
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            toaster.create({
                type: 'error',
                title: code === 'LAST_IDENTITY' ? 'Keep at least one sign-in method' : 'Could not disconnect',
            });
        }
    }

    const has = (p: string) => identities.some((i) => i.provider === p);
    const canUnlink = identities.length > 1;

    if (loading) return <Text color="fg.muted">Loading…</Text>;

    return (
        <VStack align="stretch" gap="6">
            <Heading size="lg">Connected accounts</Heading>
            <VStack align="stretch" gap="4">
                <HStack justify="space-between" wrap="wrap">
                    <Text>GitHub</Text>
                    {has('github') ? (
                        <HStack>
                            <Text fontSize="sm" color="fg.muted">
                                Connected
                            </Text>
                            <Button size="sm" variant="outline" disabled={!canUnlink} onClick={() => unlink('github')}>
                                Disconnect
                            </Button>
                        </HStack>
                    ) : (
                        <Button asChild size="sm" variant="outline">
                            <a href={linkOAuthUrl('github', returnTo)}>Connect</a>
                        </Button>
                    )}
                </HStack>
                <HStack justify="space-between" wrap="wrap">
                    <Text>Google</Text>
                    {has('google') ? (
                        <HStack>
                            <Text fontSize="sm" color="fg.muted">
                                Connected
                            </Text>
                            <Button size="sm" variant="outline" disabled={!canUnlink} onClick={() => unlink('google')}>
                                Disconnect
                            </Button>
                        </HStack>
                    ) : (
                        <Button asChild size="sm" variant="outline">
                            <a href={linkOAuthUrl('google', returnTo)}>Connect</a>
                        </Button>
                    )}
                </HStack>
                <HStack justify="space-between" wrap="wrap">
                    <Text>Email & password</Text>
                    {has('credentials') ? (
                        <Text fontSize="sm" color="fg.muted">
                            Connected
                        </Text>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                                const password = window.prompt('Choose a password (min 8 characters)');
                                if (!password || password.length < 8) return;
                                try {
                                    await authApi.linkCredentials(password);
                                    await refresh();
                                    toaster.create({ type: 'success', title: 'Password added' });
                                } catch {
                                    toaster.create({ type: 'error', title: 'Could not add password' });
                                }
                            }}
                        >
                            Add password
                        </Button>
                    )}
                </HStack>
            </VStack>
        </VStack>
    );
}
