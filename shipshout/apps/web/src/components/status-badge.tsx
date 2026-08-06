import { Badge, Box } from '@chakra-ui/react';

type Tone = 'active' | 'positive' | 'neutral';

const TONE_BY_STATUS: Record<string, Tone> = {
    draft: 'neutral',
    pending_review: 'neutral',
    generating: 'active',
    approved: 'positive',
    published: 'positive',
    active: 'positive',
    connected: 'positive',
    not_connected: 'neutral',
    disabled: 'neutral',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
    const tone = TONE_BY_STATUS[status] ?? 'neutral';
    const colorPalette = tone === 'active' ? 'brand' : tone === 'positive' ? 'success' : 'gray';
    return (
        <Badge colorPalette={colorPalette} variant="subtle" size="sm" display="inline-flex" alignItems="center" gap="1.5">
            {tone === 'active' && <Box boxSize="6px" borderRadius="full" bg="brand.solid" />}
            {tone === 'positive' && <Box boxSize="6px" borderRadius="full" bg="success.500" />}
            {label ?? status.replace(/_/g, ' ')}
        </Badge>
    );
}
