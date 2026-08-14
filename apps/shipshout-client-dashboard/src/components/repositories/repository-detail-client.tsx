'use client';

import { Stack } from '@chakra-ui/react';
import { BackNavLink } from '@/components/ui/back-nav-link';
import type { RepositoryChannelDto } from '@/lib/channels/channels.api';
import type { LinkedRepositoryDetailDto, TriggerEventDto } from '@/lib/triggers/triggers.api';
import { RepositoryChannelsCard } from './detail/repository-channels-card';
import { RepositoryEventsTable } from './detail/repository-events-table';
import { RepositoryHeaderCard } from './detail/repository-header-card';
import { RepositoryTriggersCard } from './detail/repository-triggers-card';
import { RepositoryWebhookCard } from './detail/repository-webhook-card';

export function RepositoryDetailClient(props: { repository: LinkedRepositoryDetailDto; events: TriggerEventDto[]; channels: RepositoryChannelDto[] }) {
    return (
        <Stack gap="lg">
            <BackNavLink href="/dashboard/repositories">Back to repositories</BackNavLink>
            <RepositoryHeaderCard repository={props.repository} />
            <RepositoryTriggersCard repositoryId={props.repository.id} initialTriggers={props.repository.triggers} />
            <RepositoryChannelsCard repositoryId={props.repository.id} channels={props.channels} />
            <RepositoryWebhookCard webhook={props.repository.webhook} />
            <RepositoryEventsTable events={props.events} />
        </Stack>
    );
}
