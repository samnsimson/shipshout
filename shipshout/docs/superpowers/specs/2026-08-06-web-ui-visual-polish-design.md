# Web UI Visual Polish — Design Spec

**Date:** 2026-08-06
**Status:** Approved (design), implemented
**Parent spec:** `docs/superpowers/specs/2026-08-06-web-production-ui-design.md`
**Trigger:** Post-implementation feedback — orange accent disliked, outline/ghost
button hovers invisible in dark mode, dashboard main content not horizontally
centered.

---

## 1. Goal & Scope

Three targeted visual fixes to the Chakra UI layer already shipped in
`apps/web`. No new features, no backend changes, no edits to
`apps/web/src/lib/*.ts`.

**In scope:**

- Retokenize `signal` from orange-red to cool blue across `theme.ts` (all
  existing `colorPalette="signal"` usages update automatically — pulse, nav,
  CTAs, badges).
- Center authenticated main content in a `maxW="5xl"` (~1024px) column via
  `(dashboard)/layout.tsx`.
- Fix dark-mode hover visibility for **outline** and **ghost** button variants
  only, via theme semantic tokens + `globalCss`.

**Out of scope:**

- Primary solid button hover changes (user confirmed those are fine).
- Per-page layout rewrites beyond removing redundant inner `maxW` if any
  conflict with the new shell wrapper.
- Marketing pages (`/login`, `/tools/tweet-generator`) — unchanged.
- New component recipes, Storybook, or test infrastructure.

## 2. Color — `signal` becomes cool blue

Replace the orange `signal` scale; keep the token name `signal` so no
component file needs a palette rename.

| Step | Light | Dark notes |
|---|---|---|
| `signal.500` (solid / pulse / focus ring) | `#2563EB` | same hue |
| `signal.600` | `#1D4ED8` | solid primary pressed |
| `signal.400` | `#3B82F6` | lighter accent in dark contexts |
| `signal.50`–`200` | blue wash ramp | active nav tint, muted fills |
| `signal.800`–`950` | deep blue-gray ramp | dark-mode muted/subtle backgrounds |

**Semantic tokens** (`signal.solid`, `signal.fg`, `signal.muted`, etc.):
repoint to the new scale using the same structure as today.

**Unchanged:** `beacon` (`#0EA5A0`) for success/connected/published;
`ink`/`paper`/`cloud`/`slate` surface tokens.

**Pulse motif:** rings and wordmark dot stay on `signal.solid` — they read
blue instead of orange. `prefers-reduced-motion` behavior unchanged.

## 3. Layout — centered main column

In `apps/web/src/app/(dashboard)/layout.tsx`, wrap `{children}` inside the
existing `<Flex as="main">`:

```tsx
<Box maxW="5xl" w="full" mx="auto">
  {children}
</Box>
```

- Authenticated pages only (layout already gates on session).
- Pages with narrower inner caps (`maxW="2xl"` on repositories, connections,
  brand) remain valid — they center within the `5xl` column.
- Drafts 2-column grid and billing 3-column grid use the full `5xl` width.

## 4. Dark-mode outline/ghost hover

**Problem:** default Chakra hover on `#0E1420` (`ink`) is too low-contrast for
outline and ghost buttons.

**New semantic tokens (dark-aware where needed):**

| Token | Value |
|---|---|
| `bg.emphasized` | `{ _light: '{colors.gray.100}', _dark: '{colors.whiteAlpha.100}' }` |
| `border.emphasized` | `{ _light: '{colors.gray.300}', _dark: '{colors.whiteAlpha.300}' }` |

**`globalCss` in `theme.ts`** — dark mode only, outline + ghost variants:

- Outline hover: `borderColor: border.emphasized`, `bg: bg.emphasized`
- Ghost hover: `bg: bg.emphasized`

Implementation verifies selectors against Chakra v3's rendered `data-variant`
attributes (adjust if DOM differs). Light mode uses existing defaults; no
globalCss override needed for light.

**Not in scope:** solid, subtle, surface, or plain button variants.

## 5. Files touched

| File | Change |
|---|---|
| `apps/web/src/theme.ts` | New `signal` blue ramp; `bg.emphasized` / `border.emphasized` semantic tokens; `globalCss` dark hover rules |
| `apps/web/src/app/(dashboard)/layout.tsx` | `Box maxW="5xl" mx="auto" w="full"` wrapper around `{children}` |

No other files required unless `globalCss` selectors need a follow-up tweak
after manual dark-mode QA.

## 6. Testing & verification

- **Automated:** `bunx nx test web` — must pass unmodified (no `lib/*` changes).
- **Build:** `bunx nx build web` — must succeed.
- **Manual QA:**
  1. Toggle dark mode; hover outline buttons (Save, Connect, Send test release)
     — visible background/border shift on `#0E1420`.
  2. Confirm pulse, active nav, and primary CTAs read blue, not orange.
  3. Resize to wide viewport — main content centered in column beside sidebar,
     not left-aligned.
  4. Light mode regression — hovers and colors still readable on `paper`.

## 7. Non-goals

- Renaming `signal` → `brand` or migrating to `colorPalette="blue"`.
- Changing primary solid button hover behavior.
- i18n, Storybook, visual regression tooling.
