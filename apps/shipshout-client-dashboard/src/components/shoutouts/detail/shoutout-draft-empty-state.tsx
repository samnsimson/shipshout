'use client';

import { Link as ChakraLink, Stack } from '@chakra-ui/react';
import Link from 'next/link';
import { EmptyStateText } from '@/components/ui/empty-state-text';
import type { ShoutoutDetailDto } from '@/lib/shoutouts/shoutouts.api';

export function ShoutoutDraftEmptyState(props: {
    status: ShoutoutDetailDto['status'];
    linkedRepositoryId: string;
}) {
    if (props.status === 'generating') return <EmptyStateText>Drafts will appear here once generation completes.</EmptyStateText>;

    return (
        <Stack gap="sm">
            <EmptyStateText>
                No channel drafts were generated. Enable at least one content channel (such as Email newsletter) on the repository, then retry
                generation.
            </EmptyStateText>
            <ChakraLink asChild fontSize="sm" color="brand.fg">
                <Link href={`/dashboard/repositories/${props.linkedRepositoryId}`}>Configure repository channels</Link>
            </ChakraLink>
        </Stack>
    );
}
