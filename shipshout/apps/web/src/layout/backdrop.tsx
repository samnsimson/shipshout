'use client';

import { Box } from '@chakra-ui/react';
import { useSidebar } from '@/context/sidebar-context';

export function Backdrop() {
    const { isMobileOpen, toggleMobileSidebar } = useSidebar();
    if (!isMobileOpen) return null;
    return (
        <Box
            position="fixed"
            inset="0"
            bg="blackAlpha.600"
            zIndex="40"
            display={{ base: 'block', lg: 'none' }}
            onClick={toggleMobileSidebar}
        />
    );
}
