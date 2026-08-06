import { SimpleGrid, Skeleton } from '@chakra-ui/react';

export default function BillingLoading() {
    return (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
        </SimpleGrid>
    );
}
