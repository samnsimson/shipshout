import { Box, Stack, Text } from '@chakra-ui/react';
import { Megaphone } from 'lucide-react';
import { PageHeader } from '../../../../components/dashboard/page-header';
import { getSessionAction } from '../../../../lib/auth/actions';

export default async function ShoutoutsPage() {
    const session = await getSessionAction();
    if (!session) return null;

    return (
        <Stack maxW="720px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
            <PageHeader
                icon={Megaphone}
                eyebrow="Shoutouts"
                title="Coming soon"
                description="We're working on community shoutouts and updates."
            />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Text color="fg.muted" fontSize="sm">
                    This area will show shoutouts once the feature is ready.
                </Text>
            </Box>
        </Stack>
    );
}
