import { Box, Button, Show, Text, VStack, Heading } from '@chakra-ui/react';
import { LuGithub } from 'react-icons/lu';
import { PulseField } from '@/components/ui/pulse';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams;
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/github`;
    return (
        <Box minH="100vh" display="grid" placeItems="center" bg="bg" position="relative" overflow="hidden" px="4">
            <PulseField />
            <VStack gap="6" textAlign="center" position="relative" zIndex="1" maxW="sm">
                <Heading as="h1" fontFamily="heading" fontSize={{ base: '4xl', md: '5xl' }} letterSpacing="tight">
                    ShipShout
                </Heading>
                <Text color="fg.muted" fontSize="lg">
                    Ship it. Shout about it. Automatically.
                </Text>
                <Show when={error}>
                    <Text color="fg.error" fontSize="sm">
                        GitHub sign-in failed. Start again — don&apos;t reuse the callback URL from your browser history.
                    </Text>
                </Show>
                <Button asChild size="lg" colorPalette="signal" px="8">
                    <a href={url}>
                        <LuGithub /> Sign in with GitHub
                    </a>
                </Button>
            </VStack>
        </Box>
    );
}
