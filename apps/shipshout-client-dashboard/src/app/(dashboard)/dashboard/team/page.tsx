import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import { getSessionAction } from '../../../../lib/auth/actions';

export default async function TeamPage() {
    const session = await getSessionAction();
    if (!session) return null;

    return (
        <Stack maxW="720px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
            <Stack gap="xs">
                <Text fontSize="xs" fontWeight="600" color="brand.fg" letterSpacing="0.125px" textTransform="uppercase">
                    Team
                </Text>
                <Heading as="h1" fontSize="2xl" letterSpacing="-0.625px" fontWeight="700">
                    Coming soon
                </Heading>
                <Text color="fg.muted" fontSize="sm">
                    Team pages and collaboration features will launch soon.
                </Text>
            </Stack>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Text color="fg.muted" fontSize="sm">
                    This area will be available when team management is ready.
                </Text>
            </Box>
        </Stack>
    );
}

