import { Box, type BoxProps } from '@chakra-ui/react';

const REDUCED_MOTION = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

export interface PulseProps extends Omit<BoxProps, 'boxSize'> {
    size?: BoxProps['boxSize'];
}

/** Small animated dot + expanding ring — the wordmark mark and the "active/generating" StatusBadge indicator. */
export function Pulse({ size = '10px', ...rest }: PulseProps) {
    return (
        <Box position="relative" display="inline-block" boxSize={size} flexShrink="0" {...rest}>
            <Box position="absolute" inset="0" borderRadius="full" bg="signal.solid" />
            <Box position="absolute" inset="0" borderRadius="full" bg="signal.solid" css={{ animation: 'pulseRing', ...REDUCED_MOTION }} />
        </Box>
    );
}

/** Ambient concentric rings behind a hero headline — used once per marketing surface (login, tweet generator). */
export function PulseField() {
    return (
        <Box position="absolute" inset="0" display="grid" placeItems="center" overflow="hidden" pointerEvents="none" zIndex="0">
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    position="absolute"
                    boxSize={{ base: '220px', md: '380px' }}
                    borderRadius="full"
                    borderWidth="1px"
                    borderColor="signal.solid"
                    opacity="0.35"
                    css={{ animation: 'pulseRing', animationDelay: `${i * 0.8}s`, ...REDUCED_MOTION }}
                />
            ))}
        </Box>
    );
}
