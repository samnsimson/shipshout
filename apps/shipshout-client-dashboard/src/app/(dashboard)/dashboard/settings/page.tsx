import { Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { getSessionAction } from '../../../../lib/auth/actions';

export default async function SettingsPage() {
    const session = await getSessionAction();
    if (!session) return null;

    const { user } = session;

    return (
        <Stack maxW="720px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
            <Stack gap="xs">
                <Text fontSize="xs" fontWeight="600" color="brand.fg" letterSpacing="0.125px" textTransform="uppercase">
                    Settings
                </Text>
                <Heading as="h1" fontSize="2xl" letterSpacing="-0.625px" fontWeight="700">
                    Account
                </Heading>
                <Text color="fg.muted" fontSize="sm">
                    Manage your profile details.
                </Text>
            </Stack>

            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Stack gap="md">
                    <Text fontSize="sm" fontWeight="600">
                        Account
                    </Text>
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

