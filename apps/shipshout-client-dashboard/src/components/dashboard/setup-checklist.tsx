'use client';

import { Box, Button, Flex, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import type { SetupState, SetupStep } from '@/lib/dashboard/dashboard-home.utils';

const STEP_ORDER: SetupStep[] = ['github', 'repo', 'trigger', 'channel'];

const STEP_COPY: Record<SetupStep, { title: string; helper: string }> = {
    github: { title: 'Connect GitHub', helper: 'Authorize Shipshout to read your repositories.' },
    repo: { title: 'Link a repository', helper: 'Choose which repos should trigger shoutouts.' },
    trigger: { title: 'Enable a trigger', helper: 'Turn on release, tag, or branch push events.' },
    channel: { title: 'Enable a publish channel', helper: 'Configure where shoutouts go when you publish.' },
};

function isExternalHref(href: string) {
    return href.startsWith('http://') || href.startsWith('https://');
}

export function SetupChecklist(props: { setup: SetupState }) {
    const completedCount = STEP_ORDER.filter((step) => props.setup.steps[step].done).length;

    return (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
            <Stack gap="md">
                <Stack gap="xs">
                    <Text fontSize="xs" fontWeight="600" color="fg.muted" letterSpacing="0.125px" textTransform="uppercase">
                        Get started
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                        {completedCount} of 4 complete
                    </Text>
                </Stack>

                <Stack gap="md">
                    {STEP_ORDER.map((step) => {
                        const state = props.setup.steps[step];
                        const copy = STEP_COPY[step];

                        return (
                            <Flex key={step} align="flex-start" gap="sm">
                                <Flex align="center" justify="center" boxSize="24px" flexShrink={0} pt="2px">
                                    {state.done ? (
                                        <CheckCircle2 size={20} strokeWidth={2} color="var(--chakra-colors-green-fg)" aria-hidden />
                                    ) : (
                                        <Circle size={20} strokeWidth={2} color="var(--chakra-colors-fg-faint)" aria-hidden />
                                    )}
                                </Flex>

                                <Stack gap="xs" flex="1">
                                    <Text fontSize="sm" fontWeight={state.done ? '500' : '600'} color={state.done ? 'fg.muted' : undefined}>
                                        {copy.title}
                                    </Text>
                                    {!state.done && (
                                        <Text color="fg.muted" fontSize="sm">
                                            {copy.helper}
                                        </Text>
                                    )}
                                </Stack>

                                {!state.done &&
                                    (isExternalHref(state.href) ? (
                                        <ChakraLink
                                            href={state.href}
                                            display="inline-flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            bg="brand.solid"
                                            color="white"
                                            borderRadius="lg"
                                            px="md"
                                            h="32px"
                                            fontSize="sm"
                                            fontWeight="500"
                                            flexShrink={0}
                                            _hover={{ textDecoration: 'none', bg: 'brand.600' }}
                                        >
                                            {state.cta}
                                        </ChakraLink>
                                    ) : (
                                        <Button asChild size="sm" colorPalette="blue" borderRadius="lg" flexShrink={0}>
                                            <Link href={state.href}>{state.cta}</Link>
                                        </Button>
                                    ))}
                            </Flex>
                        );
                    })}
                </Stack>
            </Stack>
        </Box>
    );
}
