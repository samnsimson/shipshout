# Dashboard toast feedback

## Summary

Add a reusable toast feedback system to the client dashboard using Chakra UI v3 `createToaster`, mounted once in the app provider. Dashboard client components call a static `Toaster` utility instead of inline error alerts.

## Architecture

- **`AppToaster`** — client component in `components/ui/app-toaster.tsx`; mounts Chakra `<Toaster>` with Shipshout styling (surface, hairline border, xl radius, top-end placement).
- **`Toaster`** — static utility class in `lib/feedback/toaster.utils.ts` with `success()`, `error()`, and `info()` methods.
- **Provider** — renders `<AppToaster />` alongside children so all dashboard routes can trigger toasts.

## API

```typescript
Toaster.success({ title: 'Saved', description?: string, duration?: number })
Toaster.error({ title: 'Failed', description?: string, duration?: number })
Toaster.info({ title: 'Working…', description?: string, duration?: number })
```

Defaults: success/info 4s, error 6s, max 3 visible toasts.

## Scope

**In scope:** dashboard client components (channels, repositories, shoutouts, settings/billing).

**Out of scope:** auth forms (login/register) keep inline alerts for form-level context; OAuth `query-banner` stays URL-driven.

## Migration

Replace inline `Alert.Root` / error text with `Toaster` calls in:

- `channels-client`, `channel-config-client`
- `repositories-client`, `repository-detail-client`
- `shoutout-detail-client`
- `billing-section`

Success toasts added where actions previously succeeded silently (save, publish, enable channel).

## Visual

Matches `DESIGN.md` `ex-toast`: `bg.surface`, hairline border, `borderRadius="xl"`, body-sm typography, status indicator, close button.
