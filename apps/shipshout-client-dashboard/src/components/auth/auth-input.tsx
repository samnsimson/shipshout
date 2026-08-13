import { Input, type InputProps } from '@chakra-ui/react';
import { forwardRef } from 'react';

/** DESIGN.md text-input: surface fill, body-sm, rounded.xs, padded. */
export const AuthInput = forwardRef<HTMLInputElement, InputProps>(function AuthInput(props, ref) {
    return (
        <Input
            ref={ref}
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
});
