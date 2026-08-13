import { Box } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export function DashboardContent({ children }: { children: ReactNode }) {
    return (
        <Box maxW="1080px" mx="auto" w="100%" px={{ base: 'md', md: 'xl' }} py="xxl">
            {children}
        </Box>
    );
}
