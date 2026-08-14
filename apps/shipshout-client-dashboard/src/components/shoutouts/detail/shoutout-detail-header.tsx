'use client';

import { Button, Flex, Link as ChakraLink, Show, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { BackNavLink } from '@/components/ui/back-nav-link';
import { SectionEyebrow } from '@/components/ui/section-eyebrow';
import { StatusBadge } from '@/components/ui/status-badge';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { publish as publishShoutout, retryGeneration } from '@/lib/shoutouts/shoutouts.actions';
import type { ShoutoutDetailDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';
import { TriggerUtils } from '@/lib/triggers/triggers.utils';

export function ShoutoutDetailHeader(props: { shoutout: ShoutoutDetailDto }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const status = ShoutoutsUtils.badge(props.shoutout.status);
    const canPublish = props.shoutout.status === 'ready_for_review' && props.shoutout.drafts.length > 0;
    const canRetry =
        props.shoutout.status === 'generation_failed' ||
        props.shoutout.status === 'generating' ||
        (props.shoutout.status === 'ready_for_review' && props.shoutout.drafts.length === 0);

    const publish = () => {
        startTransition(async () => {
            const result = await publishShoutout(props.shoutout.id);
            if (!result.ok) {
                Toaster.error({ title: 'Could not publish shoutout', description: result.error });
                return;
            }
            Toaster.success({ title: 'Shoutout published' });
            router.refresh();
        });
    };

    const retry = () => {
        startTransition(async () => {
            const result = await retryGeneration(props.shoutout.id);
            if (!result.ok) {
                Toaster.error({ title: 'Could not retry generation', description: result.error });
                return;
            }
            Toaster.info({ title: 'Regenerating shoutout drafts' });
            router.refresh();
        });
    };

    return (
        <>
            <BackNavLink href="/dashboard/shoutouts">Back to shoutouts</BackNavLink>
            <SurfaceCard>
                <Stack gap="md">
                    <Stack gap="xs">
                        <SectionEyebrow>Shoutout</SectionEyebrow>
                        <Text fontSize="2xl" fontWeight="700">
                            {props.shoutout.title}
                        </Text>
                    </Stack>
                    <Flex gap="sm" flexWrap="wrap">
                        <StatusBadge label={TriggerUtils.triggerTypeLabel(props.shoutout.triggerType)} />
                        <StatusBadge label={status.label} palette={status.palette} />
                    </Flex>
                    <Text color="fg.muted" fontSize="sm">
                        Created {new Date(props.shoutout.createdAt).toLocaleString()} from {props.shoutout.repositoryFullName}
                    </Text>
                    <Flex gap="sm" flexWrap="wrap">
                        <Show when={canPublish}>
                            <Button colorPalette="blue" borderRadius="lg" onClick={publish} loading={pending}>
                                Publish
                            </Button>
                        </Show>
                        <Show when={canRetry}>
                            <Button colorPalette="blue" borderRadius="lg" onClick={retry} loading={pending}>
                                Retry generation
                            </Button>
                        </Show>
                        <ChakraLink asChild fontSize="sm" color="brand.fg" alignSelf="center">
                            <Link href={`/dashboard/repositories/${props.shoutout.linkedRepositoryId}`}>View repository triggers</Link>
                        </ChakraLink>
                    </Flex>
                </Stack>
            </SurfaceCard>
        </>
    );
}
