import { RepoPicker } from './repo-picker';

export default async function SelectRepositoriesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    return <RepoPicker workspaceId={workspaceId} />;
}
