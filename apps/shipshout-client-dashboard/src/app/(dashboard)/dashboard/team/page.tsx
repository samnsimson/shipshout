import { Box, Stack, Text } from '@chakra-ui/react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { getSessionAction } from '@/lib/auth/actions';

export default async function TeamPage() {
    const session = await getSessionAction();
    if (!session) return null;

    return (
        <Stack gap="lg">
            <PageHeader
                icon={Users}
                eyebrow="Team"
                title="Coming soon"
                description="Team pages and collaboration features will launch soon."
            />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Text color="fg.muted" fontSize="sm">
                    This area will be available when team management is ready.
                </Text>
            </Box>
        </Stack>
    );
}
