import { Field as ChakraField, Show } from '@chakra-ui/react';
import * as React from 'react';

export interface FieldProps extends Omit<ChakraField.RootProps, 'label'> {
    label?: React.ReactNode;
    helperText?: React.ReactNode;
    errorText?: React.ReactNode;
    optionalText?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(props, ref) {
    const { label, children, helperText, errorText, optionalText, ...rest } = props;
    return (
        <ChakraField.Root ref={ref} {...rest}>
            <Show when={label}>
                {(content) => (
                    <ChakraField.Label>
                        {content}
                        <ChakraField.RequiredIndicator fallback={optionalText} />
                    </ChakraField.Label>
                )}
            </Show>
            {children}
            <Show when={helperText}>
                {(text) => <ChakraField.HelperText>{text}</ChakraField.HelperText>}
            </Show>
            <Show when={errorText}>
                {(text) => <ChakraField.ErrorText>{text}</ChakraField.ErrorText>}
            </Show>
        </ChakraField.Root>
    );
});
