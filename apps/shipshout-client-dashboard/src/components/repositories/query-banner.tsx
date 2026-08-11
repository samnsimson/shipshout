'use client';

import { Alert } from '@chakra-ui/react';

export function QueryBanner(props: { githubQuery?: string; githubReason?: string }) {
    if (!props.githubQuery) return null;

    if (props.githubQuery === 'connected') {
        return (
            <Alert.Root status="success" borderRadius="lg">
                <Alert.Indicator />
                <Alert.Title>GitHub connected successfully.</Alert.Title>
            </Alert.Root>
        );
    }

    if (props.githubQuery === 'error') {
        return (
            <Alert.Root status="error" borderRadius="lg">
                <Alert.Indicator />
                <Alert.Title>{props.githubReason ? `GitHub connection failed: ${props.githubReason}` : 'GitHub connection failed.'}</Alert.Title>
            </Alert.Root>
        );
    }

    return null;
}

