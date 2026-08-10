import { Button, Stack, Text } from '@chakra-ui/react';

function publicApiBase(): string {
    return (process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? '').replace(/\/$/, '');
}

export function SocialButtons() {
    const apiBase = publicApiBase();

    return (
        <Stack gap="sm">
            <Button
                asChild
                variant="outline"
                borderRadius="full"
                w="100%"
                h="44px"
                borderColor="border.hairline"
                fontWeight="500"
                disabled={!apiBase}
            >
                <a href={apiBase ? `${apiBase}/auth/google` : undefined}>Continue with Google</a>
            </Button>
            <Button
                asChild
                variant="outline"
                borderRadius="full"
                w="100%"
                h="44px"
                borderColor="border.hairline"
                fontWeight="500"
                disabled={!apiBase}
            >
                <a href={apiBase ? `${apiBase}/auth/github` : undefined}>Continue with GitHub</a>
            </Button>
            <Text textAlign="center" fontSize="sm" color="fg.muted" pt="xs">
                or
            </Text>
        </Stack>
    );
}
