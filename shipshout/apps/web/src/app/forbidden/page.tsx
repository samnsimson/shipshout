import NextLink from 'next/link';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';
import { LuShieldAlert } from 'react-icons/lu';
import { GridShape } from '@/components/grid-shape';

export default function ForbiddenPage() {
    return (
        <Box minH="100vh" display="grid" placeItems="center" bg="bg" position="relative" overflow="hidden" px="4">
            <GridShape />
            <VStack gap="6" textAlign="center" position="relative" zIndex="1" maxW="md">
                <Box color="brand.solid" fontSize="5xl">
                    <LuShieldAlert />
                </Box>
                <Heading size="2xl" fontWeight="semibold">
                    Access denied
                </Heading>
                <Text color="fg.muted" fontSize="lg">
                    You don&apos;t have permission to view this workspace, or it may no longer exist.
                </Text>
                <Button asChild colorPalette="brand" variant="outline">
                    <NextLink href="/">Back to dashboard</NextLink>
                </Button>
            </VStack>
        </Box>
    );
}
