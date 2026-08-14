# Production-Grade Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin every existing page of `apps/web` on real Chakra UI v3 components and a custom design system (the "broadcast pulse" identity, `ink`/`paper`/`signal`/`beacon` tokens, `Space Grotesk`/`Inter`/`JetBrains Mono` type), replacing today's raw HTML + inline `style={{}}` markup — with zero functional/behavior changes.

**Architecture:** A single custom Chakra `system` (tokens + semantic tokens + a `pulseRing` keyframe) replaces `defaultSystem` in the existing `Provider`. A small set of shared primitives (`Pulse`/`PulseField`, `Field`, `EmptyState`, `PageHeader`, `StatusBadge`, `SecretReveal`, `NavLink`) get built once and reused across every page. The authenticated app shell moves from a horizontal `<header>` to a `Sidebar` (desktop aside + mobile `Drawer`) rendered from `(dashboard)/layout.tsx`. Every page under `(dashboard)/[workspaceId]/**` is rewritten to consume the shell's padding (no more per-page `<main style={{padding}}>`) and the shared primitives. `apps/web/src/lib/*.ts` (API request modules) are consumed exactly as they are today — this plan never edits them.

**Tech Stack:** Chakra UI v3 (`@chakra-ui/react`, `@emotion/react`, already installed), `next-themes` (already installed), `react-icons` (already installed), Next.js 16 App Router, `next/font/google`.

## Global Constraints

- Chakra UI **v3** API only: `colorPalette` (not `colorScheme`), `Field.Root`/`Field.Label` (not `FormControl`), `NativeSelect` (not a v2-style `Select`), `gap` (not `spacing`) on `Stack`/`HStack`/`VStack`, `disabled` (not `isDisabled`) on inputs/buttons.
- No custom component recipes or slot recipes — only token/semantic-token overrides plus Chakra's built-in component variants (`solid`/`outline`/`subtle`/`surface`/`ghost`, `colorPalette`).
- **Never edit `apps/web/src/lib/*.ts` or their `*.spec.ts` files.** Every lib export (`createWorkspace`, `listRepositories`, `createRepository`, `simulateRelease`, `listConnections`, `mockConnect`, `connectUrl`, `listDrafts`, `updateDraft`, `approveDraft`, `publishDraft`, `getBrand`, `saveBrand`, `startCheckout`, `openPortal`, `getSessionUser`, `apiFetch`) is consumed with its exact existing signature. Keep each modified file's existing relative import paths to `lib/*` unchanged (only its JSX/markup changes).
- No new feature or behavior change: every redirect, validation rule, disabled/loading condition, and API call stays identical to today — only rendering changes.
- No Storybook, no visual regression tooling, no new `.spec.tsx` component tests — this codebase's only UI test convention is `apps/web/src/lib/*.spec.ts` (Jest) and the one component-adjacent test, `apps/web/src/app/tools/tweet-generator/generator.spec.ts` (tests the exported `generateTweet` function, not the rendered component). Both must keep passing unmodified. New/changed `.tsx` markup is verified manually via `bunx nx dev web`.
- The pulse motif (`Pulse`/`PulseField`, Task 2) must respect `prefers-reduced-motion`: the ring animation becomes `animation: none` under that media query.
- Use the `@/` path alias (already configured in `apps/web/tsconfig.json` → `./src/*`) for every new shared component import (`@/components/...`, `@/theme`). Existing page files keep their current relative-import style for `lib/*` — don't rewrite unrelated imports.
- Sign-out calls `POST {NEXT_PUBLIC_API_BASE_URL}/api/auth/logout` (confirmed in `apps/api/src/app/auth/auth.controller.ts`) directly from the client component — it is **not** added to `lib/session.ts`, since that would violate the "never edit `lib/*.ts`" constraint.
- Test command for the untouched lib specs: `bunx nx test web`. Dev server for manual verification: `bunx nx dev web` (pair with `bunx nx serve api` for real data).

---

### Task 1: Custom Chakra v3 theme, fonts, and provider wiring

**Files:**
- Create: `apps/web/src/theme.ts`
- Modify: `apps/web/src/components/ui/provider.tsx`
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Produces: `system` (Chakra `System`, exported from `@/theme`) with color tokens `ink`/`paper`/`cloud`/`slate`/`signal.50-950`/`beacon.50-950`, semantic tokens `signal.{solid,contrast,fg,muted,subtle,emphasized,focusRing}`, `beacon.{...same}`, and overridden `bg`/`fg`/`border`; font tokens `heading`/`body`/`mono`; keyframe + token `pulseRing`. Consumed by every later task via `colorPalette="signal"` / `colorPalette="beacon"` / `bg="bg.muted"` / `animation="pulseRing"` / `fontFamily="heading"`.

- [ ] **Step 1: Implement the theme**

```typescript
// apps/web/src/theme.ts
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
    theme: {
        keyframes: {
            pulseRing: {
                '0%': { transform: 'scale(0.8)', opacity: '0.7' },
                '80%': { transform: 'scale(1.8)', opacity: '0' },
                '100%': { transform: 'scale(1.8)', opacity: '0' },
            },
        },
        tokens: {
            colors: {
                ink: { value: '#0E1420' },
                paper: { value: '#F7F7F5' },
                cloud: { value: '#E7E9EE' },
                slate: { value: '#6B7280' },
                signal: {
                    50: { value: '#FFF3F0' },
                    100: { value: '#FFE2DC' },
                    200: { value: '#FFC7BA' },
                    300: { value: '#FFA792' },
                    400: { value: '#FF8266' },
                    500: { value: '#FF5A3C' },
                    600: { value: '#E8431F' },
                    700: { value: '#C23315' },
                    800: { value: '#9C280F' },
                    900: { value: '#7A1F0C' },
                    950: { value: '#430F05' },
                },
                beacon: {
                    50: { value: '#EDFCFA' },
                    100: { value: '#D2F7F1' },
                    200: { value: '#A8EEE3' },
                    300: { value: '#74E0D2' },
                    400: { value: '#3DC9BC' },
                    500: { value: '#0EA5A0' },
                    600: { value: '#0B8683' },
                    700: { value: '#0A6B69' },
                    800: { value: '#0A5453' },
                    900: { value: '#0A4342' },
                    950: { value: '#052625' },
                },
            },
            fonts: {
                heading: { value: 'var(--font-heading), sans-serif' },
                body: { value: 'var(--font-body), sans-serif' },
                mono: { value: 'var(--font-mono), monospace' },
            },
            animations: {
                pulseRing: { value: 'pulseRing 2.2s ease-out infinite' },
            },
        },
        semanticTokens: {
            colors: {
                bg: { value: { _light: '{colors.paper}', _dark: '{colors.ink}' } },
                fg: { value: { _light: '{colors.ink}', _dark: '{colors.paper}' } },
                border: { value: { _light: '{colors.cloud}', _dark: '{colors.whiteAlpha.200}' } },
                signal: {
                    solid: { value: '{colors.signal.500}' },
                    contrast: { value: 'white' },
                    fg: { value: { _light: '{colors.signal.700}', _dark: '{colors.signal.300}' } },
                    muted: { value: { _light: '{colors.signal.100}', _dark: '{colors.signal.950}' } },
                    subtle: { value: { _light: '{colors.signal.200}', _dark: '{colors.signal.900}' } },
                    emphasized: { value: { _light: '{colors.signal.300}', _dark: '{colors.signal.800}' } },
                    focusRing: { value: '{colors.signal.500}' },
                },
                beacon: {
                    solid: { value: '{colors.beacon.500}' },
                    contrast: { value: 'white' },
                    fg: { value: { _light: '{colors.beacon.700}', _dark: '{colors.beacon.300}' } },
                    muted: { value: { _light: '{colors.beacon.100}', _dark: '{colors.beacon.950}' } },
                    subtle: { value: { _light: '{colors.beacon.200}', _dark: '{colors.beacon.900}' } },
                    emphasized: { value: { _light: '{colors.beacon.300}', _dark: '{colors.beacon.800}' } },
                    focusRing: { value: '{colors.beacon.500}' },
                },
            },
        },
    },
});

export const system = createSystem(defaultConfig, config);
```

- [ ] **Step 2: Point the provider at the custom system**

```tsx
// apps/web/src/components/ui/provider.tsx
'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/theme';
import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';

export function Provider(props: ColorModeProviderProps) {
    return (
        <ChakraProvider value={system}>
            <ColorModeProvider {...props} />
        </ChakraProvider>
    );
}
```

- [ ] **Step 3: Load fonts and render the `Toaster` in the root layout**

`Toaster` (from `apps/web/src/components/ui/toaster.tsx`) is exported but currently rendered nowhere in the tree — no toast would ever be visible. This step fixes that as part of wiring up the design system, since later tasks (Task 6 onward) rely on `toaster.create(...)` for error/success feedback.

```tsx
// apps/web/src/app/layout.tsx
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { Provider } from '@/components/ui/provider';
import { Toaster } from '@/components/ui/toaster';
import './global.css';

const heading = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
    title: 'ShipShout',
    description: 'Ship it. Shout about it. Automatically.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={`${heading.variable} ${body.variable} ${mono.variable}`}>
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

- [ ] **Step 4: (optional) Generate theme typegen for editor autocomplete**

```bash
cd apps/web && npx @chakra-ui/cli typegen src/theme.ts
```

This only improves editor autocompletion for custom tokens (e.g. `colorPalette="signal"`) — safe to skip if it errors; it has no runtime effect.

- [ ] **Step 5: Manual verification**

Run: `bunx nx dev web`
Expected: the app still boots with no console errors; open any page, open devtools, confirm `<body>` (or an element) computes `font-family` containing `Space Grotesk`/`Inter` (via `--font-heading`/`--font-body`); toggling OS-level "reduce motion" has no visible effect yet (nothing uses `pulseRing` until Task 2).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/theme.ts apps/web/src/components/ui/provider.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web): custom Chakra v3 theme (ink/paper/signal/beacon tokens, brand fonts, pulseRing keyframe)"
```

---

### Task 2: Shared primitives — `Pulse`/`PulseField`, `Field`, `EmptyState`

**Files:**
- Create: `apps/web/src/components/ui/pulse.tsx`
- Create: `apps/web/src/components/ui/field.tsx`
- Create: `apps/web/src/components/ui/empty-state.tsx`

**Interfaces:**
- Consumes: `pulseRing` animation token (Task 1).
- Produces: `Pulse({ size?, ...BoxProps })` (small animated dot+ring, signature motif instance #2/#3), `PulseField()` (ambient concentric rings for hero sections, instance #1), `Field({ label?, helperText?, errorText?, optionalText?, children, ...Field.RootProps })`, `EmptyState({ title, description?, icon?, children?, ...EmptyState.RootProps })`. Consumed by Tasks 3–12.

- [ ] **Step 1: Implement `Pulse`/`PulseField`**

```tsx
// apps/web/src/components/ui/pulse.tsx
import { Box, type BoxProps } from '@chakra-ui/react';

const REDUCED_MOTION = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

export interface PulseProps extends Omit<BoxProps, 'boxSize'> {
    size?: BoxProps['boxSize'];
}

/** Small animated dot + expanding ring — the wordmark mark and the "active/generating" StatusBadge indicator. */
export function Pulse({ size = '10px', ...rest }: PulseProps) {
    return (
        <Box position="relative" display="inline-block" boxSize={size} flexShrink="0" {...rest}>
            <Box position="absolute" inset="0" borderRadius="full" bg="signal.solid" />
            <Box position="absolute" inset="0" borderRadius="full" bg="signal.solid" css={{ animation: 'pulseRing', ...REDUCED_MOTION }} />
        </Box>
    );
}

/** Ambient concentric rings behind a hero headline — used once per marketing surface (login, tweet generator). */
export function PulseField() {
    return (
        <Box position="absolute" inset="0" display="grid" placeItems="center" overflow="hidden" pointerEvents="none" zIndex="0">
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    position="absolute"
                    boxSize={{ base: '220px', md: '380px' }}
                    borderRadius="full"
                    borderWidth="1px"
                    borderColor="signal.solid"
                    opacity="0.35"
                    css={{ animation: 'pulseRing', animationDelay: `${i * 0.8}s`, ...REDUCED_MOTION }}
                />
            ))}
        </Box>
    );
}
```

- [ ] **Step 2: Implement `Field`**

```tsx
// apps/web/src/components/ui/field.tsx
import { Field as ChakraField } from '@chakra-ui/react';
import * as React from 'react';

export interface FieldProps extends Omit<ChakraField.RootProps, 'label'> {
    label?: React.ReactNode;
    helperText?: React.ReactNode;
    errorText?: React.ReactNode;
    optionalText?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(props, ref) {
    const { label, children, helperText, errorText, optionalText, ...rest } = props;
    return (
        <ChakraField.Root ref={ref} {...rest}>
            {label && (
                <ChakraField.Label>
                    {label}
                    <ChakraField.RequiredIndicator fallback={optionalText} />
                </ChakraField.Label>
            )}
            {children}
            {helperText && <ChakraField.HelperText>{helperText}</ChakraField.HelperText>}
            {errorText && <ChakraField.ErrorText>{errorText}</ChakraField.ErrorText>}
        </ChakraField.Root>
    );
});
```

- [ ] **Step 3: Implement `EmptyState`**

```tsx
// apps/web/src/components/ui/empty-state.tsx
import { EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react';
import * as React from 'react';

export interface EmptyStateProps extends ChakraEmptyState.RootProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(props, ref) {
    const { title, description, icon, children, ...rest } = props;
    return (
        <ChakraEmptyState.Root ref={ref} {...rest}>
            <ChakraEmptyState.Content>
                {icon && <ChakraEmptyState.Indicator>{icon}</ChakraEmptyState.Indicator>}
                {description ? (
                    <VStack textAlign="center">
                        <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
                        <ChakraEmptyState.Description>{description}</ChakraEmptyState.Description>
                    </VStack>
                ) : (
                    <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
                )}
                {children}
            </ChakraEmptyState.Content>
        </ChakraEmptyState.Root>
    );
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/pulse.tsx apps/web/src/components/ui/field.tsx apps/web/src/components/ui/empty-state.tsx
git commit -m "feat(web): Pulse/PulseField, Field, and EmptyState shared primitives"
```

---

### Task 3: App-specific primitives — `PageHeader`, `StatusBadge`, `SecretReveal`, `NavLink`

**Files:**
- Create: `apps/web/src/components/page-header.tsx`
- Create: `apps/web/src/components/status-badge.tsx`
- Create: `apps/web/src/components/secret-reveal.tsx`
- Create: `apps/web/src/components/nav-link.tsx`

**Interfaces:**
- Consumes: `Pulse` (Task 2).
- Produces: `PageHeader({ title, description?, action?, ...FlexProps })`, `StatusBadge({ status, label? })`, `SecretReveal({ label, value })`, `NavLink({ href, children })`. Consumed by Task 4 (`NavLink`) and Tasks 5–12 (the rest).

- [ ] **Step 1: `PageHeader`**

```tsx
// apps/web/src/components/page-header.tsx
import { Flex, Heading, Text, type FlexProps } from '@chakra-ui/react';

export interface PageHeaderProps extends FlexProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function PageHeader({ title, description, action, ...rest }: PageHeaderProps) {
    return (
        <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="4" mb="6" {...rest}>
            <Flex direction="column" gap="1">
                <Heading size="lg">{title}</Heading>
                {description ? <Text color="fg.muted">{description}</Text> : null}
            </Flex>
            {action ? <Flex gap="2">{action}</Flex> : null}
        </Flex>
    );
}
```

- [ ] **Step 2: `StatusBadge`**

```tsx
// apps/web/src/components/status-badge.tsx
import { Badge, Box } from '@chakra-ui/react';
import { Pulse } from './ui/pulse';

type Tone = 'active' | 'positive' | 'neutral';

const TONE_BY_STATUS: Record<string, Tone> = {
    draft: 'neutral',
    pending_review: 'neutral',
    generating: 'active',
    approved: 'positive',
    published: 'positive',
    active: 'positive',
    connected: 'positive',
    not_connected: 'neutral',
    disabled: 'neutral',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
    const tone = TONE_BY_STATUS[status] ?? 'neutral';
    const colorPalette = tone === 'active' ? 'signal' : tone === 'positive' ? 'beacon' : 'gray';
    return (
        <Badge colorPalette={colorPalette} variant="subtle" size="sm" display="inline-flex" alignItems="center" gap="1.5">
            {tone === 'active' ? <Pulse size="6px" /> : tone === 'positive' ? <Box boxSize="6px" borderRadius="full" bg="beacon.solid" /> : null}
            {label ?? status.replace(/_/g, ' ')}
        </Badge>
    );
}
```

- [ ] **Step 3: `SecretReveal`**

```tsx
// apps/web/src/components/secret-reveal.tsx
'use client';

import { Clipboard, Code, HStack, IconButton } from '@chakra-ui/react';
import { LuCheck, LuClipboard } from 'react-icons/lu';

export function SecretReveal({ label, value }: { label: string; value: string }) {
    return (
        <HStack justify="space-between" bg="bg" borderWidth="1px" borderColor="border" borderRadius="md" px="3" py="2" gap="3">
            <Code colorPalette="gray" fontSize="sm" truncate>
                {value}
            </Code>
            <Clipboard.Root value={value}>
                <Clipboard.Trigger asChild>
                    <IconButton aria-label={`Copy ${label}`} size="xs" variant="surface">
                        <Clipboard.Indicator copied={<LuCheck />}>
                            <LuClipboard />
                        </Clipboard.Indicator>
                    </IconButton>
                </Clipboard.Trigger>
            </Clipboard.Root>
        </HStack>
    );
}
```

- [ ] **Step 4: `NavLink`**

```tsx
// apps/web/src/components/nav-link.tsx
'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { HStack } from '@chakra-ui/react';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname();
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return (
        <NextLink href={href} style={{ textDecoration: 'none' }}>
            <HStack
                gap="2"
                px="3"
                py="2"
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                borderStart="2px solid"
                borderStartColor={active ? 'signal.solid' : 'transparent'}
                bg={active ? 'signal.muted' : 'transparent'}
                color={active ? 'signal.fg' : 'fg.muted'}
                _hover={{ bg: active ? 'signal.muted' : 'bg.muted', color: active ? 'signal.fg' : 'fg' }}
            >
                {children}
            </HStack>
        </NextLink>
    );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/page-header.tsx apps/web/src/components/status-badge.tsx apps/web/src/components/secret-reveal.tsx apps/web/src/components/nav-link.tsx
git commit -m "feat(web): PageHeader, StatusBadge, SecretReveal, NavLink primitives"
```

---

### Task 4: App shell — `Sidebar` (desktop + mobile `Drawer`), workspace/user menus

**Files:**
- Create: `apps/web/src/app/(dashboard)/sidebar.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Delete: `apps/web/src/app/(dashboard)/workspace-switcher.tsx` (its behavior moves inline into `Sidebar`'s `WorkspaceMenu`)

**Interfaces:**
- Consumes: `NavLink` (Task 3), `Pulse` (Task 2), `ColorModeButton` (existing `apps/web/src/components/ui/color-mode.tsx`).
- Produces: **shell contract** — `(dashboard)/layout.tsx` renders `<Sidebar>` plus a padded `<Flex as="main">` for `{children}`. Every page under `(dashboard)/[workspaceId]/**` (Tasks 7–11) therefore renders directly into that padding — **no page keeps its own `<main style={{padding}}>` wrapper**; pages start with a `PageHeader` (or a fragment) followed by content, optionally wrapped in a `maxW`-constrained `Box`/`Stack`.

- [ ] **Step 1: Implement the `Sidebar`**

```tsx
// apps/web/src/app/(dashboard)/sidebar.tsx
'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Box, CloseButton, Drawer, Flex, HStack, IconButton, Menu, Portal, Text, VStack } from '@chakra-ui/react';
import { LuLogOut, LuMenu, LuPlus } from 'react-icons/lu';
import { ColorModeButton } from '@/components/ui/color-mode';
import { Pulse } from '@/components/ui/pulse';
import { NavLink } from '@/components/nav-link';

type Workspace = { id: string; name: string };
type SessionUser = { name?: string; githubId?: string };

function Wordmark() {
    return (
        <NextLink href="/" style={{ textDecoration: 'none' }}>
            <HStack gap="2">
                <Pulse size="10px" />
                <Text fontFamily="heading" fontWeight="bold" fontSize="lg" color="fg">
                    ShipShout
                </Text>
            </HStack>
        </NextLink>
    );
}

function WorkspaceMenu({ workspaces, activeId }: { workspaces: Workspace[]; activeId?: string }) {
    const active = workspaces.find((w) => w.id === activeId);
    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <Box as="button" w="full" textAlign="left" px="3" py="2" borderRadius="md" borderWidth="1px" borderColor="border" fontSize="sm" fontWeight="medium" _hover={{ bg: 'bg.muted' }}>
                    {active?.name ?? 'Select workspace'}
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
                            <NextLink href="/">
                                <LuPlus /> New workspace
                            </NextLink>
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}

function SidebarNav({ activeWs }: { activeWs?: string }) {
    if (!activeWs) return null;
    return (
        <VStack align="stretch" gap="1">
            <NavLink href={`/${activeWs}/drafts`}>Drafts</NavLink>
            <Text px="3" pt="4" pb="1" fontSize="xs" fontWeight="semibold" color="fg.subtle" textTransform="uppercase" letterSpacing="wide">
                Settings
            </Text>
            <NavLink href={`/${activeWs}/settings/repositories`}>Repositories</NavLink>
            <NavLink href={`/${activeWs}/settings/connections`}>Connections</NavLink>
            <NavLink href={`/${activeWs}/settings/brand`}>Brand</NavLink>
            <NavLink href={`/${activeWs}/settings/billing`}>Billing</NavLink>
        </VStack>
    );
}

function UserMenu({ user }: { user: SessionUser }) {
    const router = useRouter();
    const signOut = async () => {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        router.push('/login');
        router.refresh();
    };
    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <HStack as="button" w="full" px="2" py="2" borderRadius="md" _hover={{ bg: 'bg.muted' }} cursor="pointer">
                    <Avatar.Root size="xs">
                        <Avatar.Fallback name={user.name ?? user.githubId ?? 'User'} />
                    </Avatar.Root>
                    <Text fontSize="sm" truncate>
                        {user.name ?? user.githubId}
                    </Text>
                </HStack>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner>
                    <Menu.Content minW="10rem">
                        <Menu.Item value="sign-out" color="fg.error" _hover={{ bg: 'bg.error', color: 'fg.error' }} onClick={signOut}>
                            <LuLogOut /> Sign out
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}

export function Sidebar({ workspaces, activeWs, user }: { workspaces: Workspace[]; activeWs?: string; user: SessionUser }) {
    const [drawerOpen, setDrawerOpen] = useState(false);

    const navContent = (
        <VStack align="stretch" gap="6" h="full">
            <Wordmark />
            <WorkspaceMenu workspaces={workspaces} activeId={activeWs} />
            <Box flex="1" overflowY="auto">
                <SidebarNav activeWs={activeWs} />
            </Box>
            <HStack justify="space-between">
                <UserMenu user={user} />
                <ColorModeButton />
            </HStack>
        </VStack>
    );

    return (
        <>
            <Box as="aside" hideBelow="md" w="240px" flexShrink="0" borderRightWidth="1px" borderColor="border" p="4" h="100vh" position="sticky" top="0">
                {navContent}
            </Box>
            <Flex as="header" hideFrom="md" align="center" justify="space-between" px="4" py="3" borderBottomWidth="1px" borderColor="border">
                <Wordmark />
                <IconButton aria-label="Open menu" variant="ghost" onClick={() => setDrawerOpen(true)}>
                    <LuMenu />
                </IconButton>
            </Flex>
            <Drawer.Root open={drawerOpen} onOpenChange={(e) => setDrawerOpen(e.open)} placement="start">
                <Portal>
                    <Drawer.Backdrop />
                    <Drawer.Positioner>
                        <Drawer.Content>
                            <Drawer.CloseTrigger asChild>
                                <CloseButton position="absolute" top="2" insetEnd="2" size="sm" />
                            </Drawer.CloseTrigger>
                            <Drawer.Body pt="6">{navContent}</Drawer.Body>
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>
        </>
    );
}
```

- [ ] **Step 2: Rewire the dashboard layout**

```tsx
// apps/web/src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { Flex } from '@chakra-ui/react';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';
import { Sidebar } from './sidebar';

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
        <Flex minH="100vh" direction={{ base: 'column', md: 'row' }} bg="bg">
            <Sidebar workspaces={workspaces} activeWs={activeWs} user={user} />
            <Flex as="main" flex="1" direction="column" p={{ base: 4, md: 8 }} overflowY="auto">
                {children}
            </Flex>
        </Flex>
    );
}
```

- [ ] **Step 3: Delete the now-unused `workspace-switcher.tsx`**

```bash
rm "apps/web/src/app/(dashboard)/workspace-switcher.tsx"
```

- [ ] **Step 4: Manual verification**

Run: `bunx nx serve api` and `bunx nx dev web`, log in.
Expected: desktop width (≥768px) shows the left sidebar with wordmark, workspace menu, nav links, and a bottom row (user menu + color-mode toggle); resizing below 768px hides the sidebar and shows a top bar with a hamburger button that opens the same nav in a slide-over `Drawer`; clicking a nav link navigates and highlights with a `signal`-colored left border; opening the user menu and clicking "Sign out" redirects to `/login`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/sidebar.tsx apps/web/src/app/\(dashboard\)/layout.tsx
git rm "apps/web/src/app/(dashboard)/workspace-switcher.tsx"
git commit -m "feat(web): sidebar app shell with workspace/user menus and mobile drawer"
```

---

### Task 5: Login page redesign (marketing surface)

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

**Interfaces:**
- Consumes: `PulseField` (Task 2).

- [ ] **Step 1: Rebuild the page**

```tsx
// apps/web/src/app/login/page.tsx
import { Box, Button, VStack, Heading, Text } from '@chakra-ui/react';
import { LuGithub } from 'react-icons/lu';
import { PulseField } from '@/components/ui/pulse';

export default function LoginPage() {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/github`;
    return (
        <Box minH="100vh" display="grid" placeItems="center" bg="bg" position="relative" overflow="hidden" px="4">
            <PulseField />
            <VStack gap="6" textAlign="center" position="relative" zIndex="1" maxW="sm">
                <Heading as="h1" fontFamily="heading" fontSize={{ base: '4xl', md: '5xl' }} letterSpacing="tight">
                    ShipShout
                </Heading>
                <Text color="fg.muted" fontSize="lg">
                    Ship it. Shout about it. Automatically.
                </Text>
                <Button asChild size="lg" colorPalette="signal" px="8">
                    <a href={url}>
                        <LuGithub /> Sign in with GitHub
                    </a>
                </Button>
            </VStack>
        </Box>
    );
}
```

- [ ] **Step 2: Manual verification**

Run: `bunx nx dev web`, visit `/login`.
Expected: large centered headline with ambient rings pulsing behind it (static if OS "reduce motion" is on); a solid `signal`-colored "Sign in with GitHub" button that navigates to the API's GitHub OAuth start route when clicked.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat(web): redesign login page with pulse hero"
```

---

### Task 6: Dashboard (no-workspace) empty state + `CreateWorkspaceForm`

**Files:**
- Modify: `apps/web/src/app/(dashboard)/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/create-workspace-form.tsx`

**Interfaces:**
- Consumes: `EmptyState`, `Field` (Task 2); `createWorkspace` (existing `lib/workspaces.ts`, unchanged); `toaster` (existing `components/ui/toaster.tsx`).

- [ ] **Step 1: Rebuild `CreateWorkspaceForm`**

```tsx
// apps/web/src/app/(dashboard)/create-workspace-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Stack } from '@chakra-ui/react';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { createWorkspace } from '../../lib/workspaces';

export function CreateWorkspaceForm() {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                try {
                    const ws = await createWorkspace(name);
                    router.push(`/${ws.id}/drafts`);
                } catch {
                    toaster.create({ type: 'error', title: "Couldn't create workspace", description: 'Try a different name.' });
                    setSubmitting(false);
                }
            }}
        >
            <Stack gap="4" minW="sm">
                <Field label="Workspace name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required />
                </Field>
                <Button type="submit" colorPalette="signal" loading={submitting} loadingText="Creating…" disabled={!name.trim()}>
                    Create workspace
                </Button>
            </Stack>
        </form>
    );
}
```

- [ ] **Step 2: Rebuild the page around `EmptyState`**

```tsx
// apps/web/src/app/(dashboard)/page.tsx
import { redirect } from 'next/navigation';
import { Center } from '@chakra-ui/react';
import { LuBuilding2 } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';
import { CreateWorkspaceForm } from './create-workspace-form';

async function getWorkspaces() {
    try {
        return await apiFetch('/workspaces');
    } catch {
        return [];
    }
}

export default async function DashboardPage() {
    const user = await getSessionUser();
    if (!user) redirect('/login');
    const workspaces = await getWorkspaces();
    if (workspaces.length > 0) redirect(`/${workspaces[0].id}/drafts`);
    return (
        <Center minH="70vh">
            <EmptyState title="Create your first workspace" description="A workspace connects a repository to your social channels." icon={<LuBuilding2 />}>
                <CreateWorkspaceForm />
            </EmptyState>
        </Center>
    );
}
```

- [ ] **Step 3: Manual verification**

Log in with an account that has no workspaces yet.
Expected: a centered empty state with icon, title, description, and the create-workspace form below it; submitting redirects to `/{newId}/drafts`; submitting with a name that fails shows an error toast (bottom-end) instead of inline text.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/page.tsx apps/web/src/app/\(dashboard\)/create-workspace-form.tsx
git commit -m "feat(web): redesign no-workspace dashboard with EmptyState + Field form"
```

---

### Task 7: Drafts page + `DraftCard` + loading skeleton

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/draft-card.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/loading.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `EmptyState`, `StatusBadge` (Tasks 2–3); `listDrafts`/`updateDraft`/`approveDraft`/`publishDraft` (existing `lib/drafts.ts`, unchanged); `toaster`.

- [ ] **Step 1: Rebuild `DraftCard`**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/drafts/draft-card.tsx
'use client';

import { useState } from 'react';
import { Button, ButtonGroup, Card, Flex, Textarea } from '@chakra-ui/react';
import { StatusBadge } from '@/components/status-badge';
import { toaster } from '@/components/ui/toaster';
import { updateDraft, approveDraft, publishDraft } from '../../../../lib/drafts';

type Draft = { id: string; channel: string; generatedCopy: string; editedCopy?: string; status: string };

export function DraftCard({ workspaceId, draft }: { workspaceId: string; draft: Draft }) {
    const [copy, setCopy] = useState(draft.editedCopy ?? draft.generatedCopy);
    const [status, setStatus] = useState(draft.status);
    const [saving, setSaving] = useState(false);
    const [approving, setApproving] = useState(false);
    const [publishing, setPublishing] = useState(false);

    return (
        <Card.Root>
            <Card.Header>
                <Flex justify="space-between" align="center">
                    <Card.Title textTransform="capitalize">{draft.channel}</Card.Title>
                    <StatusBadge status={status} />
                </Flex>
            </Card.Header>
            <Card.Body>
                <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={4} />
            </Card.Body>
            <Card.Footer>
                <ButtonGroup size="sm" variant="outline">
                    <Button
                        loading={saving}
                        onClick={async () => {
                            setSaving(true);
                            try {
                                await updateDraft(workspaceId, draft.id, copy);
                                toaster.create({ type: 'success', title: 'Draft saved' });
                            } catch {
                                toaster.create({ type: 'error', title: "Couldn't save draft" });
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        Save
                    </Button>
                    <Button
                        loading={approving}
                        onClick={async () => {
                            setApproving(true);
                            try {
                                await approveDraft(workspaceId, draft.id);
                                setStatus('approved');
                            } catch {
                                toaster.create({ type: 'error', title: "Couldn't approve draft" });
                            } finally {
                                setApproving(false);
                            }
                        }}
                    >
                        Approve
                    </Button>
                    <Button
                        colorPalette="signal"
                        variant="solid"
                        loading={publishing}
                        disabled={status !== 'approved'}
                        onClick={async () => {
                            setPublishing(true);
                            try {
                                await publishDraft(workspaceId, draft.id);
                                setStatus('published');
                            } catch {
                                toaster.create({ type: 'error', title: "Couldn't publish draft" });
                            } finally {
                                setPublishing(false);
                            }
                        }}
                    >
                        Publish
                    </Button>
                </ButtonGroup>
            </Card.Footer>
        </Card.Root>
    );
}
```

- [ ] **Step 2: Rebuild the page**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/drafts/page.tsx
import { SimpleGrid } from '@chakra-ui/react';
import { LuMegaphone } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/page-header';
import { listDrafts } from '../../../../lib/drafts';
import { DraftCard } from './draft-card';

export default async function DraftsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const drafts = await listDrafts(workspaceId);
    return (
        <>
            <PageHeader title="Drafts" description="AI-generated posts waiting for your review." />
            {drafts.length === 0 ? (
                <EmptyState title="No drafts yet" description="Connect a repo and push a release to get started." icon={<LuMegaphone />} />
            ) : (
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
                    {drafts.map((d: { id: string }) => (
                        <DraftCard key={d.id} workspaceId={workspaceId} draft={d as any} />
                    ))}
                </SimpleGrid>
            )}
        </>
    );
}
```

- [ ] **Step 3: Add the loading skeleton**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/drafts/loading.tsx
import { SimpleGrid, Skeleton } from '@chakra-ui/react';

export default function DraftsLoading() {
    return (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
            {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height="180px" borderRadius="lg" />
            ))}
        </SimpleGrid>
    );
}
```

- [ ] **Step 4: Manual verification**

Navigate to `/{workspaceId}/drafts` (create a repo + send a test release first if the workspace has none — see Task 8).
Expected: a `Skeleton` grid flashes briefly on navigation; drafts render as cards with a channel title, `StatusBadge`, editable `Textarea`, and a Save/Approve/Publish button group where Publish is disabled until Approve has been clicked and each button shows a spinner while its own request is in flight.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/[workspaceId]/drafts"
git commit -m "feat(web): redesign Drafts page with Card, StatusBadge, and loading skeleton"
```

---

### Task 8: Repositories page + `RepositoryForm` + `RepositoryRow` + loading skeleton

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-form.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-row.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/loading.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `EmptyState`, `Field`, `SecretReveal` (Tasks 2–3); `listRepositories`/`createRepository`/`simulateRelease` (existing `lib/repositories.ts`, unchanged); `toaster`.

- [ ] **Step 1: Rebuild `RepositoryRow`**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-row.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Collapsible, Flex, Input, Stack, Textarea } from '@chakra-ui/react';
import { LuChevronDown } from 'react-icons/lu';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { simulateRelease } from '../../../../../lib/repositories';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export function RepositoryRow({ workspaceId, repo }: { workspaceId: string; repo: Repo }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(`Test release ${new Date().toLocaleString()}`);
    const [notes, setNotes] = useState('Testing the ShipShout pipeline.');
    const [sending, setSending] = useState(false);
    const router = useRouter();

    return (
        <Card.Root>
            <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
                <Card.Body>
                    <Flex justify="space-between" align="center">
                        <Stack gap="0">
                            <Card.Title>{repo.name}</Card.Title>
                            <Card.Description>{repo.provider}</Card.Description>
                        </Stack>
                        <Collapsible.Trigger asChild>
                            <Button variant="outline" size="sm">
                                Send test release
                                <Collapsible.Indicator transition="transform 0.2s" _open={{ transform: 'rotate(180deg)' }}>
                                    <LuChevronDown />
                                </Collapsible.Indicator>
                            </Button>
                        </Collapsible.Trigger>
                    </Flex>
                    <Collapsible.Content>
                        <Stack gap="3" pt="4">
                            <Field label="Title">
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                            </Field>
                            <Field label="Notes">
                                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                            </Field>
                            <Button
                                alignSelf="flex-start"
                                size="sm"
                                colorPalette="signal"
                                loading={sending}
                                onClick={async () => {
                                    setSending(true);
                                    try {
                                        const res = await simulateRelease(workspaceId, repo.id, { title, notes });
                                        toaster.create({
                                            type: res.accepted ? 'success' : 'error',
                                            title: res.accepted ? 'Queued — check Drafts in a few seconds.' : 'Not accepted (usage limit reached?).',
                                        });
                                        router.refresh();
                                    } catch {
                                        toaster.create({ type: 'error', title: 'Failed to send test release.' });
                                    } finally {
                                        setSending(false);
                                    }
                                }}
                            >
                                Send
                            </Button>
                        </Stack>
                    </Collapsible.Content>
                </Card.Body>
            </Collapsible.Root>
        </Card.Root>
    );
}
```

- [ ] **Step 2: Rebuild `RepositoryForm`**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, NativeSelect, Stack, Text } from '@chakra-ui/react';
import { Field } from '@/components/ui/field';
import { SecretReveal } from '@/components/secret-reveal';
import { toaster } from '@/components/ui/toaster';
import { createRepository } from '../../../../../lib/repositories';

function randomExternalId() {
    return Math.random().toString(36).slice(2, 10);
}

export function RepositoryForm({ workspaceId }: { workspaceId: string }) {
    const [provider, setProvider] = useState('github');
    const [name, setName] = useState('');
    const [externalId, setExternalId] = useState(randomExternalId());
    const [created, setCreated] = useState<{ webhookSecret: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    return (
        <Card.Root>
            <Card.Body>
                <Card.Title mb="4">Add a repository</Card.Title>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setSubmitting(true);
                        try {
                            const { webhookSecret } = await createRepository(workspaceId, { provider, name, externalId });
                            setCreated({ webhookSecret });
                            setName('');
                            setExternalId(randomExternalId());
                            router.refresh();
                        } catch {
                            toaster.create({ type: 'error', title: "Couldn't add repository", description: 'Check the fields and try again.' });
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                >
                    <Stack gap="4" maxW="md">
                        <Field label="Provider">
                            <NativeSelect.Root>
                                <NativeSelect.Field value={provider} onChange={(e) => setProvider(e.target.value)}>
                                    <option value="github">GitHub</option>
                                    <option value="linear">Linear</option>
                                    <option value="jira">Jira</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field>
                        <Field label="Name">
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="acme/website" required />
                        </Field>
                        <Field label="External ID" helperText="Must match the id in the incoming payload. Leave as-is if you'll only use “Send test release”.">
                            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} required />
                        </Field>
                        <Button type="submit" colorPalette="signal" loading={submitting} alignSelf="flex-start">
                            Add repository
                        </Button>
                    </Stack>
                </form>
                {created ? (
                    <Stack gap="2" mt="6" p="4" borderRadius="md" bg="beacon.muted">
                        <Text fontSize="sm" fontWeight="medium">
                            Webhook URL
                        </Text>
                        <SecretReveal label="webhook URL" value={`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/webhooks/github`} />
                        <Text fontSize="sm" fontWeight="medium" mt="2">
                            Webhook secret (shown once)
                        </Text>
                        <SecretReveal label="webhook secret" value={created.webhookSecret} />
                    </Stack>
                ) : null}
            </Card.Body>
        </Card.Root>
    );
}
```

- [ ] **Step 3: Rebuild the page**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/page.tsx
import { Stack } from '@chakra-ui/react';
import { LuGitBranch } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/page-header';
import { listRepositories } from '../../../../../lib/repositories';
import { RepositoryForm } from './repository-form';
import { RepositoryRow } from './repository-row';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export default async function RepositoriesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const repos: Repo[] = await listRepositories(workspaceId);
    return (
        <>
            <PageHeader title="Repositories" description="Connect a repo to trigger releases." />
            <Stack gap="6" maxW="2xl">
                {repos.length === 0 ? (
                    <EmptyState title="No repositories yet" description="Add one below to start shipping releases." icon={<LuGitBranch />} />
                ) : (
                    <Stack gap="3">
                        {repos.map((r) => (
                            <RepositoryRow key={r.id} workspaceId={workspaceId} repo={r} />
                        ))}
                    </Stack>
                )}
                <RepositoryForm workspaceId={workspaceId} />
            </Stack>
        </>
    );
}
```

- [ ] **Step 4: Add the loading skeleton**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/loading.tsx
import { Skeleton, Stack } from '@chakra-ui/react';

export default function RepositoriesLoading() {
    return (
        <Stack gap="3" maxW="2xl">
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} height="72px" borderRadius="lg" />
            ))}
        </Stack>
    );
}
```

- [ ] **Step 5: Manual verification**

Navigate to `/{workspaceId}/settings/repositories`.
Expected: empty state when there are no repos; adding one shows the webhook URL/secret in two `SecretReveal` rows (copy button flips to a checkmark for ~1s after clicking) inside a `beacon`-tinted callout; each existing repo row's "Send test release" button expands a `Collapsible` with Title/Notes fields and a Send button that shows a success/error toast.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories"
git commit -m "feat(web): redesign Repositories page with Collapsible test-release form and SecretReveal"
```

---

### Task 9: Connections page + `ConnectionRow` + loading skeleton

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/connection-row.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/loading.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `StatusBadge` (Tasks 2–3); `listConnections`/`mockConnect`/`connectUrl` (existing `lib/connections.ts`, unchanged); `toaster`.

- [ ] **Step 1: Rebuild `ConnectionRow`**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/connection-row.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Flex, HStack } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { LuLinkedin, LuMail, LuTwitter } from 'react-icons/lu';
import { SiBuffer, SiMailchimp } from 'react-icons/si';
import { StatusBadge } from '@/components/status-badge';
import { toaster } from '@/components/ui/toaster';
import { mockConnect, connectUrl } from '../../../../../lib/connections';

const LABELS: Record<string, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    email: 'Email',
    buffer: 'Buffer',
    mailchimp: 'Mailchimp',
};

const ICONS: Record<string, IconType> = {
    x: LuTwitter,
    linkedin: LuLinkedin,
    email: LuMail,
    buffer: SiBuffer,
    mailchimp: SiMailchimp,
};

export function ConnectionRow({ workspaceId, channel, connected }: { workspaceId: string; channel: string; connected: boolean }) {
    const [connecting, setConnecting] = useState(false);
    const router = useRouter();
    const Icon = ICONS[channel] ?? LuMail;

    return (
        <Card.Root>
            <Card.Body>
                <Flex justify="space-between" align="center" wrap="wrap" gap="3">
                    <HStack gap="3">
                        <Icon />
                        <Card.Title>{LABELS[channel] ?? channel}</Card.Title>
                        <StatusBadge status={connected ? 'connected' : 'not_connected'} label={connected ? 'Connected' : 'Not connected'} />
                    </HStack>
                    <HStack gap="2">
                        <Button asChild size="sm" variant="outline">
                            <a href={connectUrl(workspaceId, channel)}>Connect</a>
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            loading={connecting}
                            onClick={async () => {
                                setConnecting(true);
                                try {
                                    await mockConnect(workspaceId, channel);
                                    router.refresh();
                                } catch {
                                    toaster.create({ type: 'error', title: 'Test connect is disabled in this environment.' });
                                } finally {
                                    setConnecting(false);
                                }
                            }}
                        >
                            Connect (test)
                        </Button>
                    </HStack>
                </Flex>
            </Card.Body>
        </Card.Root>
    );
}
```

- [ ] **Step 2: Rebuild the page**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/page.tsx
import { Stack } from '@chakra-ui/react';
import { PageHeader } from '@/components/page-header';
import { listConnections } from '../../../../../lib/connections';
import { ConnectionRow } from './connection-row';

const CHANNELS = ['x', 'linkedin', 'email', 'buffer', 'mailchimp'] as const;

export default async function ConnectionsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const connections: { type: string; status: string }[] = await listConnections(workspaceId);
    return (
        <>
            <PageHeader title="Connections" description="Link the channels ShipShout publishes to." />
            <Stack gap="3" maxW="2xl">
                {CHANNELS.map((channel) => (
                    <ConnectionRow key={channel} workspaceId={workspaceId} channel={channel} connected={connections.some((c) => c.type === channel && c.status === 'active')} />
                ))}
            </Stack>
        </>
    );
}
```

- [ ] **Step 3: Add the loading skeleton**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/loading.tsx
import { Skeleton, Stack } from '@chakra-ui/react';

export default function ConnectionsLoading() {
    return (
        <Stack gap="3" maxW="2xl">
            {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height="64px" borderRadius="lg" />
            ))}
        </Stack>
    );
}
```

- [ ] **Step 4: Manual verification**

Navigate to `/{workspaceId}/settings/connections` with the API's `MOCK_CHANNELS=true` set.
Expected: five channel rows, each with an icon, name, and `StatusBadge`; clicking "Connect (test)" on X flips its badge from "Not connected" (gray) to "Connected" (beacon, with a static dot).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/[workspaceId]/settings/connections"
git commit -m "feat(web): redesign Connections page with channel icons and StatusBadge"
```

---

### Task 10: Brand page + `BrandForm` + loading skeleton

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/brand-form.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/loading.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `Field` (Tasks 2–3); `getBrand`/`saveBrand` (existing `lib/brand.ts`, unchanged); `toaster`.

- [ ] **Step 1: Rebuild `BrandForm`**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/brand-form.tsx
'use client';

import { useState } from 'react';
import { Button, Card, NativeSelect, Stack, Switch, Textarea } from '@chakra-ui/react';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { saveBrand } from '../../../../../lib/brand';

type Brand = { tone: string; customInstructions?: string; emojiPolicy: boolean };

export function BrandForm({ workspaceId, brand }: { workspaceId: string; brand: Brand }) {
    const [tone, setTone] = useState(brand.tone);
    const [customInstructions, setCustomInstructions] = useState(brand.customInstructions ?? '');
    const [emojiPolicy, setEmojiPolicy] = useState(brand.emojiPolicy);
    const [saving, setSaving] = useState(false);

    return (
        <Card.Root maxW="2xl">
            <Card.Body>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setSaving(true);
                        try {
                            await saveBrand(workspaceId, { tone, customInstructions: customInstructions || undefined, emojiPolicy });
                            toaster.create({ type: 'success', title: 'Brand voice saved' });
                        } catch {
                            toaster.create({ type: 'error', title: "Couldn't save brand voice" });
                        } finally {
                            setSaving(false);
                        }
                    }}
                >
                    <Stack gap="5">
                        <Field label="Tone">
                            <NativeSelect.Root>
                                <NativeSelect.Field value={tone} onChange={(e) => setTone(e.target.value)}>
                                    <option value="dev_focused">Developer-focused</option>
                                    <option value="professional">Professional</option>
                                    <option value="hype_startup">Hype startup</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field>
                        <Field label="Custom instructions" helperText="Optional brand guidance for AI copy.">
                            <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} rows={4} placeholder="Optional brand guidance for AI copy…" />
                        </Field>
                        <Switch.Root checked={emojiPolicy} onCheckedChange={(e) => setEmojiPolicy(e.checked)}>
                            <Switch.HiddenInput />
                            <Switch.Control />
                            <Switch.Label>Allow emojis in generated copy</Switch.Label>
                        </Switch.Root>
                        <Button type="submit" colorPalette="signal" loading={saving} alignSelf="flex-start">
                            Save
                        </Button>
                    </Stack>
                </form>
            </Card.Body>
        </Card.Root>
    );
}
```

- [ ] **Step 2: Rebuild the page**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/page.tsx
import { PageHeader } from '@/components/page-header';
import { getBrand } from '../../../../../lib/brand';
import { BrandForm } from './brand-form';

export default async function BrandSettings({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const brand = await getBrand(workspaceId);
    return (
        <>
            <PageHeader title="Brand voice" description="Tune how AI writes about your releases." />
            <BrandForm workspaceId={workspaceId} brand={brand} />
        </>
    );
}
```

- [ ] **Step 3: Add the loading skeleton**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/loading.tsx
import { Skeleton } from '@chakra-ui/react';

export default function BrandLoading() {
    return <Skeleton height="360px" maxW="2xl" borderRadius="lg" />;
}
```

- [ ] **Step 4: Manual verification**

Navigate to `/{workspaceId}/settings/brand`.
Expected: a card with a tone dropdown, a custom-instructions textarea, and a real `Switch` (not a checkbox) for emoji policy; saving shows a success toast instead of an inline "Saved" label.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/[workspaceId]/settings/brand"
git commit -m "feat(web): redesign Brand page with NativeSelect/Switch and toast feedback"
```

---

### Task 11: Billing page + `BillingActions` + loading skeleton

**Files:**
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/billing-actions.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/loading.tsx`

**Interfaces:**
- Consumes: `PageHeader` (Task 3); `startCheckout`/`openPortal` (existing `lib/billing.ts`, unchanged); `toaster`.
- **Note:** `lib/billing.ts` has no call that returns the workspace's *current* subscription tier, and this plan cannot add one without editing a forbidden `lib/*.ts` file. So "active tier" highlighting from the design spec is implemented as a static "Most popular" badge on the Pro tier instead of a real subscription-state check — wiring true current-tier highlighting is future work that needs a new billing lib endpoint.

- [ ] **Step 1: Rebuild `BillingActions`**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/billing-actions.tsx
'use client';

import { useState } from 'react';
import { Button, ButtonGroup } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { startCheckout, openPortal } from '../../../../../lib/billing';

export function BillingActions({ workspaceId, tier }: { workspaceId: string; tier: string }) {
    const [loading, setLoading] = useState<'subscribe' | 'manage' | null>(null);

    const run = async (kind: 'subscribe' | 'manage') => {
        setLoading(kind);
        try {
            const { url } = kind === 'subscribe' ? await startCheckout(workspaceId, tier) : await openPortal(workspaceId);
            window.location.href = url;
        } catch {
            toaster.create({ type: 'error', title: 'Could not open billing portal' });
            setLoading(null);
        }
    };

    return (
        <ButtonGroup w="full">
            <Button flex="1" colorPalette="signal" loading={loading === 'subscribe'} onClick={() => run('subscribe')}>
                Subscribe
            </Button>
            <Button flex="1" variant="outline" loading={loading === 'manage'} onClick={() => run('manage')}>
                Manage
            </Button>
        </ButtonGroup>
    );
}
```

- [ ] **Step 2: Rebuild the page**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/page.tsx
import { Badge, Card, List, SimpleGrid, Text } from '@chakra-ui/react';
import { PageHeader } from '@/components/page-header';
import { BillingActions } from './billing-actions';

const TIERS = [
    { id: 'starter', name: 'Starter', price: '$19/mo', points: ['1 repository', '10 releases/mo', 'Manual output'] },
    { id: 'pro', name: 'Pro', price: '$49/mo', points: ['3 repositories', 'Unlimited releases', 'Social API sync'], highlighted: true },
    { id: 'growth', name: 'Growth', price: '$149/mo', points: ['Unlimited repositories', 'Jira/Linear integrations', 'Email digests'] },
];

export default async function BillingPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    return (
        <>
            <PageHeader title="Billing" description="Pick the plan that matches your release volume." />
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
                {TIERS.map((t) => (
                    <Card.Root key={t.id} borderWidth={t.highlighted ? '2px' : '1px'} borderColor={t.highlighted ? 'signal.solid' : 'border'}>
                        <Card.Header>
                            {t.highlighted ? (
                                <Badge colorPalette="signal" variant="solid" mb="2" alignSelf="flex-start">
                                    Most popular
                                </Badge>
                            ) : null}
                            <Card.Title fontSize="xl">{t.name}</Card.Title>
                            <Text color="fg.muted" fontWeight="medium">
                                {t.price}
                            </Text>
                        </Card.Header>
                        <Card.Body>
                            <List.Root gap="2">
                                {t.points.map((p) => (
                                    <List.Item key={p}>{p}</List.Item>
                                ))}
                            </List.Root>
                        </Card.Body>
                        <Card.Footer>
                            <BillingActions workspaceId={workspaceId} tier={t.id} />
                        </Card.Footer>
                    </Card.Root>
                ))}
            </SimpleGrid>
        </>
    );
}
```

- [ ] **Step 3: Add the loading skeleton**

```tsx
// apps/web/src/app/(dashboard)/[workspaceId]/settings/billing/loading.tsx
import { SimpleGrid, Skeleton } from '@chakra-ui/react';

export default function BillingLoading() {
    return (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
        </SimpleGrid>
    );
}
```

- [ ] **Step 4: Manual verification**

Navigate to `/{workspaceId}/settings/billing`.
Expected: three pricing cards in a responsive grid (stacked on mobile, 3-column on desktop); the Pro card has a `signal`-colored border and a "Most popular" badge; Subscribe/Manage buttons show individual loading spinners and redirect via `window.location.href` on success, or show an error toast on failure.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/[workspaceId]/settings/billing"
git commit -m "feat(web): redesign Billing page with PricingCard grid"
```

---

### Task 12: Tweet generator (public lead magnet) redesign

**Files:**
- Modify: `apps/web/src/app/tools/tweet-generator/page.tsx`
- Modify: `apps/web/src/app/tools/tweet-generator/generator.tsx`

**Interfaces:**
- Consumes: `PulseField` (Task 2).
- **Must not change:** the exported `generateTweet(releaseNotes: string): Promise<{ tweet: string }>` function's implementation/signature — `apps/web/src/app/tools/tweet-generator/generator.spec.ts` imports and tests it directly and must keep passing unmodified.

- [ ] **Step 1: Rebuild the page**

```tsx
// apps/web/src/app/tools/tweet-generator/page.tsx
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { PulseField } from '@/components/ui/pulse';
import { Generator } from './generator';

export default function TweetGeneratorPage() {
    return (
        <Box minH="100vh" bg="bg" py={{ base: 12, md: 20 }} px="4">
            <Box position="relative" mb="12" textAlign="center">
                <PulseField />
                <VStack gap="3" position="relative" zIndex="1">
                    <Heading as="h1" fontFamily="heading" fontSize={{ base: '3xl', md: '5xl' }} letterSpacing="tight">
                        Release Notes → Tweet
                    </Heading>
                    <Text color="fg.muted" fontSize="lg" maxW="lg">
                        Turn your dev release notes into a ready-to-post tweet, free.
                    </Text>
                </VStack>
            </Box>
            <Generator />
        </Box>
    );
}
```

- [ ] **Step 2: Rebuild `Generator`, keeping `generateTweet` byte-for-byte identical**

```tsx
// apps/web/src/app/tools/tweet-generator/generator.tsx
'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { Button, Card, Clipboard, Container, Text, Textarea } from '@chakra-ui/react';
import { LuCheck, LuClipboard } from 'react-icons/lu';

export async function generateTweet(releaseNotes: string): Promise<{ tweet: string }> {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const res = await fetch(`${base}/api/public/tweet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ releaseNotes }),
    });
    if (res.status === 429) throw new Error('Rate limit reached — sign up for more.');
    if (!res.ok) throw new Error('Generation failed');
    return res.json();
}

export function Generator() {
    const [notes, setNotes] = useState('');
    const [tweet, setTweet] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    async function run() {
        setErr('');
        setLoading(true);
        try {
            setTweet((await generateTweet(notes)).tweet);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container maxW="2xl">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Paste your GitHub release notes or commit log..." bg="bg.panel" />
            <Button mt="4" size="lg" colorPalette="signal" onClick={run} loading={loading} loadingText="Generating…" disabled={!notes}>
                Generate tweet
            </Button>
            {err ? (
                <Text color="fg.error" mt="3">
                    {err}
                </Text>
            ) : null}
            {tweet ? (
                <Card.Root mt="6">
                    <Card.Body>
                        <Text>{tweet}</Text>
                    </Card.Body>
                    <Card.Footer>
                        <Clipboard.Root value={tweet}>
                            <Clipboard.Trigger asChild>
                                <Button size="sm" variant="surface">
                                    <Clipboard.Indicator copied={<LuCheck />}>
                                        <LuClipboard />
                                    </Clipboard.Indicator>
                                    <Clipboard.CopyText />
                                </Button>
                            </Clipboard.Trigger>
                        </Clipboard.Root>
                    </Card.Footer>
                </Card.Root>
            ) : null}
            <Text mt="8" textAlign="center" color="fg.muted">
                Want automatic multi-channel posts on every release?{' '}
                <NextLink href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Sign up for ShipShout →
                </NextLink>
            </Text>
        </Container>
    );
}
```

- [ ] **Step 3: Run the existing spec to confirm it still passes unmodified**

Run: `bunx nx test web --testPathPatterns=generator`
Expected: PASS (the one existing test only imports and calls `generateTweet`, which is unchanged).

- [ ] **Step 4: Manual verification**

Visit `/tools/tweet-generator` (no login required).
Expected: hero headline with ambient pulse rings; pasting notes and clicking "Generate tweet" shows a spinner, then the result in a card with a working copy button (icon flips to a checkmark briefly); hitting the rate limit shows the "Rate limit reached" message.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/tools/tweet-generator
git commit -m "feat(web): redesign public tweet generator with pulse hero and Clipboard copy"
```

---

### Task 13: Full manual QA pass (no code changes)

**Files:** none — verification only.

**Interfaces:** none — this task exercises Tasks 1–12 together.

- [ ] **Step 1: Run the untouched unit tests**

```bash
bunx nx test web
```

Expected: PASS — every existing `lib/*.spec.ts` and `generator.spec.ts` still pass unmodified (this plan never edited their source files' tested behavior).

- [ ] **Step 2: Start the stack**

```bash
docker compose up -d postgres redis
bunx nx serve api
bunx nx serve worker
bunx nx dev web
```

- [ ] **Step 3: Walk the full dogfood flow with the new UI**

1. Visit `/login` — confirm the pulse hero renders, sign in with GitHub.
2. No workspace → confirm the `EmptyState` + form → create one → redirected to `/{id}/drafts` with the sidebar visible.
3. **Repositories** → add a repo → confirm the `SecretReveal` copy buttons work → expand "Send test release" on the row → Send → confirm the toast.
4. **Drafts** → wait for the worker → confirm cards render with `StatusBadge` → edit copy → Save → Approve → confirm Publish is now enabled.
5. **Connections** → Connect (test) on X → confirm the badge flips to "Connected".
6. Back in **Drafts** → Publish the approved draft → confirm its badge updates.
7. **Brand** → change tone, toggle the emoji `Switch`, Save → confirm the success toast.
8. **Billing** → confirm the 3-card grid and the Pro "Most popular" highlight; click Subscribe/Manage (fails locally without real Stripe keys — confirm the error toast appears instead of a crash).

- [ ] **Step 4: Cross-cutting checks**

- Toggle the sidebar's color-mode button on at least one page; confirm `bg`/`fg`/`border` swap correctly and text stays readable in both modes.
- Resize the browser below 768px; confirm the sidebar becomes a top bar + `Drawer` on every `(dashboard)` page.
- Enable "reduce motion" at the OS level, reload `/login`; confirm the pulse rings are static (no animation) instead of pulsing.
- Visit `/tools/tweet-generator` while logged out; confirm it renders standalone (no sidebar) and works end-to-end.

- [ ] **Step 5: No commit for this task** — verification only; if any check fails, fix the underlying task and re-run from Step 3.

---

## Self-Review

- **Spec coverage:** Visual identity / pulse motif in its 3 named spots (§2 → Task 2's `Pulse`/`PulseField`, used in Task 4's `Wordmark`, Task 3's `StatusBadge`, Tasks 5 & 12's hero sections); color/type tokens (§2 → Task 1); sidebar app shell + workspace switcher `Menu` + `Settings` grouping + active-route styling + responsive `Drawer` (§3 → Task 4); shared primitives `PageHeader`/`EmptyState`/`StatusBadge`/`SecretReveal`/`NavLink`/`Field` (§4 → Tasks 2–3); every page in the page-by-page table (§5 → Tasks 5–12); `loading.tsx` skeletons for every server-component page (§5 → Tasks 7–11); toast-based error/success feedback, inline `Field` validation, `Button loading` states, action-oriented `EmptyState` copy (§6 → Tasks 6–12); manual QA walkthrough + no new test infra (§7 → Task 13, Global Constraints).
- **Placeholder scan:** no TBD/TODO; every step has runnable code or an exact command.
- **Type consistency:** `Pulse({ size?, ...BoxProps })` / `PulseField()` (Task 2) match every call site in Tasks 3–5, 12; `Field({ label?, helperText?, errorText?, optionalText?, children })` (Task 2) matches every usage in Tasks 6, 8, 10; `StatusBadge({ status, label? })` (Task 3) matches Tasks 7 and 9; `SecretReveal({ label, value })` (Task 3) matches Task 8; `NavLink({ href, children })` (Task 3) matches Task 4's `SidebarNav`. `Sidebar({ workspaces, activeWs, user })`'s prop shape matches exactly what `(dashboard)/layout.tsx` already fetches (`apiFetch('/workspaces')` → `{id, name}[]`, `getSessionUser()` → `{name?, githubId?}`). No task calls a `lib/*.ts` export with a different signature than it already has today.
