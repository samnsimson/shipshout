'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, HStack, Show, Text } from '@chakra-ui/react';

export function NavItem({ href, icon, children, showLabel = true }: { href: string; icon: React.ReactNode; children: React.ReactNode; showLabel?: boolean }) {
    const pathname = usePathname();
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return (
        <NextLink href={href} style={{ textDecoration: 'none' }}>
            <HStack
                gap="3"
                px="3"
                py="2"
                borderRadius="lg"
                fontSize="sm"
                fontWeight="medium"
                justify={showLabel ? 'flex-start' : 'center'}
                bg={active ? 'brand.muted' : 'transparent'}
                color={active ? 'brand.fg' : { _light: 'gray.700', _dark: 'gray.300' }}
                _hover={{ bg: active ? 'brand.muted' : 'bg.muted' }}
            >
                <Box as="span" color={active ? 'brand.solid' : { _light: 'gray.500', _dark: 'gray.400' }} display="flex">
                    {icon}
                </Box>
                <Show when={showLabel}>
                    <Text>{children}</Text>
                </Show>
            </HStack>
        </NextLink>
    );
}