# Shoutouts Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Async AI generation of per-channel shoutout variants, human review/edit, email alert + newsletter dispatch, and per-repo channel configuration gated by subscription plan.

**Architecture:** Extend existing `ShoutoutModule` with `@nestjs/bullmq` queues (`shoutout-generation`, `shoutout-dispatch`); replace stub `ChannelModule` with catalog + per-repo config; add `AiModule` with OpenAI default; Redis pub/sub drives SSE on shoutout detail; dashboard gets channel config UI and full shoutout review flow.

**Tech Stack:** NestJS 11, `@nestjs/bullmq`, Redis, TypeORM, OpenAI SDK, `@shipshout/email-client`, Next.js dashboard, Chakra UI v3, bun

**Spec:** [`docs/superpowers/specs/2026-08-12-shoutouts-design.md`](../specs/2026-08-12-shoutouts-design.md)

## Global Constraints

- Full pipeline (generate → review → publish); **email only functional in v1** (`email_alert`, `email_newsletter`); X/LinkedIn stub UI only.
- Email: alert account owner when draft ready **and** send edited copy to configured recipients on publish.
- Per-channel AI variants; per-repo channel config + tone; plan gating via `limits.channels: string[]`.
- Async jobs: Redis + `@nestjs/bullmq` (not raw BullMQ); env `REDIS_URL` required.
- AI: provider-agnostic `AiModule`; `AI_PROVIDER=openai` (default), `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o`.
- Live UI: SSE `GET /shoutouts/:id/events` + polling fallback every 3s while `generating` or `publishing`.
- Static helpers on utility classes (`ChannelEntitlementUtils`, `ChannelConfigUtils`, `ShoutoutStatusUtils`, `AiPromptUtils`).
- Follow [`DESIGN.md`](../../../DESIGN.md) for dashboard UI; use generated `@shipshout/api-client` SDK in dashboard.
- OpenAPI decorators on all new/changed endpoints; regenerate client after API changes.

---

## File map

| Area | Create / modify |
| --- | --- |
| Root deps | `package.json` — add `@nestjs/bullmq`, `bullmq`, `ioredis`, `openai` |
| Env | `.env.example` — `OPENAI_API_KEY`, `AI_PROVIDER`, `OPENAI_MODEL` |
| Database | `libs/database/src/lib/entities/channel-type.entity.ts`, `repository-channel.entity.ts`, `shoutout-channel-draft.entity.ts`, `shoutout-dispatch-log.entity.ts`; update `shoutout.entity.ts`, `subscription-plan.entity.ts`, `entities/index.ts`; migration |
| Channels API | Replace `apps/shipshout-api-svc/src/app/channels/*` scaffold |
| AI | `apps/shipshout-api-svc/src/app/ai/*` |
| Shoutout jobs | `shoutout-queue.service.ts`, `shoutout-generation.processor.ts`, `shoutout-dispatch.processor.ts`, `shoutout-events.service.ts`, utils, repos |
| Webhook | `webhook-ingest.service.ts` — enqueue generation |
| Repository link | Seed `repository_channels` on link (via `RepositoryChannelService.ensureForLinkedRepository`) |
| Dashboard | `repository-channels-section.tsx`, update `repository-detail-client.tsx`, `shoutouts-client.tsx`, `shoutout-detail-client.tsx`, lib API modules |
| App module | `BullModule.forRootAsync`, import `AiModule`, wire updated modules |

---

### Task 1: Install dependencies and BullMQ root config

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `apps/shipshout-api-svc/src/app/app.module.ts`

**Interfaces:**
- Produces: global `BullModule.forRootAsync` using `REDIS_URL`

- [ ] **Step 1: Install packages**

```bash
bun add @nestjs/bullmq bullmq ioredis openai
```

- [ ] **Step 2: Extend `.env.example`**

```
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=
AI_PROVIDER=openai
OPENAI_MODEL=gpt-4o
```

(`REDIS_URL` line already exists — add the OpenAI vars below it.)

- [ ] **Step 3: Register BullMQ in `AppModule`**

```typescript
import { BullModule } from '@nestjs/bullmq';

// inside imports array, after ConfigModule.forRoot:
BullModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow('REDIS_URL') },
    }),
}),
```

- [ ] **Step 4: Verify API boots (Redis must be running locally)**

```bash
redis-server &
bun nx run shipshout-api-svc:serve
```

Expected: app starts without BullMQ connection errors.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock .env.example apps/shipshout-api-svc/src/app/app.module.ts
git commit -m "chore(api): add BullMQ, Redis, and OpenAI dependencies"
```

---

### Task 2: Database entities and migration

**Files:**
- Create: `libs/database/src/lib/entities/channel-type.entity.ts`
- Create: `libs/database/src/lib/entities/repository-channel.entity.ts`
- Create: `libs/database/src/lib/entities/shoutout-channel-draft.entity.ts`
- Create: `libs/database/src/lib/entities/shoutout-dispatch-log.entity.ts`
- Modify: `libs/database/src/lib/entities/shoutout.entity.ts`
- Modify: `libs/database/src/lib/entities/subscription-plan.entity.ts`
- Modify: `libs/database/src/lib/entities/index.ts`
- Create: `libs/database/src/lib/migrations/1786522000000-Migration.ts`

**Interfaces:**
- Produces: `ChannelTypeEntity`, `RepositoryChannelEntity`, `ShoutoutChannelDraftEntity`, `ShoutoutDispatchLogEntity`
- Produces: `ShoutoutStatus` type:
  `'generating' | 'ready_for_review' | 'publishing' | 'published' | 'partially_published' | 'failed' | 'generation_failed'`
- Produces: `SubscriptionPlanLimits`:
  `{ repos: number; releasesPerMonth: number | null; channels: string[] }`

- [ ] **Step 1: Update `SubscriptionPlanLimits` in `subscription-plan.entity.ts`**

```typescript
export type SubscriptionPlanLimits = {
    repos: number;
    releasesPerMonth: number | null;
    channels: string[];
};
```

- [ ] **Step 2: Update `ShoutoutStatus` in `shoutout.entity.ts`**

```typescript
export type ShoutoutStatus =
    | 'generating'
    | 'ready_for_review'
    | 'publishing'
    | 'published'
    | 'partially_published'
    | 'failed'
    | 'generation_failed';
```

Change default from `'pending_ai'` to `'generating'`.

- [ ] **Step 3: Create entity files** (follow snake_case column naming from existing entities like `shoutout.entity.ts`)

`channel-type.entity.ts` — PK `key` varchar; columns per spec (`displayName`, `description`, `kind`, `configSchema`, `sortOrder`, `isActive`).

`repository-channel.entity.ts` — uuid PK; FK `linkedRepositoryId`; `channelKey`; `enabled` default false; `tone` default `'professional'`; `config` jsonb default `{}`; unique index on `(linkedRepositoryId, channelKey)`.

`shoutout-channel-draft.entity.ts` — uuid PK; FK `shoutoutId`; `channelKey`; `title`; `body` text; `editedAt` nullable; unique `(shoutoutId, channelKey)`.

`shoutout-dispatch-log.entity.ts` — uuid PK; FK `shoutoutId`; `channelKey`; `status` (`sent`|`failed`|`skipped`); `error` nullable; `sentAt` nullable.

- [ ] **Step 4: Register in `entities/index.ts`**

Add all four new entities to `ENTITIES` array and exports.

- [ ] **Step 5: Write migration `1786522000000-Migration.ts`**

```typescript
// up():
// 1. CREATE TABLE channel_types + seed 4 rows (email_alert, email_newsletter, x, linkedin)
// 2. CREATE TABLE repository_channels + FKs + unique index
// 3. CREATE TABLE shoutout_channel_drafts + FKs + unique index
// 4. CREATE TABLE shoutout_dispatch_logs + FK shoutout_id
// 5. UPDATE shoutouts SET status = 'generating' WHERE status = 'pending_ai'
// 6. UPDATE subscription_plans SET limits = limits || '{"channels": []}'::jsonb WHERE limits->'channels' IS NULL
// 7. UPDATE subscription_plans SET limits = jsonb_set(limits, '{channels}', '["email_alert"]') WHERE name = 'starter'
// 8. UPDATE subscription_plans SET limits = jsonb_set(limits, '{channels}', '["email_alert","email_newsletter"]') WHERE name = 'pro'
```

Seed `channel_types` rows:

| key | displayName | kind | sortOrder |
| --- | --- | --- | --- |
| email_alert | Email alert | notify | 1 |
| email_newsletter | Email newsletter | publish | 2 |
| x | X (Twitter) | publish | 3 |
| linkedin | LinkedIn | publish | 4 |

`email_newsletter` configSchema example:
`{ "type": "object", "properties": { "recipients": { "type": "array", "items": { "type": "string", "format": "email" }, "minItems": 1 }, "subjectPrefix": { "type": "string" } }, "required": ["recipients"] }`

- [ ] **Step 6: Run migration**

```bash
bun run migration:run
```

Expected: all tables created; existing shoutouts migrated to `generating`.

- [ ] **Step 7: Commit**

```bash
git add libs/database/
git commit -m "feat(database): add channel and shoutout draft entities"
```

---

### Task 3: Channel utility classes + unit tests

**Files:**
- Create: `apps/shipshout-api-svc/src/app/channels/utils/channel-entitlement.utils.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/utils/channel-config.utils.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/__tests__/channel-entitlement.utils.spec.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/__tests__/channel-config.utils.spec.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/utils/shoutout-status.utils.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-status.utils.spec.ts`

**Interfaces:**
- Produces: `ChannelEntitlementUtils.canEnable(channelKey, planChannels): boolean`
- Produces: `ChannelEntitlementUtils.filterEntitled(enabledRows, planChannels): RepositoryChannelRow[]`
- Produces: `ChannelConfigUtils.validate(configSchema, config): { ok: true } | { ok: false; error: string }`
- Produces: `ShoutoutStatusUtils.canTransition(from, to): boolean`

- [ ] **Step 1: Write failing tests for `ChannelEntitlementUtils`**

```typescript
// channel-entitlement.utils.spec.ts
import { ChannelEntitlementUtils } from '../utils/channel-entitlement.utils';

describe('ChannelEntitlementUtils', () => {
    it('canEnable returns true when plan includes channel', () => {
        expect(ChannelEntitlementUtils.canEnable('email_alert', ['email_alert'])).toBe(true);
    });

    it('canEnable returns false when plan excludes channel', () => {
        expect(ChannelEntitlementUtils.canEnable('email_newsletter', ['email_alert'])).toBe(false);
    });

    it('filterEntitled keeps only plan-allowed enabled channels', () => {
        const rows = [
            { channelKey: 'email_alert', enabled: true },
            { channelKey: 'email_newsletter', enabled: true },
        ];
        const result = ChannelEntitlementUtils.filterEntitled(rows, ['email_alert']);
        expect(result.map((r) => r.channelKey)).toEqual(['email_alert']);
    });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
bun nx test shipshout-api-svc --testPathPattern=channel-entitlement
```

- [ ] **Step 3: Implement `ChannelEntitlementUtils`**

```typescript
export class ChannelEntitlementUtils {
    static canEnable(channelKey: string, planChannels: string[]): boolean {
        return planChannels.includes(channelKey);
    }

    static filterEntitled<T extends { channelKey: string; enabled: boolean }>(rows: T[], planChannels: string[]): T[] {
        return rows.filter((row) => row.enabled && planChannels.includes(row.channelKey));
    }
}
```

- [ ] **Step 4: Write failing tests + implement `ChannelConfigUtils`**

Validate `recipients` is non-empty string array for email_newsletter; empty schema `{}` always passes.

- [ ] **Step 5: Write failing tests + implement `ShoutoutStatusUtils`**

```typescript
export class ShoutoutStatusUtils {
    static canTransition(from: ShoutoutStatus, to: ShoutoutStatus): boolean {
        const allowed: Record<ShoutoutStatus, ShoutoutStatus[]> = {
            generating: ['ready_for_review', 'generation_failed'],
            ready_for_review: ['publishing'],
            publishing: ['published', 'partially_published', 'failed'],
            generation_failed: ['generating'],
            published: [],
            partially_published: [],
            failed: [],
        };
        return allowed[from]?.includes(to) ?? false;
    }
}
```

- [ ] **Step 6: Run all new tests — expect PASS**

```bash
bun nx test shipshout-api-svc --testPathPattern="channel-|shoutout-status"
```

- [ ] **Step 7: Commit**

```bash
git commit -am "feat(channels): add entitlement, config, and status utilities"
```

---

### Task 4: Channel module — catalog + per-repo config API

**Files:**
- Delete: `apps/shipshout-api-svc/src/app/channels/entities/channel.entity.ts`, `dto/create-channel.dto.ts`, `dto/update-channel.dto.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/repositories/channel-type.repository.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/repositories/repository-channel.repository.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/services/channel-catalog.service.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/services/repository-channel.service.ts`
- Create: `apps/shipshout-api-svc/src/app/channels/dto/channel.dto.ts`
- Replace: `apps/shipshout-api-svc/src/app/channels/channel.controller.ts`
- Replace: `apps/shipshout-api-svc/src/app/channels/channel.module.ts`
- Replace: `apps/shipshout-api-svc/src/app/channels/channel.service.spec.ts`
- Modify: `apps/shipshout-api-svc/src/app/subscription/subscription-plans.seed.ts` — add `channels` to limits
- Modify: `apps/shipshout-api-svc/src/app/repository/services/repository.service.ts` — call `repositoryChannelService.ensureForLinkedRepository` on link

**Interfaces:**
- Produces: `RepositoryChannelService.ensureForLinkedRepository(linkedRepositoryId): Promise<void>` — upsert disabled row per catalog channel
- Produces: `GET /channels` → `{ channels: ChannelCatalogItemDto[] }` with `availableOnPlan: boolean`
- Produces: `GET /repositories/:id/channels` → `{ channels: RepositoryChannelDto[] }`
- Produces: `PATCH /repositories/:id/channels` body `{ channels: { channelKey, enabled?, tone?, config? }[] }`

- [ ] **Step 1: Update plan seed limits**

```typescript
// subscription-plans.seed.ts
limits: { repos: 1, releasesPerMonth: 10, channels: ['email_alert'] },  // starter
limits: { repos: 3, releasesPerMonth: null, channels: ['email_alert', 'email_newsletter'] },  // pro
```

Add free plan upsert if missing: `channels: []`.

- [ ] **Step 2: Implement repositories** (extend `BaseRepository` pattern from `shoutout.repository.ts`)

- [ ] **Step 3: Implement `ChannelCatalogService.listForUser(userId)`**

Load all active `channel_types`; load user plan via existing subscription lookup; set `availableOnPlan = limits.channels.includes(key)`.

- [ ] **Step 4: Implement `RepositoryChannelService`**

- `ensureForLinkedRepository(id)` — for each catalog row, upsert disabled default
- `listForRepo(userId, repoId)` — verify repo ownership; return merged catalog + config
- `updateForRepo(userId, repoId, patches)` — reject enable when `!ChannelEntitlementUtils.canEnable`; validate config via `ChannelConfigUtils`

- [ ] **Step 5: Replace controller routes**

```typescript
@Controller()
export class ChannelController {
    @Get('channels')
    @UseGuards(JwtAuthGuard)
    listCatalog(@JwtUser() user: JwtUserPayload) { ... }

    @Get('repositories/:id/channels')
    @UseGuards(JwtAuthGuard)
    listRepoChannels(@JwtUser() user, @Param('id') id: string) { ... }

    @Patch('repositories/:id/channels')
    @UseGuards(JwtAuthGuard)
    updateRepoChannels(@JwtUser() user, @Param('id') id: string, @Body() body: PatchRepositoryChannelsDto) { ... }
}
```

- [ ] **Step 6: Wire `ChannelModule` imports** — `DatabaseModule` entities, `SubscriptionPlanRepository` or `ShoutoutLimitService` pattern for plan lookup; export `RepositoryChannelService`.

- [ ] **Step 7: Hook repo link lifecycle**

In `RepositoryService.linkRepositories`, after save:

```typescript
await this.repositoryChannelService.ensureForLinkedRepository(saved.id);
```

- [ ] **Step 8: Controller spec — PATCH rejects disallowed enable**

```typescript
it('returns 403 when enabling channel not on plan', async () => {
    // mock plan channels ['email_alert'], attempt enable email_newsletter
});
```

- [ ] **Step 9: Commit**

```bash
git commit -am "feat(channels): add catalog and per-repo channel config API"
```

---

### Task 5: AiModule with OpenAI provider

**Files:**
- Create: `apps/shipshout-api-svc/src/app/ai/providers/ai-provider.interface.ts`
- Create: `apps/shipshout-api-svc/src/app/ai/providers/openai.provider.ts`
- Create: `apps/shipshout-api-svc/src/app/ai/services/ai-generation.service.ts`
- Create: `apps/shipshout-api-svc/src/app/ai/utils/ai-prompt.utils.ts`
- Create: `apps/shipshout-api-svc/src/app/ai/ai.module.ts`
- Create: `apps/shipshout-api-svc/src/app/ai/__tests__/ai-prompt.utils.spec.ts`
- Create: `apps/shipshout-api-svc/src/app/ai/__tests__/ai-generation.service.spec.ts`
- Modify: `apps/shipshout-api-svc/src/app/app.module.ts` — import `AiModule`

**Interfaces:**
- Produces: `AiProvider.generateChannelVariants(input): Promise<Record<string, { title: string; body: string }>>`
- Produces: `AiGenerationService.generateVariants(...)` — delegates to factory-selected provider; skips `email_alert` (notify-only)

- [ ] **Step 1: Write failing test for `AiPromptUtils.buildSystemPrompt(channelKey, tone)`**

Assert `email_newsletter` prompt mentions benefit-driven copy; `x` prompt mentions 280 chars.

- [ ] **Step 2: Implement `AiPromptUtils`**

Static methods building system + user messages from `sourceSummary` JSON.

- [ ] **Step 3: Define interface + OpenAI provider**

```typescript
// ai-provider.interface.ts
export interface AiProvider {
    generateChannelVariants(input: {
        sourceSummary: Record<string, unknown>;
        channels: { key: string; tone: string }[];
        repoFullName: string;
    }): Promise<Record<string, { title: string; body: string }>>;
}
```

`OpenAiProvider` uses `openai` SDK; one chat completion per channel (or batched JSON response — pick one, document in code).

- [ ] **Step 4: `AiGenerationService` with factory**

```typescript
@Injectable()
export class AiGenerationService {
    constructor(private readonly config: ConfigService) {}

    private resolveProvider(): AiProvider {
        const name = this.config.get('AI_PROVIDER', 'openai');
        if (name === 'openai') return new OpenAiProvider(this.config.getOrThrow('OPENAI_API_KEY'), this.config.get('OPENAI_MODEL', 'gpt-4o'));
        throw new Error(`Unsupported AI_PROVIDER: ${name}`);
    }

    async generateVariants(...) {
        const generatable = input.channels.filter((c) => c.key !== 'email_alert');
        return this.resolveProvider().generateChannelVariants({ ...input, channels: generatable });
    }
}
```

- [ ] **Step 5: Unit test `AiGenerationService` with mocked provider**

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(ai): add provider-agnostic generation module with OpenAI default"
```

---

### Task 6: Shoutout queue, generation processor, and webhook enqueue

**Files:**
- Create: `apps/shipshout-api-svc/src/app/shoutout/repositories/shoutout-channel-draft.repository.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout-queue.service.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/processors/shoutout-generation.processor.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout-generation.service.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/shoutout.module.ts`
- Modify: `apps/shipshout-api-svc/src/app/webhook/webhook.module.ts`
- Modify: `apps/shipshout-api-svc/src/app/webhook/services/webhook-ingest.service.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/__tests__/shoutout-generation.service.spec.ts`

**Interfaces:**
- Produces: `ShoutoutQueueService.addGenerationJob({ shoutoutId: string }): Promise<void>`
- Consumes: `AiGenerationService`, `RepositoryChannelService`, `ShoutoutLimitService`, `EmailClient`, `ShoutoutEventsService` (Task 7 — stub publish no-op until then)

- [ ] **Step 1: Register queues in `ShoutoutModule`**

```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue({ name: 'shoutout-generation' }, { name: 'shoutout-dispatch' }),
        ChannelModule,
        AiModule,
    ],
    ...
})
```

- [ ] **Step 2: Implement `ShoutoutQueueService`**

```typescript
@Injectable()
export class ShoutoutQueueService {
    constructor(@InjectQueue('shoutout-generation') private readonly generationQueue: Queue) {}

    async addGenerationJob(payload: { shoutoutId: string }): Promise<void> {
        await this.generationQueue.add('generate', payload, { jobId: `gen-${payload.shoutoutId}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    }
}
```

- [ ] **Step 3: Implement `ShoutoutGenerationService` (testable core logic)**

Flow:
1. Load shoutout + relations; if status not `generating`/`generation_failed`, return early
2. Load repo channels; get user plan channels; `ChannelEntitlementUtils.filterEntitled`
3. Call `AiGenerationService.generateVariants`
4. Upsert `shoutout_channel_drafts`
5. If `email_alert` enabled + entitled → send alert email to user email (lookup via auth DB or pass from shoutout `userId` — use existing user email lookup pattern from auth)
6. Set status `ready_for_review`; call `ShoutoutEventsService.publish(shoutoutId, { status })`

On error after retries: processor sets `generation_failed`.

- [ ] **Step 4: Implement processor**

```typescript
@Processor('shoutout-generation')
export class ShoutoutGenerationProcessor extends WorkerHost {
    async process(job: Job<{ shoutoutId: string }>): Promise<void> {
        await this.generationService.run(job.data.shoutoutId);
    }
}
```

- [ ] **Step 5: Update webhook ingest**

```typescript
// webhook-ingest.service.ts — after shoutout save:
status: 'generating',
// after event link:
await this.shoutoutQueue.addGenerationJob({ shoutoutId: shoutout.id });
```

Inject `ShoutoutQueueService` via `ShoutoutModule` export; import `ShoutoutModule` in `WebhookModule`.

- [ ] **Step 6: Unit test generation service** with mocked AI + email

- [ ] **Step 7: Commit**

```bash
git commit -am "feat(shoutouts): add BullMQ generation pipeline and webhook enqueue"
```

---

### Task 7: Dispatch processor, events service, and SSE endpoint

**Files:**
- Create: `apps/shipshout-api-svc/src/app/shoutout/repositories/shoutout-dispatch-log.repository.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout-dispatch.service.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/processors/shoutout-dispatch.processor.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout-events.service.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/controllers/shoutout.controller.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout.service.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/dto/shoutout.dto.ts`

**Interfaces:**
- Produces: `ShoutoutQueueService.addDispatchJob({ shoutoutId: string })`
- Produces: `ShoutoutEventsService.publish(shoutoutId, event: { status: string; channelKey?: string; error?: string })`
- Produces: `GET /shoutouts/:id/events` — SSE (`text/event-stream`)

- [ ] **Step 1: Implement `ShoutoutEventsService` with ioredis pub/sub**

```typescript
export class ShoutoutEventsService {
    private readonly publisher: Redis;
    private readonly subscriber: Redis;

    channelFor(shoutoutId: string): string {
        return `shoutout:${shoutoutId}:events`;
    }

    async publish(shoutoutId: string, event: ShoutoutStreamEvent): Promise<void> {
        await this.publisher.publish(this.channelFor(shoutoutId), JSON.stringify(event));
    }

    subscribe(shoutoutId: string, onMessage: (event: ShoutoutStreamEvent) => void): () => void {
        const channel = this.channelFor(shoutoutId);
        void this.subscriber.subscribe(channel);
        const handler = (ch: string, message: string) => {
            if (ch === channel) onMessage(JSON.parse(message) as ShoutoutStreamEvent);
        };
        this.subscriber.on('message', handler);
        return () => {
            this.subscriber.off('message', handler);
            void this.subscriber.unsubscribe(channel);
        };
    }
}
```

- [ ] **Step 2: Implement `ShoutoutDispatchService`**

For each enabled publish channel entitled by plan:
- `email_newsletter`: load draft + config.recipients; send via `EmailClient`; log `sent`/`failed`
- Skip with `skipped` + reason if disabled or not entitled
- Compute final status: all sent → `published`; mix → `partially_published`; all failed/skipped → `failed`
- Publish SSE event

- [ ] **Step 3: Dispatch processor + queue service method**

- [ ] **Step 4: Extend shoutout DTOs**

Add to detail response:
```typescript
drafts: { channelKey: string; title: string; body: string; editedAt: string | null }[];
dispatchLogs: { channelKey: string; status: string; error: string | null; sentAt: string | null }[];
```

- [ ] **Step 5: Add SSE endpoint to controller**

```typescript
@Get(':id/events')
@UseGuards(JwtAuthGuard)
@Sse()
streamEvents(@JwtUser() user: JwtUserPayload, @Param('id') id: string): Observable<MessageEvent> {
    // verify ownership, return Observable from ShoutoutEventsService.subscribe
}
```

Use `@Sse()` from `@nestjs/common` and RxJS `Observable`.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(shoutouts): add dispatch processor, Redis events, and SSE endpoint"
```

---

### Task 8: Shoutout API — drafts, publish, retry

**Files:**
- Modify: `apps/shipshout-api-svc/src/app/shoutout/controllers/shoutout.controller.ts`
- Modify: `apps/shipshout-api-svc/src/app/shoutout/services/shoutout.service.ts`
- Create: `apps/shipshout-api-svc/src/app/shoutout/dto/update-shoutout-draft.dto.ts`

**Interfaces:**
- Produces: `PATCH /shoutouts/:id/drafts/:channelKey` body `{ title?: string; body?: string }`
- Produces: `POST /shoutouts/:id/publish` → `{ status: 'publishing' }`
- Produces: `POST /shoutouts/:id/retry-generation` → `{ status: 'generating' }`

- [ ] **Step 1: Implement draft update**

Only when shoutout status is `ready_for_review`; set `editedAt = new Date()`.

- [ ] **Step 2: Implement publish**

Verify `ShoutoutStatusUtils.canTransition('ready_for_review', 'publishing')`; set status; enqueue dispatch job.

- [ ] **Step 3: Implement retry-generation**

Only from `generation_failed`; set `generating`; enqueue generation job.

- [ ] **Step 4: Controller spec for state guards**

Publish returns 409 when status is `generating`.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(shoutouts): add draft edit, publish, and retry endpoints"
```

---

### Task 9: Dashboard — channel config on repository detail

**Files:**
- Create: `apps/shipshout-client-dashboard/src/lib/channels/api.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/channels/actions.ts`
- Create: `apps/shipshout-client-dashboard/src/components/repositories/repository-channels-section.tsx`
- Modify: `apps/shipshout-client-dashboard/src/components/repositories/repository-detail-client.tsx`
- Modify: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/repositories/[id]/page.tsx`

**Interfaces:**
- Consumes: generated SDK after openapi regen (Task 11); until then use typed fetch wrappers matching DTOs

- [ ] **Step 1: Add server-side data fetch on repo detail page**

Load `GET /repositories/:id/channels` and `GET /channels` alongside existing repo detail.

- [ ] **Step 2: Build `RepositoryChannelsSection`**

Per catalog channel card:
- Enable toggle (disabled + upgrade link when `!availableOnPlan`)
- Tone `<select>` when enabled
- Recipients textarea (comma-separated emails) for `email_newsletter`
- Save button → server action `PATCH /repositories/:id/channels`

Follow `DESIGN.md` — match triggers section styling in `repository-detail-client.tsx`.

- [ ] **Step 3: Insert section below Triggers in repo detail**

- [ ] **Step 4: Manual smoke test**

Enable email_alert on starter plan repo; verify email_newsletter toggle shows upgrade CTA.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(dashboard): add per-repo channel configuration UI"
```

---

### Task 10: Dashboard — shoutout review, SSE, and publish

**Files:**
- Modify: `apps/shipshout-client-dashboard/src/lib/shoutouts/api.ts`
- Create: `apps/shipshout-client-dashboard/src/lib/shoutouts/actions.ts`
- Replace: `apps/shipshout-client-dashboard/src/components/shoutouts/shoutouts-client.tsx`
- Replace: `apps/shipshout-client-dashboard/src/components/shoutouts/shoutout-detail-client.tsx`
- Modify: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/shoutouts/page.tsx`

**Interfaces:**
- Consumes: `GET /shoutouts/:id/events` SSE; `PATCH /shoutouts/:id/drafts/:channelKey`; `POST /shoutouts/:id/publish`

- [ ] **Step 1: Status badge helper**

Map statuses to labels/colors: Generating (purple), Ready for review (blue), Publishing (orange), Published (green), Failed (red).

- [ ] **Step 2: List polling**

In `ShoutoutsClient`, `useEffect` interval 3s when any shoutout has in-flight status; refetch via router.refresh() or client fetch.

- [ ] **Step 3: Detail page — SSE hook**

```typescript
function useShoutoutEvents(shoutoutId: string, onEvent: (e: ShoutoutStreamEvent) => void) {
    useEffect(() => {
        const es = new EventSource(`${API_URL}/shoutouts/${shoutoutId}/events`, { withCredentials: true });
        es.onmessage = (msg) => onEvent(JSON.parse(msg.data));
        es.onerror = () => { es.close(); /* fall back to polling */ };
        return () => es.close();
    }, [shoutoutId]);
}
```

Note: SSE with JWT may require passing token as query param or using fetch-based SSE polyfill if cookies insufficient — match existing auth pattern from dashboard API calls.

- [ ] **Step 4: Tabbed draft editor**

Chakra tabs per draft channel; textarea for title/body; debounced save or Save button per tab.

- [ ] **Step 5: Publish + Retry buttons**

Publish enabled when `ready_for_review`; Retry when `generation_failed`.

- [ ] **Step 6: Dispatch log table at bottom of detail**

- [ ] **Step 7: Commit**

```bash
git commit -am "feat(dashboard): add shoutout review UI with SSE and publish flow"
```

---

### Task 11: OpenAPI regen, billing limits display, and end-to-end test

**Files:**
- Modify: `apps/shipshout-client-dashboard/src/components/settings/billing-section.tsx` — show `limits.channels`
- Modify: `apps/shipshout-client-dashboard/src/app/(dashboard)/dashboard/settings/page.tsx` — pass channels in limits type

- [ ] **Step 1: Run API + regenerate client**

```bash
bun nx run shipshout-api-svc:serve &
bun run openapi:generate
```

- [ ] **Step 2: Replace hand-rolled fetch in `lib/channels/api.ts` and `lib/shoutouts/api.ts` with generated SDK**

- [ ] **Step 3: Update billing section to list entitled channels**

- [ ] **Step 4: Run tests**

```bash
bun nx test shipshout-api-svc
bun nx run shipshout-client-dashboard:lint
```

- [ ] **Step 5: Manual E2E test plan**

1. Start Redis + Postgres + API + dashboard
2. User on **Starter** plan links repo → enable `email_alert` on repo detail
3. Enable release trigger → publish GitHub release
4. Shoutout appears as **Generating** → becomes **Ready for review**; owner receives alert email
5. Edit newsletter draft tab (if Pro) or upgrade to Pro → enable `email_newsletter` with recipients
6. Publish → recipients receive newsletter; status **Published**; dispatch log shows `sent`
7. Verify SSE updates on detail page during generation

- [ ] **Step 6: Final commit**

```bash
git commit -am "chore: regenerate api client and update billing channels display"
```

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| BullMQ + Redis via `@nestjs/bullmq` | Task 1, 6 |
| Channel catalog + per-repo config | Task 2, 4 |
| Plan `limits.channels` gating | Task 2, 4 |
| AiModule OpenAI default | Task 5 |
| Async generation on webhook | Task 6 |
| email_alert on generation | Task 6 |
| email_newsletter on publish | Task 7 |
| Per-channel drafts | Task 2, 6, 8 |
| SSE + polling UI | Task 7, 10 |
| Shoutout status lifecycle | Task 2, 3, 6, 7, 8 |
| X/LinkedIn stub UI | Task 4, 9 |
| Repository link seeds channels | Task 4 |
| Dashboard repo channels section | Task 9 |
| Dashboard shoutout review | Task 10 |
| OpenAPI + client regen | Task 11 |

## Out of scope (tracked in spec)

- X/LinkedIn API integration
- Growth plan Stripe price
- Admin channel catalog CRUD
- Bull Board admin UI
