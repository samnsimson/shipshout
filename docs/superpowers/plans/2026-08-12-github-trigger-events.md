# GitHub Trigger Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-repo GitHub trigger configuration, webhook ingestion, and placeholder shoutout drafts across API and dashboard.

**Architecture:** Three Nest modules (`TriggerModule`, `WebhookModule`, `ShoutoutModule`) alongside existing `RepositoryModule`. One GitHub webhook per linked repo; server-side event filtering; `ModuleRef` lifecycle hooks on link/unlink/disconnect.

**Tech Stack:** NestJS 11, TypeORM, Next.js dashboard, Chakra UI v3, bun

**Spec:** [`docs/superpowers/specs/2026-08-12-github-trigger-events-design.md`](../specs/2026-08-12-github-trigger-events-design.md)

## Global Constraints

- Per linked repo; multiple trigger types can be enabled (`release`, `tagPush`, `branchPush`).
- Default on link: all triggers **off**; no webhook until user saves toggles.
- On fire: ingest + placeholder shoutout (`pending_ai`); no AI in v1.
- Auto-register GitHub webhooks; `manual_required` fallback panel in UI.
- Static helpers on utility classes (`TriggerEventUtils`, `WebhookSecretUtils`, `ShoutoutTitleUtils`).
- Webhook endpoint: `POST /webhooks/github/:deliveryToken` (`@AllowAnonymous`).
- Env: `API_BASE_URL` (defaults to `BETTER_AUTH_BASE_URL`), `WEBHOOK_SECRET_ENCRYPTION_KEY` (defaults to `BETTER_AUTH_SECRET`).

---

## Implementation status

- [x] Database entities + migration (`repository_triggers`, `repository_webhooks`, `trigger_events`, `shoutouts`)
- [x] Utility classes + unit tests
- [x] `TriggerModule`, `WebhookModule`, `ShoutoutModule` wired in `AppModule`
- [x] Repository lifecycle via `ModuleRef` (seed triggers on link, cleanup webhooks on unlink/disconnect)
- [x] Dashboard: repo detail `/dashboard/repositories/[id]`, shoutouts list/detail, Configure link on repos table
- [ ] Run `bun run migration:run` locally
- [ ] Regenerate `@shipshout/api-client` (`bun run openapi:generate` with API running)
- [ ] Manual test: link repo → enable release trigger → publish GitHub release

## Manual test plan

1. Link a repo → open `/dashboard/repositories/[id]` → toggles off, webhook "Not configured"
2. Enable release trigger → save → webhook status "Active" (or manual setup if GitHub API 403)
3. Publish a GitHub release → event appears on repo detail + shoutout on `/dashboard/shoutouts`
4. Simulate webhook register failure → manual URL/secret panel visible
