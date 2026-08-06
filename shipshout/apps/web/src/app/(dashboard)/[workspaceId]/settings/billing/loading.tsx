import { SimpleGrid, Skeleton, Stack } from '@chakra-ui/react';

export default function Loading() {
    return (
        <Stack gap="6">
            <Skeleton height="8" width="32" borderRadius="lg" />
            <Skeleton height="4" width="56" borderRadius="lg" />
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
                <Skeleton height="72" borderRadius="2xl" />
                <Skeleton height="72" borderRadius="2xl" />
                <Skeleton height="72" borderRadius="2xl" />
            </SimpleGrid>
        </Stack>
    );
}
