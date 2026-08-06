import Image from 'next/image';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import { ColorModeButton } from '@/components/ui/color-mode';
import { GridShape } from '@/components/grid-shape';
import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams;
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/github`;
    return (
        <Flex minH="100vh" bg="bg">
            <Flex flex="1" align="center" justify="center">
                <LoginForm authUrl={url} error={error} />
            </Flex>
            <Box display={{ base: 'none', lg: 'flex' }} flex="1" bg="brand.950" alignItems="center" justifyContent="center" position="relative" overflow="hidden">
                <GridShape />
                <VStack gap="4" zIndex="1" textAlign="center">
                    <Image src="/images/logo/auth-logo.svg" alt="ShipShout" width={231} height={48} />
                    <Text color="gray.400" maxW="xs">
                        Ship it. Shout about it. Automatically.
                    </Text>
                </VStack>
            </Box>
            <Box position="fixed" bottom="6" right="6" zIndex="50">
                <ColorModeButton variant="outline" borderColor="border" />
            </Box>
        </Flex>
    );
}
