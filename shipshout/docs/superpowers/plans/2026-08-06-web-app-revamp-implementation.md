# Web App Revamp — TailAdmin Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin every page of `apps/web` to full TailAdmin visual parity using Chakra UI v3 — collapsible sidebar shell, sticky header, TailAdmin color tokens, Outfit font, shared component library — with zero functional/behavior changes.

**Architecture:** Replace `theme.ts` with TailAdmin token mappings, swap fonts to Outfit, copy logo/grid assets from `next-admin-template`. Build a new dashboard shell (`SidebarProvider` → `AppSidebar` + `AppHeader` + `DashboardShell`) matching TailAdmin layout behavior. Introduce Chakra equivalents of TailAdmin primitives (`ComponentCard`, `NavItem`, `GridShape`, `Logo`). Restyle all existing pages to consume the shell and primitives. Delete Pulse components and all `signal`/`beacon` token references.

**Tech Stack:** Chakra UI v3 (`@chakra-ui/react`, `@emotion/react`), `next-themes`, `react-icons/lu`, Next.js 16 App Router, `next/font/google` (Outfit), Nx monorepo.

**Design spec:** `docs/superpowers/specs/2026-08-06-web-app-revamp-design.md`

## Global Constraints

- Chakra UI **v3** API only: `colorPalette` (not `colorScheme`), `Field.Root`/`Field.Label`, `gap` (not `spacing`), `disabled` (not `isDisabled`).
- Primary accent is `colorPalette="brand"` — never `signal` or `beacon`.
- Font is **Outfit only** — remove Space Grotesk, Inter, JetBrains Mono.
- **Never edit `apps/web/src/lib/*.ts` or their `*.spec.ts` files.**
- No new features: every redirect, validation, disabled/loading condition, and API call stays identical — only rendering changes.
- Header has **no search bar and no notifications dropdown** (per spec).
- Workspace switcher lives in the **header**, not the sidebar.
- Branding uses **static SVG logos** — delete `Pulse` and `PulseField` entirely.
- No Storybook or new component test files. Verify via `nx build web`, `nx test web`, and manual browser check.
- Use `@/` path alias for all new shared components.
- Sign-out stays as `POST {NEXT_PUBLIC_API_BASE_URL}/api/auth/logout` from client components.
- Copy assets from `/Users/samsimson/Development/next-admin-template/public/images/` — do not add Tailwind as a dependency.
- Reference TailAdmin source at `/Users/samsimson/Development/next-admin-template/src/` for layout behavior and spacing.

---

### Task 1: TailAdmin theme tokens and Outfit font

**Files:**
- Modify: `apps/web/src/theme.ts`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/ui/provider.tsx` (only if dark-mode hover overrides reference old tokens)

**Interfaces:**
- Produces: `system` exported from `@/theme` with `brand`, `gray`, `success`, `error`, `warning`, `orange` color scales; semantic tokens `bg`, `fg`, `border`, `brand.*`; shadow tokens; Outfit font token; dark-mode button hover overrides using new tokens.

- [ ] **Step 1: Replace theme.ts with TailAdmin token mappings**

```typescript
// apps/web/src/theme.ts
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const gray = {
    25: { value: '#fcfcfd' },
    50: { value: '#f9fafb' },
    100: { value: '#f2f4f7' },
    200: { value: '#e4e7ec' },
    300: { value: '#d0d5dd' },
    400: { value: '#98a2b3' },
    500: { value: '#667085' },
    600: { value: '#475467' },
    700: { value: '#344054' },
    800: { value: '#1d2939' },
    900: { value: '#101828' },
    950: { value: '#0c111d' },
};

const brand = {
    25: { value: '#f2f7ff' },
    50: { value: '#ecf3ff' },
    100: { value: '#dde9ff' },
    200: { value: '#c2d6ff' },
    300: { value: '#9cb9ff' },
    400: { value: '#7592ff' },
    500: { value: '#465fff' },
    600: { value: '#3641f5' },
    700: { value: '#2a31d8' },
    800: { value: '#252dae' },
    900: { value: '#262e89' },
    950: { value: '#161950' },
};

const config = defineConfig({
    globalCss: {
        body: {
            bg: 'bg',
            color: 'fg',
            fontFamily: 'body',
        },
        '.dark [data-variant="outline"]:hover:not(:disabled)': {
            borderColor: 'border.emphasized',
            bg: 'bg.emphasized',
        },
        '.dark [data-variant="ghost"]:hover:not(:disabled)': {
            bg: 'bg.emphasized',
        },
    },
    theme: {
        tokens: {
            colors: { gray, brand },
            fonts: {
                heading: { value: 'var(--font-outfit), sans-serif' },
                body: { value: 'var(--font-outfit), sans-serif' },
            },
            radii: {
                lg: { value: '8px' },
                '2xl': { value: '16px' },
            },
            shadows: {
                'theme-xs': { value: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)' },
                'theme-sm': { value: '0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)' },
                'theme-md': { value: '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)' },
                'theme-lg': { value: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)' },
                'theme-xl': { value: '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)' },
            },
        },
        semanticTokens: {
            colors: {
                bg: { value: { _light: '{colors.gray.50}', _dark: '{colors.gray.900}' } },
                fg: { value: { _light: '{colors.gray.900}', _dark: 'rgba(255,255,255,0.9)' } },
                'fg.muted': { value: { _light: '{colors.gray.500}', _dark: '{colors.gray.400}' } },
                'fg.subtle': { value: { _light: '{colors.gray.400}', _dark: '{colors.gray.500}' } },
                border: { value: { _light: '{colors.gray.200}', _dark: '{colors.gray.800}' } },
                'bg.muted': { value: { _light: '{colors.gray.100}', _dark: 'rgba(255,255,255,0.05)' } },
                'bg.emphasized': { value: { _light: '{colors.gray.100}', _dark: 'rgba(255,255,255,0.1)' } },
                'border.emphasized': { value: { _light: '{colors.gray.300}', _dark: 'rgba(255,255,255,0.2)' } },
                brand: {
                    solid: { value: '{colors.brand.500}' },
                    contrast: { value: 'white' },
                    fg: { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.400}' } },
                    muted: { value: { _light: '{colors.brand.50}', _dark: 'rgba(70, 95, 255, 0.12)' } },
                    subtle: { value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' } },
                    emphasized: { value: { _light: '{colors.brand.300}', _dark: '{colors.brand.800}' } },
                    focusRing: { value: '{colors.brand.500}' },
                },
            },
        },
    },
});

export const system = createSystem(defaultConfig, config);
```

Add `success`, `error`, `warning`, `orange` scales from TailAdmin `globals.css` lines 81–131 into `tokens.colors` (copy hex values verbatim).

- [ ] **Step 2: Swap root layout to Outfit font**

```typescript
// apps/web/src/app/layout.tsx
import { Outfit } from 'next/font/google';
import { Provider } from '@/components/ui/provider';
import { Toaster } from '@/components/ui/toaster';
import './global.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata = {
    title: 'ShipShout',
    description: 'Ship it. Shout about it. Automatically.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={outfit.variable}>
            <body>
                <Provider>
                    {children}
                    <Toaster />
                </Provider>
            </body>
        </html>
    );
}
```

- [ ] **Step 3: Verify build**

Run: `cd shipshout && nx build web`
Expected: PASS (pages still compile; some `signal`/`beacon`/`heading` references will warn at runtime but TypeScript may still pass)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/theme.ts apps/web/src/app/layout.tsx
git commit -m "feat(web): replace theme with TailAdmin tokens and Outfit font"
```

---

### Task 2: Copy static assets from TailAdmin template

**Files:**
- Create: `apps/web/public/images/logo/logo.svg`
- Create: `apps/web/public/images/logo/logo-dark.svg`
- Create: `apps/web/public/images/logo/logo-icon.svg`
- Create: `apps/web/public/images/logo/auth-logo.svg`
- Create: `apps/web/public/images/shape/grid-01.svg`

**Interfaces:**
- Produces: Static assets served at `/images/logo/*` and `/images/shape/grid-01.svg`.

- [ ] **Step 1: Copy logo and shape SVGs**

```bash
mkdir -p apps/web/public/images/logo apps/web/public/images/shape
cp /Users/samsimson/Development/next-admin-template/public/images/logo/*.svg apps/web/public/images/logo/
cp /Users/samsimson/Development/next-admin-template/public/images/shape/grid-01.svg apps/web/public/images/shape/
```

- [ ] **Step 2: Verify files exist**

Run: `ls apps/web/public/images/logo/ apps/web/public/images/shape/`
Expected: 4 logo files + grid-01.svg

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/images/
git commit -m "feat(web): add TailAdmin logo and grid shape assets"
```

---

### Task 3: Sidebar context provider

**Files:**
- Create: `apps/web/src/context/sidebar-context.tsx`

**Interfaces:**
- Produces: `SidebarProvider`, `useSidebar()` returning `{ isExpanded, isMobileOpen, isHovered, toggleSidebar, toggleMobileSidebar, setIsHovered }`.

- [ ] **Step 1: Implement sidebar context**

Port logic from `next-admin-template/src/context/SidebarContext.tsx` to Chakra-free React context. Omit `activeItem`, `openSubmenu`, `toggleSubmenu` — ShipShout nav is flat (no collapsible submenu groups needed).

```typescript
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type SidebarContextValue = {
    isExpanded: boolean;
    isMobileOpen: boolean;
    isHovered: boolean;
    toggleSidebar: () => void;
    toggleMobileSidebar: () => void;
    setIsHovered: (hovered: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsMobileOpen(false);
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <SidebarContext.Provider
            value={{
                isExpanded: isMobile ? false : isExpanded,
                isMobileOpen,
                isHovered,
                toggleSidebar: () => setIsExpanded((v) => !v),
                toggleMobileSidebar: () => setIsMobileOpen((v) => !v),
                setIsHovered,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const ctx = useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
    return ctx;
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd shipshout && nx build web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/context/sidebar-context.tsx
git commit -m "feat(web): add sidebar context for collapsible layout"
```

---

### Task 4: Logo, GridShape, and ComponentCard primitives

**Files:**
- Create: `apps/web/src/components/logo.tsx`
- Create: `apps/web/src/components/grid-shape.tsx`
- Create: `apps/web/src/components/component-card.tsx`

**Interfaces:**
- Produces: `Logo({ variant: 'full' | 'icon' })`, `GridShape()`, `ComponentCard({ title, desc?, children, className? })`.

- [ ] **Step 1: Implement Logo component**

```tsx
'use client';

import Image from 'next/image';
import { useColorMode } from '@/components/ui/color-mode';

export function Logo({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
    const { colorMode } = useColorMode();
    if (variant === 'icon') {
        return <Image src="/images/logo/logo-icon.svg" alt="ShipShout" width={32} height={32} priority />;
    }
    const src = colorMode === 'dark' ? '/images/logo/logo-dark.svg' : '/images/logo/logo.svg';
    return <Image src={src} alt="ShipShout" width={150} height={40} priority />;
}
```

- [ ] **Step 2: Implement GridShape**

```tsx
import Image from 'next/image';
import { Box } from '@chakra-ui/react';

export function GridShape() {
    return (
        <>
            <Box position="absolute" top="0" right="0" zIndex="-1" maxW={{ base: '250px', xl: '450px' }} w="full">
                <Image src="/images/shape/grid-01.svg" alt="" width={540} height={254} />
            </Box>
            <Box position="absolute" bottom="0" left="0" zIndex="-1" maxW={{ base: '250px', xl: '450px' }} w="full" transform="rotate(180deg)">
                <Image src="/images/shape/grid-01.svg" alt="" width={540} height={254} />
            </Box>
        </>
    );
}
```

- [ ] **Step 3: Implement ComponentCard**

```tsx
import { Box, Heading, Text } from '@chakra-ui/react';

export function ComponentCard({
    title,
    desc,
    children,
}: {
    title: string;
    desc?: string;
    children: React.ReactNode;
}) {
    return (
        <Box borderWidth="1px" borderColor="border" borderRadius="2xl" bg={{ _light: 'white', _dark: 'rgba(255,255,255,0.03)' }}>
            <Box px="6" py="5">
                <Heading size="md" fontWeight="medium">{title}</Heading>
                {desc && <Text mt="1" fontSize="sm" color="fg.muted">{desc}</Text>}
            </Box>
            <Box p={{ base: 4, sm: 6 }} borderTopWidth="1px" borderColor={{ _light: 'gray.100', _dark: 'gray.800' }}>
                {children}
            </Box>
        </Box>
    );
}
```

- [ ] **Step 4: Verify build**

Run: `cd shipshout && nx build web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/logo.tsx apps/web/src/components/grid-shape.tsx apps/web/src/components/component-card.tsx
git commit -m "feat(web): add Logo, GridShape, and ComponentCard primitives"
```

---

### Task 5: NavItem and WorkspaceSwitcher

**Files:**
- Create: `apps/web/src/components/nav-item.tsx`
- Create: `apps/web/src/components/workspace-switcher.tsx`
- Delete later: `apps/web/src/components/nav-link.tsx` (Task 14)

**Interfaces:**
- Produces: `NavItem({ href, icon, children })`, `WorkspaceSwitcher({ workspaces, activeId? })`.
- Consumes: `usePathname()` for active state; workspace type `{ id: string; name: string }[]`.

- [ ] **Step 1: Implement NavItem**

Match TailAdmin `menu-item-active` / `menu-item-inactive` styling:

```tsx
'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { HStack, Text } from '@chakra-ui/react';

export function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
    const pathname = usePathname();
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return (
        <NextLink href={href} style={{ textDecoration: 'none' }}>
            <HStack
                gap="3"
                px="3"
                py="2"
                borderRadius="lg"
                fontSize="sm"
                fontWeight="medium"
                bg={active ? 'brand.muted' : 'transparent'}
                color={active ? 'brand.fg' : { _light: 'gray.700', _dark: 'gray.300' }}
                _hover={{ bg: active ? 'brand.muted' : 'bg.muted' }}
            >
                <Text as="span" color={active ? 'brand.solid' : { _light: 'gray.500', _dark: 'gray.400' }}>{icon}</Text>
                {children}
            </HStack>
        </NextLink>
    );
}
```

- [ ] **Step 2: Implement WorkspaceSwitcher**

Extract from `apps/web/src/app/(dashboard)/sidebar.tsx` `WorkspaceMenu`, styled as header dropdown:

```tsx
'use client';

import NextLink from 'next/link';
import { Box, Menu, Portal, Text } from '@chakra-ui/react';
import { LuChevronDown, LuPlus } from 'react-icons/lu';

type Workspace = { id: string; name: string };

export function WorkspaceSwitcher({ workspaces, activeId }: { workspaces: Workspace[]; activeId?: string }) {
    const active = workspaces.find((w) => w.id === activeId);
    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <Box
                    as="button"
                    display="flex"
                    alignItems="center"
                    gap="2"
                    px="3"
                    py="2"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border"
                    fontSize="sm"
                    fontWeight="medium"
                    _hover={{ bg: 'bg.muted' }}
                >
                    <Text truncate maxW="160px">{active?.name ?? 'Select workspace'}</Text>
                    <LuChevronDown />
                </Box>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner>
                    <Menu.Content minW="12rem">
                        {workspaces.map((ws) => (
                            <Menu.Item key={ws.id} value={ws.id} asChild>
                                <NextLink href={`/${ws.id}/drafts`}>{ws.name}</NextLink>
                            </Menu.Item>
                        ))}
                        <Menu.Separator />
                        <Menu.Item value="__new__" asChild>
                            <NextLink href="/"><LuPlus /> New workspace</NextLink>
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}
```

- [ ] **Step 3: Verify build**

Run: `cd shipshout && nx build web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/nav-item.tsx apps/web/src/components/workspace-switcher.tsx
git commit -m "feat(web): add NavItem and WorkspaceSwitcher components"
```

---

### Task 6: AppSidebar and mobile Backdrop

**Files:**
- Create: `apps/web/src/layout/app-sidebar.tsx`
- Create: `apps/web/src/layout/backdrop.tsx`

**Interfaces:**
- Consumes: `useSidebar()`, `NavItem`, `Logo`, `usePathname()`.
- Produces: `AppSidebar({ activeWs?: string })`.

Nav config (icons from `react-icons/lu`):

| Label | href | Icon |
|---|---|---|
| Drafts | `/${activeWs}/drafts` | `LuFileText` |
| Repositories | `/${activeWs}/settings/repositories` | `LuFolderGit2` |
| Connections | `/${activeWs}/settings/connections` | `LuPlug` |
| Brand | `/${activeWs}/settings/brand` | `LuPalette` |
| Billing | `/${activeWs}/settings/billing` | `LuCreditCard` |

- [ ] **Step 1: Implement Backdrop**

```tsx
'use client';

import { Box } from '@chakra-ui/react';
import { useSidebar } from '@/context/sidebar-context';

export function Backdrop() {
    const { isMobileOpen, toggleMobileSidebar } = useSidebar();
    if (!isMobileOpen) return null;
    return (
        <Box
            position="fixed"
            inset="0"
            bg="blackAlpha.600"
            zIndex="40"
            display={{ base: 'block', lg: 'none' }}
            onClick={toggleMobileSidebar}
        />
    );
}
```

- [ ] **Step 2: Implement AppSidebar**

Port width logic from TailAdmin `AppSidebar.tsx`:
- Expanded: 290px; collapsed: 90px; hover on collapsed → 290px
- Mobile: off-canvas with translate-x
- Section headers: "Menu" (Drafts), "Settings" (4 items)
- Logo: full when expanded/hovered/mobile-open, icon when collapsed
- `onMouseEnter`/`onMouseLeave` for hover expand when collapsed

Use Chakra `Box as="aside"` with `position="fixed"`, `h="100vh"`, `borderRightWidth="1px"`, `transition="width 0.3s ease"`.

Only render nav items when `activeWs` is defined (same as current `SidebarNav` behavior).

- [ ] **Step 3: Verify build**

Run: `cd shipshout && nx build web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/layout/app-sidebar.tsx apps/web/src/layout/backdrop.tsx
git commit -m "feat(web): add collapsible AppSidebar and mobile Backdrop"
```

---

### Task 7: AppHeader and DashboardShell

**Files:**
- Create: `apps/web/src/layout/app-header.tsx`
- Create: `apps/web/src/layout/dashboard-shell.tsx`

**Interfaces:**
- Consumes: `useSidebar()`, `Logo`, `WorkspaceSwitcher`, `ColorModeButton`, session user `{ name?: string; githubId?: string }`, workspaces array.
- Produces: `AppHeader({ workspaces, activeWs, user })`, `DashboardShell({ workspaces, activeWs, user, children })`.

- [ ] **Step 1: Implement AppHeader**

Elements (no search, no notifications):
1. Sidebar toggle button (hamburger/close) — `toggleSidebar` on lg+, `toggleMobileSidebar` on mobile
2. Mobile-only `<Logo variant="full" />` link to `/`
3. Spacer / flex grow
4. `WorkspaceSwitcher`
5. `ColorModeButton` — restyle with `variant="outline"`, `borderColor="border"`, size matching TailAdmin 44px button
6. User dropdown (avatar + name + sign out) — port from current `sidebar.tsx` `UserMenu`

Sticky header: `position="sticky"`, `top="0"`, `zIndex="30"`, `bg="white"` / `_dark: gray.900`, `borderBottomWidth="1px"`.

- [ ] **Step 2: Implement DashboardShell**

```tsx
'use client';

import { Box, Flex } from '@chakra-ui/react';
import { SidebarProvider, useSidebar } from '@/context/sidebar-context';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { Backdrop } from './backdrop';

function ShellBody({ workspaces, activeWs, user, children }: DashboardShellProps) {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();
    const sidebarWide = isMobileOpen || isExpanded || isHovered;
    const ml = sidebarWide ? '290px' : '90px';

    return (
        <Box minH="100vh" bg="bg">
            <AppSidebar activeWs={activeWs} />
            <Backdrop />
            <Box ml={{ base: 0, lg: ml }} transition="margin-left 0.3s ease">
                <AppHeader workspaces={workspaces} activeWs={activeWs} user={user} />
                <Box as="main" p={{ base: 4, md: 6 }} maxW="1536px" mx="auto">
                    {children}
                </Box>
            </Box>
        </Box>
    );
}

export function DashboardShell(props: DashboardShellProps) {
    return (
        <SidebarProvider>
            <ShellBody {...props} />
        </SidebarProvider>
    );
}
```

- [ ] **Step 3: Verify build**

Run: `cd shipshout && nx build web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/layout/app-header.tsx apps/web/src/layout/dashboard-shell.tsx
git commit -m "feat(web): add AppHeader and DashboardShell layout"
```

---

### Task 8: Wire dashboard layout to new shell

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Delete: `apps/web/src/app/(dashboard)/sidebar.tsx`

**Interfaces:**
- Consumes: `DashboardShell`, existing `getSessionUser`, `getWorkspaces`, `redirect`.

- [ ] **Step 1: Replace dashboard layout**

```tsx
import { redirect } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';
import { DashboardShell } from '@/layout/dashboard-shell';

async function getWorkspaces() {
    try {
        return await apiFetch('/workspaces');
    } catch {
        return [];
    }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getSessionUser();
    if (!user) redirect('/login');
    const workspaces = await getWorkspaces();
    const activeWs = workspaces[0]?.id;
    return (
        <DashboardShell workspaces={workspaces} activeWs={activeWs} user={user}>
            {children}
        </DashboardShell>
    );
}
```

Note: `[workspaceId]/layout.tsx` may need to pass the correct `activeWs` from params — if so, move workspace resolution to a client wrapper or pass `activeWs` from child layout. Check `apps/web/src/app/(dashboard)/[workspaceId]/layout.tsx` and update `DashboardShell` to accept `activeWs` from the URL segment when inside `[workspaceId]` routes. Simplest approach: make `DashboardShell` read `workspaceId` from `useParams()` in a thin client wrapper for `activeWs` override.

- [ ] **Step 2: Delete old sidebar**

```bash
rm apps/web/src/app/(dashboard)/sidebar.tsx
```

- [ ] **Step 3: Fix activeWs from URL**

Add client helper `apps/web/src/layout/active-workspace.tsx` that reads `useParams().workspaceId` and passes it to shell components, falling back to `workspaces[0]?.id`.

- [ ] **Step 4: Verify dev server manually**

Run: `cd shipshout && nx dev web`
Expected: Dashboard loads with collapsible sidebar, header with workspace switcher, all nav links work.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/layout.tsx apps/web/src/layout/
git rm apps/web/src/app/(dashboard)/sidebar.tsx
git commit -m "feat(web): swap dashboard layout to TailAdmin shell"
```

---

### Task 9: Update shared components for brand tokens

**Files:**
- Modify: `apps/web/src/components/page-header.tsx`
- Modify: `apps/web/src/components/status-badge.tsx`
- Modify: `apps/web/src/components/ui/empty-state.tsx`
- Modify: `apps/web/src/components/ui/field.tsx`

**Interfaces:**
- Produces: Updated components using `brand` palette, TailAdmin typography sizes, no Pulse references.

- [ ] **Step 1: Update StatusBadge**

Remove Pulse import. Map tones:
- `active` → `colorPalette="brand"` with static dot
- `positive` → `colorPalette="success"`
- `neutral` → `colorPalette="gray"`

- [ ] **Step 2: Update PageHeader**

Match TailAdmin spacing: title `fontSize="2xl"` / `fontWeight="semibold"`, description `fontSize="sm"` `color="fg.muted"`, `mb="6"`.

- [ ] **Step 3: Update EmptyState and Field**

EmptyState: bordered `rounded-2xl` card aesthetic.
Field: inputs with `borderColor="border"`, `borderRadius="lg"`, focus ring `brand.focusRing`, `shadow="theme-xs"`.

- [ ] **Step 4: Run tests**

Run: `cd shipshout && nx test web`
Expected: PASS (lib specs unchanged)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(web): restyle shared components for TailAdmin brand tokens"
```

---

### Task 10: Restyle dashboard pages

**Files:**
- Modify: `apps/web/src/app/(dashboard)/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/create-workspace-form.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/draft-card.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-row.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/connect-github.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/select/repo-picker.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/connection-row.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/brand-form.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/billing-actions.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `ComponentCard`, `StatusBadge`, updated Field/EmptyState.

- [ ] **Step 1: Replace all `colorPalette="signal"` with `colorPalette="brand"`**

Run: `rg 'colorPalette="signal"|signal\.solid|signal\.muted|signal\.fg|beacon\.' apps/web/src --files-with-matches`
Replace each occurrence with `brand` equivalent.

- [ ] **Step 2: Wrap settings forms in ComponentCard**

Each settings page pattern:

```tsx
<>
    <PageHeader title="Brand" description="..." />
    <ComponentCard title="Brand voice" desc="How ShipShout writes for you.">
        <BrandForm ... />
    </ComponentCard>
</>
```

- [ ] **Step 3: Restyle draft cards**

`DraftCard`: use `borderRadius="2xl"`, `borderWidth="1px"`, `shadow="theme-sm"`, Publish button `colorPalette="brand"`.

- [ ] **Step 4: Restyle billing tier cards**

Replace `borderColor={t.highlighted ? 'signal.solid' : 'border'}` with `brand.solid`.

- [ ] **Step 5: Verify build and tests**

Run: `cd shipshout && nx build web && nx test web`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(dashboard)/
git commit -m "feat(web): restyle dashboard pages with TailAdmin components"
```

---

### Task 11: Loading skeleton states

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/loading.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/loading.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/loading.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/loading.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/loading.tsx`

**Interfaces:**
- Consumes: Chakra `Skeleton`, `SkeletonText`, `SimpleGrid`.

- [ ] **Step 1: Implement skeleton layouts matching page structure**

Example for drafts:

```tsx
import { SimpleGrid, Skeleton, Stack } from '@chakra-ui/react';

export default function Loading() {
    return (
        <Stack gap="6">
            <Skeleton height="8" width="40" borderRadius="lg" />
            <Skeleton height="4" width="64" borderRadius="lg" />
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
                <Skeleton height="48" borderRadius="2xl" />
                <Skeleton height="48" borderRadius="2xl" />
            </SimpleGrid>
        </Stack>
    );
}
```

Apply similar patterns to each settings loading file (card-shaped skeleton for forms, row skeletons for list pages).

- [ ] **Step 2: Verify in browser**

Navigate to each settings route — confirm skeleton flash before content loads.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/**/loading.tsx
git commit -m "feat(web): add TailAdmin-style loading skeletons"
```

---

### Task 12: Login split auth layout

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/components/auth/login-form.tsx`

**Interfaces:**
- Consumes: `GridShape`, `Logo`, `ColorModeButton`, existing GitHub OAuth URL logic.

- [ ] **Step 1: Create LoginForm client component**

Port TailAdmin `SignInForm` layout but with only GitHub button (no email/password):

```tsx
'use client';

import { Button, Heading, Text, VStack } from '@chakra-ui/react';
import { LuGithub } from 'react-icons/lu';

export function LoginForm({ authUrl, error }: { authUrl: string; error?: string }) {
    return (
        <VStack align="stretch" gap="6" maxW="md" mx="auto" w="full" px="6" py="10">
            <VStack align="stretch" gap="2">
                <Heading size="xl" fontWeight="semibold">Sign in</Heading>
                <Text fontSize="sm" color="fg.muted">Connect your GitHub account to get started.</Text>
            </VStack>
            {error && (
                <Text color="fg.error" fontSize="sm">
                    GitHub sign-in failed. Start again — don&apos;t reuse the callback URL from your browser history.
                </Text>
            )}
            <Button asChild size="lg" colorPalette="brand">
                <a href={authUrl}><LuGithub /> Sign in with GitHub</a>
            </Button>
        </VStack>
    );
}
```

- [ ] **Step 2: Rewrite login page with split layout**

```tsx
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import { ColorModeButton } from '@/components/ui/color-mode';
import { GridShape } from '@/components/grid-shape';
import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams;
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/github`;
    return (
        <Flex minH="100vh" bg="bg">
            <Flex flex="1" align="center" justify="center">
                <LoginForm authUrl={url} error={error} />
            </Flex>
            <Box display={{ base: 'none', lg: 'flex' }} flex="1" bg="brand.950" alignItems="center" justifyContent="center" position="relative" overflow="hidden">
                <GridShape />
                <VStack gap="4" zIndex="1" textAlign="center">
                    <Image src="/images/logo/auth-logo.svg" alt="ShipShout" width={231} height={48} />
                    <Text color="gray.400" maxW="xs">Ship it. Shout about it. Automatically.</Text>
                </VStack>
            </Box>
            <Box position="fixed" bottom="6" right="6" zIndex="50">
                <ColorModeButton />
            </Box>
        </Flex>
    );
}
```

Remove `PulseField` import.

- [ ] **Step 3: Verify login page in browser**

Run: `cd shipshout && nx dev web`
Expected: Split layout on desktop, single column on mobile, GitHub button works.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/login/ apps/web/src/components/auth/
git commit -m "feat(web): restyle login with TailAdmin split auth layout"
```

---

### Task 13: Forbidden and tweet generator pages

**Files:**
- Modify: `apps/web/src/app/forbidden/page.tsx`
- Modify: `apps/web/src/app/tools/tweet-generator/page.tsx`
- Modify: `apps/web/src/app/tools/tweet-generator/generator.tsx`

**Interfaces:**
- Consumes: `GridShape`, `ComponentCard`, `brand` palette.

- [ ] **Step 1: Restyle forbidden page**

TailAdmin error-page pattern: full viewport, `GridShape` background, centered icon + heading + outline button. Remove `PulseField`. Use `colorPalette="brand"` on CTA.

- [ ] **Step 2: Restyle tweet generator page**

Remove `PulseField`. Hero with Outfit typography. Wrap `<Generator />` in `ComponentCard title="Generate tweet"`. Use `maxW="2xl" mx="auto"`.

- [ ] **Step 3: Update generator button**

Change `colorPalette="signal"` → `colorPalette="brand"` in `generator.tsx`.

- [ ] **Step 4: Run tests (generator spec must pass)**

Run: `cd shipshout && nx test web --testPathPattern=generator.spec`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/forbidden/ apps/web/src/app/tools/
git commit -m "feat(web): restyle forbidden and tweet generator pages"
```

---

### Task 14: Cleanup legacy Pulse and token references

**Files:**
- Delete: `apps/web/src/components/ui/pulse.tsx`
- Delete: `apps/web/src/components/nav-link.tsx`
- Modify: any remaining files referencing Pulse, signal, beacon, or old fonts

**Interfaces:**
- Produces: Zero references to removed components/tokens.

- [ ] **Step 1: Delete Pulse and NavLink**

```bash
rm apps/web/src/components/ui/pulse.tsx
rm apps/web/src/components/nav-link.tsx
```

- [ ] **Step 2: Grep for stale references**

Run: `rg 'Pulse|PulseField|signal\.|beacon\.|colorPalette="signal"|colorPalette="beacon"|font-heading|fontFamily="heading"|nav-link' apps/web/src`
Expected: No matches

Fix any remaining hits.

- [ ] **Step 3: Final verification**

Run: `cd shipshout && nx build web && nx test web`
Expected: PASS

- [ ] **Step 4: Manual checklist**

- [ ] Light and dark mode on every page
- [ ] Sidebar collapse, hover-expand, mobile drawer
- [ ] Workspace switcher in header
- [ ] Active nav highlighting
- [ ] GitHub sign-in flow
- [ ] Tweet generator standalone page
- [ ] Loading skeletons on navigation

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/
git commit -m "chore(web): remove Pulse components and legacy signal/beacon tokens"
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| TailAdmin color palette | Task 1 |
| Outfit font | Task 1 |
| Logo SVG assets | Task 2 |
| Collapsible sidebar 90/290px | Tasks 3, 6 |
| Sticky header (no search/notifications) | Task 7 |
| Workspace switcher in header | Tasks 5, 7 |
| ComponentCard primitive | Task 4 |
| GridShape | Task 4 |
| Dashboard shell swap | Task 8 |
| All dashboard pages restyled | Task 10 |
| Loading skeletons | Task 11 |
| Login split auth | Task 12 |
| Forbidden page | Task 13 |
| Tweet generator | Task 13 |
| Remove Pulse/branding | Task 14 |
| No lib/* changes | All tasks |
| nx build + nx test pass | Tasks 1, 8, 10, 14 |
