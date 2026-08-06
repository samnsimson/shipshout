import { apiFetch } from '../../../lib/api-client';
import { redirectOnApiAuthError } from '../../../lib/redirect-on-api-error';

export default async function WorkspaceLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ workspaceId: string }>;
}) {
    const { workspaceId } = await params;
    try {
        await apiFetch(`/workspaces/${workspaceId}`);
    } catch (error) {
        redirectOnApiAuthError(error);
    }
    return children;
}
