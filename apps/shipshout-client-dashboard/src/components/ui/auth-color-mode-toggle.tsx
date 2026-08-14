'use client';

import { Box } from '@chakra-ui/react';
import { ColorModeButton } from './color-mode';

export function AuthColorModeToggle() {
    return (
        <Box position="fixed" top="md" right="md" zIndex="sticky">
            <ColorModeButton borderRadius="lg" bg="bg.surface" borderWidth="1px" borderColor="border.hairline" />
        </Box>
    );
}
