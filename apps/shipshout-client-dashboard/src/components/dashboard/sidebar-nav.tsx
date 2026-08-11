'use client';

import NextLink from 'next/link';
import { Box, Flex, Link as ChakraLink, Text } from '@chakra-ui/react';

const NAV = [
    { href: '/dashboard', label: 'Home' },
    { href: '/dashboard/repositories', label: 'Repositories' },
    { href: '/dashboard/shoutouts', label: 'Shoutouts' },
    { href: '/dashboard/team', label: 'Team' },
    { href: '/dashboard/settings', label: 'Settings' },
] as const;

export function SidebarNav(props: {
    user: { email: string; name: string; username?: string | null; image?: string | null };
    pathname: string;
    isMobileOpen: boolean;
    onMobileClose: () => void;
}) {
    const content = (
        <Flex direction="column" gap="xs" px="md" py="lg">
            {NAV.map((item) => {
                const active = props.pathname === item.href || props.pathname.startsWith(`${item.href}/`);
                return (
                    <ChakraLink
                        key={item.href}
                        as={NextLink}
                        href={item.href}
                        display="flex"
                        alignItems="center"
                        gap="sm"
                        px="sm"
                        py="xs"
                        borderRadius="md"
                        borderLeftWidth="2px"
                        borderLeftColor={active ? 'brand.solid' : 'transparent'}
                        bg={active ? 'bg.canvas' : 'transparent'}
                        color={active ? 'brand.fg' : 'fg'}
                        fontWeight={600}
                        letterSpacing="-0.125px"
                        onClick={() => props.onMobileClose()}
                    >
                        <Box w="2px" h="16px" bg={active ? 'brand.solid' : 'transparent'} borderRadius="full" />
                        <Text fontSize="sm">{item.label}</Text>
                    </ChakraLink>
                );
            })}
        </Flex>
    );

    return (
        <>
            <Box
                as="nav"
                display={{ base: 'none', md: 'block' }}
                w="260px"
                borderRightWidth="1px"
                borderRightColor="border.hairline"
                bg="bg.canvas"
            >
                {content}
            </Box>

            {props.isMobileOpen ? (
                <Box
                    position="fixed"
                    inset="0"
                    bg="rgba(0, 0, 0, 0.2)"
                    zIndex="overlay"
                    onClick={props.onMobileClose}
                    display={{ base: 'block', md: 'none' }}
                >
                    <Box
                        w="260px"
                        h="100%"
                        bg="bg.canvas"
                        borderRightWidth="1px"
                        borderRightColor="border.hairline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {content}
                    </Box>
                </Box>
            ) : null}
        </>
    );
}

