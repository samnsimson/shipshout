import { Skeleton, Stack } from '@chakra-ui/react';

export default function Loading() {
    return (
        <Stack gap="6">
            <Skeleton height="8" width="48" borderRadius="lg" />
            <Skeleton height="4" width="72" borderRadius="lg" />
            <Stack gap="3">
                <Skeleton height="14" borderRadius="2xl" />
                <Skeleton height="14" borderRadius="2xl" />
                <Skeleton height="14" borderRadius="2xl" />
            </Stack>
        </Stack>
    );
}
