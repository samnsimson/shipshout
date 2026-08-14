# Dogfood UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user exercise the whole ShipShout pipeline from the browser — create a workspace, register a repo, trigger a release, review/approve a draft, connect a channel, and publish it — without curl or real third-party API keys.

**Architecture:** Backend adds a `simulate-release` endpoint (reuses the existing webhook ingestion/dedupe/usage-limit logic minus signature verification) and a `MOCK_CHANNELS`-gated mock-connect endpoint + mock connector so publish can succeed without real OAuth apps. Frontend adds a workspace-creation form, a working workspace switcher, and two new settings pages (Repositories, Connections) built with the same plain server-component-plus-thin-client-component pattern already used by the Brand/Billing pages.

**Tech Stack:** NestJS, TypeORM, zod (`@shipshout/contracts`), Next.js App Router, existing `@shipshout/integrations-core` `ChannelConnector`/`ConnectorRegistry`.

## Global Constraints

- No changes to the `Channel` enum, `Draft` schema, or the hardcoded `[Channel.X, Channel.LinkedIn, Channel.Email]` list in `apps/worker/src/app/generate.processor.ts`.
- New web pages/components follow the existing plain inline-`style={{}}` convention — no CSS framework, no new dependency.
- `simulateRelease` skips signature verification and `externalId` payload-matching (it's an authenticated, workspace-scoped action) but goes through the same usage-limit/dedupe/enqueue path as real webhooks (`WebhooksService`).
- Mock-connect only works when `process.env.MOCK_CHANNELS === 'true'`; otherwise it 404s, so this never activates by accident in a real deployment.
- Follow existing test conventions exactly: pure functions/services get `.spec.ts` unit tests (see `apps/web/src/lib/*.spec.ts`, `apps/api/src/app/**/*.spec.ts`); this codebase has **no** component-level (`.spec.tsx`) tests for React components, so new UI components are verified manually, not with new test infrastructure.
- Test commands use `bunx nx test <project>` (project names: `shared-contracts`, `database`, `api`, `worker`, `web`).

---

### Task 1: `SimulateReleaseSchema` contract

**Files:**
- Modify: `libs/shared/contracts/src/lib/repository.contracts.ts`
- Create: `libs/shared/contracts/src/lib/repository.contracts.spec.ts`

**Interfaces:**
- Produces: `SimulateReleaseSchema` (zod, `{ title?: string; notes?: string }`), `SimulateReleaseDto` type. Consumed by Task 3's controller.

- [ ] **Step 1: Write the failing test**

```typescript
// libs/shared/contracts/src/lib/repository.contracts.spec.ts
import { SimulateReleaseSchema } from './repository.contracts';

describe('SimulateReleaseSchema', () => {
    it('accepts an empty body (all fields optional)', () => {
        expect(SimulateReleaseSchema.safeParse({}).success).toBe(true);
    });
    it('accepts title and notes', () => {
        expect(SimulateReleaseSchema.safeParse({ title: 'v1.0.1', notes: 'Fixed bugs' }).success).toBe(true);
    });
    it('rejects a non-string title', () => {
        expect(SimulateReleaseSchema.safeParse({ title: 42 }).success).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx nx test shared-contracts`
Expected: FAIL — `SimulateReleaseSchema` is not exported.

- [ ] **Step 3: Implement the schema**

```typescript
// libs/shared/contracts/src/lib/repository.contracts.ts
// (append to the existing file, after RegisterRepoSchema)
export const SimulateReleaseSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    notes: z.string().max(5000).optional(),
});
export type SimulateReleaseDto = z.infer<typeof SimulateReleaseSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx nx test shared-contracts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/contracts
git commit -m "feat(contracts): add SimulateReleaseSchema"
```

---

### Task 2: `WebhooksService.simulateRelease` (+ `acceptEvent` refactor)

**Files:**
- Modify: `apps/api/src/app/repositories/repositories.service.ts`
- Modify: `apps/api/src/app/webhooks/webhooks.service.ts`
- Modify: `apps/api/src/app/webhooks/webhooks.service.spec.ts`

**Interfaces:**
- Consumes: `RepositoriesService.findById(id)` (new), `SourceProvider`, `GenerateJob`, existing `TierService`/`ReleaseEventRepository`/`Queue` ports already injected into `WebhooksService`.
- Produces: `RepositoriesService.findById(id): Promise<ConnectedRepo | null>`; `WebhooksService.simulateRelease(workspaceId: string, repositoryId: string, dto: { title?: string; notes?: string }): Promise<{ accepted: boolean; duplicate?: boolean }>` — throws `NotFoundException` when the repo doesn't belong to `workspaceId`. Consumed by Task 3's controller.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/src/app/webhooks/webhooks.service.spec.ts` (keep the existing `describe('WebhooksService.handleGithub', ...)` block untouched):

```typescript
// apps/api/src/app/webhooks/webhooks.service.spec.ts (append)
describe('WebhooksService.simulateRelease', () => {
    function make(repoOverrides: Partial<{ id: string; enabled: boolean; workspace: { id: string } }> = {}) {
        const repo = { id: 'r1', enabled: true, workspace: { id: 'w1' }, ...repoOverrides };
        const repos = { findById: jest.fn(async () => repo) };
        const events = {
            findByDeliveryId: jest.fn(async () => null),
            create: (d: any) => d,
            save: jest.fn(async (d: any) => ({ id: 'e1', ...d })),
        };
        const queue = { add: jest.fn(async () => ({})) };
        const tiers = { tryConsumeRelease: jest.fn(async () => true), sourceIntegrationsAllowed: jest.fn(async () => true) };
        const svc = new WebhooksService(repos as any, events as any, tiers as any, queue as any);
        return { svc, events, queue };
    }

    it('queues a synthetic release event for the given repository', async () => {
        const { svc, events, queue } = make();
        const res = await svc.simulateRelease('w1', 'r1', { title: 'v1.0.1', notes: 'Fixed things' });
        expect(res.accepted).toBe(true);
        expect(events.save).toHaveBeenCalledWith(expect.objectContaining({ commitSummary: 'v1.0.1\nFixed things' }));
        expect(queue.add).toHaveBeenCalledWith('generate', { releaseEventId: 'e1' });
    });

    it('fills in defaults when title/notes are omitted', async () => {
        const { svc, events } = make();
        await svc.simulateRelease('w1', 'r1', {});
        const saved = (events.save as jest.Mock).mock.calls[0][0];
        expect(saved.commitSummary).toMatch(/^Test release /);
    });

    it('rejects a repository that belongs to a different workspace', async () => {
        const { svc } = make({ workspace: { id: 'other-ws' } });
        await expect(svc.simulateRelease('w1', 'r1', {})).rejects.toThrow('Repository not found');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx nx test api --testPathPatterns=webhooks.service`
Expected: FAIL — `svc.simulateRelease is not a function`.

- [ ] **Step 3: Add `findById` to `RepositoriesService`**

```typescript
// apps/api/src/app/repositories/repositories.service.ts
// add alongside the existing findByExternalId method
findById(id: string) {
    return this.repos.findOneBy({ id });
}
```

- [ ] **Step 4: Refactor `ingestNormalized` and implement `simulateRelease`**

Replace the body of `WebhooksService` in `apps/api/src/app/webhooks/webhooks.service.ts`:

```typescript
// apps/api/src/app/webhooks/webhooks.service.ts
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SourceProvider } from '@shipshout/database';
import { verifyGithubSignature, normalizeGithubRelease } from '@shipshout/integrations-github';
import { verifyLinearSignature, normalizeLinear } from '@shipshout/integrations-linear';
import { verifyJiraSecret, normalizeJira } from '@shipshout/integrations-jira';
import { QUEUES, GenerateJob } from '@shipshout/queue';
import { TierService } from '../billing/tier.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { ReleaseEventRepository } from './release-event.repository';

@Injectable()
export class WebhooksService {
    constructor(
        private repos: RepositoriesService,
        private events: ReleaseEventRepository,
        private tiers: TierService,
        @InjectQueue(QUEUES.generate) private generateQueue: Queue,
    ) {}

    async ingestNormalized(input: {
        source: SourceProvider;
        externalId: string;
        commitSummary: string;
        deliveryId: string;
        verified: boolean;
        requireSourceIntegration: boolean;
        rawPayload?: unknown;
    }): Promise<{ accepted: boolean; duplicate?: boolean }> {
        if (!input.verified) return { accepted: false };
        const repo = await this.repos.findByExternalId(input.source, input.externalId);
        if (!repo || !repo.enabled) return { accepted: false };
        return this.acceptEvent(repo, {
            source: input.source,
            deliveryId: input.deliveryId,
            commitSummary: input.commitSummary,
            requireSourceIntegration: input.requireSourceIntegration,
            rawPayload: input.rawPayload ?? { externalId: input.externalId },
        });
    }

    async simulateRelease(workspaceId: string, repositoryId: string, dto: { title?: string; notes?: string }): Promise<{ accepted: boolean; duplicate?: boolean }> {
        const repo = await this.repos.findById(repositoryId);
        if (!repo || repo.workspace.id !== workspaceId) throw new NotFoundException('Repository not found');
        const title = dto.title?.trim() || `Test release ${new Date().toISOString()}`;
        const notes = dto.notes?.trim() || 'Testing the ShipShout pipeline.';
        return this.acceptEvent(repo, {
            source: SourceProvider.Github,
            deliveryId: `sim-${randomUUID()}`,
            commitSummary: [title, notes].join('\n'),
            requireSourceIntegration: false,
            rawPayload: { simulated: true, title, notes },
        });
    }

    private async acceptEvent(
        repo: { id: string; workspace: { id: string } },
        input: { source: SourceProvider; deliveryId: string; commitSummary: string; requireSourceIntegration: boolean; rawPayload: unknown },
    ): Promise<{ accepted: boolean; duplicate?: boolean }> {
        const workspaceId = repo.workspace.id;
        if (input.requireSourceIntegration && !(await this.tiers.sourceIntegrationsAllowed(workspaceId))) return { accepted: false };

        const existing = await this.events.findByDeliveryId(repo.id, input.deliveryId);
        if (existing) return { accepted: true, duplicate: true };
        if (!(await this.tiers.tryConsumeRelease(workspaceId))) return { accepted: false };

        const saved = await this.events.save(
            this.events.create({
                repository: repo as any,
                source: input.source,
                deliveryId: input.deliveryId,
                rawPayload: input.rawPayload,
                commitSummary: input.commitSummary,
            }),
        );
        const job: GenerateJob = { releaseEventId: saved.id };
        await this.generateQueue.add('generate', job);
        return { accepted: true, duplicate: false };
    }

    async handleGithub(rawBody: Buffer, headers: Record<string, string | undefined>) {
        const payload = JSON.parse(rawBody.toString('utf8'));
        const norm = normalizeGithubRelease(payload);
        const repo = await this.repos.findByExternalId('github', norm.externalId);
        if (!repo || !repo.enabled) return { accepted: false };

        const secret = this.repos.decryptSecret(repo.webhookSecret);
        const verified = verifyGithubSignature(rawBody, headers['x-hub-signature-256'] ?? '', secret);
        return this.ingestNormalized({
            source: SourceProvider.Github,
            externalId: norm.externalId,
            commitSummary: norm.commitSummary,
            deliveryId: headers['x-github-delivery'] ?? '',
            verified,
            requireSourceIntegration: false,
            rawPayload: payload,
        });
    }

    async handleLinear(rawBody: Buffer, headers: Record<string, string | undefined>) {
        const payload = JSON.parse(rawBody.toString('utf8'));
        const norm = normalizeLinear(payload);
        if (!norm.isCompletion) return { accepted: false };
        const repo = await this.repos.findByExternalId(SourceProvider.Linear, norm.externalId);
        const verified = !!repo && verifyLinearSignature(rawBody, headers['linear-signature'] ?? '', this.repos.decryptSecret(repo.webhookSecret));
        return this.ingestNormalized({
            source: SourceProvider.Linear,
            externalId: norm.externalId,
            commitSummary: norm.commitSummary,
            deliveryId: headers['linear-delivery'] ?? norm.externalId,
            verified,
            requireSourceIntegration: true,
            rawPayload: payload,
        });
    }

    async handleJira(rawBody: Buffer, _headers: Record<string, string | undefined>, query: Record<string, string | undefined>) {
        const payload = JSON.parse(rawBody.toString('utf8'));
        const norm = normalizeJira(payload);
        if (!norm.isCompletion) return { accepted: false };
        const repo = await this.repos.findByExternalId(SourceProvider.Jira, norm.externalId);
        const verified = !!repo && verifyJiraSecret(query['secret'] ?? '', this.repos.decryptSecret(repo.webhookSecret));
        return this.ingestNormalized({
            source: SourceProvider.Jira,
            externalId: norm.externalId,
            commitSummary: norm.commitSummary,
            deliveryId: `${norm.externalId}:${payload?.timestamp ?? Date.now()}`,
            verified,
            requireSourceIntegration: true,
            rawPayload: payload,
        });
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bunx nx test api --testPathPatterns=webhooks`
Expected: PASS — all of `webhooks.service.spec.ts`, `webhooks.normalized.spec.ts`, `webhooks.integration.spec.ts` (unchanged behavior for the real webhook path).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/repositories/repositories.service.ts apps/api/src/app/webhooks
git commit -m "feat(api): WebhooksService.simulateRelease for dev-triggered test releases"
```

---

### Task 3: `RepositorySimulateController`

**Files:**
- Create: `apps/api/src/app/webhooks/repository-simulate.controller.ts`
- Create: `apps/api/src/app/webhooks/repository-simulate.controller.spec.ts`
- Modify: `apps/api/src/app/webhooks/webhooks.module.ts`

**Interfaces:**
- Consumes: `SimulateReleaseSchema` (Task 1), `WebhooksService.simulateRelease` (Task 2), `WorkspaceGuard` (`@shipshout/auth`).
- Produces: `POST /api/workspaces/:workspaceId/repositories/:id/simulate-release`. Consumed by Task 7's web `repositories.ts` lib.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/app/webhooks/repository-simulate.controller.spec.ts
import { BadRequestException } from '@nestjs/common';
import { RepositorySimulateController } from './repository-simulate.controller';

describe('RepositorySimulateController', () => {
    it('delegates valid bodies to WebhooksService.simulateRelease', async () => {
        const webhooks = { simulateRelease: jest.fn(async () => ({ accepted: true, duplicate: false })) };
        const c = new RepositorySimulateController(webhooks as any);
        const res = await c.simulateRelease('w1', 'r1', { title: 'v1' });
        expect(webhooks.simulateRelease).toHaveBeenCalledWith('w1', 'r1', { title: 'v1' });
        expect(res).toEqual({ accepted: true, duplicate: false });
    });

    it('rejects an invalid body', () => {
        const webhooks = { simulateRelease: jest.fn() };
        const c = new RepositorySimulateController(webhooks as any);
        expect(() => c.simulateRelease('w1', 'r1', { title: 42 })).toThrow(BadRequestException);
        expect(webhooks.simulateRelease).not.toHaveBeenCalled();
    });

    it('defaults a missing body to an empty object', async () => {
        const webhooks = { simulateRelease: jest.fn(async () => ({ accepted: true })) };
        const c = new RepositorySimulateController(webhooks as any);
        await c.simulateRelease('w1', 'r1', undefined);
        expect(webhooks.simulateRelease).toHaveBeenCalledWith('w1', 'r1', {});
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx nx test api --testPathPatterns=repository-simulate`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the controller and wire it into the module**

```typescript
// apps/api/src/app/webhooks/repository-simulate.controller.ts
import { BadRequestException, Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { SimulateReleaseSchema } from '@shipshout/contracts';
import { WebhooksService } from './webhooks.service';

@Controller('workspaces/:workspaceId/repositories')
@UseGuards(WorkspaceGuard)
export class RepositorySimulateController {
    constructor(private webhooks: WebhooksService) {}

    @Post(':id/simulate-release')
    simulateRelease(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() body: unknown) {
        const parsed = SimulateReleaseSchema.safeParse(body ?? {});
        if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
        return this.webhooks.simulateRelease(workspaceId, id, parsed.data);
    }
}
```

```typescript
// apps/api/src/app/webhooks/webhooks.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { QueueModule } from '@shipshout/queue/module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { DatabaseModule } from '../config/database.module';
import { WebhooksController } from './webhooks.controller';
import { RepositorySimulateController } from './repository-simulate.controller';
import { WebhooksService } from './webhooks.service';
import { ReleaseEventRepository } from './release-event.repository';

@Module({
    imports: [DatabaseModule, forwardRef(() => BillingModule), RepositoriesModule, QueueModule],
    controllers: [WebhooksController, RepositorySimulateController],
    providers: [ReleaseEventRepository, WebhooksService],
})
export class WebhooksModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx nx test api --testPathPatterns=repository-simulate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/webhooks
git commit -m "feat(api): POST /workspaces/:id/repositories/:id/simulate-release endpoint"
```

---

### Task 4: Mock-connect endpoint

**Files:**
- Modify: `apps/api/src/app/connections/connections.controller.ts`
- Create: `apps/api/src/app/connections/connections.controller.spec.ts`
- Modify: `.env`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `ConnectionsService.saveTokens` (existing), `parseChannel` (existing), `process.env.MOCK_CHANNELS`.
- Produces: `POST /api/workspaces/:workspaceId/connections/:channel/mock-connect` — 404 unless `MOCK_CHANNELS=true`. Consumed by Task 8's web `connections.ts` lib.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/app/connections/connections.controller.spec.ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Channel } from '@shipshout/database';
import { ConnectionsController } from './connections.controller';

describe('ConnectionsController.mockConnect', () => {
    const originalEnv = process.env.MOCK_CHANNELS;
    afterEach(() => {
        process.env.MOCK_CHANNELS = originalEnv;
    });

    it('saves a fake active connection when MOCK_CHANNELS is enabled', async () => {
        process.env.MOCK_CHANNELS = 'true';
        const svc = { saveTokens: jest.fn(async () => ({ id: 'c1' })) };
        const c = new ConnectionsController(svc as any);
        const res = await c.mockConnect('w1', 'x');
        expect(svc.saveTokens).toHaveBeenCalledWith('w1', Channel.X, { accessToken: 'mock-token', externalAccountId: 'mock' });
        expect(res).toEqual({ connected: true });
    });

    it('404s when MOCK_CHANNELS is disabled', async () => {
        process.env.MOCK_CHANNELS = 'false';
        const svc = { saveTokens: jest.fn() };
        const c = new ConnectionsController(svc as any);
        await expect(c.mockConnect('w1', 'x')).rejects.toThrow(NotFoundException);
        expect(svc.saveTokens).not.toHaveBeenCalled();
    });

    it('400s for an unknown channel', async () => {
        process.env.MOCK_CHANNELS = 'true';
        const svc = { saveTokens: jest.fn() };
        const c = new ConnectionsController(svc as any);
        await expect(c.mockConnect('w1', 'not-a-channel')).rejects.toThrow(BadRequestException);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx nx test api --testPathPatterns=connections.controller`
Expected: FAIL — `c.mockConnect is not a function`.

- [ ] **Step 3: Implement the endpoint**

```typescript
// apps/api/src/app/connections/connections.controller.ts
import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { WorkspaceGuard } from '@shipshout/auth';
import { ConnectionsService } from './connections.service';
import { parseChannel } from './oauth.config';

@Controller('workspaces/:workspaceId/connections')
@UseGuards(WorkspaceGuard)
export class ConnectionsController {
    constructor(private svc: ConnectionsService) {}

    @Get()
    list(@Param('workspaceId') ws: string) {
        return this.svc.list(ws);
    }

    @Get(':channel/start')
    start(@Param('workspaceId') ws: string, @Param('channel') channel: string, @Res() res: Response) {
        try {
            res.redirect(this.svc.buildAuthUrl(ws, parseChannel(channel)));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new BadRequestException(message);
        }
    }

    @Get(':channel/callback')
    async callback(@Param('workspaceId') ws: string, @Param('channel') channel: string, @Query('code') code: string, @Res() res: Response) {
        await this.svc.exchangeCode(ws, parseChannel(channel), code);
        res.redirect(`${process.env.WEB_BASE_URL}/${ws}/settings/connections`);
    }

    @Post(':channel/mock-connect')
    async mockConnect(@Param('workspaceId') ws: string, @Param('channel') channel: string) {
        if (process.env.MOCK_CHANNELS !== 'true') throw new NotFoundException();
        try {
            await this.svc.saveTokens(ws, parseChannel(channel), { accessToken: 'mock-token', externalAccountId: 'mock' });
            return { connected: true };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new BadRequestException(message);
        }
    }
}
```

Add `MOCK_CHANNELS=true` to `.env`, and `MOCK_CHANNELS=` (with a comment) to `.env.example`:

```
# apps to .env.example, after the Stripe block
# Local/dev only — swaps real publish connectors for one that always succeeds,
# and enables the "Connect (test)" button in Settings → Connections.
MOCK_CHANNELS=
```

```
# append to .env
MOCK_CHANNELS=true
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx nx test api --testPathPatterns=connections.controller`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/connections .env .env.example
git commit -m "feat(api): dev-only mock-connect endpoint gated by MOCK_CHANNELS"
```

---

### Task 5: `MockConnector` + worker connector-registry factory

**Files:**
- Create: `apps/worker/src/app/mock-connector.ts`
- Create: `apps/worker/src/app/mock-connector.spec.ts`
- Create: `apps/worker/src/app/connector-registry.factory.ts`
- Create: `apps/worker/src/app/connector-registry.factory.spec.ts`
- Modify: `apps/worker/src/app/app.module.ts`

**Interfaces:**
- Consumes: `ChannelConnector`, `PublishInput`, `PublishOutput` (`@shipshout/integrations-core`), `Channel` (`@shipshout/database`).
- Produces: `MockConnector` (implements `ChannelConnector`, always resolves with a fake `externalUrl`); `buildConnectorRegistry(mockChannels?: boolean): ConnectorRegistry` — real connectors by default, `MockConnector` per channel when `mockChannels` (defaults to `process.env.MOCK_CHANNELS === 'true'`) is `true`.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/worker/src/app/mock-connector.spec.ts
import { Channel } from '@shipshout/database';
import { MockConnector } from './mock-connector';

describe('MockConnector', () => {
    it('always resolves with a fake url for the given channel', async () => {
        const connector = new MockConnector(Channel.X);
        expect(connector.channel).toBe(Channel.X);
        const out = await connector.publish({ text: 'hello', accessToken: 'tok' });
        expect(out.externalUrl).toContain('https://example.test/x/');
    });
});
```

```typescript
// apps/worker/src/app/connector-registry.factory.spec.ts
import { Channel } from '@shipshout/database';
import { XConnector } from '@shipshout/integrations-x';
import { buildConnectorRegistry } from './connector-registry.factory';

describe('buildConnectorRegistry', () => {
    it('wires mock connectors when mockChannels is true', async () => {
        const registry = buildConnectorRegistry(true);
        const out = await registry.get(Channel.X).publish({ text: 'hi', accessToken: 'tok' });
        expect(out.externalUrl).toContain('https://example.test/x/');
    });

    it('wires real connectors when mockChannels is false', () => {
        const registry = buildConnectorRegistry(false);
        expect(registry.get(Channel.X)).toBeInstanceOf(XConnector);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx nx test worker`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `MockConnector` and the factory**

```typescript
// apps/worker/src/app/mock-connector.ts
import { randomUUID } from 'crypto';
import { Channel } from '@shipshout/database';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';

export class MockConnector implements ChannelConnector {
    constructor(public channel: Channel) {}

    async publish(_input: PublishInput): Promise<PublishOutput> {
        return { externalUrl: `https://example.test/${this.channel}/${randomUUID()}` };
    }
}
```

```typescript
// apps/worker/src/app/connector-registry.factory.ts
import { Channel } from '@shipshout/database';
import { ConnectorRegistry } from '@shipshout/integrations-core';
import { XConnector } from '@shipshout/integrations-x';
import { LinkedInConnector } from '@shipshout/integrations-linkedin';
import { EmailConnector } from '@shipshout/integrations-email';
import { BufferConnector } from '@shipshout/integrations-buffer';
import { MailchimpConnector } from '@shipshout/integrations-mailchimp';
import { MockConnector } from './mock-connector';

const MOCKABLE_CHANNELS = [Channel.X, Channel.LinkedIn, Channel.Email, Channel.Buffer, Channel.Mailchimp];

export function buildConnectorRegistry(mockChannels: boolean = process.env.MOCK_CHANNELS === 'true'): ConnectorRegistry {
    if (mockChannels) return new ConnectorRegistry(MOCKABLE_CHANNELS.map((channel) => new MockConnector(channel)));
    return new ConnectorRegistry([new XConnector(), new LinkedInConnector(), new EmailConnector(), new BufferConnector(), new MailchimpConnector()]);
}
```

Update `apps/worker/src/app/app.module.ts` to use the factory instead of constructing connectors inline:

```typescript
// apps/worker/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    AiEngine,
    ClaudeProvider,
    GenerationService,
    OpenAiProvider,
    ReleaseEventRepository,
    BrandProfileRepository,
    DraftRepository as GenerationDraftRepository,
} from '@shipshout/ai';
import {
    ConnectorRegistry,
    DispatchService,
    CONNECTIONS_PORT,
    DraftRepository as DispatchDraftRepository,
    PublishRecordRepository,
} from '@shipshout/integrations-core';
import { QueueModule } from '@shipshout/queue/module';
import { buildWorkerTypeOrmOptions } from './config/typeorm.module';
import { DatabaseModule } from './config/database.module';
import { ChannelConnectionRepository } from './channel-connection.repository';
import { DispatchProcessor } from './dispatch.processor';
import { GenerateProcessor } from './generate.processor';
import { WorkerConnectionsService } from './worker-connections.service';
import { buildConnectorRegistry } from './connector-registry.factory';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot(buildWorkerTypeOrmOptions()), DatabaseModule, QueueModule],
    providers: [
        {
            provide: AiEngine,
            useFactory: () => new AiEngine(new OpenAiProvider(), new ClaudeProvider()),
        },
        ReleaseEventRepository,
        BrandProfileRepository,
        GenerationDraftRepository,
        GenerationService,
        GenerateProcessor,
        {
            provide: ConnectorRegistry,
            useFactory: () => buildConnectorRegistry(),
        },
        ChannelConnectionRepository,
        WorkerConnectionsService,
        { provide: CONNECTIONS_PORT, useExisting: WorkerConnectionsService },
        DispatchDraftRepository,
        PublishRecordRepository,
        DispatchService,
        DispatchProcessor,
    ],
})
export class AppModule {}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx nx test worker`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/worker
git commit -m "feat(worker): MockConnector + MOCK_CHANNELS-gated connector registry factory"
```

---

### Task 6: Web lib — `workspaces.ts`, `repositories.ts`, `connections.ts`

**Files:**
- Create: `apps/web/src/lib/workspaces.ts`
- Create: `apps/web/src/lib/workspaces.spec.ts`
- Create: `apps/web/src/lib/repositories.ts`
- Create: `apps/web/src/lib/repositories.spec.ts`
- Create: `apps/web/src/lib/connections.ts`
- Create: `apps/web/src/lib/connections.spec.ts`

**Interfaces:**
- Consumes: `apiFetch` (`apps/web/src/lib/api-client.ts`).
- Produces: `listWorkspaces()`, `createWorkspace(name)`; `listRepositories(ws)`, `createRepository(ws, dto)`, `simulateRelease(ws, repositoryId, dto)`; `listConnections(ws)`, `mockConnect(ws, channel)`, `connectUrl(ws, channel): string`. Consumed by Tasks 7–9's components.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/lib/workspaces.spec.ts
import { createWorkspace } from './workspaces';

describe('createWorkspace', () => {
    it('POSTs a new workspace', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'w1' }) } as any);
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
        await createWorkspace('Acme');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Acme' }) }));
        spy.mockRestore();
    });
});
```

```typescript
// apps/web/src/lib/repositories.spec.ts
import { createRepository, simulateRelease } from './repositories';

describe('repositories lib', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    });

    it('POSTs a new repository', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ webhookSecret: 's' }) } as any);
        await createRepository('w1', { provider: 'github', externalId: 'abc', name: 'acme/app' });
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/repositories', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });

    it('POSTs a simulate-release request', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ accepted: true }) } as any);
        await simulateRelease('w1', 'r1', { title: 'v1' });
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/repositories/r1/simulate-release', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });
});
```

```typescript
// apps/web/src/lib/connections.spec.ts
import { mockConnect, connectUrl } from './connections';

describe('connections lib', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    });

    it('POSTs a mock-connect request', async () => {
        const spy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ connected: true }) } as any);
        await mockConnect('w1', 'x');
        expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/connections/x/mock-connect', expect.objectContaining({ method: 'POST' }));
        spy.mockRestore();
    });

    it('builds the OAuth start URL', () => {
        expect(connectUrl('w1', 'x')).toBe('http://api.test/api/workspaces/w1/connections/x/start');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx nx test web --testPathPatterns="workspaces|repositories|connections"`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the lib modules**

```typescript
// apps/web/src/lib/workspaces.ts
import { apiFetch } from './api-client';

export const listWorkspaces = () => apiFetch('/workspaces');

export const createWorkspace = (name: string) =>
    apiFetch('/workspaces', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
    });
```

```typescript
// apps/web/src/lib/repositories.ts
import { apiFetch } from './api-client';

export const listRepositories = (ws: string) => apiFetch(`/workspaces/${ws}/repositories`);

export const createRepository = (ws: string, dto: { provider: string; externalId: string; name: string }) =>
    apiFetch(`/workspaces/${ws}/repositories`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dto),
    });

export const simulateRelease = (ws: string, repositoryId: string, dto: { title?: string; notes?: string }) =>
    apiFetch(`/workspaces/${ws}/repositories/${repositoryId}/simulate-release`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dto),
    });
```

```typescript
// apps/web/src/lib/connections.ts
import { apiFetch } from './api-client';

export const listConnections = (ws: string) => apiFetch(`/workspaces/${ws}/connections`);

export const mockConnect = (ws: string, channel: string) => apiFetch(`/workspaces/${ws}/connections/${channel}/mock-connect`, { method: 'POST' });

export const connectUrl = (ws: string, channel: string) =>
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/workspaces/${ws}/connections/${channel}/start`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx nx test web --testPathPatterns="workspaces|repositories|connections"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/workspaces.ts apps/web/src/lib/workspaces.spec.ts apps/web/src/lib/repositories.ts apps/web/src/lib/repositories.spec.ts apps/web/src/lib/connections.ts apps/web/src/lib/connections.spec.ts
git commit -m "feat(web): workspaces/repositories/connections API client modules"
```

---

### Task 7: Workspace creation + working workspace switcher + nav links

**Files:**
- Create: `apps/web/src/app/(dashboard)/create-workspace-form.tsx`
- Modify: `apps/web/src/app/(dashboard)/page.tsx`
- Create: `apps/web/src/app/(dashboard)/workspace-switcher.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `createWorkspace` (Task 6).
- Produces: no new exports consumed elsewhere; this is a leaf UI task.

- [ ] **Step 1: Create the workspace-creation form**

```typescript
// apps/web/src/app/(dashboard)/create-workspace-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkspace } from '../../lib/workspaces';

export function CreateWorkspaceForm() {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    return (
        <form
            style={{ display: 'grid', gap: 12, maxWidth: 360, marginTop: 16 }}
            onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setError(null);
                try {
                    const ws = await createWorkspace(name);
                    router.push(`/${ws.id}/drafts`);
                } catch {
                    setError('Could not create workspace. Try a different name.');
                    setSubmitting(false);
                }
            }}
        >
            <label style={{ display: 'grid', gap: 6 }}>
                <span>Workspace name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required />
            </label>
            <button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? 'Creating…' : 'Create workspace'}
            </button>
            {error ? <span style={{ color: '#dc2626' }}>{error}</span> : null}
        </form>
    );
}
```

- [ ] **Step 2: Wire it into the dashboard page**

```typescript
// apps/web/src/app/(dashboard)/page.tsx
import { redirect } from 'next/navigation';
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
        <main style={{ padding: '2rem' }}>
            <h1>Dashboard</h1>
            <p>Create a workspace to get started.</p>
            <CreateWorkspaceForm />
        </main>
    );
}
```

- [ ] **Step 3: Create the workspace switcher**

```typescript
// apps/web/src/app/(dashboard)/workspace-switcher.tsx
'use client';

import { useRouter } from 'next/navigation';

type Workspace = { id: string; name: string };

export function WorkspaceSwitcher({ workspaces, activeId }: { workspaces: Workspace[]; activeId?: string }) {
    const router = useRouter();
    return (
        <select
            aria-label="Workspace"
            value={activeId ?? ''}
            onChange={(e) => {
                if (e.target.value === '__new__') router.push('/');
                else router.push(`/${e.target.value}/drafts`);
            }}
            style={{ marginLeft: activeId ? 0 : 'auto' }}
        >
            {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                    {ws.name}
                </option>
            ))}
            <option value="__new__">+ New workspace</option>
        </select>
    );
}
```

- [ ] **Step 4: Wire the switcher and new nav links into the layout**

```typescript
// apps/web/src/app/(dashboard)/layout.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { getSessionUser } from '../../lib/session';
import { WorkspaceSwitcher } from './workspace-switcher';

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
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <header
                style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '1rem 2rem',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#fff',
                }}
            >
                <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: '#0f172a' }}>
                    ShipShout
                </Link>
                <span style={{ color: '#64748b' }}>{user.name ?? user.githubId}</span>
                {activeWs ? (
                    <nav style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                        <Link href={`/${activeWs}/drafts`}>Drafts</Link>
                        <Link href={`/${activeWs}/settings/repositories`}>Repositories</Link>
                        <Link href={`/${activeWs}/settings/connections`}>Connections</Link>
                        <Link href={`/${activeWs}/settings/brand`}>Brand</Link>
                        <Link href={`/${activeWs}/settings/billing`}>Billing</Link>
                    </nav>
                ) : null}
                <WorkspaceSwitcher workspaces={workspaces} activeId={activeWs} />
            </header>
            {children}
        </div>
    );
}
```

- [ ] **Step 5: Manual verification**

Run: `bunx nx serve api` and `bunx nx dev web` (see Task 10 for full local-run instructions if not already running).
Expected: Logging in with no workspaces shows the "Create workspace" form; submitting it redirects to `/{newId}/drafts` with the new nav links visible; the workspace `<select>` now navigates when changed.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/create-workspace-form.tsx apps/web/src/app/\(dashboard\)/page.tsx apps/web/src/app/\(dashboard\)/workspace-switcher.tsx apps/web/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(web): workspace creation form, working workspace switcher, settings nav links"
```

---

### Task 8: Repositories settings page

**Files:**
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/page.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-form.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-row.tsx`

**Interfaces:**
- Consumes: `listRepositories`, `createRepository`, `simulateRelease` (Task 6).
- Produces: no new exports consumed elsewhere; leaf UI task.

- [ ] **Step 1: Create the repository row (with "Send test release")**

```typescript
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-row.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { simulateRelease } from '../../../../../lib/repositories';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export function RepositoryRow({ workspaceId, repo }: { workspaceId: string; repo: Repo }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(`Test release ${new Date().toLocaleString()}`);
    const [notes, setNotes] = useState('Testing the ShipShout pipeline.');
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    return (
        <article style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fff' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <strong>{repo.name}</strong>
                    <span style={{ marginLeft: 8, color: '#666', fontSize: 14 }}>{repo.provider}</span>
                </div>
                <button type="button" onClick={() => setOpen((o) => !o)}>
                    Send test release
                </button>
            </header>
            {open ? (
                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes" />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={async () => {
                                setMessage(null);
                                try {
                                    const res = await simulateRelease(workspaceId, repo.id, { title, notes });
                                    setMessage(res.accepted ? 'Queued — check Drafts in a few seconds.' : 'Not accepted (usage limit reached?).');
                                    router.refresh();
                                } catch {
                                    setMessage('Failed to send test release.');
                                }
                            }}
                        >
                            Send
                        </button>
                        {message ? <span style={{ color: '#666' }}>{message}</span> : null}
                    </div>
                </div>
            ) : null}
        </article>
    );
}
```

- [ ] **Step 2: Create the add-repository form**

```typescript
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/repository-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRepository } from '../../../../../lib/repositories';

function randomExternalId() {
    return Math.random().toString(36).slice(2, 10);
}

export function RepositoryForm({ workspaceId }: { workspaceId: string }) {
    const [provider, setProvider] = useState('github');
    const [name, setName] = useState('');
    const [externalId, setExternalId] = useState(randomExternalId());
    const [created, setCreated] = useState<{ webhookSecret: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    return (
        <div>
            <form
                style={{ display: 'grid', gap: 12, maxWidth: 480 }}
                onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    try {
                        const { webhookSecret } = await createRepository(workspaceId, { provider, name, externalId });
                        setCreated({ webhookSecret });
                        setName('');
                        setExternalId(randomExternalId());
                        router.refresh();
                    } catch {
                        setError('Could not add repository. Check the fields and try again.');
                    }
                }}
            >
                <label style={{ display: 'grid', gap: 6 }}>
                    <span>Provider</span>
                    <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                        <option value="github">GitHub</option>
                        <option value="linear">Linear</option>
                        <option value="jira">Jira</option>
                    </select>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    <span>Name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="acme/website" required />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                    <span>External ID</span>
                    <input value={externalId} onChange={(e) => setExternalId(e.target.value)} required />
                    <small style={{ color: '#666' }}>
                        Must match the id in the incoming payload. Leave as-is if you&apos;ll only use &quot;Send test release&quot;.
                    </small>
                </label>
                <button type="submit">Add repository</button>
                {error ? <span style={{ color: '#dc2626' }}>{error}</span> : null}
            </form>
            {created ? (
                <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <p>
                        Webhook URL: <code>{process.env.NEXT_PUBLIC_API_BASE_URL}/api/webhooks/github</code>
                    </p>
                    <p>
                        Webhook secret (shown once): <code>{created.webhookSecret}</code>
                    </p>
                </div>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 3: Create the page**

```typescript
// apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories/page.tsx
import { listRepositories } from '../../../../../lib/repositories';
import { RepositoryForm } from './repository-form';
import { RepositoryRow } from './repository-row';

type Repo = { id: string; provider: string; name: string; enabled: boolean };

export default async function RepositoriesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const repos: Repo[] = await listRepositories(workspaceId);
    return (
        <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Repositories</h1>
            {repos.length === 0 ? (
                <p style={{ color: '#666' }}>No repositories yet. Add one below.</p>
            ) : (
                <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                    {repos.map((r) => (
                        <RepositoryRow key={r.id} workspaceId={workspaceId} repo={r} />
                    ))}
                </div>
            )}
            <RepositoryForm workspaceId={workspaceId} />
        </main>
    );
}
```

- [ ] **Step 4: Manual verification**

Navigate to `/{workspaceId}/settings/repositories`.
Expected: empty state shown initially; adding a repository shows the webhook secret callout once and the new row appears; clicking "Send test release" on a row and then "Send" shows the "Queued" message.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/[workspaceId]/settings/repositories"
git commit -m "feat(web): Repositories settings page with add-repo form and test-release trigger"
```

---

### Task 9: Connections settings page

**Files:**
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/page.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/connection-row.tsx`

**Interfaces:**
- Consumes: `listConnections`, `mockConnect`, `connectUrl` (Task 6).
- Produces: no new exports consumed elsewhere; leaf UI task.

- [ ] **Step 1: Create the connection row**

```typescript
// apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/connection-row.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockConnect, connectUrl } from '../../../../../lib/connections';

const LABELS: Record<string, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    email: 'Email',
    buffer: 'Buffer',
    mailchimp: 'Mailchimp',
};

export function ConnectionRow({ workspaceId, channel, connected }: { workspaceId: string; channel: string; connected: boolean }) {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    return (
        <article
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
            }}
        >
            <div>
                <strong>{LABELS[channel] ?? channel}</strong>
                <span style={{ marginLeft: 8, color: connected ? '#059669' : '#666' }}>{connected ? 'Connected' : 'Not connected'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a href={connectUrl(workspaceId, channel)}>Connect</a>
                <button
                    type="button"
                    onClick={async () => {
                        setError(null);
                        try {
                            await mockConnect(workspaceId, channel);
                            router.refresh();
                        } catch {
                            setError('Test connect is disabled in this environment.');
                        }
                    }}
                >
                    Connect (test)
                </button>
                {error ? <span style={{ color: '#dc2626' }}>{error}</span> : null}
            </div>
        </article>
    );
}
```

- [ ] **Step 2: Create the page**

```typescript
// apps/web/src/app/(dashboard)/[workspaceId]/settings/connections/page.tsx
import { listConnections } from '../../../../../lib/connections';
import { ConnectionRow } from './connection-row';

const CHANNELS = ['x', 'linkedin', 'email', 'buffer', 'mailchimp'] as const;

export default async function ConnectionsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const connections: { type: string; status: string }[] = await listConnections(workspaceId);
    return (
        <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Connections</h1>
            <div style={{ display: 'grid', gap: 12 }}>
                {CHANNELS.map((channel) => (
                    <ConnectionRow
                        key={channel}
                        workspaceId={workspaceId}
                        channel={channel}
                        connected={connections.some((c) => c.type === channel && c.status === 'active')}
                    />
                ))}
            </div>
        </main>
    );
}
```

- [ ] **Step 3: Manual verification**

Navigate to `/{workspaceId}/settings/connections` with `MOCK_CHANNELS=true` set on the API.
Expected: all five channels show "Not connected"; clicking "Connect (test)" next to X flips it to "Connected".

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(dashboard)/[workspaceId]/settings/connections"
git commit -m "feat(web): Connections settings page with real OAuth link and mock-connect button"
```

---

### Task 10: Full local dogfood walkthrough (manual, no code changes)

**Files:** none (verification only).

**Interfaces:** none — this task exercises Tasks 1–9 together.

- [ ] **Step 1: Start infrastructure and apply migrations**

```bash
docker compose up -d postgres redis
bun run migration:run
```

Expected: no errors; `subscriptions`/`usage_counters`/etc. tables exist (already applied from earlier work, this is a no-op check).

- [ ] **Step 2: Confirm `MOCK_CHANNELS=true` is set**

Check `.env` has `MOCK_CHANNELS=true` (added in Task 4).

- [ ] **Step 3: Start all three apps**

```bash
bunx nx serve api
bunx nx serve worker
bunx nx dev web
```

Expected: all three start without crashing (watch each terminal for the "Application is running on" / "ShipShout worker started" log lines).

- [ ] **Step 4: Walk the flow in the browser**

1. Go to `http://localhost:4200`, log in via GitHub.
2. No workspace yet → fill in "Create workspace" → redirected to `/{id}/drafts`.
3. Go to **Repositories** → add a repo (provider `github`, name `acme/app`, leave External ID as generated) → confirm the webhook secret callout appears.
4. Click **Send test release** on the new repo row → **Send** → confirm the "Queued" message.
5. Go to **Drafts** (wait a few seconds for the worker to process) → confirm drafts appear for X/LinkedIn/Email → edit copy on one → **Approve**.
6. Go to **Connections** → click **Connect (test)** next to **X (Twitter)** → confirm it flips to "Connected".
7. Go back to **Drafts** → **Publish** the approved X draft.

Expected: no errors in any of the three terminals; the draft's status moves through `pending_review` → `approved` → `published`.

- [ ] **Step 5: Verify the `PublishRecord` directly (optional but recommended)**

```bash
docker exec -it shipshout-postgres-1 psql -U shipshout -d shipshout -c \
  "SELECT status, \"externalUrl\" FROM publish_records ORDER BY \"createdAt\" DESC LIMIT 1;"
```

Expected: one row with `status = success` and an `externalUrl` starting with `https://example.test/x/`.

- [ ] **Step 6: No commit for this task** (verification only — if any step fails, fix the underlying task and re-run from Step 4).

---

## Self-Review

- **Spec coverage:** Workspace creation (§3.1 → Task 7), Repositories page + webhook secret/URL display + "Send test release" (§3.2 → Task 8), Connections page + real/test connect (§3.3 → Task 9), nav links (§3.4 → Task 7), web lib modules (§3.5 → Task 6), simulate-release endpoint + `acceptEvent` refactor (§4.1 → Tasks 2–3), mock-connect endpoint + `MOCK_CHANNELS` env (§4.2–4.3 → Task 4), `MockConnector` + registry wiring (§5 → Task 5), end-to-end walkthrough (§6 → Task 10), error handling for cross-workspace simulate-release / disabled mock-connect (§7 → Tasks 2–4, verified by their tests).
- **Placeholder scan:** no TBD/TODO; every step has runnable code or exact manual commands.
- **Type consistency:** `WebhooksService.simulateRelease(workspaceId, repositoryId, dto)` (Task 2) matches the call in `RepositorySimulateController` (Task 3) matches `simulateRelease(ws, repositoryId, dto)` in the web lib (Task 6) matches the call in `RepositoryRow` (Task 8). `ConnectorRegistry`/`ChannelConnector` types in `MockConnector` and `connector-registry.factory.ts` (Task 5) match the existing `@shipshout/integrations-core` interfaces used by `DispatchService` — no changes needed there. `ConnectionsController.mockConnect` (Task 4) matches `mockConnect(ws, channel)` in the web lib (Task 6) matches the call in `ConnectionRow` (Task 9).
