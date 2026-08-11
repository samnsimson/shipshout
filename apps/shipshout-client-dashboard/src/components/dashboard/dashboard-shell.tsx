'use client';

import type { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { useDisclosure } from '@chakra-ui/react';
import { TopBar } from './top-bar';
import { SidebarNav } from './sidebar-nav';

export function DashboardShell(props: {
    user: { email: string; name: string; username?: string | null; image?: string | null };
    children: ReactNode;
}) {
    const pathname = usePathname();
    const { open, onOpen, onClose } = useDisclosure();

    return (
        <Flex direction="column" minH="100vh">
            <TopBar user={props.user} onOpenSidebar={onOpen} />
            <Flex flex="1" bg="bg.soft">
                <SidebarNav user={props.user} pathname={pathname} isMobileOpen={open} onMobileClose={onClose} />
                <Box as="main" flex="1" bg="bg.soft">
                    {props.children}
                </Box>
            </Flex>
        </Flex>
    );
}

