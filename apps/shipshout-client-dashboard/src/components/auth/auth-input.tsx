import { Input, type InputProps } from '@chakra-ui/react';

/** DESIGN.md text-input: surface fill, body-sm, rounded.xs, padded. */
export function AuthInput(props: InputProps) {
    return (
        <Input
            size="md"
            borderRadius="xs"
            borderWidth="1px"
            borderColor="border.hairline"
            bg="bg.surface"
            px="sm"
            py="xs"
            h="auto"
            minH="40px"
            fontSize="sm"
            _placeholder={{ color: 'fg.muted' }}
            _focusVisible={{ borderColor: 'brand.500', outline: 'none', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            {...props}
        />
    );
}
