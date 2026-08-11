# Design: Client Dashboard Layout

**Date:** 2026-08-11  
**Status:** Draft (ready for your review)  
**App:** `shipshout-client-dashboard`  
**Design system:** [`DESIGN.md`](../../../DESIGN.md)  
**API:** `shipshout-api-svc` (`@shipshout/auth`, `@shipshout/repositories`)  
**Generated API client:** [`libs/api-client`](../../../libs/api-client) (`ApiClient` SDK)  
**Package manager:** bun

## Goal
Create a consistent, Notion-inspired client dashboard layout (shell + navigation + page roles) and wire it to repository management UX via the generated `ApiClient` SDK.

This spec covers:
- Hybrid app chrome (slim top bar + left sidebar) for authenticated pages
- Route/IA for v1 dashboard sections (Home, Repositories, Shoutouts, Team, Settings)
- Visual mapping to `DESIGN.md` tokens/components (quiet chrome, one blue for actions)
- Repositories page flow (connect GitHub + list/link/unlink repos) using `ApiClient`

Non-goals (for v1):
- Team/Shoutouts feature implementation (stubs only)
- Deep settings for GitHub connection (GitHub lives under Repositories per earlier decision)
- Client-side SPA tab routing (v1 favors URL routes for OAuth return + deep links)

## User experience (v1)
After logging in/registering, the user lands on `/dashboard` (Home). The left sidebar provides navigation to:
- `/dashboard` (Home overview)
- `/dashboard/repositories` (GitHub connect + repo linking UI)
- `/dashboard/shoutouts` (Coming soon)
- `/dashboard/team` (Coming soon)
- `/dashboard/settings` (Account/profile only)

When GitHub OAuth completes, the API redirects back into `/dashboard/repositories` so the repositories page can reflect the connected state.

## Design: App shell & layout
### Layout structure
Authenticated dashboard pages live in a Next.js route group `(dashboard)` so the shell can be shared without impacting auth pages.

```
┌─────────────────────────────────────────────────────────┐
│ Top bar (nav-bar tokens)                                 │
│  [mobile: hamburger] Shipshout [user menu] [logout]     │
├──────────────┬──────────────────────────────────────────┤
│ Sidebar      │ Main content                              │
│ (ex-app-     │ bg: canvas-soft, constrained width        │
│  shell-row)  │ page headers + panels/cards               │
│ Home          │                                              │
│ Repositories  │                                              │
│ Shoutouts     │                                              │
│ Team          │                                              │
│ Settings      │                                              │
└──────────────┴──────────────────────────────────────────┘
```

### Shell responsibilities
- **Top bar**
  - Brand wordmark + optional “Home” navigation
  - User menu (username/handle) and logout action
  - Mobile: hamburger opens sidebar drawer
- **Sidebar**
  - Primary navigation only; active row indicator uses `DESIGN.md` “app shell row” style with `{colors.primary}`.
- **Main content**
  - Warm canvas background (`bg.soft`), consistent outer padding, hairline separators
- **Session**
  - The `(dashboard)` layout can load session once (via existing `getSessionAction`) for header rendering and guard behavior.

## Design: Routes & page roles
### Route table (v1)
| Route | Sidebar item | Page role |
| --- | --- | --- |
| `/dashboard` | Home | Lightweight welcome + status snapshot (connected? linked repos count?) |
| `/dashboard/repositories` | Repositories | Full GitHub connect + link/unlink UX |
| `/dashboard/shoutouts` | Shoutouts | Stub: title + “Coming soon” card |
| `/dashboard/team` | Team | Stub: title + “Coming soon” card |
| `/dashboard/settings` | Settings | Account/profile only (name/email/username) |

### OAuth return alignment
GitHub OAuth redirect is treated as a navigation concern:
- Browser enters OAuth flow via `GET /repositories/github/connect`
- API redirects back to the client app under `/dashboard/repositories`
- The repositories page reads query state (`github=connected|error`) to show a short banner

Exact query parameters are aligned with the Nest repository controller service (success/failure redirect URLs).

## Design: Visual system mapping (`DESIGN.md`)
The dashboard chrome stays monochrome + one blue:

- **Background**
  - Main canvas: `{colors.canvas-soft}` via `bg.soft`
- **Panels/cards**
  - `feature-card` (12px radius, hairline chrome, padding around `{spacing.lg}`) or `ex-empty-state-card` for empty/error states
- **Borders/dividers**
  - Use `{colors.hairline}` and thin dividers; avoid heavy shadows
- **Actions**
  - Primary actions use `button-primary` (blue fill)
  - Utility/secondary actions use `button-utility` / non-blue styling

### Typography
Use existing Chakra theme mappings:
- Page/subsection titles: `heading-2` / `heading-3` / `title` per importance
- Dense list rows, nav: `body-sm`
- Small labels and category markers: `eyebrow`

## Design: Repositories page flow (GitHub connect + link/unlink)
The repositories page is the only v1 page with meaningful interactive content.

### Endpoints & what each UI state needs
#### UI State 1: Disconnected (no GitHub connection)
**UI**
- Empty-state card with:
  - Primary CTA: “Connect GitHub”
  - Optional helper text about permissions

**Actions**
- “Connect GitHub” navigates the browser to the OAuth start endpoint:
  - `GET {API_BASE_URL}/repositories/github/connect`
  - This is intentionally a full browser navigation (OAuth + redirect).

#### UI State 2: Connected, but no linked repos
**UI**
- Status card/strip:
  - “Connected as <githubUsername>”
  - Utility action: “Disconnect”
- Empty linked list (with prompt to link repos)
- “Add repositories” panel:
  - Shows `available` repos with multi-select checkboxes
  - Primary CTA: “Link selected”

**Actions**
- Load:
  - `GET /repositories/github/connection`
  - `GET /repositories/github/available`
  - `GET /repositories`
- Mutations:
  - Disconnect: `DELETE /repositories/github/connection`
  - Link: `POST /repositories` with selected GitHub repo IDs

#### UI State 3: Connected with linked repos
**UI**
- Linked repos list:
  - Repo name / full name
  - Unlink utility per row
- “Add repositories” still available:
  - Either hides already-linked repos or shows them disabled (follow API DTO field `linked` for available repos)

**Actions**
- Load:
  - `GET /repositories`
  - `GET /repositories/github/available` (to populate the selectable set)
  - Optional: `GET /repositories/github/connection` for status header
- Mutations:
  - Unlink: `DELETE /repositories/:id`

### Using `ApiClient` SDK for API calls (required)
All repository API calls that happen via server-side fetch must use the generated `ApiClient` from `libs/api-client`.

#### Client instantiation (server-only helper)
Create a server-side helper (e.g. `src/lib/repositories/api.ts`) that:
- Uses `SHIPSHOUT_API_URL` for `baseUrl`
- Forwards Next.js cookies to Nest by building a `Cookie` header from `cookies()`:
  - `const cookieHeader = cookieStore.getAll().map(c => \`\${c.name}=\${c.value}\`).join('; ')`
- Constructs the SDK client with:
  - `new ApiClient({ baseUrl, headers: { Cookie: cookieHeader } })`

> Note: Unlike the existing auth flow (`authFetch` + `applySetCookies`), repository calls do not set cookies; forwarding the request cookie header is sufficient.

#### Which SDK methods map to which UI actions
- Connection status
  - `ApiClient().getGithubConnection()` → `GET /repositories/github/connection`
- Available repos for selection
  - `ApiClient().listAvailableRepos()` → `GET /repositories/github/available`
- Linked repos
  - `ApiClient().listLinkedRepos()` → `GET /repositories`
- Disconnect
  - `ApiClient().disconnectGithub()` → `DELETE /repositories/github/connection`
- Link selected repos
  - `ApiClient().linkRepositories({ body: { repositories: [...] } })` → `POST /repositories`
- Unlink
  - `ApiClient().unlinkRepository({ path: { id } })` → `DELETE /repositories/{id}`

#### Handling SDK response/errors
The SDK returns a `RequestResult` with `data` vs `error` (depending on `throwOnError` and `responseStyle`).

Dashboard UX requirements:
- On mutation errors: show a short, non-technical error banner/toast in the repositories page.
- Do not lose user selections on transient errors (keep selection state in the page component until successful mutation).
- For `github=error&reason=` query banner: display a safe message and clear/redraw the query once rendered (so it doesn’t repeat on subsequent reloads).

### Connect button rule
Even though the rest of the API calls use `ApiClient`, the **Connect GitHub** button uses browser navigation to:
`GET /repositories/github/connect`

Rationale:
- OAuth + redirect semantics are better represented as a top-level navigation than as a fetch-based SDK call.

## State management & components (v1)
### Recommended component breakdown
- `DashboardShell` (layout-only)
  - renders `TopBar`, `SidebarNav`, and main container
- `RepositoriesPage`
  - orchestrates state:
    - connected/disconnected
    - linked repos list
    - available repos selection
  - renders:
    - connection banner/status
    - empty state card
    - linked repos list card
    - “Add repositories” selection card
- `RepositoriesErrorBanner`
  - uniform error UI for SDK failures
- `RepoSelectionList`
  - checkbox list for available repos

### Server actions vs server components
- **Server components**: load initial connection/available/linked lists via SDK.
- **Server actions**: run mutations (disconnect/link/unlink) via SDK and revalidate/redirect back to the repositories route.

## Testing plan
### Unit tests (low-cost, high-value)
- Repositories API mapping:
  - ensure selected repo IDs are sent in the correct DTO shape for `linkRepositories`
- Cookie-forward helper:
  - verify cookie header serialization format

### Component tests / smoke
- Repositories page renders each of the three states (disconnected/connected-none/connected-some) using mocked SDK responses.
- Manual smoke:
  - login → `/dashboard` → go to `/dashboard/repositories`
  - click connect → OAuth returns → see connected banner + repos list
  - link → unlink → disconnect flows behave and preserve errors in UI

## Open questions
1. When disconnecting, should the repos list clear immediately in UI (optimistic update) or wait for the next server re-fetch?
2. For available repo selection, should already-linked repos appear disabled vs hidden (DTO field `linked` can support either)?

