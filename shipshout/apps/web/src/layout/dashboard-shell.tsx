'use client';

import { useParams } from 'next/navigation';
import { Box } from '@chakra-ui/react';
import { SidebarProvider, useSidebar } from '@/context/sidebar-context';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { Backdrop } from './backdrop';

type Workspace = { id: string; name: string };
type SessionUser = { name?: string; email?: string };

type DashboardShellProps = {
    workspaces: Workspace[];
    activeWs?: string;
    user: SessionUser;
    children: React.ReactNode;
};

function ShellBody({ workspaces, activeWs: activeWsProp, user, children }: DashboardShellProps) {
    const params = useParams();
    const workspaceId = typeof params?.workspaceId === 'string' ? params.workspaceId : undefined;
    const activeWs = workspaceId ?? activeWsProp ?? workspaces[0]?.id;
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const sidebarWide = isMobileOpen || isExpanded || isHovered;
    const ml = sidebarWide ? '290px' : '90px';

    return (
        <Box minH="100vh" bg="bg">
            <AppSidebar activeWs={activeWs} />
            <Backdrop />
            <Box ml={{ base: 0, lg: ml }} transition="margin-left 0.3s ease">
                <AppHeader workspaces={workspaces} activeWs={activeWs} user={user} />
                <Box as="main" p={{ base: 4, md: 6 }} maxW="1536px" mx="auto">
                    {children}
                </Box>
            </Box>
        </Box>
    );
}

export function DashboardShell(props: DashboardShellProps) {
    return (
        <SidebarProvider>
            <ShellBody {...props} />
        </SidebarProvider>
    );
}
