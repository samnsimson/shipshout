'use client';

import { Button, Checkbox, For, Stack, Text } from '@chakra-ui/react';
import { useEffect, useTransition } from 'react';
import { SectionHeading } from '@/components/ui/section-heading';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Toaster } from '@/lib/feedback/toaster.utils';
import { useRepositoryTriggersStore } from '@/lib/triggers/repository-triggers.store';
import { updateRepositoryTriggers } from '@/lib/triggers/triggers.actions';
import type { RepositoryTriggersDto } from '@shipshout/api-client';
import { TriggerUtils } from '@/lib/triggers/triggers.utils';

export function RepositoryTriggersCard(props: { repositoryId: string; initialTriggers: RepositoryTriggersDto }) {
    const [pending, startTransition] = useTransition();
    const storedTriggers = useRepositoryTriggersStore((state) => state.triggers);
    const hydrate = useRepositoryTriggersStore((state) => state.hydrate);
    const setTrigger = useRepositoryTriggersStore((state) => state.setTrigger);
    const triggers = storedTriggers ?? props.initialTriggers;

    useEffect(() => {
        hydrate(props.initialTriggers);
    }, [hydrate, props.initialTriggers]);

    const save = () => {
        startTransition(async () => {
            const result = await updateRepositoryTriggers(props.repositoryId, triggers);
            if (!result.ok) {
                Toaster.error({ title: 'Could not save triggers', description: result.error });
                return;
            }
            Toaster.success({ title: 'Triggers saved' });
            window.location.reload();
        });
    };

    return (
        <SurfaceCard>
            <Stack gap="md">
                <SectionHeading>Trigger configuration</SectionHeading>
                <Text color="fg.muted" fontSize="sm">
                    No triggers are enabled by default. Turn on at least one to start receiving events.
                </Text>
                <Stack gap="sm">
                    <For each={TriggerUtils.triggerKeys}>
                        {(key) => (
                            <Checkbox.Root key={key} checked={triggers[key]} onCheckedChange={(details) => setTrigger(key, Boolean(details.checked))}>
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                                <Checkbox.Label fontSize="sm">{TriggerUtils.triggerLabels[key]}</Checkbox.Label>
                            </Checkbox.Root>
                        )}
                    </For>
                </Stack>
                <Button colorPalette="blue" borderRadius="lg" alignSelf="flex-start" onClick={save} loading={pending}>
                    Save triggers
                </Button>
            </Stack>
        </SurfaceCard>
    );
}
