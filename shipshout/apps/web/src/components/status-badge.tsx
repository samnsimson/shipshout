import { Badge, Box, Show } from '@chakra-ui/react';
import { Pulse } from './ui/pulse';

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
    const colorPalette = tone === 'active' ? 'signal' : tone === 'positive' ? 'beacon' : 'gray';
    return (
        <Badge colorPalette={colorPalette} variant="subtle" size="sm" display="inline-flex" alignItems="center" gap="1.5">
            <Show when={tone === 'active'}>
                <Pulse size="6px" />
            </Show>
            <Show when={tone === 'positive'}>
                <Box boxSize="6px" borderRadius="full" bg="beacon.solid" />
            </Show>
            {label ?? status.replace(/_/g, ' ')}
        </Badge>
    );
}
