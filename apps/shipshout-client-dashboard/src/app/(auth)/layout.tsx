import { Box, Flex } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { AuthColorModeToggle } from '../../components/ui/auth-color-mode-toggle';

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <Flex minH="100vh" align="center" justify="center" bg="bg.soft" px="lg" py="xxl">
            <AuthColorModeToggle />
            <Box w="100%" display="flex" justifyContent="center">
                {children}
            </Box>
        </Flex>
    );
}
