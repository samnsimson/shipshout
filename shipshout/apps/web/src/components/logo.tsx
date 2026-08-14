'use client';

import Image from 'next/image';
import NextLink from 'next/link';
import { useColorMode } from '@/components/ui/color-mode';

export function Logo({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
    const { colorMode } = useColorMode();
    if (variant === 'icon') return <Image src="/images/logo/logo-icon.svg" alt="ShipShout" width={32} height={32} priority />;

    const src = colorMode === 'dark' ? '/images/logo/logo-dark.svg' : '/images/logo/logo.svg';
    return (
        <NextLink href="/">
            <Image src={src} alt="ShipShout" width={150} height={40} priority />
        </NextLink>
    );
}
