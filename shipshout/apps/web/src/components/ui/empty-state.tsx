import { EmptyState as ChakraEmptyState, Show, VStack } from '@chakra-ui/react';
import * as React from 'react';

export interface EmptyStateProps extends ChakraEmptyState.RootProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(props, ref) {
    const { title, description, icon, children, ...rest } = props;
    return (
        <ChakraEmptyState.Root ref={ref} {...rest}>
            <ChakraEmptyState.Content>
                <Show when={icon}>
                    {(content) => <ChakraEmptyState.Indicator>{content}</ChakraEmptyState.Indicator>}
                </Show>
                <Show when={description} fallback={<ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>}>
                    {(text) => (
                        <VStack textAlign="center">
                            <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
                            <ChakraEmptyState.Description>{text}</ChakraEmptyState.Description>
                        </VStack>
                    )}
                </Show>
                {children}
            </ChakraEmptyState.Content>
        </ChakraEmptyState.Root>
    );
});
