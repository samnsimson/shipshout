import { Button, Flex, Stack, Text } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa6';

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
                <a href={apiBase ? `${apiBase}/auth/google` : undefined}>
                    <Flex align="center" justify="center" gap="sm" w="100%">
                        <FcGoogle size={18} aria-hidden />
                        Continue with Google
                    </Flex>
                </a>
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
                <a href={apiBase ? `${apiBase}/auth/github` : undefined}>
                    <Flex align="center" justify="center" gap="sm" w="100%">
                        <FaGithub size={18} aria-hidden />
                        Continue with GitHub
                    </Flex>
                </a>
            </Button>
            <Text textAlign="center" fontSize="sm" color="fg.muted" pt="xs">
                or
            </Text>
        </Stack>
    );
}
