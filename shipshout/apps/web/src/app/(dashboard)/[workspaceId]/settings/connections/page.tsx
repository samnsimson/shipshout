import { ComponentCard } from '@/components/component-card';
import { Stack } from '@chakra-ui/react';
import { PageHeader } from '@/components/page-header';
import { connectionsConfig, listConnections } from '../../../../../lib/connections';
import { ConnectionRow } from './connection-row';

const CHANNELS = ['x', 'linkedin', 'email', 'buffer', 'mailchimp'] as const;

export default async function ConnectionsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const [connections, config]: [
        { type: string; status: string }[],
        { x: boolean; linkedin: boolean; buffer: boolean; mailchimp: boolean; email: boolean },
    ] = await Promise.all([listConnections(workspaceId), connectionsConfig(workspaceId)]);
    return (
        <>
            <PageHeader title="Connections" description="Link the channels ShipShout publishes to." />
            <ComponentCard title="Channels" desc="Connect social and email channels for publishing.">
                <Stack gap="3">
                    {CHANNELS.map((channel) => (
                        <ConnectionRow
                            key={channel}
                            workspaceId={workspaceId}
                            channel={channel}
                            connected={connections.some((c) => c.type === channel && c.status === 'active')}
                            oauthEnabled={channel === 'email' ? config.email : config[channel]}
                        />
                    ))}
                </Stack>
            </ComponentCard>
        </>
    );
}
