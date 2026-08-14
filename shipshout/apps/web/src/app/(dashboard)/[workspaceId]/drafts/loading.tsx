import { SimpleGrid, Skeleton, Stack } from '@chakra-ui/react';

export default function Loading() {
    return (
        <Stack gap="6">
            <Skeleton height="8" width="40" borderRadius="lg" />
            <Skeleton height="4" width="64" borderRadius="lg" />
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
                <Skeleton height="48" borderRadius="2xl" />
                <Skeleton height="48" borderRadius="2xl" />
            </SimpleGrid>
        </Stack>
    );
}
