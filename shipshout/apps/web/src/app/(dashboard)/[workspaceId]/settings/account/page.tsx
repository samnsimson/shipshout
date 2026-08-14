import { ConnectedAccounts } from './connected-accounts';

export default async function AccountSettings({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    return <ConnectedAccounts workspaceId={workspaceId} />;
}
