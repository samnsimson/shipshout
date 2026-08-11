# Client Dashboard Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Notion-inspired authenticated client dashboard shell + routing, and ship the `/dashboard/repositories` UX backed by the generated `libs/api-client` `ApiClient` SDK.

**Architecture:** Use a Next.js route group `(dashboard)` with a shared layout that guards sessions and renders hybrid chrome (slim top bar + left sidebar). Each section is a route under `/dashboard/*`; only Repositories is feature-complete in v1.

**Tech Stack:** Next.js App Router, Chakra UI v3, `@/lib/api-client` generated `ApiClient` SDK, Next server actions for mutations, CSS/token mapping via `DESIGN.md`.

## Global Constraints
- Follow `DESIGN.md` for token usage: quiet monochrome chrome + `{colors.primary}` only for actions/active states.
- Use `bun` + Nx workflows.
- For repository API calls: use generated `libs/api-client` `ApiClient` SDK (not ad-hoc `fetch` for repos endpoints).
- OAuth entry/return: “Connect GitHub” navigates the browser to `GET {API}/repositories/github/connect`; OAuth redirect returns to `/dashboard/repositories`.
- Mutations (`disconnectGithub`, `linkRepositories`, `unlinkRepository`) use server actions and redirect back to `/dashboard/repositories` on success.
- No placeholders / no “TBD” text in implementation steps.

---

## Task 1: Dashboard route group + shared shell

**Files:**
- Modify: `apps/shipshout-client-dashboard/src/app/dashboard/page.tsx` (move/delete after relocation)
- Create: `apps/shipshout-client-dashboard/src/app/(dashboard)/layout.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/dashboard/dashboard-shell.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/dashboard/sidebar-nav.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/dashboard/top-bar.tsx`

**Interfaces:**
- Consumes: `getSessionAction(): Promise<{ user: { id; email; name; username?; image? }; session: Record<string, unknown> } | null>` from `apps/shipshout-client-dashboard/src/lib/auth/actions.ts`
- Produces: `DashboardShell({ user, children }: { user: { email: string; name: string; username?: string | null }; children: React.ReactNode })`

- [ ] **Step 1: Create `(dashboard)` layout that guards session**

```tsx
// apps/shipshout-client-dashboard/src/app/(dashboard)/layout.tsx
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Box, Flex } from '@chakra-ui/react';
import { getSessionAction } from '../../lib/auth/actions';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const session = await getSessionAction();
    if (!session) redirect('/login');

    const { user } = session;
    return (
        <DashboardShell user={user}>
            <Box minH="100vh">{children}</Box>
        </DashboardShell>
    );
}
```

- [ ] **Step 2: Move the existing dashboard page into `(dashboard)`**

Create the new file:

```tsx
// apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/page.tsx
export { default } from '../dashboard/page';
```

Then adjust imports in the original moved target (see step 4). Implementation is easiest by physically moving code from `src/app/dashboard/page.tsx` into the new location.

- [ ] **Step 3: Implement `DashboardShell` (client)**

```tsx
// apps/shipshout-client-dashboard/src/components/dashboard/dashboard-shell.tsx
'use client';

import type { ReactNode } from 'react';
import { Flex } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { TopBar } from './top-bar';
import { SidebarNav } from './sidebar-nav';

export function DashboardShell(props: {
    user: { email: string; name: string; username?: string | null };
    children: ReactNode;
}) {
    const pathname = usePathname();

    return (
        <Flex direction="column" minH="100vh">
            <TopBar user={props.user} />
            <Flex flex="1" bg="bg.soft">
                <SidebarNav user={props.user} pathname={pathname} />
                <Flex as="main" flex="1" direction="column" bg="bg.soft">
                    {props.children}
                </Flex>
            </Flex>
        </Flex>
    );
}
```

- [ ] **Step 4: Implement `TopBar` and `SidebarNav` using `DESIGN.md` tokens**

```tsx
// apps/shipshout-client-dashboard/src/components/dashboard/top-bar.tsx
'use client';

import { Box, Flex, Text } from '@chakra-ui/react';
import { LogoutButton } from '../auth/logout-button';

export function TopBar(props: { user: { email: string; name: string; username?: string | null } }) {
    return (
        <Flex
            as="header"
            align="center"
            justify="space-between"
            px={{ base: 'md', md: 'xl' }}
            py="md"
            bg="bg.canvas"
            borderBottomWidth="1px"
            borderColor="border.hairline"
        >
            <Box display="flex" alignItems="center" gap="md">
                <Text fontSize="sm" fontWeight="600" letterSpacing="-0.125px">
                    Shipshout
                </Text>
            </Box>
            <LogoutButton />
        </Flex>
    );
}
```

```tsx
// apps/shipshout-client-dashboard/src/components/dashboard/sidebar-nav.tsx
'use client';

import { Box, Flex, Link as ChakraLink, Text } from '@chakra-ui/react';
import NextLink from 'next/link';

const NAV = [
    { href: '/dashboard', label: 'Home' },
    { href: '/dashboard/repositories', label: 'Repositories' },
    { href: '/dashboard/shoutouts', label: 'Shoutouts' },
    { href: '/dashboard/team', label: 'Team' },
    { href: '/dashboard/settings', label: 'Settings' },
];

export function SidebarNav(props: { user: { email: string; name: string; username?: string | null }; pathname: string }) {
    return (
        <Box
            as="nav"
            display={{ base: 'none', md: 'block' }}
            w="260px"
            px="md"
            py="lg"
            borderRightWidth="1px"
            borderRightColor="border.hairline"
        >
            <Flex direction="column" gap="xs">
                {NAV.map((item) => {
                    const active = props.pathname === item.href || props.pathname.startsWith(`${item.href}/`);
                    return (
                        <ChakraLink
                            key={item.href}
                            as={NextLink}
                            href={item.href}
                            display="flex"
                            alignItems="center"
                            gap="sm"
                            px="sm"
                            py="xs"
                            borderRadius="md"
                            color={active ? 'brand.fg' : 'fg'}
                        >
                            <Text fontSize="sm" fontWeight="600" letterSpacing="-0.125px">
                                {item.label}
                            </Text>
                        </ChakraLink>
                    );
                })}
            </Flex>
        </Box>
    );
}
```

- [ ] **Step 5: Delete/relocate old route file**

After creating the new `(dashboard)` page at `src/app/(dashboard)/dashboard/page.tsx`, remove the old `src/app/dashboard/page.tsx` so there is only one canonical `/dashboard`.

- [ ] **Step 6: Run typecheck + quick render sanity**

Run:

```bash
bun nx run shipshout-client-dashboard:test --silent
```

If no tests exist, run:

```bash
bun nx run shipshout-client-dashboard:build
```

- [ ] **Step 7: Commit**

```bash
git add apps/shipshout-client-dashboard/src/app/(dashboard)/** apps/shipshout-client-dashboard/src/components/dashboard/**
git commit -m "feat(dashboard): add authenticated dashboard shell + routes"
```

## Task 2: Implement Home + Settings pages

**Files:**
- Create: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/page.tsx`
- Create: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `getSessionAction()` in server components for the account card

- [ ] **Step 1: Create Home page**

Use the existing card from `src/app/dashboard/page.tsx` (welcome header + account card). Ensure it uses `bg.canvas` header band and a constrained `Stack` max width.

- [ ] **Step 2: Create Settings page**

Move the account card portion from Home into Settings; Settings content should not depend on repositories state.

- [ ] **Step 3: Run Jest/TypeScript**

Run:

```bash
bun nx run shipshout-client-dashboard:test
```

- [ ] **Step 4: Commit**

```bash
git add apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/page.tsx apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/settings/page.tsx
git commit -m "feat(dashboard): ship Home and Settings pages"
```

## Task 3: Add Shoutouts + Team stub pages

**Files:**
- Create: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/shoutouts/page.tsx`
- Create: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/team/page.tsx`

**Interfaces:**
- Consumes: `(dashboard)` layout session guard

- [ ] **Step 1: Create each stub page**

Each page should render:
- A small eyebrow label (e.g. “Dashboard”)
- A `heading-2` title with the section name
- One `feature-card` containing “Coming soon”.

Use Chakra primitives already in Home/Settings for consistent styling.

- [ ] **Step 2: Commit**

```bash
git add apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/shoutouts/page.tsx apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/team/page.tsx
git commit -m "feat(dashboard): add Shoutouts and Team stubs"
```

## Task 4: Add repositories API helper + server actions via `ApiClient`

**Files:**
- Create: `apps/shipshout-client-dashboard/src/lib/repositories/api.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/repositories/actions.ts`

**Interfaces:**
- Exports:
  - `buildCookieHeader(cookieList: Array<{ name: string; value: string }>): string`
  - `createRepositoriesApiClient(cookieHeader: string): ApiClient`
  - `disconnectGithubAction(): Promise<{ ok: true } | { ok: false; error: string }>`
  - `linkRepositoriesAction(repositories: number[]): Promise<{ ok: true } | { ok: false; error: string }>`
  - `unlinkRepositoryAction(id: number): Promise<{ ok: true } | { ok: false; error: string }>`

- [ ] **Step 1: Implement cookie-forwarding helper**

```ts
// apps/shipshout-client-dashboard/src/lib/repositories/api.ts
import { cookies } from 'next/headers';
import { ApiClient } from '@shipshout/api-client';

export function buildCookieHeader(cookieList: Array<{ name: string; value: string }>): string {
    return cookieList.map((c) => `${c.name}=${c.value}`).join('; ');
}

export function createRepositoriesApiClient(baseUrl: string, cookieHeader: string) {
    return new ApiClient({
        baseUrl,
        headers: {
            Cookie: cookieHeader,
        },
        responseStyle: 'fields',
        throwOnError: false,
    });
}

export async function getRepositoriesApiClient() {
    const baseUrl = process.env.SHIPSHOUT_API_URL;
    if (!baseUrl) throw new Error('SHIPSHOUT_API_URL is not set');

    const cookieStore = await cookies();
    const cookieHeader = buildCookieHeader(cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })));
    return createRepositoriesApiClient(baseUrl.replace(/\/$/, ''), cookieHeader);
}
```

- [ ] **Step 2: Implement server actions for mutations**

```ts
// apps/shipshout-client-dashboard/src/lib/repositories/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { getRepositoriesApiClient } from './api';

function errorToMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return 'Request failed';
}

export async function disconnectGithubAction(): Promise<{ ok: true } | { ok: false; error: string }> {
    const api = await getRepositoriesApiClient();
    const result = await api.disconnectGithub({ responseStyle: 'fields', throwOnError: false });
    if ('error' in result && result.error) return { ok: false, error: errorToMessage(result.error) };
    redirect('/dashboard/repositories');
}

export async function linkRepositoriesAction(
    repositories: number[],
): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!Array.isArray(repositories) || repositories.length === 0) return { ok: false, error: 'Select at least one repository' };

    const api = await getRepositoriesApiClient();
    const result = await api.linkRepositories({
        body: { repositories },
        responseStyle: 'fields',
        throwOnError: false,
    });
    if ('error' in result && result.error) return { ok: false, error: errorToMessage(result.error) };
    redirect('/dashboard/repositories');
}

export async function unlinkRepositoryAction(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!Number.isFinite(id)) return { ok: false, error: 'Invalid repository id' };

    const api = await getRepositoriesApiClient();
    const result = await api.unlinkRepository({
        path: { id },
        responseStyle: 'fields',
        throwOnError: false,
    });
    if ('error' in result && result.error) return { ok: false, error: errorToMessage(result.error) };
    redirect('/dashboard/repositories');
}
```

- [ ] **Step 3: Add unit tests for cookie header helper**

Create:

```ts
// apps/shipshout-client-dashboard/specs/repositories/api.spec.ts
import { buildCookieHeader } from '../src/lib/repositories/api';

describe('buildCookieHeader', () => {
    it('serializes cookies in "name=value; name2=value2" form', () => {
        expect(buildCookieHeader([{ name: 'a', value: '1' }, { name: 'b', value: '2' }])).toBe('a=1; b=2');
    });
});
```

- [ ] **Step 4: Run tests**

```bash
bun nx run shipshout-client-dashboard:test
```

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-client-dashboard/src/lib/repositories/**
git add apps/shipshout-client-dashboard/specs/repositories/**
git commit -m "feat(dashboard): add repositories ApiClient helper + server actions"
```

## Task 5: Implement `/dashboard/repositories` UI wired to the SDK + server actions

**Files:**
- Create: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/repositories/page.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/repositories/repositories-client.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/repositories/query-banner.tsx`

**Interfaces:**
- `RepositoriesPage({ searchParams })` (server component)
- `RepositoriesClient(props: { connection: GithubConnectionResponseDto; available: GithubRepoDto[]; linked: LinkedRepositoryResponseDto[]; githubQuery?: string })`
- Server actions used:
  - `disconnectGithubAction()`
  - `linkRepositoriesAction(repositories: number[])`
  - `unlinkRepositoryAction(id: number)`

- [ ] **Step 1: Implement server component that loads initial data via `ApiClient`**

Load:
- `github=connected|error` query for banner
- `getGithubConnection`
- `listAvailableRepos` and `listLinkedRepos`

Use `try/catch` so failures render an error banner rather than crashing.

Include actual code:

```tsx
// apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/repositories/page.tsx
import { Box, Stack, Text } from '@chakra-ui/react';
import type { SearchParams } from 'next/dist/server/request/search-params';
import { getRepositoriesApiClient } from '../../../lib/repositories/api';
import { RepositoriesClient } from '../../../components/repositories/repositories-client';

export default async function RepositoriesPage({ searchParams }: { searchParams: SearchParams }) {
    const api = await getRepositoriesApiClient();
    const github = typeof searchParams.github === 'string' ? searchParams.github : undefined;
    const reason = typeof searchParams.reason === 'string' ? searchParams.reason : undefined;

    const [connectionRes, availableRes, linkedRes] = await Promise.all([
        api.getGithubConnection({ responseStyle: 'fields', throwOnError: false }),
        api.listAvailableRepos({ responseStyle: 'fields', throwOnError: false }),
        api.listLinkedRepos({ responseStyle: 'fields', throwOnError: false }),
    ]);

    // Normalize to DTOs (SDK may return {data} or {error})
    const connection = 'data' in connectionRes && connectionRes.data ? connectionRes.data : { connected: false };
    const available = 'data' in availableRes && availableRes.data ? availableRes.data.repositories : [];
    const linked = 'data' in linkedRes && linkedRes.data ? linkedRes.data.repositories : [];

    return (
        <Box bg="bg.soft">
            <Stack maxW="1080px" mx="auto" px={{ base: 'md', md: 'xl' }} py="xxl" gap="lg">
                <Text fontSize="xs" fontWeight="600" color="brand.fg" letterSpacing="0.125px" textTransform="uppercase">
                    Repositories
                </Text>
                <RepositoriesClient connection={connection} available={available} linked={linked} githubQuery={github} githubReason={reason} />
            </Stack>
        </Box>
    );
}
```

> Note: if the SDK response shape differs, adjust the `availableRes.data.repositories` / `linkedRes.data.repositories` property names by inspecting types generated in `libs/api-client`.

- [ ] **Step 2: Implement client component for selection + mutations**

```tsx
// apps/shipshout-client-dashboard/src/components/repositories/repositories-client.tsx
'use client';

import { Alert, Box, Button, Checkbox, Divider, Stack, Text } from '@chakra-ui/react';
import { useMemo, useState, useTransition } from 'react';
import type { GithubConnectionResponseDto, GithubRepoDto, LinkedRepositoryResponseDto } from '@shipshout/api-client';
import { QueryBanner } from './query-banner';
import { disconnectGithubAction, linkRepositoriesAction, unlinkRepositoryAction } from '../../lib/repositories/actions';

export function RepositoriesClient(props: {
    connection: GithubConnectionResponseDto;
    available: (GithubRepoDto & { linked?: boolean })[];
    linked: LinkedRepositoryResponseDto[];
    githubQuery?: string;
    githubReason?: string;
}) {
    const [selected, setSelected] = useState<number[]>([]);
    const [pending, startTransition] = useTransition();
    const connected = Boolean(props.connection.connected);

    const linkedIds = useMemo(() => new Set(props.linked.map((r) => r.githubRepoId)), [props.linked]);

    const toggle = (id: number, checked: boolean) => {
        setSelected((prev) => {
            if (checked) return prev.includes(id) ? prev : [...prev, id];
            return prev.filter((x) => x !== id);
        });
    };

    if (!connected) {
        return (
            <Stack gap="lg">
                <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />
                <Box borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg" bg="bg.surface">
                    <Stack gap="md">
                        <Text fontSize="sm" fontWeight="600">
                            Connect GitHub to link repositories
                        </Text>
                        <Button
                            as="a"
                            href={`${process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? ''}/repositories/github/connect`}
                            variant="solid"
                            colorScheme="blue"
                            borderRadius="full"
                        >
                            Connect GitHub
                        </Button>
                    </Stack>
                </Box>
            </Stack>
        );
    }

    const filteredAvailable = props.available.filter((r) => !linkedIds.has(r.githubId));

    return (
        <Stack gap="lg">
            <QueryBanner githubQuery={props.githubQuery} githubReason={props.githubReason} />

            <Box borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg" bg="bg.surface">
                <Stack gap="sm">
                    <Text fontSize="sm" fontWeight="600">
                        Connected as {props.connection.githubUsername ?? 'GitHub'}
                    </Text>
                    <Button
                        variant="outline"
                        borderColor="border.hairline"
                        borderRadius="full"
                        onClick={() => startTransition(() => disconnectGithubAction())}
                        isLoading={pending}
                        alignSelf="flex-start"
                    >
                        Disconnect
                    </Button>
                </Stack>
            </Box>

            {props.linked.length === 0 ? (
                <Box borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg" bg="bg.surface">
                    <Text color="fg.muted" fontSize="sm">
                        No repositories linked yet.
                    </Text>
                </Box>
            ) : (
                <Box borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg" bg="bg.surface">
                    <Stack gap="xs">
                        {props.linked.map((repo) => (
                            <Box key={repo.id} display="flex" justifyContent="space-between" alignItems="center">
                                <Text fontSize="sm" fontWeight="600">
                                    {repo.fullName}
                                </Text>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    borderColor="border.hairline"
                                    borderRadius="full"
                                    onClick={() => startTransition(() => unlinkRepositoryAction(repo.id))}
                                    isLoading={pending}
                                >
                                    Unlink
                                </Button>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

            <Divider />

            <Box borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg" bg="bg.surface">
                <Stack gap="md">
                    <Text fontSize="sm" fontWeight="600">
                        Add repositories
                    </Text>
                    <Stack maxH="320px" overflow="auto" gap="xs">
                        {filteredAvailable.map((repo) => (
                            <Checkbox
                                key={repo.githubId}
                                isDisabled={repo.linked === true}
                                isChecked={selected.includes(repo.githubId)}
                                onChange={(e) => toggle(repo.githubId, e.target.checked)}
                            >
                                <Text fontSize="sm">{repo.fullName}</Text>
                            </Checkbox>
                        ))}
                    </Stack>
                    <Button
                        variant="solid"
                        colorScheme="blue"
                        borderRadius="full"
                        onClick={() => startTransition(() => linkRepositoriesAction(selected))}
                        isLoading={pending}
                        isDisabled={selected.length === 0}
                        alignSelf="flex-start"
                    >
                        Link selected
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
}
```

- [ ] **Step 3: Implement query banner client component**

```tsx
// apps/shipshout-client-dashboard/src/components/repositories/query-banner.tsx
'use client';

import { Alert, AlertDescription, AlertIcon } from '@chakra-ui/react';

export function QueryBanner(props: { githubQuery?: string; githubReason?: string }) {
    if (!props.githubQuery) return null;

    if (props.githubQuery === 'connected') {
        return (
            <Alert status="success" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>GitHub connected successfully.</AlertDescription>
            </Alert>
        );
    }

    if (props.githubQuery === 'error') {
        return (
            <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>GitHub connection failed.</AlertDescription>
            </Alert>
        );
    }

    return null;
}
```

- [ ] **Step 4: Fix any DTO property naming mismatches**

After implementing, compile and fix property names to match generated DTO types in:
- `libs/api-client/src/lib/client/types.gen.ts` (and `sdk.gen.ts` signatures)

Replace incorrect uses like `repo.fullName`, `repo.id`, `repo.githubId`, `repo.githubRepoId` accordingly.

- [ ] **Step 5: Manual smoke**

Run:
- `bun nx run shipshout-client-dashboard:serve`

Then:
1. Login
2. Go to `/dashboard/repositories`
3. Click Connect GitHub (OAuth)
4. After redirect, confirm connected banner + repos UI renders
5. Link a repo, unlink it, then disconnect

- [ ] **Step 6: Commit**

```bash
git add apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/repositories/**
git add apps/shipshout-client-dashboard/src/components/repositories/**
git commit -m "feat(dashboard): implement repositories page with ApiClient SDK"
```

## Task 6: Final verification (tests + lint) + polish

**Files:**
- Modify: any files changed during verification

- [ ] **Step 1: Run unit tests**

```bash
bun nx run shipshout-client-dashboard:test
```

- [ ] **Step 2: Run build**

```bash
bun nx run shipshout-client-dashboard:build
```

- [ ] **Step 3: Commit polish (if any)**

```bash
git commit -m "chore(dashboard): polish and verify repositories layout"
```

## Self-Review
1. Spec coverage:
   - Shell + routes + visual mapping: Tasks 1-3
   - Repositories page flow: Task 5
   - ApiClient required for repos API calls: Tasks 4-5
2. Placeholder scan:
   - No “TBD” placeholders included in plan tasks
3. Type consistency:
   - Task 5 includes a required DTO property naming mismatch fix step

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-08-11-client-dashboard-layout-impl.md`. Two execution options:
1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans

Which approach?

