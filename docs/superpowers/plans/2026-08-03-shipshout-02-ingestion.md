# ShipShout Plan 2 — Ingestion (GitHub Webhooks + Queue) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receive GitHub Release webhooks, verify + dedupe them, persist a normalized `ReleaseEvent`, and enqueue a `generate` job on Redis/BullMQ.

**Architecture:** `apps/api` exposes a raw-body webhook endpoint; a `Repository` entity holds a per-repo `webhookSecret` (encrypted). `libs/queue` defines typed BullMQ job contracts and queue setup shared by `api` (producer) and `worker` (consumer). `libs/integrations/github` verifies HMAC signatures and normalizes payloads.

**Tech Stack:** NestJS, BullMQ, Redis, TypeORM, `@shipshout/shared-util` crypto, zod.

## Global Constraints

- Same as Plan 1 Global Constraints (Nx, NestJS, TypeORM/Postgres no-synchronize, zod DTOs, encrypted secrets, workspace-scoped, "ShipShout").
- Webhook endpoints MUST verify provider HMAC signatures before trusting payloads.
- Duplicate deliveries (same provider delivery id) MUST be idempotent (no duplicate `ReleaseEvent`).
- All queue job payloads are typed via contracts in `libs/queue`.

---

### Task 1: Repository, BrandProfile, ReleaseEvent entities + migration

**Files:**
- Create: `libs/data/entities/src/lib/entities/repository.entity.ts`
- Create: `libs/data/entities/src/lib/entities/brand-profile.entity.ts`
- Create: `libs/data/entities/src/lib/entities/release-event.entity.ts`
- Modify: `libs/data/entities/src/lib/typeorm.config.ts`
- Test: `libs/data/entities/src/lib/entities/ingestion-entities.spec.ts`

**Interfaces:**
- Consumes: `Workspace` (Plan 1), `ENTITIES` array.
- Produces: `Repository` (workspace, provider, externalId, name, webhookSecret encrypted, enabled), `BrandProfile` (workspace, tone, customInstructions, emojiPolicy), `ReleaseEvent` (repository, source, rawPayload jsonb, commitSummary, status, deliveryId unique-per-repo), `ReleaseEventStatus` enum (`received|generating|drafted|failed`), `SourceProvider` enum (`github|linear|jira`), `Tone` enum (`dev_focused|professional|hype_startup`).

- [ ] **Step 1: Write the failing test**

```typescript
// ingestion-entities.spec.ts
import { ENTITIES } from '../typeorm.config';
import { Repository } from './repository.entity';
import { BrandProfile } from './brand-profile.entity';
import { ReleaseEvent, ReleaseEventStatus, SourceProvider } from './release-event.entity';
import { Tone } from './brand-profile.entity';

describe('ingestion entities', () => {
  it('registers entities', () => {
    expect(ENTITIES).toEqual(expect.arrayContaining([Repository, BrandProfile, ReleaseEvent]));
  });
  it('exposes enums', () => {
    expect(ReleaseEventStatus.Received).toBe('received');
    expect(SourceProvider.Github).toBe('github');
    expect(Tone.DevFocused).toBe('dev_focused');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test data-entities`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement entities**

```typescript
// release-event.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { Repository as Repo } from './repository.entity';

export enum SourceProvider { Github = 'github', Linear = 'linear', Jira = 'jira' }
export enum ReleaseEventStatus { Received = 'received', Generating = 'generating', Drafted = 'drafted', Failed = 'failed' }

@Entity('release_events')
@Unique(['repository', 'deliveryId'])
export class ReleaseEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Repo, { eager: true }) repository!: Repo;
  @Column({ type: 'enum', enum: SourceProvider }) source!: SourceProvider;
  @Column() deliveryId!: string;
  @Column({ type: 'jsonb' }) rawPayload!: unknown;
  @Column({ type: 'text', nullable: true }) commitSummary?: string;
  @Column({ type: 'enum', enum: ReleaseEventStatus, default: ReleaseEventStatus.Received }) status!: ReleaseEventStatus;
  @CreateDateColumn() createdAt!: Date;
}
```

```typescript
// brand-profile.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity';

export enum Tone { DevFocused = 'dev_focused', Professional = 'professional', HypeStartup = 'hype_startup' }

@Entity('brand_profiles')
export class BrandProfile {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
  @Column({ type: 'enum', enum: Tone, default: Tone.Professional }) tone!: Tone;
  @Column({ type: 'text', nullable: true }) customInstructions?: string;
  @Column({ default: true }) emojiPolicy!: boolean;
}
```

```typescript
// repository.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity';
import { SourceProvider } from './release-event.entity';

@Entity('repositories')
export class Repository {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
  @Column({ type: 'enum', enum: SourceProvider }) provider!: SourceProvider;
  @Column() externalId!: string;
  @Column() name!: string;
  @Column({ type: 'text' }) webhookSecret!: string; // encrypted ciphertext
  @Column({ default: true }) enabled!: boolean;
}
```

Register all three in `typeorm.config.ts` `ENTITIES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test data-entities`
Expected: PASS.

- [ ] **Step 5: Generate + run migration**

```bash
npx typeorm migration:generate libs/data/entities/src/lib/migrations/Ingestion -d libs/data/entities/src/lib/data-source.ts
npx typeorm migration:run -d libs/data/entities/src/lib/data-source.ts
```

- [ ] **Step 6: Commit**

```bash
git add libs/data/entities
git commit -m "feat(data): add Repository, BrandProfile, ReleaseEvent entities + migration"
```

---

### Task 2: Queue library — typed job contracts + BullMQ setup

**Files:**
- Create: `libs/queue/src/lib/jobs.ts`
- Create: `libs/queue/src/lib/queue.constants.ts`
- Create: `libs/queue/src/lib/queue.module.ts`
- Test: `libs/queue/src/lib/jobs.spec.ts`

**Interfaces:**
- Consumes: `REDIS_URL`.
- Produces: queue names `QUEUES.generate`, `QUEUES.dispatch`; job payload types `GenerateJob { releaseEventId: string }`, `DispatchJob { draftId: string }`; `buildBullConnection()`; a Nest `QueueModule` registering both queues via `@nestjs/bullmq`.

- [ ] **Step 1: Generate lib + install**

```bash
npx nx g @nx/js:lib queue --directory=libs/queue --importPath=@shipshout/queue --unitTestRunner=jest
npm i bullmq @nestjs/bullmq
```

- [ ] **Step 2: Write the failing test**

```typescript
// jobs.spec.ts
import { QUEUES } from './queue.constants';
import type { GenerateJob, DispatchJob } from './jobs';

describe('queue contracts', () => {
  it('defines queue names', () => {
    expect(QUEUES.generate).toBe('generate');
    expect(QUEUES.dispatch).toBe('dispatch');
  });
  it('types compile', () => {
    const g: GenerateJob = { releaseEventId: 'r1' };
    const d: DispatchJob = { draftId: 'd1' };
    expect(g.releaseEventId).toBe('r1');
    expect(d.draftId).toBe('d1');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx nx test queue`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement contracts + module**

```typescript
// queue.constants.ts
export const QUEUES = { generate: 'generate', dispatch: 'dispatch' } as const;
```

```typescript
// jobs.ts
export interface GenerateJob { releaseEventId: string; }
export interface DispatchJob { draftId: string; }
```

```typescript
// queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queue.constants';

function connection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return { host: url.hostname, port: Number(url.port || 6379) };
}

@Module({
  imports: [
    BullModule.forRoot({ connection: connection() }),
    BullModule.registerQueue({ name: QUEUES.generate }, { name: QUEUES.dispatch }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx nx test queue`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/queue
git commit -m "feat(queue): typed BullMQ job contracts and QueueModule"
```

---

### Task 3: GitHub integration — signature verify + payload normalize

**Files:**
- Create: `libs/integrations/github/src/lib/verify-signature.ts`
- Create: `libs/integrations/github/src/lib/normalize-release.ts`
- Test: `libs/integrations/github/src/lib/verify-signature.spec.ts`
- Test: `libs/integrations/github/src/lib/normalize-release.spec.ts`

**Interfaces:**
- Consumes: raw request body + `X-Hub-Signature-256` header; decrypted per-repo secret.
- Produces: `verifyGithubSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean`; `normalizeGithubRelease(payload): { externalId: string; commitSummary: string }`.

- [ ] **Step 1: Generate lib + write failing tests**

```bash
npx nx g @nx/js:lib integrations-github --directory=libs/integrations/github --importPath=@shipshout/integrations-github --unitTestRunner=jest
```

```typescript
// verify-signature.spec.ts
import { createHmac } from 'crypto';
import { verifyGithubSignature } from './verify-signature';

describe('verifyGithubSignature', () => {
  const secret = 's3cret';
  const body = Buffer.from(JSON.stringify({ a: 1 }));
  const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  it('accepts a valid signature', () => expect(verifyGithubSignature(body, sig, secret)).toBe(true));
  it('rejects a tampered body', () => expect(verifyGithubSignature(Buffer.from('x'), sig, secret)).toBe(false));
});
```

```typescript
// normalize-release.spec.ts
import { normalizeGithubRelease } from './normalize-release';
it('extracts id and summary from a release payload', () => {
  const out = normalizeGithubRelease({ release: { id: 42, name: 'v1.2', body: '- fix auth\n- speed up cache' } });
  expect(out.externalId).toBe('42');
  expect(out.commitSummary).toContain('fix auth');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test integrations-github`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

```typescript
// verify-signature.ts
import { createHmac, timingSafeEqual } from 'crypto';
export function verifyGithubSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

```typescript
// normalize-release.ts
export function normalizeGithubRelease(payload: any): { externalId: string; commitSummary: string } {
  const r = payload?.release ?? {};
  return {
    externalId: String(r.id ?? payload?.id ?? ''),
    commitSummary: [r.name, r.body].filter(Boolean).join('\n'),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test integrations-github`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/integrations/github
git commit -m "feat(integrations): github HMAC verify and release payload normalizer"
```

---

### Task 4: Repositories API (register repo, generate webhook secret)

**Files:**
- Create: `apps/api/src/app/repositories/repositories.service.ts`
- Create: `apps/api/src/app/repositories/repositories.controller.ts`
- Create: `apps/api/src/app/repositories/repositories.module.ts`
- Create: `libs/shared/contracts/src/lib/repository.contracts.ts`
- Test: `apps/api/src/app/repositories/repositories.service.spec.ts`

**Interfaces:**
- Consumes: `Repository` entity, `WorkspaceGuard`, `encryptSecret`/`decryptSecret`, `SourceProvider`.
- Produces: `POST /api/workspaces/:workspaceId/repositories` (creates repo, returns plaintext secret once), `GET /api/workspaces/:workspaceId/repositories`; `RepositoriesService.create(workspaceId, dto)` returns `{ repository, webhookSecret }`; `RepositoriesService.findByExternalId(provider, externalId)` used by the webhook receiver.

- [ ] **Step 1: Write contract + failing test**

```typescript
// repository.contracts.ts
import { z } from 'zod';
export const RegisterRepoSchema = z.object({
  provider: z.enum(['github','linear','jira']),
  externalId: z.string().min(1),
  name: z.string().min(1),
});
export type RegisterRepoDto = z.infer<typeof RegisterRepoSchema>;
```

```typescript
// repositories.service.spec.ts
import { RepositoriesService } from './repositories.service';
process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32,1).toString('base64');

describe('RepositoriesService.create', () => {
  it('stores an encrypted secret and returns plaintext once', async () => {
    const repo = { create:(d:any)=>d, save: jest.fn(async (d:any)=>({ id:'r1', ...d })) };
    const svc = new RepositoriesService(repo as any);
    const { repository, webhookSecret } = await svc.create('w1', { provider:'github', externalId:'42', name:'acme/app' });
    expect(webhookSecret).toHaveLength(64); // hex of 32 bytes
    expect(repository.webhookSecret).not.toBe(webhookSecret); // stored encrypted
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement service + controller**

```typescript
// repositories.service.ts
import { Repository as OrmRepo } from 'typeorm';
import { randomBytes } from 'crypto';
import { Repository } from '@shipshout/data-entities';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import { RegisterRepoDto } from '@shipshout/contracts';

export class RepositoriesService {
  constructor(private repos: OrmRepo<Repository>) {}

  async create(workspaceId: string, dto: RegisterRepoDto) {
    const webhookSecret = randomBytes(32).toString('hex');
    const repository = await this.repos.save(this.repos.create({
      workspace: { id: workspaceId } as any,
      provider: dto.provider as any,
      externalId: dto.externalId,
      name: dto.name,
      webhookSecret: encryptSecret(webhookSecret),
    }));
    return { repository, webhookSecret };
  }

  list(workspaceId: string) { return this.repos.find({ where: { workspace: { id: workspaceId } } }); }

  async findByExternalId(provider: string, externalId: string) {
    return this.repos.findOne({ where: { provider: provider as any, externalId } });
  }

  decryptSecret(cipher: string) { return decryptSecret(cipher); }
}
```

```typescript
// repositories.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { RegisterRepoSchema } from '@shipshout/contracts';
import { RepositoriesService } from './repositories.service';

@Controller('workspaces/:workspaceId/repositories')
@UseGuards(WorkspaceGuard)
export class RepositoriesController {
  constructor(private svc: RepositoriesService) {}
  @Get() list(@Param('workspaceId') ws: string) { return this.svc.list(ws); }
  @Post() create(@Param('workspaceId') ws: string, @Body() body: unknown) {
    const parsed = RegisterRepoSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.create(ws, parsed.data);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api libs/shared/contracts
git commit -m "feat(api): repository registration with per-repo encrypted webhook secret"
```

---

### Task 5: Webhook receiver — verify, dedupe, persist, enqueue

**Files:**
- Create: `apps/api/src/app/webhooks/webhooks.controller.ts`
- Create: `apps/api/src/app/webhooks/webhooks.service.ts`
- Create: `apps/api/src/app/webhooks/webhooks.module.ts`
- Modify: `apps/api/src/main.ts` (raw body for webhook route)
- Test: `apps/api/src/app/webhooks/webhooks.service.spec.ts`

**Interfaces:**
- Consumes: `RepositoriesService`, `verifyGithubSignature`, `normalizeGithubRelease`, `ReleaseEvent` repo, `generate` queue.
- Produces: `POST /api/webhooks/github` (200 always after processing decision); `WebhooksService.handleGithub(rawBody, headers)` — verifies, dedupes by delivery id, persists `ReleaseEvent`, enqueues `GenerateJob`.

- [ ] **Step 1: Write the failing test**

```typescript
// webhooks.service.spec.ts
import { createHmac } from 'crypto';
import { WebhooksService } from './webhooks.service';
process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32,1).toString('base64');

function make() {
  const secret = 's3cret';
  const body = Buffer.from(JSON.stringify({ release: { id: 42, name: 'v1', body: 'fix' } }));
  const repos = {
    findByExternalId: jest.fn(async () => ({ id:'r1', enabled:true, webhookSecret:'cipher' })),
    decryptSecret: jest.fn(() => secret),
  };
  const events = { findOne: jest.fn(async ()=>null), create:(d:any)=>d, save: jest.fn(async (d:any)=>({ id:'e1', ...d })) };
  const queue = { add: jest.fn(async ()=>({})) };
  const svc = new WebhooksService(repos as any, events as any, queue as any);
  const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  return { svc, body, sig, events, queue };
}

describe('WebhooksService.handleGithub', () => {
  it('persists event and enqueues generate on valid signature', async () => {
    const { svc, body, sig, events, queue } = make();
    const res = await svc.handleGithub(body, { 'x-hub-signature-256': sig, 'x-github-delivery': 'd1' });
    expect(res.accepted).toBe(true);
    expect(events.save).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith('generate', { releaseEventId: 'e1' });
  });
  it('is idempotent for duplicate delivery ids', async () => {
    const { svc, body, sig, events } = make();
    (events.findOne as jest.Mock).mockResolvedValueOnce({ id: 'e1' });
    const res = await svc.handleGithub(body, { 'x-hub-signature-256': sig, 'x-github-delivery': 'd1' });
    expect(res.duplicate).toBe(true);
    expect(events.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement service + controller + raw body**

```typescript
// webhooks.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository as OrmRepo } from 'typeorm';
import { ReleaseEvent, SourceProvider } from '@shipshout/data-entities';
import { verifyGithubSignature, normalizeGithubRelease } from '@shipshout/integrations-github';
import { QUEUES, GenerateJob } from '@shipshout/queue';
import { RepositoriesService } from '../repositories/repositories.service';

export class WebhooksService {
  constructor(
    private repos: RepositoriesService,
    private events: OrmRepo<ReleaseEvent>,
    @InjectQueue(QUEUES.generate) private generateQueue: Queue,
  ) {}

  async handleGithub(rawBody: Buffer, headers: Record<string,string|undefined>) {
    const payload = JSON.parse(rawBody.toString('utf8'));
    const norm = normalizeGithubRelease(payload);
    const repo = await this.repos.findByExternalId('github', norm.externalId);
    if (!repo || !repo.enabled) return { accepted: false };

    const secret = this.repos.decryptSecret(repo.webhookSecret);
    if (!verifyGithubSignature(rawBody, headers['x-hub-signature-256'] ?? '', secret)) return { accepted: false };

    const deliveryId = headers['x-github-delivery'] ?? '';
    const existing = await this.events.findOne({ where: { repository: { id: repo.id }, deliveryId } });
    if (existing) return { accepted: true, duplicate: true };

    const saved = await this.events.save(this.events.create({
      repository: repo as any, source: SourceProvider.Github, deliveryId,
      rawPayload: payload, commitSummary: norm.commitSummary,
    }));
    const job: GenerateJob = { releaseEventId: saved.id };
    await this.generateQueue.add('generate', job);
    return { accepted: true, duplicate: false };
  }
}
```

```typescript
// webhooks.controller.ts
import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) {}
  @Post('github') @HttpCode(200)
  async github(@Req() req: any, @Headers() headers: Record<string,string>) {
    return this.svc.handleGithub(req.rawBody, headers);
  }
}
```

In `main.ts`, enable raw body capture for `/api/webhooks/*` (e.g. `NestFactory.create(AppModule, { rawBody: true })` and `app.use(bodyParser.json({ verify: (req,_res,buf)=>{ (req as any).rawBody = buf; } }))`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: register a repo, POST a signed sample GitHub release payload to `/api/webhooks/github`.
Expected: `ReleaseEvent` row created; a `generate` job appears in Redis (`redis-cli LRANGE bull:generate:wait 0 -1` or Bull Board later).

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): github webhook receiver with verify, dedupe, persist, enqueue"
```

---

## Self-Review (Plan 2)

- **Spec coverage:** GitHub webhook ingestion (§3, §7), `ReleaseEvent`/`Repository`/`BrandProfile` (§5), BullMQ/Redis queue (§3.1), HMAC verification + dedupe (§10), encrypted webhook secret (§5/§10). Linear/Jira sources are deferred to Plan 7 per phasing (§13).
- **Type consistency:** `GenerateJob { releaseEventId }`, `QUEUES.generate`, `SourceProvider`, `ReleaseEventStatus` defined here/Plan 1 and consumed identically in Plan 3.
- **No placeholders:** all steps contain runnable code.
