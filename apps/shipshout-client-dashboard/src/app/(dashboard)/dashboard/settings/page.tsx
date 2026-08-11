import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { Settings, User } from 'lucide-react';
import { PageHeader } from '../../../../components/dashboard/page-header';
import { getSessionAction } from '../../../../lib/auth/actions';

export default async function SettingsPage() {
    const session = await getSessionAction();
    if (!session) return null;

    const { user } = session;

    return (
        <Stack maxW="720px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
            <PageHeader icon={Settings} eyebrow="Settings" title="Account" description="Manage your profile details." />

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Flex align="center" gap="xs">
                        <User size={16} strokeWidth={2} aria-hidden />
                        <Text fontSize="sm" fontWeight="600">
                            Account
                        </Text>
                    </Flex>
                    <Stack gap="xs" fontSize="sm">
                        <Flex justify="space-between" gap="md">
                            <Text color="fg.muted">Name</Text>
                            <Text>{user.name || '—'}</Text>
                        </Flex>
                        <Flex justify="space-between" gap="md">
                            <Text color="fg.muted">Email</Text>
                            <Text>{user.email}</Text>
                        </Flex>
                        {user.username ? (
                            <Flex justify="space-between" gap="md">
                                <Text color="fg.muted">Username</Text>
                                <Text>{user.username}</Text>
                            </Flex>
                        ) : null}
                    </Stack>
                </Stack>
            </Box>
        </Stack>
    );
}
