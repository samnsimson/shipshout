import { Button, Stack, Text } from '@chakra-ui/react';

function publicApiBase(): string {
    return (process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? '').replace(/\/$/, '');
}

export function SocialButtons() {
    const apiBase = publicApiBase();

    return (
        <Stack gap="sm">
            <Button asChild variant="outline" borderRadius="full" w="100%" borderColor="border.hairline" disabled={!apiBase}>
                <a href={apiBase ? `${apiBase}/auth/google` : undefined}>Continue with Google</a>
            </Button>
            <Button asChild variant="outline" borderRadius="full" w="100%" borderColor="border.hairline" disabled={!apiBase}>
                <a href={apiBase ? `${apiBase}/auth/github` : undefined}>Continue with GitHub</a>
            </Button>
            <Text textAlign="center" fontSize="sm" color="fg.muted">
                or
            </Text>
        </Stack>
    );
}
