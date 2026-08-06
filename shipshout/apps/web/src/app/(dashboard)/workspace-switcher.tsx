'use client';

import { useRouter } from 'next/navigation';

type Workspace = { id: string; name: string };

export function WorkspaceSwitcher({ workspaces, activeId }: { workspaces: Workspace[]; activeId?: string }) {
    const router = useRouter();
    return (
        <select
            aria-label="Workspace"
            value={activeId ?? ''}
            onChange={(e) => {
                if (e.target.value === '__new__') router.push('/');
                else router.push(`/${e.target.value}/drafts`);
            }}
            style={{ marginLeft: activeId ? 0 : 'auto' }}
        >
            {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                    {ws.name}
                </option>
            ))}
            <option value="__new__">+ New workspace</option>
        </select>
    );
}
