import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { ComponentCard } from '@/components/component-card';
import { Generator } from './generator';

export default function TweetGeneratorPage() {
    return (
        <Box minH="100vh" bg="bg" py={{ base: 12, md: 20 }} px="4">
            <VStack gap="3" mb="12" textAlign="center">
                <Heading size="3xl" fontWeight="semibold" letterSpacing="tight">
                    Release Notes → Tweet
                </Heading>
                <Text color="fg.muted" fontSize="lg" maxW="lg">
                    Turn your dev release notes into a ready-to-post tweet, free.
                </Text>
            </VStack>
            <Box maxW="2xl" mx="auto">
                <ComponentCard title="Generate tweet" desc="Paste your release notes and get a tweet draft.">
                    <Generator />
                </ComponentCard>
            </Box>
        </Box>
    );
}
