import { Stack } from '@chakra-ui/react';
import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { ShoutoutsClient } from '@/components/shoutouts/shoutouts-client';
import { fetchShoutouts } from '@/lib/shoutouts/api';

export default async function ShoutoutsPage() {
    const result = await fetchShoutouts();
    const shoutouts = result.data?.shoutouts ?? [];

    return (
        <Stack gap="lg">
            <PageHeader icon={Megaphone} eyebrow="Shoutouts" title="Shoutouts" description="Review AI-generated drafts and publish them to your configured channels when GitHub triggers fire." />
            <ShoutoutsClient shoutouts={shoutouts} />
        </Stack>
    );
}
