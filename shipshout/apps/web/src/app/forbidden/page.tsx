import NextLink from 'next/link';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';
import { LuShieldAlert } from 'react-icons/lu';
import { PulseField } from '@/components/ui/pulse';

export default function ForbiddenPage() {
    return (
        <Box minH="100vh" display="grid" placeItems="center" bg="bg" position="relative" overflow="hidden" px="4">
            <PulseField />
            <VStack gap="6" textAlign="center" position="relative" zIndex="1" maxW="md">
                <Box color="signal.solid" fontSize="5xl">
                    <LuShieldAlert />
                </Box>
                <Heading as="h1" fontFamily="heading" fontSize={{ base: '3xl', md: '4xl' }} letterSpacing="tight">
                    Access denied
                </Heading>
                <Text color="fg.muted" fontSize="lg">
                    You don&apos;t have permission to view this workspace, or it may no longer exist.
                </Text>
                <Button asChild colorPalette="signal">
                    <NextLink href="/">Back to dashboard</NextLink>
                </Button>
            </VStack>
        </Box>
    );
}
