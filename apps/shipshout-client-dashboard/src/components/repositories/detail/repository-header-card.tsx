'use client';

import { Badge, Flex, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import { ExternalLink } from 'lucide-react';
import { SectionEyebrow } from '@/components/ui/section-eyebrow';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { LinkedRepositoryDetailDto } from '@/lib/triggers/triggers.api';

export function RepositoryHeaderCard(props: { repository: LinkedRepositoryDetailDto }) {
    return (
        <SurfaceCard>
            <Stack gap="sm">
                <Flex align="center" justify="space-between" gap="md" flexWrap="wrap">
                    <Stack gap="xxs">
                        <SectionEyebrow>Repository</SectionEyebrow>
                        <Text fontSize="xl" fontWeight="700">
                            {props.repository.fullName}
                        </Text>
                    </Stack>
                    <Flex align="center" gap="sm">
                        <Badge variant="subtle" borderRadius="lg">
                            {props.repository.defaultBranch}
                        </Badge>
                        <ChakraLink href={props.repository.htmlUrl} target="_blank" rel="noreferrer" fontSize="sm" color="brand.fg">
                            <Flex align="center" gap="xs">
                                GitHub
                                <ExternalLink size={14} strokeWidth={2} aria-hidden />
                            </Flex>
                        </ChakraLink>
                    </Flex>
                </Flex>
            </Stack>
        </SurfaceCard>
    );
}
