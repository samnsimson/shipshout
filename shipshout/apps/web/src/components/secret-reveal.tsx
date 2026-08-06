'use client';

import { Clipboard, Code, HStack, IconButton } from '@chakra-ui/react';
import { LuCheck, LuClipboard } from 'react-icons/lu';

export function SecretReveal({ label, value }: { label: string; value: string }) {
    return (
        <HStack justify="space-between" bg="bg" borderWidth="1px" borderColor="border" borderRadius="md" px="3" py="2" gap="3">
            <Code colorPalette="gray" fontSize="sm" truncate>
                {value}
            </Code>
            <Clipboard.Root value={value}>
                <Clipboard.Trigger asChild>
                    <IconButton aria-label={`Copy ${label}`} size="xs" variant="surface">
                        <Clipboard.Indicator copied={<LuCheck />}>
                            <LuClipboard />
                        </Clipboard.Indicator>
                    </IconButton>
                </Clipboard.Trigger>
            </Clipboard.Root>
        </HStack>
    );
}
