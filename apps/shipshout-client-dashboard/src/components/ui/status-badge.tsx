import { Badge, type BadgeProps } from '@chakra-ui/react';

type StatusBadgeProps = BadgeProps & {
    label: string;
    palette?: BadgeProps['colorPalette'];
};

export function StatusBadge({ label, palette, ...props }: StatusBadgeProps) {
    return (
        <Badge variant="subtle" borderRadius="lg" colorPalette={palette} {...props}>
            {label}
        </Badge>
    );
}
