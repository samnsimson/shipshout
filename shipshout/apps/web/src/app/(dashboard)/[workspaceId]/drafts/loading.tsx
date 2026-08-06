import { SimpleGrid, Skeleton } from '@chakra-ui/react';

export default function DraftsLoading() {
    return (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
            {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height="180px" borderRadius="lg" />
            ))}
        </SimpleGrid>
    );
}
