# GitHub App Auto-Webhook — Design Spec

**Date:** 2026-08-06  
**Status:** Approved (design)  
**Supersedes:** Manual webhook setup UI from `2026-08-06-real-integrations-design.md` §3

---

## 1. Goal & Scope

Replace manual webhook copy/paste setup with a Vercel/Railway-style connect experience. Users click **Connect with GitHub**, select repos, and releases trigger drafts automatically — no webhook URL or secret configuration in the UI.

### In scope

| Area | Change |
|---|---|
| Connect flow | GitHub App install when `GITHUB_APP_*` configured; OAuth fallback otherwise |
| Webhook provisioning | App path: rely on App-level webhook; OAuth path: auto `registerGithubWebhook()` on import |
| Data model | `webhookStatus` column on `repositories` |
| API | Expose `webhookStatus` in list; add `POST .../retry-webhook` for OAuth failures |
| UI | Remove manual setup panel; show Active / Failed / Waiting status |
| Docs | GitHub App one-time webhook config in `.env.example` / README |

### Out of scope (v2)

- `installation_repositories` webhook sync (auto add/remove repos when App access changes)
- Push-to-branch triggers (Release events only — confirmed)
- Local dev tunneling (ngrok) for webhook delivery
- Changing Linear/Jira ingestion

### Decisions log

| Decision | Choice |
|---|---|
| Trigger event | GitHub Release published (unchanged) |
| Connect flow | GitHub App preferred; OAuth auto-webhook fallback |
| App path webhooks | App-level webhook in GitHub App settings (no per-repo hook API call) |
| OAuth path webhooks | Existing `registerGithubWebhook()` on import; track success/failure |
| Manual setup UI | Remove entirely from default view |

---

## 2. Connect Flow

### When GitHub App is configured

Env required: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`  
Optional but required for webhook verification: `GITHUB_APP_WEBHOOK_SECRET`

**Connect button** redirects to:
```
https://github.com/apps/{GITHUB_APP_SLUG}/installations/new?state={workspaceId}
```

**Callback:** existing `GET /api/github/install/callback` → repo picker → import.

**On import (App path):** set `webhookStatus: active` immediately. The GitHub App's centrally configured webhook delivers `release` events for all installed repos. Do not call `registerGithubWebhook()` per repo.

### When GitHub App is not configured (OAuth fallback)

**Connect button** redirects to OAuth authorize (unchanged):
```
https://github.com/login/oauth/authorize?...&state=repo:{workspaceId}
```

**On import (OAuth path):** call `registerGithubWebhook(fullName, accessToken, webhookUrl, secret)` as today. Set `webhookStatus: active` on success, `failed` on error. Log failures server-side.

### `GithubReposService.startUrl` change

```typescript
startUrl(workspaceId: string) {
    if (this.usesGithubApp()) {
        const params = new URLSearchParams({ state: workspaceId });
        return `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new?${params}`;
    }
    // existing OAuth URL
}
```

Pass `viaApp: boolean` through import flow (from session `installationId` presence) to choose webhook strategy.

---

## 3. GitHub App One-Time Setup (ops/docs, not UI)

Configure in GitHub App settings → Webhook:

| Setting | Value |
|---|---|
| Webhook URL | `{API_BASE_URL}/api/webhooks/github` |
| Webhook secret | Same as `GITHUB_APP_WEBHOOK_SECRET` |
| Events | **Release** |

Existing `WebhooksService.handleGithub` already verifies App secret via `GITHUB_APP_WEBHOOK_SECRET` and accepts `release` events.

---

## 4. Data Model

### Migration

Add enum and column to `repositories`:

```typescript
export enum WebhookStatus {
    Pending = 'pending',
    Active = 'active',
    Failed = 'failed',
}

@Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.Pending })
webhookStatus!: WebhookStatus;
```

Backfill existing rows: `pending` (or `active` if `lastReleaseAt` exists — optional migration data step).

### API response shape

Extend `GET /workspaces/:id/repositories` item:

```typescript
{
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  webhookStatus: 'pending' | 'active' | 'failed';
  lastReleaseAt: string | null;
  lastReleaseStatus: 'received' | 'generating' | 'drafted' | 'failed' | null;
}
```

---

## 5. Retry Webhook Endpoint

**Endpoint:** `POST /api/workspaces/:workspaceId/repositories/:id/retry-webhook`

**Behavior:**
1. Load repo; verify workspace ownership
2. Only for OAuth-connected repos (`webhookStatus === 'failed'` or user-initiated retry)
3. Requires stored access token path — use workspace user's GitHub OAuth token OR re-require connect flow

**Pragmatic v1:** Retry re-calls `registerGithubWebhook` using a fresh token from a new OAuth connect session is heavy. Simpler v1: **Reconnect** button in UI links to `connectGithubUrl(workspaceId)` (full re-connect flow). Skip dedicated retry endpoint if reconnect covers the case.

**Decision:** UI **Reconnect** button → GitHub connect flow. Add `POST retry-webhook` only if we can obtain a token without full reconnect (defer if not trivial).

For v1: **Reconnect button only** (no new retry endpoint). User reconnects repo via existing OAuth/App flow.

---

## 6. Repository Status UI

Replace collapsible manual setup with inline status on each repo row (no collapsible required).

| `webhookStatus` | Display |
|---|---|
| `active` | `StatusBadge` **Webhook active** + *"Releases will trigger drafts automatically"* + last release line if present |
| `failed` | `StatusBadge` **Setup failed** + *"Reconnect the repository or check GitHub admin permissions"* + **Reconnect** button |
| `pending` + no `lastReleaseAt` | Muted *"Waiting for first release"* |
| `pending` + has `lastReleaseAt` | Treat as active display (release received implies webhook worked) |

**Remove:** `SecretReveal`, webhook URL, numbered setup steps, secret guidance.

**OAuth-only deployments:** optional collapsed **Troubleshooting** text (admin must grant repo hook permissions) — not shown by default.

**Reconnect button:** links to `connectGithubUrl(workspaceId)` (App or OAuth depending on server config).

---

## 7. Error Handling

| Scenario | Behavior |
|---|---|
| App not configured | OAuth fallback; per-repo hook registration |
| OAuth hook registration fails (403/422) | `webhookStatus: failed`; user sees Reconnect |
| App configured but App webhook URL wrong | No events; status stays `pending` until first release |
| `localhost` API URL in dev | GitHub cannot deliver webhooks; expected dev limitation |
| Duplicate webhook (422) | Treat as success → `webhookStatus: active` (already in `registerGithubWebhook`) |

---

## 8. Testing

### Unit tests
- `GithubReposService.startUrl` returns App install URL when App configured
- `GithubReposService.startUrl` returns OAuth URL when App not configured
- `importRepos` sets `webhookStatus: active` on App path without calling `registerGithubWebhook`
- `importRepos` sets `active`/`failed` based on `registerGithubWebhook` result on OAuth path
- `RepositoriesService.list` includes `webhookStatus`

### Manual checklist
1. Configure GitHub App with webhook URL + Release event
2. Connect repo via App install → status shows **Webhook active** without manual steps
3. Publish GitHub Release → drafts appear
4. Unconfigure App env → OAuth connect still works with auto-hook registration

---

## 9. Implementation Order

1. Migration: add `webhookStatus` to `repositories`
2. Entity + `RepositoriesService.createFromGithub` accept/set status
3. `GithubReposService`: App install URL in `startUrl`; branch import on App vs OAuth
4. `RepositoriesService.list` include `webhookStatus`
5. Web UI: replace manual panel with status + Reconnect
6. Update `.env.example` / README with App webhook setup notes

---

## 10. Files to Touch

| File | Action |
|---|---|
| `libs/data/database/.../repository.entity.ts` | Add `WebhookStatus` enum + column |
| `libs/data/database/.../migrations/*` | New migration |
| `apps/api/.../github-repos.service.ts` | App install URL; import webhook branching |
| `apps/api/.../repositories.service.ts` | Persist and return `webhookStatus` |
| `apps/web/.../repository-row.tsx` | Status UI; remove manual setup |
| `apps/web/.../repositories/page.tsx` | Extend Repo type |
| `.env.example`, `README.md` | App webhook documentation |
