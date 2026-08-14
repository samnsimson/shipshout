'use client';

import { Button, Flex, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { SectionHeading } from '@/components/ui/section-heading';
import { SurfaceCard } from '@/components/ui/surface-card';
import type { RepositoryChannelDto } from '@/lib/channels/channels.api';
import { RepositoryChannelsSummary } from '../repository-channels-summary';

export function RepositoryChannelsCard(props: { repositoryId: string; channels: RepositoryChannelDto[] }) {
    return (
        <SurfaceCard flush p="0">
            <Stack gap="0" px="lg" pt="lg" pb="md">
                <Flex align="center" justify="space-between" gap="md" flexWrap="wrap">
                    <Stack gap="xxs">
                        <SectionHeading>Delivery channels</SectionHeading>
                        <Text color="fg.muted" fontSize="sm">
                            Channels enabled for this repository.
                        </Text>
                    </Stack>
                    <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
                        <Link href={`/dashboard/channels?repo=${props.repositoryId}`}>
                            <Button size="sm" variant="outline" borderColor="border.hairline" borderRadius="lg">
                                Manage channels
                            </Button>
                        </Link>
                    </ChakraLink>
                </Flex>
            </Stack>
            <RepositoryChannelsSummary repositoryId={props.repositoryId} channels={props.channels} />
        </SurfaceCard>
    );
}
