import { Link as ChakraLink, Flex, type LinkProps } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function BackNavLink(props: { href: string; children: ReactNode } & Omit<LinkProps, 'href' | 'children'>) {
    const { href, children, ...linkProps } = props;
    return (
        <ChakraLink asChild color="fg.muted" fontSize="sm" _hover={{ color: 'fg.default' }} {...linkProps}>
            <Link href={href}>
                <Flex align="center" gap="xs">
                    <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                    {children}
                </Flex>
            </Link>
        </ChakraLink>
    );
}
