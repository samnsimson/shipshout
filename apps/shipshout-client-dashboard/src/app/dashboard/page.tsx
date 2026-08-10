import { Heading, Stack, Text } from '@chakra-ui/react';
import { LogoutButton } from '../../components/auth/logout-button';

export default function DashboardPage() {
    return (
        <Stack minH="100vh" bg="bg.soft" align="center" justify="center" gap="lg" px="md">
            <Stack gap="xs" textAlign="center">
                <Text fontSize="sm" fontWeight="600" color="brand.fg">
                    Shipshout
                </Text>
                <Heading size="xl" letterSpacing="-0.625px">
                    You&apos;re in
                </Heading>
                <Text color="fg.muted" fontSize="sm">
                    This is your dashboard placeholder.
                </Text>
            </Stack>
            <LogoutButton />
        </Stack>
    );
}
