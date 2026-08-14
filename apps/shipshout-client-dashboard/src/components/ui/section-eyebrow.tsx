import { Text, type TextProps } from '@chakra-ui/react';

export function SectionEyebrow(props: TextProps) {
    return (
        <Text fontSize="xs" fontWeight="600" color="fg.muted" textTransform="uppercase" letterSpacing="0.125px" {...props} />
    );
}
