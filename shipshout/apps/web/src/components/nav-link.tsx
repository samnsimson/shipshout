'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { HStack } from '@chakra-ui/react';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return (
        <NextLink href={href} style={{ textDecoration: 'none' }}>
            <HStack
                gap="2"
                px="3"
                py="2"
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                borderStart="2px solid"
                borderStartColor={active ? 'signal.solid' : 'transparent'}
                bg={active ? 'signal.muted' : 'transparent'}
                color={active ? 'signal.fg' : 'fg.muted'}
                _hover={{ bg: active ? 'signal.muted' : 'bg.muted', color: active ? 'signal.fg' : 'fg' }}
            >
                {children}
            </HStack>
        </NextLink>
    );
}
