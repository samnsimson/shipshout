import Image from 'next/image';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import { ColorModeButton } from '@/components/ui/color-mode';
import { GridShape } from '@/components/grid-shape';
import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
    return (
        <Flex minH="100vh" bg="bg">
            <Flex flex="1" align="center" justify="center">
                <SignupForm />
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
