# GitHub App Auto-Webhook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vercel-style GitHub repo connect with automatic webhook provisioning — no manual URL/secret setup in the UI.

**Architecture:** Add `webhookStatus` to repositories. When GitHub App env vars are set, connect redirects to App install and marks repos `active` (App-level webhook). Otherwise OAuth fallback auto-registers per-repo hooks and records success/failure. UI shows status badges instead of manual setup instructions.

**Tech Stack:** TypeORM migrations, NestJS, Next.js/Chakra UI v3, `@shipshout/integrations-github`, Nx (`bunx nx test`, `bun run migration:run`).

**Design spec:** `docs/superpowers/specs/2026-08-06-github-app-auto-webhook-design.md`

## Global Constraints

- Trigger remains **GitHub Release** events only — do not add push/branch handlers.
- App path: **do not** call `registerGithubWebhook()` per repo when `session.installationId` is set.
- OAuth path: call `registerGithubWebhook()`; 422 response = success (hook already exists).
- `webhookStatus` values: `'pending' | 'active' | 'failed'`; default `'pending'`.
- Remove manual webhook URL/secret UI from `repository-row.tsx`.
- Reconnect button uses existing `connectGithubUrl(workspaceId)` — no new retry API in v1.
- Run migrations after entity change: `bun run migration:gen` then `bun run migration:run`.
- Commit after each task when tests pass.

---

### Task 1: Add `webhookStatus` to database

**Files:**
- Modify: `libs/data/database/src/lib/entities/repository.entity.ts`
- Create: migration via `bun run migration:gen`
- Modify: `libs/data/database/src/index.ts` (export `WebhookStatus` if needed)

**Interfaces:**
- Produces: `WebhookStatus` enum `{ Pending, Active, Failed }` on `Repository` entity

- [ ] **Step 1: Add enum and column to entity**

```typescript
export enum WebhookStatus {
    Pending = 'pending',
    Active = 'active',
    Failed = 'failed',
}

@Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.Pending })
webhookStatus!: WebhookStatus;
```

- [ ] **Step 2: Generate and run migration**

Run: `bun run migration:gen -- libs/data/database/src/lib/migrations/RepositoryWebhookStatus`  
Run: `bun run migration:run`  
Expected: migration applies cleanly

- [ ] **Step 3: Commit**

```bash
git add libs/data/database
git commit -m "feat(database): add webhookStatus to repositories"
```

---

### Task 2: Persist webhookStatus on repo create/import

**Files:**
- Modify: `apps/api/src/app/repositories/services/repositories.service.ts`
- Modify: `apps/api/src/app/repositories/__tests__/services/repositories.service.spec.ts`

**Interfaces:**
- Produces: `createFromGithub(workspaceId, repo, opts?: { webhookStatus?: WebhookStatus })` returns `{ repository, webhookSecret, created }`
- Produces: `list()` includes `webhookStatus` in each item

- [ ] **Step 1: Write failing test**

```typescript
it('createFromGithub sets webhookStatus when provided', async () => {
    const repos = {
        findByExternalIdForWorkspace: jest.fn(async () => null),
        create: jest.fn((d) => d),
        save: jest.fn(async (d) => ({ id: 'r1', ...d })),
    };
    const svc = new RepositoriesService(repos as any, { assertCanAddRepo: jest.fn() } as any, { findLatestByRepositoryIds: jest.fn(async () => new Map()) } as any);
    await svc.createFromGithub('w1', { id: 1, full_name: 'o/r' }, { webhookStatus: WebhookStatus.Active });
    expect(repos.save).toHaveBeenCalledWith(expect.objectContaining({ webhookStatus: WebhookStatus.Active }));
});
```

- [ ] **Step 2: Implement createFromGithub options + list field**

Add optional third param; pass `webhookStatus` into `create()`. Include `webhookStatus` in `list()` mapped response.

- [ ] **Step 3: Run tests**

Run: `bunx nx test api --testPathPatterns=repositories.service`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/repositories
git commit -m "feat(api): persist and return repository webhookStatus"
```

---

### Task 3: GitHub App install URL + import webhook branching

**Files:**
- Modify: `apps/api/src/app/repositories/services/github-repos.service.ts`
- Modify: `apps/api/src/app/repositories/__tests__/services/github-repos.service.spec.ts`

**Interfaces:**
- Produces: `startUrl(ws)` → App install URL when `usesGithubApp()` true
- Consumes: `createFromGithub(..., { webhookStatus })` from Task 2
- App import (`session.installationId`): `WebhookStatus.Active`, skip `registerGithubWebhook`
- OAuth import: call `registerGithubWebhook`; set `Active` or `Failed`

- [ ] **Step 1: Update startUrl test — expect App install URL**

```typescript
it('uses GitHub App install URL when App is configured', () => {
    process.env.GITHUB_APP_SLUG = 'shipshout';
    process.env.GITHUB_APP_ID = '1';
    process.env.GITHUB_APP_PRIVATE_KEY = 'key';
    const svc = new GithubReposService({} as any);
    const url = svc.startUrl('ws-1');
    expect(url).toContain('github.com/apps/shipshout/installations/new');
    expect(url).toContain('state=ws-1');
});
```

Update existing test "uses OAuth start URL even when GitHub App is configured" → invert expectation to App install URL.

- [ ] **Step 2: Implement startUrl branch**

```typescript
startUrl(workspaceId: string) {
    if (this.usesGithubApp()) {
        return `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new?${new URLSearchParams({ state: workspaceId })}`;
    }
    // existing OAuth URL
}
```

- [ ] **Step 3: Branch importRepos on viaApp flag**

Pass `viaApp: !!session.installationId` into `importSelected` → `importRepos`. When `viaApp`, call `createFromGithub(..., { webhookStatus: WebhookStatus.Active })` without `registerGithubWebhook`. When OAuth, try register and set Active/Failed.

- [ ] **Step 4: Add import test with mocked registerGithubWebhook**

Mock `@shipshout/integrations-github` `registerGithubWebhook`; verify not called on App path, called on OAuth path.

- [ ] **Step 5: Run tests**

Run: `bunx nx test api --testPathPatterns=github-repos.service`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/repositories/services/github-repos.service.ts apps/api/src/app/repositories/__tests__
git commit -m "feat(api): GitHub App install connect with automatic webhook status"
```

---

### Task 4: Repository status UI (remove manual setup)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-row.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/page.tsx`
- Modify: `apps/web/src/components/status-badge.tsx` — add `webhook_active`, `setup_failed` tones if needed

**Interfaces:**
- Consumes: repo list with `webhookStatus: 'pending' | 'active' | 'failed'`
- Produces: inline status card; Reconnect button → `connectGithubUrl(workspaceId)`

- [ ] **Step 1: Extend Repo type in page.tsx**

Add `webhookStatus: 'pending' | 'active' | 'failed'`.

- [ ] **Step 2: Rewrite repository-row.tsx**

Remove `Collapsible`, `SecretReveal`, setup steps. Show:
- `active` (or `pending` + has release): green **Webhook active** badge + helper text + last release line
- `failed`: warning **Setup failed** + Reconnect button (`connectGithubUrl`)
- `pending` + no release: **Waiting for first release**

- [ ] **Step 3: Build web**

Run: `bunx nx build web`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/\[workspaceId\]/settings/repositories apps/web/src/components/status-badge.tsx
git commit -m "feat(web): automatic webhook status UI, remove manual setup"
```

---

### Task 5: Docs — GitHub App webhook setup

**Files:**
- Modify: `.env.example` — clarify App webhook one-time setup
- Modify: `README.md` (if exists at repo root) — add GitHub App webhook section

- [ ] **Step 1: Update .env.example comments**

Under `GITHUB_APP_*` block, add:
```
# One-time in GitHub App settings → Webhook:
#   URL: {API_BASE_URL}/api/webhooks/github
#   Secret: GITHUB_APP_WEBHOOK_SECRET
#   Events: Release
```

- [ ] **Step 2: Commit**

```bash
git add .env.example README.md
git commit -m "docs: GitHub App webhook one-time setup instructions"
```

---

## Self-Review

| Spec section | Task |
|---|---|
| §2 Connect flow | Task 3 |
| §3 App one-time setup | Task 5 |
| §4 Data model | Tasks 1–2 |
| §5 Reconnect (no retry API) | Task 4 |
| §6 Status UI | Task 4 |
| §9 Implementation order | Tasks 1–5 |

No placeholders. `webhookStatus` type consistent across entity, API list, and web `Repo` type.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-github-app-auto-webhook-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session with checkpoints

Which approach?
