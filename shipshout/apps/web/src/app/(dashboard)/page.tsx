import { redirect } from 'next/navigation';
import { Center } from '@chakra-ui/react';
import { LuBuilding2 } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';
import { CreateWorkspaceForm } from './create-workspace-form';

async function getWorkspaces() {
    try {
        return await apiFetch('/workspaces');
    } catch {
        return [];
    }
}

export default async function DashboardPage() {
    const user = await getSessionUser();
    if (!user) redirect('/login');
    const workspaces = await getWorkspaces();
    if (workspaces.length > 0) redirect(`/${workspaces[0].id}/drafts`);
    return (
        <Center minH="70vh">
            <EmptyState title="Create your first workspace" description="A workspace connects a repository to your social channels." icon={<LuBuilding2 />}>
                <CreateWorkspaceForm />
            </EmptyState>
        </Center>
    );
}
