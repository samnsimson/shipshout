import { Text, type TextProps } from '@chakra-ui/react';

export function EmptyStateText(props: TextProps) {
    return <Text color="fg.muted" fontSize="sm" {...props} />;
}
