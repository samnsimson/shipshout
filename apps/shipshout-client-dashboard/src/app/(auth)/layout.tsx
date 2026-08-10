import { Box, Flex } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <Flex minH="100vh" align="center" justify="center" bg="bg.soft" px="md" py="xl">
            <Box w="100%" display="flex" justifyContent="center">
                {children}
            </Box>
        </Flex>
    );
}
