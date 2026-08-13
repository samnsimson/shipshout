import { Box, Flex } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { AuthMarketingPanel } from '../../components/auth/auth-marketing-panel';
import { AuthColorModeToggle } from '../../components/ui/auth-color-mode-toggle';

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <Flex minH="100dvh" w="100%" direction={{ base: 'column', lg: 'row' }}>
            <AuthColorModeToggle />
            <Flex
                as="section"
                flex="1"
                direction="column"
                align="center"
                justify="center"
                bg="bg.canvas"
                px={{ base: 'lg', md: 'xxl' }}
                py={{ base: 'xxl', lg: 'xxl' }}
                overflowY="auto"
            >
                <Box w="100%" maxW="420px">
                    {children}
                </Box>
            </Flex>
            <Box as="aside" flex="1" display={{ base: 'none', lg: 'block' }} minH="100dvh">
                <AuthMarketingPanel />
            </Box>
        </Flex>
    );
}
