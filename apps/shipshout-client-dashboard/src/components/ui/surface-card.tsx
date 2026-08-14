import { Box, type BoxProps } from '@chakra-ui/react';

type SurfaceCardProps = BoxProps & {
    flush?: boolean;
};

export function SurfaceCard({ flush, children, p, ...props }: SurfaceCardProps) {
    return (
        <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.hairline"
            borderRadius="lg"
            overflow={flush ? 'hidden' : props.overflow}
            p={p ?? (flush ? undefined : 'lg')}
            {...props}
        >
            {children}
        </Box>
    );
}
