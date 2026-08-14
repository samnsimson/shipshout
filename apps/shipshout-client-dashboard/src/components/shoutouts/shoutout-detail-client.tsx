'use client';

import { Stack } from '@chakra-ui/react';
import { useEffect } from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useShoutoutDetailStore } from '@/lib/shoutouts/shoutout-detail.store';
import { useShoutoutEvents } from '@/lib/shoutouts/use-shoutout-events';
import type { ShoutoutDetailDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';
import { ShoutoutDetailHeader } from './detail/shoutout-detail-header';
import { ShoutoutDispatchLogTable } from './detail/shoutout-dispatch-log-table';
import { ShoutoutDraftEditor } from './detail/shoutout-draft-editor';
import { ShoutoutSourceSummaryPanel } from './detail/shoutout-source-summary-panel';

export function ShoutoutDetailClient(props: { shoutout: ShoutoutDetailDto }) {
    const storedShoutout = useShoutoutDetailStore((state) => state.shoutout);
    const hydrate = useShoutoutDetailStore((state) => state.hydrate);
    const setShoutout = useShoutoutDetailStore((state) => state.setShoutout);
    const shoutout = storedShoutout ?? props.shoutout;

    useEffect(() => {
        hydrate(props.shoutout);
    }, [hydrate, props.shoutout]);

    useShoutoutEvents(shoutout.id, ShoutoutsUtils.isInFlight(shoutout.status));

    const canEdit = shoutout.status === 'ready_for_review' && shoutout.drafts.length > 0;

    return (
        <Stack gap="lg">
            <ShoutoutDetailHeader shoutout={shoutout} />

            <SurfaceCard>
                <Stack gap="md">
                    <SectionHeading>Channel drafts</SectionHeading>
                    <ShoutoutDraftEditor
                        shoutoutId={shoutout.id}
                        linkedRepositoryId={shoutout.linkedRepositoryId}
                        drafts={shoutout.drafts}
                        status={shoutout.status}
                        editable={canEdit}
                        onSaved={setShoutout}
                    />
                </Stack>
            </SurfaceCard>

            <SurfaceCard>
                <Stack gap="md">
                    <SectionHeading>Source summary</SectionHeading>
                    <ShoutoutSourceSummaryPanel triggerType={shoutout.triggerType} sourceSummary={shoutout.sourceSummary} />
                </Stack>
            </SurfaceCard>

            <SurfaceCard flush p="0">
                <Stack gap="md" p="lg">
                    <SectionHeading>Dispatch log</SectionHeading>
                    <ShoutoutDispatchLogTable dispatchLogs={shoutout.dispatchLogs} />
                </Stack>
            </SurfaceCard>
        </Stack>
    );
}
