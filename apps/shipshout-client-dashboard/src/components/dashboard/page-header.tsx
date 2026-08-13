import { Flex, Heading, Show, Stack, Text } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader(props: {
    eyebrow: string;
    title: string;
    description?: string;
    icon: LucideIcon;
    children?: ReactNode;
}) {
    const Icon = props.icon;

    return (
        <Stack gap="xs">
            <Flex align="center" gap="xs">
                <Icon size={14} strokeWidth={2} aria-hidden />
                <Text fontSize="xs" fontWeight="600" color="brand.fg" letterSpacing="0.125px" textTransform="uppercase">
                    {props.eyebrow}
                </Text>
            </Flex>
            <Heading as="h1" fontSize="2xl" letterSpacing="-0.625px" fontWeight="700">
                {props.title}
            </Heading>
            <Show when={props.description}>
                <Text color="fg.muted" fontSize="sm">
                    {props.description}
                </Text>
            </Show>
            {props.children}
        </Stack>
    );
}
