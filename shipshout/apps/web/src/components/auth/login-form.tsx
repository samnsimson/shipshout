'use client';

import { Button, Heading, Text, VStack } from '@chakra-ui/react';
import { LuGithub } from 'react-icons/lu';

export function LoginForm({ authUrl, error }: { authUrl: string; error?: string }) {
    return (
        <VStack align="stretch" gap="6" maxW="md" mx="auto" w="full" px="6" py="10">
            <VStack align="stretch" gap="2">
                <Heading size="xl" fontWeight="semibold">
                    Sign in
                </Heading>
                <Text fontSize="sm" color="fg.muted">
                    Connect your GitHub account to get started.
                </Text>
            </VStack>
            {error && (
                <Text color="fg.error" fontSize="sm">
                    GitHub sign-in failed. Start again — don&apos;t reuse the callback URL from your browser history.
                </Text>
            )}
            <Button asChild size="lg" colorPalette="brand">
                <a href={authUrl}>
                    <LuGithub /> Sign in with GitHub
                </a>
            </Button>
        </VStack>
    );
}
