'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonGroup, Card, Flex, Textarea } from '@chakra-ui/react';
import { StatusBadge } from '@/components/status-badge';
import { toaster } from '@/components/ui/toaster';
import { updateDraft, approveDraft, publishDraft } from '../../../../lib/drafts';
import { handleForbiddenClient } from '../../../../lib/forbidden';

type Draft = { id: string; channel: string; generatedCopy: string; editedCopy?: string; status: string };

export function DraftCard({ workspaceId, draft }: { workspaceId: string; draft: Draft }) {
    const router = useRouter();
    const [copy, setCopy] = useState(draft.editedCopy ?? draft.generatedCopy);
    const [status, setStatus] = useState(draft.status);
    const [saving, setSaving] = useState(false);
    const [approving, setApproving] = useState(false);
    const [publishing, setPublishing] = useState(false);

    return (
        <Card.Root>
            <Card.Header>
                <Flex justify="space-between" align="center">
                    <Card.Title textTransform="capitalize">{draft.channel}</Card.Title>
                    <StatusBadge status={status} />
                </Flex>
            </Card.Header>
            <Card.Body>
                <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={4} />
            </Card.Body>
            <Card.Footer>
                <ButtonGroup size="sm" variant="outline">
                    <Button
                        loading={saving}
                        onClick={async () => {
                            setSaving(true);
                            try {
                                await updateDraft(workspaceId, draft.id, copy);
                                toaster.create({ type: 'success', title: 'Draft saved' });
                            } catch (error) {
                                if (handleForbiddenClient(error, router.push)) return;
                                toaster.create({ type: 'error', title: "Couldn't save draft" });
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        Save
                    </Button>
                    <Button
                        loading={approving}
                        onClick={async () => {
                            setApproving(true);
                            try {
                                await approveDraft(workspaceId, draft.id);
                                setStatus('approved');
                            } catch (error) {
                                if (handleForbiddenClient(error, router.push)) return;
                                toaster.create({ type: 'error', title: "Couldn't approve draft" });
                            } finally {
                                setApproving(false);
                            }
                        }}
                    >
                        Approve
                    </Button>
                    <Button
                        colorPalette="signal"
                        variant="solid"
                        loading={publishing}
                        disabled={status !== 'approved'}
                        onClick={async () => {
                            setPublishing(true);
                            try {
                                await publishDraft(workspaceId, draft.id);
                                setStatus('published');
                            } catch (error) {
                                if (handleForbiddenClient(error, router.push)) return;
                                toaster.create({ type: 'error', title: "Couldn't publish draft" });
                            } finally {
                                setPublishing(false);
                            }
                        }}
                    >
                        Publish
                    </Button>
                </ButtonGroup>
            </Card.Footer>
        </Card.Root>
    );
}
