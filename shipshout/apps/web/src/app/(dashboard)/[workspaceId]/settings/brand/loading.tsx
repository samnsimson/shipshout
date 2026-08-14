import { Skeleton, Stack } from '@chakra-ui/react';

export default function Loading() {
    return (
        <Stack gap="6">
            <Skeleton height="8" width="40" borderRadius="lg" />
            <Skeleton height="4" width="64" borderRadius="lg" />
            <Skeleton height="64" borderRadius="2xl" />
        </Stack>
    );
}
