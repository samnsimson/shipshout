'use client';

import { Button, HStack, VStack } from '@chakra-ui/react';
import { LuGithub } from 'react-icons/lu';
import { FcGoogle } from 'react-icons/fc';
import { oauthUrl } from '@/lib/auth-api';

export function OAuthButtons() {
    return (
        <VStack align="stretch" gap="3">
            <Button asChild size="lg" colorPalette="brand" variant="outline">
                <a href={oauthUrl('github')}>
                    <LuGithub /> Continue with GitHub
                </a>
            </Button>
            <Button asChild size="lg" variant="outline">
                <a href={oauthUrl('google')}>
                    <HStack gap="2">
                        <FcGoogle /> Continue with Google
                    </HStack>
                </a>
            </Button>
        </VStack>
    );
}

export function AuthDivider() {
    return (
        <HStack gap="3" color="fg.muted" fontSize="sm">
            <span style={{ flex: 1, height: 1, background: 'var(--chakra-colors-border)' }} />
            or
            <span style={{ flex: 1, height: 1, background: 'var(--chakra-colors-border)' }} />
        </HStack>
    );
}
