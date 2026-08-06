'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Collapsible, Flex, Input, Stack, Textarea } from '@chakra-ui/react';
import { LuChevronDown } from 'react-icons/lu';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { simulateRelease } from '../../../../../lib/repositories';
import { handleForbiddenClient } from '../../../../../lib/forbidden';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export function RepositoryRow({ workspaceId, repo }: { workspaceId: string; repo: Repo }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(`Test release ${new Date().toLocaleString()}`);
    const [notes, setNotes] = useState('Testing the ShipShout pipeline.');
    const [sending, setSending] = useState(false);
    const router = useRouter();

    return (
        <Card.Root>
            <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
                <Card.Body>
                    <Flex justify="space-between" align="center">
                        <Stack gap="0">
                            <Card.Title>{repo.name}</Card.Title>
                            <Card.Description>{repo.provider}</Card.Description>
                        </Stack>
                        <Collapsible.Trigger asChild>
                            <Button variant="outline" size="sm">
                                Send test release
                                <Collapsible.Indicator transition="transform 0.2s" _open={{ transform: 'rotate(180deg)' }}>
                                    <LuChevronDown />
                                </Collapsible.Indicator>
                            </Button>
                        </Collapsible.Trigger>
                    </Flex>
                    <Collapsible.Content>
                        <Stack gap="3" pt="4">
                            <Field label="Title">
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                            </Field>
                            <Field label="Notes">
                                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                            </Field>
                            <Button
                                alignSelf="flex-start"
                                size="sm"
                                colorPalette="signal"
                                loading={sending}
                                onClick={async () => {
                                    setSending(true);
                                    try {
                                        const res = await simulateRelease(workspaceId, repo.id, { title, notes });
                                        toaster.create({
                                            type: res.accepted ? 'success' : 'error',
                                            title: res.accepted ? 'Queued — check Drafts in a few seconds.' : 'Not accepted (usage limit reached?).',
                                        });
                                        router.refresh();
                                    } catch (error) {
                                        if (handleForbiddenClient(error, router.push)) return;
                                        toaster.create({ type: 'error', title: 'Failed to send test release.' });
                                    } finally {
                                        setSending(false);
                                    }
                                }}
                            >
                                Send
                            </Button>
                        </Stack>
                    </Collapsible.Content>
                </Card.Body>
            </Collapsible.Root>
        </Card.Root>
    );
}
