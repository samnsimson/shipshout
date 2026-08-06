import { Skeleton, Stack } from '@chakra-ui/react';

export default function RepositoriesLoading() {
    return (
        <Stack gap="3" maxW="2xl">
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} height="72px" borderRadius="lg" />
            ))}
        </Stack>
    );
}
