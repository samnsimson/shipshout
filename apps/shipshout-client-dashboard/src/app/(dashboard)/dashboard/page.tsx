import { Stack } from '@chakra-ui/react';
import { Home } from 'lucide-react';
import { PageHeader } from '../../../components/dashboard/page-header';
import { getSessionAction } from '../../../lib/auth/actions';

export default async function DashboardPage() {
    const session = await getSessionAction();
    if (!session) return null;

    const { user } = session;
    const handle = user.username ? `@${user.username}` : user.email;

    return (
        <Stack maxW="720px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
            <PageHeader
                icon={Home}
                eyebrow="Dashboard"
                title={`Welcome back${user.name ? `, ${user.name.split(' ')[0]}` : ''}`}
                description={`You're signed in as ${handle}.`}
            />
        </Stack>
    );
}
