import { Heading, Stack, Text } from '@chakra-ui/react';
import { getSessionAction } from '../../../lib/auth/actions';

export default async function DashboardPage() {
    const session = await getSessionAction();
    if (!session) return null;

    const { user } = session;
    const handle = user.username ? `@${user.username}` : user.email;

    return (
        <Stack maxW="720px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
            <Stack gap="xs">
                <Text fontSize="xs" fontWeight="600" color="brand.fg" letterSpacing="0.125px" textTransform="uppercase">
                    Dashboard
                </Text>
                <Heading as="h1" fontSize="2xl" letterSpacing="-0.625px" fontWeight="700">
                    Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
                </Heading>
                <Text color="fg.muted" fontSize="sm">
                    You&apos;re signed in as {handle}.
                </Text>
            </Stack>
        </Stack>
    );
}

