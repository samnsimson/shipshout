'use client';

import NextLink from 'next/link';
import { Box, Menu, Portal, Text } from '@chakra-ui/react';
import { LuChevronDown, LuPlus } from 'react-icons/lu';

type Workspace = { id: string; name: string };

export function WorkspaceSwitcher({ workspaces, activeId }: { workspaces: Workspace[]; activeId?: string }) {
    const active = workspaces.find((w) => w.id === activeId);
    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <Box
                    as="button"
                    display="flex"
                    alignItems="center"
                    gap="2"
                    px="3"
                    py="2"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border"
                    fontSize="sm"
                    fontWeight="medium"
                    _hover={{ bg: 'bg.muted' }}
                >
                    <Text truncate maxW="160px">
                        {active?.name ?? 'Select workspace'}
                    </Text>
                    <LuChevronDown />
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
