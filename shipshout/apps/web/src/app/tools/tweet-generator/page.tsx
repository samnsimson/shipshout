import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { PulseField } from '@/components/ui/pulse';
import { Generator } from './generator';

export default function TweetGeneratorPage() {
    return (
        <Box minH="100vh" bg="bg" py={{ base: 12, md: 20 }} px="4">
            <Box position="relative" mb="12" textAlign="center">
                <PulseField />
                <VStack gap="3" position="relative" zIndex="1">
                    <Heading as="h1" fontFamily="heading" fontSize={{ base: '3xl', md: '5xl' }} letterSpacing="tight">
                        Release Notes → Tweet
                    </Heading>
                    <Text color="fg.muted" fontSize="lg" maxW="lg">
                        Turn your dev release notes into a ready-to-post tweet, free.
                    </Text>
                </VStack>
            </Box>
            <Generator />
        </Box>
    );
}
