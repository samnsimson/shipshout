# Production-Grade Web UI — Design Spec

**Date:** 2026-08-06
**Status:** Approved (design), pending implementation plan
**Source idea:** Chakra UI is installed (`ChakraProvider`, color-mode, toaster,
tooltip snippets already scaffolded) but unused — every page in `apps/web` is
raw HTML with inline `style={{}}` objects and no design tokens.

---

## 1. Goal & Scope

Give ShipShout's web app a real, cohesive, production-grade visual identity
built on Chakra UI v3, and apply it consistently across every existing page.
This is a visual/UX layer redesign — no new features, no backend changes, no
changes to `apps/web/src/lib/*` request logic.

**In scope — every existing page/component:**

- `/login`
- `/` (dashboard — no-workspace empty state + create-workspace form)
- `/[workspaceId]/drafts` (+ `draft-card`)
- `/[workspaceId]/settings/repositories` (+ `repository-form`, `repository-row`)
- `/[workspaceId]/settings/connections` (+ `connection-row`)
- `/[workspaceId]/settings/brand` (+ `brand-form`)
- `/[workspaceId]/settings/billing` (+ `billing-actions`)
- `/tools/tweet-generator` (public lead magnet, + `generator`)
- The dashboard shell (`(dashboard)/layout.tsx`) and workspace switcher

**Explicitly out of scope:**

- Any change to `apps/web/src/lib/*.ts` (API request modules) or their tests
- New features or behavior changes — this is re-skinning existing flows
- A custom Chakra theme with new component recipes — we use Chakra's built-in
  components/variants, customized only via token overrides (colors, fonts)
- Storybook, visual regression testing, or new component test infrastructure
- i18n

## 2. Visual Identity

**Signature motif — the "broadcast pulse":** ShipShout = **Ship** (release) +
**Shout** (announce). One recurring animated element — a small signal-ring
pulse, like a beacon or sonar ping — represents "going out." It appears in
exactly three places so it reads as a signature, not decoration:

1. Ambient, slow, subtle rings behind the hero headline on marketing surfaces
   (login, tweet-generator) — respects `prefers-reduced-motion` (static ring,
   no animation, when reduced motion is set).
2. `StatusBadge` in its "active/generating" state (e.g. a draft that's
   currently being generated).
3. The static pulse-dot used as the wordmark's logo mark in the sidebar.

Everywhere else stays quiet and disciplined — one signature, not scattered
effects.

**Color tokens** (bridge light/dark via the same 6 values — `ink`/`paper`
swap roles between modes rather than needing a second palette):

| Token | Hex | Role |
|---|---|---|
| `ink` | `#0E1420` | Dark-mode surface / light-mode text |
| `paper` | `#F7F7F5` | Light-mode surface |
| `cloud` | `#E7E9EE` | Borders, dividers, subtle fills |
| `signal` | `#FF5A3C` | Brand / primary CTA |
| `beacon` | `#0EA5A0` | Success / connected / published |
| `slate` | `#6B7280` | Secondary text |

**Typography:**

- Display (`Space Grotesk`) — headlines and hero copy on marketing surfaces;
  moderate use on dashboard page titles.
- Body/UI (`Inter`) — forms, buttons, table/card text. The dashboard interior
  stays compact and efficient rather than "bold" — personality lives in the
  accent color and the pulse motif, not in oversized dashboard type.
- Utility/mono (`JetBrains Mono`) — webhook secrets, external IDs, any
  copyable identifier.

Personality split: **marketing surfaces** (login, public tweet-generator) get
the full bold treatment — large display type, the pulse hero moment, high
visual energy (Stripe/Buffer-like). The **dashboard interior** uses the same
tokens but prioritizes density and clarity.

## 3. Layout & Information Architecture

New authenticated app shell replaces the horizontal top nav in
`(dashboard)/layout.tsx`:

```
┌────────────┬──────────────────────────────────────────┐
│ ● ShipShout│  Drafts                        [+ Repo]   │
│────────────│ ─────────────────────────────────────────│
│ Acme Inc ▾ │                                            │
│            │   ┌──────────────────────────────────┐    │
│  Drafts    │   │ X · Generating…        ⟲ pulse    │    │
│            │   └──────────────────────────────────┘    │
│  Settings  │   ┌──────────────────────────────────┐    │
│   Repos    │   │ LinkedIn · Approved                │    │
│   Connect. │   └──────────────────────────────────┘    │
│   Brand    │                                            │
│   Billing  │                                            │
│            │                                            │
│────────────│                                            │
│ 🌙 Sam S.  │                                            │
└────────────┴──────────────────────────────────────────┘
```

- **Sidebar top:** wordmark with pulse-dot mark, workspace switcher below it
  as a proper Chakra `Menu` dropdown (replaces the bare `<select>`), showing
  workspace name + "＋ New workspace" as the last item.
- **Nav:** `Drafts` flat top-level; `Repositories`, `Connections`, `Brand`,
  `Billing` grouped under a `Settings` label. Active route: `signal`-colored
  left border + tinted background.
- **Sidebar bottom:** color-mode toggle (`ColorModeButton`, already
  scaffolded) + user identity, opens a small menu with "Sign out".
- **Main content:** every page gets a `PageHeader` (title + optional
  one-line description + right-aligned primary action slot), replacing
  per-page ad-hoc `<h1>` + inline padding.
- **Responsive:** sidebar collapses into a top bar with a Chakra `Drawer`
  slide-over below ~768px.
- **Login and `/tools/tweet-generator` do not use this shell** — standalone
  centered/hero layouts, since they're pre-auth marketing surfaces.

## 4. Shared Component Primitives

New files under `apps/web/src/components/`:

- `PageHeader` — title, description, action slot
- `EmptyState` — icon + action-oriented message + optional CTA button
- `StatusBadge` — pill badge; pulse animation for "active/generating", static
  `beacon`-colored dot for "approved/published/connected", `slate` neutral
  for "pending/draft/not connected"
- `SecretReveal` — monospace box + "Copy" button + copied-confirmation, for
  webhook URL/secret display
- `NavLink` — sidebar item, active-state aware
- `Field` — thin wrapper around Chakra `Field.Root` giving every form input
  a consistent label/helper-text/error-text slot

## 5. Page-by-Page Plan

| Page | Key changes |
|---|---|
| Login | Hero: large Space Grotesk headline, ambient pulse rings, solid `signal` "Sign in with GitHub" button with GitHub icon |
| Dashboard (no workspace) | Centered `EmptyState` + `CreateWorkspaceForm` rebuilt with `Field`/`Input`/`Button` |
| Drafts | Grid of `DraftCard`s (Chakra `Card`), `StatusBadge` w/ pulse while generating, Chakra `Textarea`, Save/Approve/Publish button group with `loading` states |
| Repositories | `RepositoryRow` as `Card` with expandable "Send test release" form (Chakra `Collapsible`); `SecretReveal` for webhook secret callout; `RepositoryForm` on `Field`s |
| Connections | `ConnectionRow` as `Card` per channel with channel icon (react-icons), `StatusBadge`, Connect / Connect (test) actions |
| Brand | `Field`/`Select`/`Textarea`/`Switch` (replaces raw checkbox for emoji policy) |
| Billing | Three `PricingCard`s in a responsive grid; active tier gets a `signal` border highlight |
| Tweet generator (public) | Hero treatment matching login; large `Textarea`; prominent generate `Button`; result in a `Card` with copy button; soft-CTA footer link |

All server-component pages that `await` API calls get a matching
`loading.tsx` using Chakra `Skeleton`, so navigation shows a placeholder
instead of a blank flash.

## 6. Interaction Patterns & Error Handling

- **Transient feedback** (save succeeded, connect failed, etc.) moves from
  inline `<span style={{color}}>` text to the existing `Toaster`. Success
  toasts auto-dismiss; error toasts persist until dismissed and speak in the
  interface's voice (e.g. "Couldn't add repository — check the fields and
  try again," not "Error: request failed").
- **Form validation errors** stay inline under the field via `Field`'s error
  slot, not toasts — validation is about a specific input.
- **Button loading states**: every async action button (Save, Approve,
  Publish, Subscribe, Connect) uses Chakra `Button loading` + auto-disable,
  replacing today's plain `disabled` + text swap.
- **Empty states** use `EmptyState` with an action-oriented message ("No
  repositories yet — add one to start shipping releases"), not a passive
  gray sentence.
- **Status transitions** (draft Approve/Publish) keep today's immediate
  local-state update, now reflected via `StatusBadge` color/pulse change
  instead of a text label swap.

## 7. Testing & Non-Goals

- No new component test infrastructure — the existing convention only unit
  tests `apps/web/src/lib/*.ts` (Jest), not React components. Those existing
  tests are untouched and must keep passing unmodified.
- Manual QA: after implementation, walk the full dogfood flow (create
  workspace → add repo → simulate release → approve/publish draft → connect
  channel) end-to-end in the browser to confirm no functional regressions.
- Non-goals: Storybook, visual regression tooling, custom Chakra theme
  recipes beyond token overrides, changes to `apps/web/src/lib/*` request
  logic, i18n.
