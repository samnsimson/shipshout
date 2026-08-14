# Web App Revamp — TailAdmin Visual Parity in Chakra UI

**Date:** 2026-08-06  
**Status:** Approved (design)  
**Reference:** `/Users/samsimson/Development/next-admin-template` (TailAdmin v2.3.0)  
**Supersedes:** Visual identity sections of `2026-08-06-web-production-ui-design.md` for this revamp work

---

## 1. Goal & Scope

Revamp ShipShout's Next.js web app (`apps/web`) to achieve full visual parity
with the TailAdmin template — same layout, spacing, colors, typography, and
component patterns — implemented entirely in Chakra UI v3. No backend changes,
no new features, no changes to `apps/web/src/lib/*` request logic.

### In scope

| Area | Routes / files |
|---|---|
| Dashboard shell | `(dashboard)/layout.tsx`, new sidebar/header components |
| Dashboard pages | `/`, `/[workspaceId]/drafts`, all `/[workspaceId]/settings/*` |
| Auth | `/login` |
| Error | `/forbidden` |
| Public tool | `/tools/tweet-generator` |
| Theme & assets | `theme.ts`, logo SVGs, Outfit font |
| Shared UI | Component library (see §4) |
| Loading states | All existing `loading.tsx` files |

### Out of scope

- Global search bar and notifications dropdown (header chrome omitted until real functionality exists)
- TailAdmin demo pages (charts, calendar, tables demo, modals demo, profile, etc.)
- Backend, API client, session, or routing logic changes
- Storybook or visual regression infrastructure
- i18n

### Decisions log

| Decision | Choice |
|---|---|
| Parity level | Full visual parity (shell + primitives + auth + loading states) |
| Color identity | TailAdmin palette wholesale (`brand` blue, gray scale, status colors) |
| Header features | Sidebar toggle, workspace switcher, theme toggle, user menu only |
| Branding | Static SVG logo (full + icon, light/dark) — no Pulse animation |
| Typography | Outfit only (drop Space Grotesk, Inter, JetBrains Mono) |
| Workspace switcher | Header, next to user menu |
| Page coverage | All routes including tweet generator |
| Implementation approach | Shell-first (Approach 2) |

---

## 2. Visual Identity & Theme

Replace `apps/web/src/theme.ts` with TailAdmin's token system mapped to Chakra
v3 `defineConfig`:

### Color palettes

- **Brand:** `brand-25` through `brand-950` (primary `#465fff` at 500)
- **Neutrals:** `gray-25` through `gray-950`, plus `gray-dark` (`#1a2231`) for dark surfaces
- **Status:** `success`, `error`, `warning`, `orange` (full 25–950 scales from TailAdmin `globals.css`)

### Semantic tokens

| Token | Light | Dark |
|---|---|---|
| `bg` | `gray-50` | `gray-900` |
| `fg` | `gray-900` | `white/90` |
| `fg.muted` | `gray-500` | `gray-400` |
| `border` | `gray-200` | `gray-800` |
| Card surface | `white` | `white/3%` |

Active nav items use `brand-50` background and `brand-500` text (light);
`brand-500/12%` background and `brand-400` text (dark).

### Shadows

Map TailAdmin shadow tokens: `theme-xs`, `theme-sm`, `theme-md`, `theme-lg`, `theme-xl`.

### Typography

- **Font:** Outfit via `next/font/google` in `layout.tsx`
- **Text styles:** `theme-xs` (12px), `theme-sm` (14px), `theme-xl` (20px)
- **Title sizes:** `title-sm` through `title-2xl` matching TailAdmin scale

### Radii

- `lg` = 8px (buttons, inputs)
- `2xl` = 16px (cards, modals)

### Removed

- `ink`, `paper`, `cloud`, `signal`, `beacon`, `slate` palettes
- `pulseRing` keyframe and animation tokens
- `Pulse` and `PulseField` components and all usages
- All `colorPalette="signal"` references → `colorPalette="brand"`

Dark mode continues via existing `ColorModeProvider` (class-based `.dark` on `<html>`).

---

## 3. App Shell Architecture

### File structure

```
apps/web/src/
  layout/
    app-sidebar.tsx
    app-header.tsx
    backdrop.tsx
    dashboard-shell.tsx
  context/
    sidebar-context.tsx
  components/
    logo.tsx
    workspace-switcher.tsx
    component-card.tsx
    page-breadcrumb.tsx
    nav-item.tsx
    grid-shape.tsx
    ... (updated existing components)
  public/images/logo/
    logo.svg
    logo-dark.svg
    logo-icon.svg
    auth-logo.svg
```

### Sidebar (`app-sidebar.tsx`)

Matches TailAdmin `AppSidebar` behavior:

| State | Width | Behavior |
|---|---|---|
| Collapsed (desktop) | 90px | Icon-only nav; logo shows icon variant |
| Expanded (desktop) | 290px | Full labels; logo shows wordmark |
| Hover (collapsed) | 290px | Temporary expand on mouse enter |
| Mobile | 290px | Off-canvas; `-translate-x-full` when closed |

Features:
- Fixed position, full viewport height, `border-r`, white/dark-gray-900 background
- Nav sections with uppercase labels ("Menu", "Settings")
- Collapsible submenu support (not needed for ShipShout's flat nav, but structure allows it)
- Icons on every nav item (react-icons/lu equivalents of TailAdmin icons)
- Active item styling via `NavItem` recipe

Nav items:
- **Menu:** Drafts
- **Settings:** Repositories, Connections, Brand, Billing

Does **not** contain: workspace switcher, user menu, theme toggle.

### Header (`app-header.tsx`)

Sticky top bar matching TailAdmin proportions, minus search/notifications:

| Element | Position | Notes |
|---|---|---|
| Sidebar toggle | Left | Hamburger / close icon; desktop toggles expand, mobile toggles drawer |
| Mobile logo | Left (lg:hidden) | Full wordmark link to `/` |
| Workspace switcher | Right area | Dropdown moved from sidebar |
| Theme toggle | Right area | Existing `ColorModeButton` restyled |
| User dropdown | Right area | Avatar + name; sign-out action |

### Main content

- Margin-left animates with sidebar width (`90px` / `290px`)
- Padding: `p-4 md:p-6`
- Max width: ~1536px (`2xl` breakpoint)
- Replaces current `maxW="5xl"` constraint

### Context (`sidebar-context.tsx`)

Client context providing:
- `isExpanded`, `isHovered`, `isMobileOpen`
- `toggleSidebar`, `toggleMobileSidebar`, `setIsHovered`

Wrap in `(dashboard)/layout.tsx` via `DashboardShell`.

### Mobile backdrop

Semi-transparent overlay when mobile sidebar is open; click to close.

---

## 4. Shared Component Library

Chakra v3 recipes and wrapper components matching TailAdmin primitives used by
ShipShout:

| Component | TailAdmin source | ShipShout usage |
|---|---|---|
| `ComponentCard` | `ComponentCard.tsx` | Settings forms, content sections |
| `PageBreadcrumb` | `PageBreadCrumb.tsx` | Optional on nested settings pages |
| `PageHeader` | — (custom) | All dashboard pages; updated spacing/typography |
| `NavItem` | sidebar menu-item utilities | Sidebar navigation |
| Button recipes | `ui/button/Button.tsx` | Solid, outline, ghost; sm/md/lg sizes |
| `StatusBadge` | `ui/badge/Badge.tsx` | Draft status indicators |
| `Field` | form `Label` + `InputField` | All forms (brand, billing, etc.) |
| `EmptyState` | — | Drafts empty, no-workspace state |
| `GridShape` | `GridShape.tsx` | Auth panel, forbidden page background |
| Skeleton | — | All `loading.tsx` files |

### Logo (`logo.tsx`)

Props: `variant: 'full' | 'icon'`, respects color mode for light/dark SVG swap.
Uses Next.js `Image` or inline SVG from `public/images/logo/`.

### Workspace switcher (`workspace-switcher.tsx`)

Extracted from current `sidebar.tsx` `WorkspaceMenu`; styled as TailAdmin
dropdown button in header.

Not porting: charts, calendar, maps, notification dropdown, table demos, modal
demos, phone input, date picker, dropzone.

---

## 5. Page Designs

### Login (`/login`)

TailAdmin split auth layout:

```
┌─────────────────────┬─────────────────────┐
│  GitHub sign-in     │  Branded panel      │
│  form (left 50%)    │  GridShape + logo   │
│                     │  tagline (right 50%)│
│                     │  hidden on mobile   │
└─────────────────────┴─────────────────────┘
         [theme toggle — fixed bottom-right]
```

- Single "Sign in with GitHub" button (no email/password fields)
- Error message for failed OAuth (existing logic)
- Remove PulseField background

### Dashboard pages

All pages render inside `DashboardShell`. Pattern:

```tsx
<PageHeader title="..." description="..." action={...} />
<ComponentCard title="..." desc="...">
  {/* page content */}
</ComponentCard>
```

Specific pages:
- **Workspace home (`/`):** Create-workspace form in ComponentCard
- **Drafts:** Grid of cards with `rounded-2xl border`; brand-colored Publish button
- **Settings (all):** Forms inside ComponentCard; repository/connection rows as bordered list items
- **Loading states:** Skeleton blocks matching card layout dimensions

### Forbidden (`/forbidden`)

TailAdmin error-page pattern:
- Full viewport, centered content
- GridShape decorative background
- Large heading, description, "Back to dashboard" outline button
- LuShieldAlert icon (no 404 illustration SVG needed)

### Tweet generator (`/tools/tweet-generator`)

Standalone full-width page (not inside dashboard shell):
- TailAdmin typography and color tokens
- Hero section with title + description (no Pulse)
- Generator form wrapped in ComponentCard
- Matches TailAdmin marketing/form aesthetic

---

## 6. Migration Strategy

Implementation order (Approach 2 — shell-first):

1. **Theme + font** — New `theme.ts`, Outfit in `layout.tsx`, remove old tokens
2. **Assets** — Copy/adapt logo SVGs to `public/images/logo/`
3. **Context + shell** — `sidebar-context.tsx`, `app-sidebar.tsx`, `app-header.tsx`, `backdrop.tsx`, `dashboard-shell.tsx`
4. **Layout swap** — Replace `(dashboard)/layout.tsx` to use `DashboardShell`
5. **Shared primitives** — ComponentCard, NavItem, GridShape, updated PageHeader, Badge, Field, Button recipes
6. **Dashboard pages** — Restyle all dashboard routes and loading states
7. **Standalone pages** — Login, forbidden, tweet generator
8. **Cleanup** — Delete Pulse components, remove dead theme references, update any remaining `signal`/`beacon`/`heading` font references

Each step should leave the app buildable and functional.

---

## 7. Error Handling & Data Flow

No changes to:
- `apps/web/src/lib/*` API modules
- Session/auth flow (`getSessionUser`, GitHub OAuth redirect)
- `handleForbiddenClient` redirect logic
- Toaster notifications (restyle only if needed for dark mode)

All existing server components remain server components; only layout shell and
interactive UI pieces are client components.

---

## 8. Testing

- **Build:** `nx build web` passes
- **Existing tests:** All `apps/web/src/**/*.spec.ts` pass unchanged
- **Manual checklist:**
  - Light and dark mode on every page
  - Sidebar: collapse, hover-expand, mobile drawer, backdrop dismiss
  - Workspace switcher in header across all dashboard routes
  - Active nav highlighting on current route
  - Auth flow (GitHub sign-in redirect)
  - Responsive breakpoints: mobile, tablet, desktop (≥1024px)
  - Tweet generator standalone page layout
  - Loading skeletons render on navigation

---

## 9. Reference Mapping

| TailAdmin (Tailwind) | ShipShout (Chakra) |
|---|---|
| `globals.css` `@theme` tokens | `theme.ts` tokens + semanticTokens |
| `AppSidebar` | `layout/app-sidebar.tsx` |
| `AppHeader` | `layout/app-header.tsx` |
| `SidebarContext` | `context/sidebar-context.tsx` |
| `ComponentCard` | `components/component-card.tsx` |
| `ThemeToggleButton` | `components/ui/color-mode.tsx` (restyled) |
| Auth layout | New `(auth)` layout or inline in login page |
| `menu-item-active` utility | `NavItem` recipe with active variant |
| Outfit font | `next/font/google` in root layout |
