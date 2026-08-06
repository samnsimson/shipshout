'use client';

import { useRouter } from 'next/navigation';
import { Avatar, Box, Flex, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react';
import { LuLogOut, LuMenu, LuX } from 'react-icons/lu';
import { Logo } from '@/components/logo';
import { ColorModeButton } from '@/components/ui/color-mode';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { useSidebar } from '@/context/sidebar-context';

type Workspace = { id: string; name: string };
type SessionUser = { name?: string; githubId?: string };

function UserMenu({ user }: { user: SessionUser }) {
    const router = useRouter();
    const signOut = async () => {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        router.push('/login');
        router.refresh();
    };
    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <HStack as="button" px="2" py="2" borderRadius="lg" _hover={{ bg: 'bg.muted' }} cursor="pointer">
                    <Avatar.Root size="xs">
                        <Avatar.Fallback name={user.name ?? user.githubId ?? 'User'} />
                    </Avatar.Root>
                    <Text fontSize="sm" truncate display={{ base: 'none', sm: 'block' }}>
                        {user.name ?? user.githubId}
                    </Text>
                </HStack>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner>
                    <Menu.Content minW="10rem">
                        <Menu.Item value="sign-out" color="fg.error" _hover={{ bg: 'bg.error', color: 'fg.error' }} onClick={signOut}>
                            <LuLogOut /> Sign out
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}

export function AppHeader({ workspaces, activeWs, user }: { workspaces: Workspace[]; activeWs?: string; user: SessionUser }) {
    const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

    const handleToggle = () => {
        if (window.innerWidth >= 1024) toggleSidebar();
        else toggleMobileSidebar();
    };

    return (
        <Box
            as="header"
            position="sticky"
            top="0"
            zIndex="30"
            bg={{ _light: 'white', _dark: 'gray.900' }}
            borderBottomWidth="1px"
            borderColor="border"
        >
            <Flex align="center" justify="space-between" gap="3" px={{ base: 3, lg: 6 }} py={{ base: 3, lg: 4 }}>
                <Flex align="center" gap="3">
                    <IconButton aria-label="Toggle sidebar" variant="outline" borderColor="border" onClick={handleToggle}>
                        {isMobileOpen ? <LuX /> : <LuMenu />}
                    </IconButton>
                    <Box display={{ base: 'block', lg: 'none' }}>
                        <Logo variant="full" />
                    </Box>
                </Flex>
                <Flex align="center" gap="2">
                    <WorkspaceSwitcher workspaces={workspaces} activeId={activeWs} />
                    <ColorModeButton variant="outline" borderColor="border" />
                    <UserMenu user={user} />
                </Flex>
            </Flex>
        </Box>
    );
}
