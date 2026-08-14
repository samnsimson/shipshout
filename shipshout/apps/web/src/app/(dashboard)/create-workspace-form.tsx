'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Stack } from '@chakra-ui/react';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { createWorkspace } from '../../lib/workspaces';

export function CreateWorkspaceForm() {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                try {
                    const ws = await createWorkspace(name);
                    router.push(`/${ws.id}/drafts`);
                } catch {
                    toaster.create({ type: 'error', title: "Couldn't create workspace", description: 'Try a different name.' });
                    setSubmitting(false);
                }
            }}
        >
            <Stack gap="4" minW="sm">
                <Field label="Workspace name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required />
                </Field>
                <Button type="submit" colorPalette="brand" loading={submitting} loadingText="Creating…" disabled={!name.trim()}>
                    Create workspace
                </Button>
            </Stack>
        </form>
    );
}
