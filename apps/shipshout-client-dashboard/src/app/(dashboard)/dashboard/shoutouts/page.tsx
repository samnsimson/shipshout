import { Stack } from '@chakra-ui/react';
import { Megaphone } from 'lucide-react';
import { PageHeader } from '../../../../components/dashboard/page-header';
import { ShoutoutsClient } from '../../../../components/shoutouts/shoutouts-client';
import { fetchShoutouts } from '../../../../lib/shoutouts/api';

export default async function ShoutoutsPage() {
    const result = await fetchShoutouts();
    const shoutouts = result.data?.shoutouts ?? [];

    return (
        <Stack maxW="960px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
            <PageHeader icon={Megaphone} eyebrow="Shoutouts" title="Shoutouts" description="Placeholder drafts created when GitHub triggers fire on your linked repositories." />
            <ShoutoutsClient shoutouts={shoutouts} />
        </Stack>
    );
}
