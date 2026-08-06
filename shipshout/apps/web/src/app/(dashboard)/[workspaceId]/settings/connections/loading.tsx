import { Skeleton, Stack } from '@chakra-ui/react';

export default function ConnectionsLoading() {
    return (
        <Stack gap="3" maxW="2xl">
            {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height="64px" borderRadius="lg" />
            ))}
        </Stack>
    );
}
