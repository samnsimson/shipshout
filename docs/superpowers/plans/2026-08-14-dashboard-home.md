# Dashboard Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill `/dashboard` with an onboarding checklist (until setup is complete) or stat tiles, action items, and recent shoutouts (when ready).

**Architecture:** Server-composed Next.js page fetches existing APIs, derives state in `DashboardHomeUtils`, passes props to presentational client components. No new backend endpoint. `ShoutoutsTable` extracted for reuse between home and shoutouts list.

**Tech Stack:** Next.js 16, React, Chakra UI v3, `@shipshout/api-client`, bun, Jest

**Spec:** [`docs/superpowers/specs/2026-08-14-dashboard-home-design.md`](../specs/2026-08-14-dashboard-home-design.md)

## Global Constraints

- Server-composed page using existing APIs only — no new backend endpoint in v1.
- Setup complete requires all four gates: GitHub connected, ≥1 linked repo, ≥1 active trigger, ≥1 enabled generatable publish channel.
- Generatable channel: `enabled === true AND channelKey ∈ subscription.limits.channels AND channelKey !== 'email_alert'`.
- When setup complete: hide checklist entirely; show stats + action items + recent shoutouts.
- No polling on home page.
- Shoutout stat: total count (no date filter).
- Channels stat: raw count of enabled generatable channels across repos (not deduped by key).
- Webhook action items: only `webhook.status === 'error'` (not `manual_required`).
- Static helpers on utility classes (`DashboardHomeUtils`, `ChannelUtils`); React components stay as functions.
- Prettier: 4-space, single quotes, printWidth 160; single-statement `if` without braces.
- Follow [`DESIGN.md`](../../../DESIGN.md) for UI tokens (card shells, brand blue CTAs, quiet chrome).

## File map

| File | Responsibility |
| --- | --- |
| `apps/shipshout-client-dashboard/src/lib/channels/channels.utils.ts` | Add `filterGeneratable` |
| `apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts` | Setup, stats, action items, recent shoutouts derivation |
| `apps/shipshout-client-dashboard/src/lib/dashboard/__tests__/dashboard-home.utils.spec.ts` | Unit tests for utils |
| `apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-table.tsx` | Shared shoutouts table markup |
| `apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-client.tsx` | Polling wrapper delegating to `ShoutoutsTable` |
| `apps/shipshout-client-dashboard/src/components/dashboard/setup-checklist.tsx` | Onboarding card |
| `apps/shipshout-client-dashboard/src/components/dashboard/dashboard-stat-tiles.tsx` | Four stat tiles |
| `apps/shipshout-client-dashboard/src/components/dashboard/dashboard-action-items.tsx` | Needs-attention list |
| `apps/shipshout-client-dashboard/src/components/dashboard/dashboard-home-client.tsx` | Mode switch + layout |
| `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/page.tsx` | Server fetch + `PageHeader` |

---

### Task 1: `ChannelUtils.filterGeneratable`

**Files:**

- Modify: `apps/shipshout-client-dashboard/src/lib/channels/channels.utils.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/channels/__tests__/channels.utils.spec.ts`

**Interfaces:**

- Produces: `ChannelUtils.filterGeneratable<T extends { channelKey: string; enabled: boolean }>(rows: T[], planChannels: string[]): T[]`

- [ ] **Step 1: Write failing test**

```typescript
import { ChannelUtils } from '../channels.utils';

describe('ChannelUtils.filterGeneratable', () => {
    const rows = [
        { channelKey: 'email_alert', enabled: true },
        { channelKey: 'x', enabled: true },
        { channelKey: 'linkedin', enabled: false },
        { channelKey: 'linkedin', enabled: true },
    ];

    it('returns enabled plan channels excluding email_alert', () => {
        const result = ChannelUtils.filterGeneratable(rows, ['email_alert', 'x', 'linkedin']);
        expect(result).toEqual([
            { channelKey: 'x', enabled: true },
            { channelKey: 'linkedin', enabled: true },
        ]);
    });

    it('excludes channels not on plan even when enabled', () => {
        const result = ChannelUtils.filterGeneratable(rows, ['email_alert', 'x']);
        expect(result).toEqual([{ channelKey: 'x', enabled: true }]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun nx run shipshout-client-dashboard:test --testPathPattern=channels.utils.spec`
Expected: FAIL — `filterGeneratable` is not a function

- [ ] **Step 3: Implement `filterGeneratable`**

Add to `ChannelUtils`:

```typescript
static filterGeneratable<T extends { channelKey: string; enabled: boolean }>(rows: T[], planChannels: string[]): T[] {
    return rows.filter((row) => row.enabled && planChannels.includes(row.channelKey) && row.channelKey !== 'email_alert');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun nx run shipshout-client-dashboard:test --testPathPattern=channels.utils.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-client-dashboard/src/lib/channels/channels.utils.ts apps/shipshout-client-dashboard/src/lib/channels/__tests__/channels.utils.spec.ts
git commit -m "feat(dashboard): add ChannelUtils.filterGeneratable for home setup checks."
```

---

### Task 2: `DashboardHomeUtils`

**Files:**

- Create: `apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/dashboard/__tests__/dashboard-home.utils.spec.ts`

**Interfaces:**

- Consumes: `ChannelUtils.filterGeneratable`
- Produces (all static on `DashboardHomeUtils`):

```typescript
export type SetupStep = 'github' | 'repo' | 'trigger' | 'channel';

export type SetupStepState = { done: boolean; href: string; cta: string };

export type SetupState = {
    complete: boolean;
    steps: Record<SetupStep, SetupStepState>;
};

export type DashboardStats = {
    linkedRepos: number;
    activeTriggers: number;
    channelsOn: number;
    shoutouts: number;
};

export type ActionItem = {
    message: string;
    href: string;
    tone?: 'default' | 'danger';
};

export type RepoHomeContext = {
    id: string;
    fullName: string;
    activeTriggerCount: number;
    webhookStatus: 'pending' | 'active' | 'manual_required' | 'error' | 'not_configured';
    channels: { channelKey: string; enabled: boolean }[];
};

export type ShoutoutHomeRow = {
    id: string;
    title: string;
    status: string;
    createdAt: string;
};

// Methods:
static buildSetupState(input: {
    connected: boolean;
    linkedRepos: { id: string }[];
    repoContexts: RepoHomeContext[];
    connectUrl: string;
}): SetupState;

static buildStats(linkedRepos: number, repoContexts: RepoHomeContext[], shoutoutCount: number): DashboardStats;

static buildActionItems(repoContexts: RepoHomeContext[], shoutouts: ShoutoutHomeRow[]): ActionItem[];

static buildRecentShoutouts<T extends ShoutoutHomeRow>(shoutouts: T[]): T[];
```

- [ ] **Step 1: Write failing tests**

```typescript
import { DashboardHomeUtils } from '../dashboard-home.utils';

const connectUrl = 'https://api.example.com/repositories/github/connect';

describe('DashboardHomeUtils.buildSetupState', () => {
    it('marks complete when all four gates pass', () => {
        const setup = DashboardHomeUtils.buildSetupState({
            connected: true,
            linkedRepos: [{ id: 'repo-1' }],
            repoContexts: [
                {
                    id: 'repo-1',
                    fullName: 'acme/app',
                    activeTriggerCount: 1,
                    webhookStatus: 'active',
                    channels: [{ channelKey: 'x', enabled: true }],
                },
            ],
            connectUrl,
            planChannels: ['x'],
        });
        expect(setup.complete).toBe(true);
        expect(setup.steps.github.done).toBe(true);
        expect(setup.steps.repo.done).toBe(true);
        expect(setup.steps.trigger.done).toBe(true);
        expect(setup.steps.channel.done).toBe(true);
    });

    it('stays incomplete when generatable channel missing', () => {
        const setup = DashboardHomeUtils.buildSetupState({
            connected: true,
            linkedRepos: [{ id: 'repo-1' }],
            repoContexts: [
                {
                    id: 'repo-1',
                    fullName: 'acme/app',
                    activeTriggerCount: 1,
                    webhookStatus: 'active',
                    channels: [{ channelKey: 'email_alert', enabled: true }],
                },
            ],
            connectUrl,
            planChannels: ['email_alert', 'x'],
        });
        expect(setup.complete).toBe(false);
        expect(setup.steps.channel.done).toBe(false);
        expect(setup.steps.channel.href).toBe('/dashboard/channels?repo=repo-1');
    });

    it('uses connectUrl for github step when not connected', () => {
        const setup = DashboardHomeUtils.buildSetupState({
            connected: false,
            linkedRepos: [],
            repoContexts: [],
            connectUrl,
            planChannels: ['x'],
        });
        expect(setup.steps.github.href).toBe(connectUrl);
        expect(setup.steps.github.cta).toBe('Connect GitHub');
    });
});

describe('DashboardHomeUtils.buildActionItems', () => {
    it('prioritizes webhook errors over drafts and caps at five', () => {
        const items = DashboardHomeUtils.buildActionItems(
            [
                { id: 'r1', fullName: 'a/b', activeTriggerCount: 1, webhookStatus: 'error', channels: [] },
                { id: 'r2', fullName: 'c/d', activeTriggerCount: 1, webhookStatus: 'active', channels: [] },
            ],
            [
                { id: 's1', title: 'Draft', status: 'ready_for_review', createdAt: '2026-08-14T10:00:00.000Z' },
                { id: 's2', title: 'Fail', status: 'generation_failed', createdAt: '2026-08-14T09:00:00.000Z' },
                { id: 's3', title: 'Old', status: 'ready_for_review', createdAt: '2026-08-13T09:00:00.000Z' },
                { id: 's4', title: 'Old2', status: 'ready_for_review', createdAt: '2026-08-12T09:00:00.000Z' },
                { id: 's5', title: 'Old3', status: 'ready_for_review', createdAt: '2026-08-11T09:00:00.000Z' },
                { id: 's6', title: 'Old4', status: 'ready_for_review', createdAt: '2026-08-10T09:00:00.000Z' },
            ],
        );
        expect(items).toHaveLength(5);
        expect(items[0].tone).toBe('danger');
        expect(items[0].message).toContain('Webhook error');
        expect(items[1].message).toContain('Generation failed');
    });
});

describe('DashboardHomeUtils.buildRecentShoutouts', () => {
    it('sorts by createdAt desc and slices to five', () => {
        const rows = [
            { id: 'a', title: 'A', status: 'published', createdAt: '2026-08-10T00:00:00.000Z' },
            { id: 'b', title: 'B', status: 'published', createdAt: '2026-08-14T00:00:00.000Z' },
            { id: 'c', title: 'C', status: 'published', createdAt: '2026-08-12T00:00:00.000Z' },
            { id: 'd', title: 'D', status: 'published', createdAt: '2026-08-11T00:00:00.000Z' },
            { id: 'e', title: 'E', status: 'published', createdAt: '2026-08-13T00:00:00.000Z' },
            { id: 'f', title: 'F', status: 'published', createdAt: '2026-08-09T00:00:00.000Z' },
        ];
        const recent = DashboardHomeUtils.buildRecentShoutouts(rows);
        expect(recent.map((row) => row.id)).toEqual(['b', 'e', 'c', 'd', 'a']);
    });
});
```

Note: `buildSetupState` accepts `planChannels: string[]` as shown above (pass `subscription.limits.channels` from the page).

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun nx run shipshout-client-dashboard:test --testPathPattern=dashboard-home.utils.spec`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `DashboardHomeUtils`**

Key logic:

```typescript
import { ChannelUtils } from '@/lib/channels/channels.utils';

export class DashboardHomeUtils {
    static buildSetupState(input: {
        connected: boolean;
        linkedRepos: { id: string }[];
        repoContexts: RepoHomeContext[];
        connectUrl: string;
        planChannels: string[];
    }): SetupState {
        const firstLinkedId = input.linkedRepos[0]?.id;
        const hasTrigger = input.repoContexts.some((repo) => repo.activeTriggerCount >= 1);
        const hasGeneratableChannel = input.repoContexts.some(
            (repo) => ChannelUtils.filterGeneratable(repo.channels, input.planChannels).length >= 1,
        );

        const githubDone = input.connected;
        const repoDone = input.linkedRepos.length >= 1;
        const triggerDone = hasTrigger;
        const channelDone = hasGeneratableChannel;

        const repoDetailHref = firstLinkedId ? `/dashboard/repositories/${firstLinkedId}` : '/dashboard/repositories';
        const channelHref = firstLinkedId ? `/dashboard/channels?repo=${firstLinkedId}` : '/dashboard/channels';

        const steps: SetupState['steps'] = {
            github: {
                done: githubDone,
                href: githubDone ? '/dashboard/repositories' : input.connectUrl,
                cta: githubDone ? 'View repos' : 'Connect GitHub',
            },
            repo: { done: repoDone, href: '/dashboard/repositories', cta: 'Link a repo' },
            trigger: { done: triggerDone, href: repoDetailHref, cta: 'Configure triggers' },
            channel: { done: channelDone, href: channelHref, cta: 'Enable a channel' },
        };

        return { complete: githubDone && repoDone && triggerDone && channelDone, steps };
    }

    static buildStats(linkedRepos: number, repoContexts: RepoHomeContext[], shoutoutCount: number, planChannels: string[]): DashboardStats {
        return {
            linkedRepos,
            activeTriggers: repoContexts.reduce((sum, repo) => sum + repo.activeTriggerCount, 0),
            channelsOn: repoContexts.reduce(
                (sum, repo) => sum + ChannelUtils.filterGeneratable(repo.channels, planChannels).length,
                0,
            ),
            shoutouts: shoutoutCount,
        };
    }

    static buildActionItems(repoContexts: RepoHomeContext[], shoutouts: ShoutoutHomeRow[]): ActionItem[] {
        const items: ActionItem[] = [];

        for (const repo of repoContexts) {
            if (repo.webhookStatus !== 'error') continue;
            items.push({
                message: `Webhook error on ${repo.fullName}`,
                href: `/dashboard/repositories/${repo.id}`,
                tone: 'danger',
            });
        }

        for (const shoutout of shoutouts) {
            if (shoutout.status === 'generation_failed')
                items.push({ message: `Generation failed: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
        }

        for (const shoutout of shoutouts) {
            if (shoutout.status === 'failed' || shoutout.status === 'partially_published')
                items.push({ message: `Dispatch issue: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
        }

        for (const shoutout of shoutouts) {
            if (shoutout.status === 'ready_for_review')
                items.push({ message: `Draft ready to publish: ${shoutout.title}`, href: `/dashboard/shoutouts/${shoutout.id}` });
        }

        return items.slice(0, 5);
    }

    static buildRecentShoutouts<T extends ShoutoutHomeRow>(shoutouts: T[]): T[] {
        return [...shoutouts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
    }
}
```

Export all types from the same file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun nx run shipshout-client-dashboard:test --testPathPattern=dashboard-home.utils.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/shipshout-client-dashboard/src/lib/dashboard/dashboard-home.utils.ts apps/shipshout-client-dashboard/src/lib/dashboard/__tests__/dashboard-home.utils.spec.ts
git commit -m "feat(dashboard): add DashboardHomeUtils for home page state."
```

---

### Task 3: Extract `ShoutoutsTable`

**Files:**

- Create: `apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-table.tsx`
- Modify: `apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-client.tsx`

**Interfaces:**

- Produces: `ShoutoutsTable(props: { shoutouts: ShoutoutDto[]; emptyMessage?: string })`

- [ ] **Step 1: Create `ShoutoutsTable`**

Move table markup and `triggerTypeLabel` from `shoutouts-client.tsx` into:

```typescript
'use client';

import { Badge, Box, For, Link as ChakraLink, Table, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { ShoutoutDto } from '@/lib/shoutouts/shoutouts.api';
import { ShoutoutsUtils } from '@/lib/shoutouts/shoutouts.utils';

function triggerTypeLabel(type: string) { /* unchanged */ }

export function ShoutoutsTable(props: { shoutouts: ShoutoutDto[]; emptyMessage?: string }) {
    const emptyMessage = props.emptyMessage ?? 'Shoutouts appear here when a trigger fires on a linked repo.';

    if (props.shoutouts.length === 0) {
        return (
            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" p="lg">
                <Text color="fg.muted" fontSize="sm">{emptyMessage}</Text>
            </Box>
        );
    }

    return (/* existing Table.Root markup */);
}
```

- [ ] **Step 2: Refactor `ShoutoutsClient` to delegate**

```typescript
export function ShoutoutsClient(props: { shoutouts: ShoutoutDto[] }) {
    const router = useRouter();
    const hasInFlight = props.shoutouts.some((shoutout) => ShoutoutsUtils.isInFlight(shoutout.status));

    useEffect(() => {
        if (!hasInFlight) return;
        const intervalId = window.setInterval(() => router.refresh(), 3000);
        return () => window.clearInterval(intervalId);
    }, [hasInFlight, router]);

    return <ShoutoutsTable shoutouts={props.shoutouts} />;
}
```

- [ ] **Step 3: Run existing tests + lint**

Run: `bun nx run shipshout-client-dashboard:test --silent`
Run: `bun nx run shipshout-client-dashboard:lint --silent`
Expected: PASS (no behavior change on shoutouts page)

- [ ] **Step 4: Commit**

```bash
git add apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-table.tsx apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-client.tsx
git commit -m "refactor(dashboard): extract ShoutoutsTable for reuse on home page."
```

---

### Task 4: Dashboard home UI components

**Files:**

- Create: `apps/shipshout-client-dashboard/src/components/dashboard/setup-checklist.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/dashboard/dashboard-stat-tiles.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/dashboard/dashboard-action-items.tsx`
- Create: `apps/shipshout-client-dashboard/src/components/dashboard/dashboard-home-client.tsx`

**Interfaces:**

- Consumes: `SetupState`, `DashboardStats`, `ActionItem`, `ShoutoutDto` from utils/api types
- Produces: `DashboardHomeClient(props: { setup: SetupState; stats?: DashboardStats; actionItems?: ActionItem[]; recentShoutouts?: ShoutoutDto[] })`

- [ ] **Step 1: Implement `SetupChecklist`**

Props: `{ setup: SetupState }`. Render card with eyebrow **Get started**, progress `{n} of 4 complete`, four rows in order `github`, `repo`, `trigger`, `channel`.

Copy constants:

```typescript
const STEP_COPY: Record<SetupStep, { title: string; helper: string }> = {
    github: { title: 'Connect GitHub', helper: 'Authorize Shipshout to read your repositories.' },
    repo: { title: 'Link a repository', helper: 'Choose which repos should trigger shoutouts.' },
    trigger: { title: 'Enable a trigger', helper: 'Turn on release, tag, or branch push events.' },
    channel: { title: 'Enable a publish channel', helper: 'Configure where shoutouts go when you publish.' },
};
```

Done rows: `CheckCircle2` green icon, muted title, no button. Pending rows: `Button` with `borderRadius="full"`, `size="sm"`, `colorPalette="blue"`. GitHub external link when `href` starts with `http`.

- [ ] **Step 2: Implement `DashboardStatTiles`**

Props: `{ stats: DashboardStats }`. `SimpleGrid columns={{ base: 2, lg: 4 }} gap="md"`. Tiles:

| Label | Field |
| --- | --- |
| Linked repos | `stats.linkedRepos` |
| Active triggers | `stats.activeTriggers` |
| Channels on | `stats.channelsOn` |
| Shoutouts | `stats.shoutouts` |

- [ ] **Step 3: Implement `DashboardActionItems`**

Props: `{ items: ActionItem[] }`. Card eyebrow **Needs attention**. Each row: message (`color={item.tone === 'danger' ? 'red.fg' : undefined}`) + `ChakraLink` "View →".

- [ ] **Step 4: Implement `DashboardHomeClient`**

```typescript
'use client';

export function DashboardHomeClient(props: {
    setup: SetupState;
    stats?: DashboardStats;
    actionItems?: ActionItem[];
    recentShoutouts?: ShoutoutDto[];
}) {
    if (!props.setup.complete) return <SetupChecklist setup={props.setup} />;

    return (
        <Stack gap="lg">
            <DashboardStatTiles stats={props.stats!} />
            <Show when={(props.actionItems?.length ?? 0) > 0}>
                <DashboardActionItems items={props.actionItems!} />
            </Show>
            <Box bg="bg.surface" borderWidth="1px" borderColor="border.hairline" borderRadius="lg" overflow="hidden">
                <Flex justify="space-between" align="center" px="lg" py="md" borderBottomWidth="1px" borderColor="border.hairline">
                    <Text fontSize="sm" fontWeight="600">Recent shoutouts</Text>
                    <ChakraLink asChild color="brand.fg" fontSize="sm">
                        <Link href="/dashboard/shoutouts">View all →</Link>
                    </ChakraLink>
                </Flex>
                <ShoutoutsTable
                    shoutouts={props.recentShoutouts ?? []}
                    emptyMessage="Shoutouts will appear here once a trigger fires."
                />
            </Box>
        </Stack>
    );
}
```

Adjust `ShoutoutsTable` empty state wrapper when nested inside home card (home card provides outer border — pass a prop `embedded?: boolean` to skip duplicate outer `Box` on empty/table, or split inner table only). Simplest approach: add `variant="embedded"` to `ShoutoutsTable` that renders table without outer card shell; home wraps header + embedded table.

- [ ] **Step 5: Lint**

Run: `bun nx run shipshout-client-dashboard:lint --silent`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/shipshout-client-dashboard/src/components/dashboard/setup-checklist.tsx apps/shipshout-client-dashboard/src/components/dashboard/dashboard-stat-tiles.tsx apps/shipshout-client-dashboard/src/components/dashboard/dashboard-action-items.tsx apps/shipshout-client-dashboard/src/components/dashboard/dashboard-home-client.tsx apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-table.tsx
git commit -m "feat(dashboard): add home page client components."
```

---

### Task 5: Wire server page

**Files:**

- Modify: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**

- Consumes: all APIs + `DashboardHomeUtils` methods from Tasks 1–2
- Produces: rendered home page with dynamic `PageHeader` description

- [ ] **Step 1: Implement data loading in `page.tsx`**

```typescript
import { Stack } from '@chakra-ui/react';
import { Home } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardHomeClient } from '@/components/dashboard/dashboard-home-client';
import { BillingApi } from '@/lib/billing/billing.api';
import { ChannelsApi } from '@/lib/channels/channels.api';
import { DashboardHomeUtils, type RepoHomeContext } from '@/lib/dashboard/dashboard-home.utils';
import { RepositoriesApi } from '@/lib/repositories/repositories.api';
import { ShoutoutsApi } from '@/lib/shoutouts/shoutouts.api';
import { TriggersApi } from '@/lib/triggers/triggers.api';
import { getSession } from '@/lib/auth/auth.actions';

export const metadata: Metadata = { title: 'Dashboard' };

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/$/, '');
}

async function loadRepoContexts(linkedRepos: { id: string; fullName: string }[]): Promise<RepoHomeContext[]> {
    if (linkedRepos.length === 0) return [];

    const results = await Promise.all(
        linkedRepos.map(async (repo) => {
            const [detailRes, channelsRes] = await Promise.all([
                TriggersApi.fetchRepositoryDetail(repo.id),
                ChannelsApi.fetchRepositoryChannels(repo.id),
            ]);

            if (!detailRes.data || !channelsRes.data) {
                return {
                    id: repo.id,
                    fullName: repo.fullName,
                    activeTriggerCount: 0,
                    webhookStatus: 'not_configured' as const,
                    channels: [],
                };
            }

            return {
                id: repo.id,
                fullName: repo.fullName,
                activeTriggerCount: detailRes.data.activeTriggerCount,
                webhookStatus: detailRes.data.webhook.status,
                channels: channelsRes.data.channels.map((channel) => ({
                    channelKey: channel.channelKey,
                    enabled: channel.enabled,
                })),
            };
        }),
    );

    return results;
}

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) return null;

    const publicApiBaseUrl = process.env.NEXT_PUBLIC_SHIPSHOUT_API_URL ?? process.env.SHIPSHOUT_API_URL;
    if (!publicApiBaseUrl) throw new Error('NEXT_PUBLIC_SHIPSHOUT_API_URL is not set');
    const connectUrl = `${normalizeBaseUrl(publicApiBaseUrl)}/repositories/github/connect`;

    const [connectionRes, linkedRes, subscriptionRes] = await Promise.all([
        RepositoriesApi.getGithubConnection(),
        RepositoriesApi.listLinkedRepos(),
        BillingApi.getMySubscription(),
    ]);

    const connection = connectionRes.data ?? { connected: false };
    const linkedRepos = linkedRes.data?.repositories ?? [];
    const planChannels = subscriptionRes.data?.limits.channels ?? [];

    const repoContexts = await loadRepoContexts(linkedRepos);

    const setup = DashboardHomeUtils.buildSetupState({
        connected: Boolean(connection.connected),
        linkedRepos,
        repoContexts,
        connectUrl,
        planChannels,
    });

    let stats;
    let actionItems;
    let recentShoutouts;

    if (setup.complete) {
        const shoutoutsRes = await ShoutoutsApi.fetchAll();
        const shoutouts = shoutoutsRes.data?.shoutouts ?? [];
        stats = DashboardHomeUtils.buildStats(linkedRepos.length, repoContexts, shoutouts.length, planChannels);
        actionItems = DashboardHomeUtils.buildActionItems(repoContexts, shoutouts);
        recentShoutouts = DashboardHomeUtils.buildRecentShoutouts(shoutouts);
    }

    const { user } = session;
    const handle = user.username ? `@${user.username}` : user.email;
    const description = setup.complete
        ? `You're signed in as ${handle}. Your repos are wired up and shouting.`
        : `You're signed in as ${handle}. Finish setup to start shouting.`;

    return (
        <Stack gap="lg">
            <PageHeader
                icon={Home}
                eyebrow="Dashboard"
                title={`Welcome back${user.name ? `, ${user.name.split(' ')[0]}` : ''}`}
                description={description}
            />
            <DashboardHomeClient setup={setup} stats={stats} actionItems={actionItems} recentShoutouts={recentShoutouts} />
        </Stack>
    );
}
```

- [ ] **Step 2: Build dashboard**

Run: `bun nx run shipshout-client-dashboard:build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): wire home page data fetching and layout modes."
```

---

### Task 6: Verification

**Files:** none (verification only)

- [ ] **Step 1: Run full dashboard test suite**

Run: `bun nx run shipshout-client-dashboard:test --silent`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `bun nx run shipshout-client-dashboard:lint --silent`
Expected: PASS

- [ ] **Step 3: Manual smoke**

1. Fresh / partial account → checklist with correct done/pending steps and CTAs.
2. Full setup account → stat tiles, optional action items, recent shoutouts (max 5), no checklist.
3. Shoutouts page still polls in-flight statuses (unchanged).

- [ ] **Step 4: Commit (if any fixups)**

Only if verification required small fixes.

---

## Self-review

| Spec requirement | Task |
| --- | --- |
| Server-composed, no new API | Task 5 |
| Four setup gates + generatable channel rule | Tasks 1–2 |
| Hide checklist when complete | Task 4–5 |
| Stat tiles definitions | Tasks 2, 4 |
| Action items priority + cap 5 | Task 2 |
| Recent shoutouts max 5 | Tasks 2, 4 |
| No home polling | Task 4 (no useEffect refresh) |
| ShoutoutsTable extraction | Task 3 |
| Per-repo fetch failure degradation | Task 5 `loadRepoContexts` |
| DESIGN.md card/button patterns | Task 4 |
| Unit tests for utils | Tasks 1–2 |

No placeholders. Type names consistent across tasks (`SetupState`, `RepoHomeContext`, `ActionItem`).
