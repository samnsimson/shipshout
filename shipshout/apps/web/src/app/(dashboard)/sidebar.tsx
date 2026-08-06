'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Box, CloseButton, Drawer, Flex, HStack, IconButton, Menu, Portal, Show, Text, VStack } from '@chakra-ui/react';
import { LuLogOut, LuMenu, LuPlus } from 'react-icons/lu';
import { ColorModeButton } from '@/components/ui/color-mode';
import { Pulse } from '@/components/ui/pulse';
import { NavLink } from '@/components/nav-link';

type Workspace = { id: string; name: string };
type SessionUser = { name?: string; githubId?: string };

function Wordmark() {
    return (
        <NextLink href="/" style={{ textDecoration: 'none' }}>
            <HStack gap="2">
                <Pulse size="10px" />
                <Text fontFamily="heading" fontWeight="bold" fontSize="lg" color="fg">
                    ShipShout
                </Text>
            </HStack>
        </NextLink>
    );
}

function WorkspaceMenu({ workspaces, activeId }: { workspaces: Workspace[]; activeId?: string }) {
    const active = workspaces.find((w) => w.id === activeId);
    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <Box as="button" w="full" textAlign="left" px="3" py="2" borderRadius="md" borderWidth="1px" borderColor="border" fontSize="sm" fontWeight="medium" _hover={{ bg: 'bg.muted' }}>
                    {active?.name ?? 'Select workspace'}
                </Box>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner>
                    <Menu.Content minW="12rem">
                        {workspaces.map((ws) => (
                            <Menu.Item key={ws.id} value={ws.id} asChild>
                                <NextLink href={`/${ws.id}/drafts`}>{ws.name}</NextLink>
                            </Menu.Item>
                        ))}
                        <Menu.Separator />
                        <Menu.Item value="__new__" asChild>
                            <NextLink href="/">
                                <LuPlus /> New workspace
                            </NextLink>
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}

function SidebarNav({ activeWs }: { activeWs?: string }) {
    return (
        <Show when={activeWs}>
            {(ws) => (
                <VStack align="stretch" gap="1">
                    <NavLink href={`/${ws}/drafts`}>Drafts</NavLink>
                    <Text px="3" pt="4" pb="1" fontSize="xs" fontWeight="semibold" color="fg.subtle" textTransform="uppercase" letterSpacing="wide">
                        Settings
                    </Text>
                    <NavLink href={`/${ws}/settings/repositories`}>Repositories</NavLink>
                    <NavLink href={`/${ws}/settings/connections`}>Connections</NavLink>
                    <NavLink href={`/${ws}/settings/brand`}>Brand</NavLink>
                    <NavLink href={`/${ws}/settings/billing`}>Billing</NavLink>
                </VStack>
            )}
        </Show>
    );
}

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
                <HStack as="button" w="full" px="2" py="2" borderRadius="md" _hover={{ bg: 'bg.muted' }} cursor="pointer">
                    <Avatar.Root size="xs">
                        <Avatar.Fallback name={user.name ?? user.githubId ?? 'User'} />
                    </Avatar.Root>
                    <Text fontSize="sm" truncate>
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

export function Sidebar({ workspaces, activeWs, user }: { workspaces: Workspace[]; activeWs?: string; user: SessionUser }) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const navContent = (
        <VStack align="stretch" gap="6" h="full">
            <Wordmark />
            <WorkspaceMenu workspaces={workspaces} activeId={activeWs} />
            <Box flex="1" overflowY="auto">
                <SidebarNav activeWs={activeWs} />
            </Box>
            <HStack justify="space-between">
                <UserMenu user={user} />
                <ColorModeButton />
            </HStack>
        </VStack>
    );

    return (
        <>
            <Box as="aside" hideBelow="md" w="240px" flexShrink="0" borderRightWidth="1px" borderColor="border" p="4" h="100vh" position="sticky" top="0">
                {navContent}
            </Box>
            <Flex as="header" hideFrom="md" align="center" justify="space-between" px="4" py="3" borderBottomWidth="1px" borderColor="border">
                <Wordmark />
                <IconButton aria-label="Open menu" variant="ghost" onClick={() => setDrawerOpen(true)}>
                    <LuMenu />
                </IconButton>
            </Flex>
            <Drawer.Root open={drawerOpen} onOpenChange={(e) => setDrawerOpen(e.open)} placement="start">
                <Portal>
                    <Drawer.Backdrop />
                    <Drawer.Positioner>
                        <Drawer.Content>
                            <Drawer.CloseTrigger asChild>
                                <CloseButton position="absolute" top="2" insetEnd="2" size="sm" />
                            </Drawer.CloseTrigger>
                            <Drawer.Body pt="6">{navContent}</Drawer.Body>
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>
        </>
    );
}
