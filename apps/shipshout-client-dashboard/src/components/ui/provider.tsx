'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../../theme';
import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';

export function Provider({ children, ...rest }: ColorModeProviderProps) {
    return (
        <ChakraProvider value={system}>
            <ColorModeProvider defaultTheme="system" enableSystem storageKey="shipshout-theme" {...rest}>
                {children}
            </ColorModeProvider>
        </ChakraProvider>
    );
}
