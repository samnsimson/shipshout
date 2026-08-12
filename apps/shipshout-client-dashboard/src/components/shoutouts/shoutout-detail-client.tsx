'use client';

import { Badge, Box, Link as ChakraLink, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ShoutoutDetailDto } from '../../lib/shoutouts/api';

function triggerTypeLabel(type: string) {
    if (type === 'release') return 'Release';
    if (type === 'tag_push') return 'Tag push';
    if (type === 'branch_push') return 'Branch push';
    return type;
}

export function ShoutoutDetailClient(props: { shoutout: ShoutoutDetailDto }) {
    return (
        <Stack gap="lg">
            <ChakraLink asChild color="fg.muted" fontSize="sm" _hover={{ color: 'fg.default' }}>
                <Link href="/dashboard/shoutouts">
                    <Stack direction="row" align="center" gap="xs">
                        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                        Back to shoutouts
                    </Stack>
                </Link>
            </ChakraLink>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Stack gap="xs">
                        <Text fontSize="xs" fontWeight="600" color="fg.muted" textTransform="uppercase" letterSpacing="0.125px">
                            Shoutout
                        </Text>
                        <Text fontSize="2xl" fontWeight="700">
                            {props.shoutout.title}
                        </Text>
                    </Stack>
                    <Stack direction="row" gap="sm" flexWrap="wrap">
                        <Badge variant="subtle" borderRadius="full">
                            {triggerTypeLabel(props.shoutout.triggerType)}
                        </Badge>
                        <Badge colorPalette="purple" variant="subtle" borderRadius="full">
                            Pending AI
                        </Badge>
                    </Stack>
                    <Text color="fg.muted" fontSize="sm">
                        Created {new Date(props.shoutout.createdAt).toLocaleString()} from {props.shoutout.repositoryFullName}
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                        AI generation coming soon — this is a placeholder draft from the trigger payload.
                    </Text>
                    <ChakraLink asChild fontSize="sm" color="brand.fg">
                        <Link href={`/dashboard/repositories/${props.shoutout.linkedRepositoryId}`}>View repository triggers</Link>
                    </ChakraLink>
                </Stack>
            </Box>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="sm">
                    <Text fontSize="sm" fontWeight="600">
                        Source summary
                    </Text>
                    <Box as="pre" fontSize="xs" p="md" bg="bg.canvas" borderRadius="md" overflowX="auto" whiteSpace="pre-wrap">
                        {JSON.stringify(props.shoutout.sourceSummary, null, 2)}
                    </Box>
                </Stack>
            </Box>
        </Stack>
    );
}
