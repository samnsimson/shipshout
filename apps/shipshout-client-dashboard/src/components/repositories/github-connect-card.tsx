'use client';

import { Badge, Flex, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import { GitBranch } from 'lucide-react';
import { SectionEyebrow } from '@/components/ui/section-eyebrow';
import { SurfaceCard } from '@/components/ui/surface-card';

export function GithubConnectCard(props: { connectUrl: string }) {
    return (
        <SurfaceCard>
            <Stack gap="md">
                <SectionEyebrow>GitHub connection</SectionEyebrow>

                <Flex align="flex-start" gap="sm">
                    <Flex align="center" justify="center" boxSize="40px" borderRadius="md" bg="orange.subtle" color="orange.fg" flexShrink={0}>
                        <GitBranch size={18} strokeWidth={2} aria-hidden />
                    </Flex>
                    <Stack gap="xs" flex="1">
                        <Flex align="center" gap="xs" flexWrap="wrap">
                            <Badge colorPalette="orange" variant="subtle" borderRadius="lg">
                                Not connected
                            </Badge>
                            <Text fontSize="sm" fontWeight="600">
                                Link repositories from GitHub
                            </Text>
                        </Flex>
                        <Text color="fg.muted" fontSize="sm">
                            Authorize Shipshout to read your repos so you can choose which ones to shout about.
                        </Text>
                    </Stack>
                </Flex>

                <ChakraLink
                    href={props.connectUrl}
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    gap="xs"
                    bg="brand.solid"
                    color="white"
                    borderRadius="lg"
                    px="lg"
                    h="44px"
                    fontWeight="500"
                    alignSelf="flex-start"
                    _hover={{ textDecoration: 'none', bg: 'brand.600' }}
                >
                    <GitBranch size={16} strokeWidth={2} aria-hidden />
                    Connect GitHub
                </ChakraLink>
            </Stack>
        </SurfaceCard>
    );
}
