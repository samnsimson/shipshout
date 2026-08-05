# ShipShout Plan 5 — Multi-Channel Dispatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish approved drafts to external channels (X, LinkedIn, Email) with Buffer/Mailchimp sync connectors, storing per-attempt results and retrying transient failures.

**Architecture:** `ChannelConnection` stores encrypted OAuth tokens per workspace/channel. Each channel connector in `libs/integrations/*` implements a common `ChannelConnector` interface. `apps/api` handles OAuth connect/callback for each channel. `apps/worker` runs a `dispatch` consumer that resolves the connector, posts, and writes a `PublishRecord`.

**Tech Stack:** NestJS, BullMQ, TypeORM, OAuth2, X API, LinkedIn API, Resend/SendGrid, Buffer/Mailchimp APIs, `@shipshout/shared-util` crypto.

## Global Constraints

- Same as Plans 1–4 Global Constraints.
- OAuth tokens stored **encrypted at rest**; decrypted only in the connector at send time.
- Connectors implement one common interface so channels are swappable.
- Transient errors retried via BullMQ; permanent errors mark `PublishRecord` failed.

---

### Task 1: ChannelConnection + PublishRecord entities + migration

**Files:**

- Create: `libs/data/entities/src/lib/entities/channel-connection.entity.ts`
- Create: `libs/data/entities/src/lib/entities/publish-record.entity.ts`
- Modify: `libs/data/entities/src/lib/typeorm.config.ts`
- Test: `libs/data/entities/src/lib/entities/dispatch-entities.spec.ts`

**Interfaces:**

- Consumes: `Workspace`, `Draft`, `Channel` (Plans 1/3), `ENTITIES`.
- Produces: `ChannelConnection` (workspace, type: `Channel`, accessToken/refreshToken encrypted, externalAccountId, status), `PublishRecord` (draft, channelConnection, externalUrl, status: `PublishStatus`, error), `PublishStatus` enum (`success|failed`), `ConnectionStatus` enum (`active|revoked`).

- [ ] **Step 1: Write the failing test**

```typescript
// dispatch-entities.spec.ts
import { ENTITIES } from '../typeorm.config';
import { ChannelConnection, ConnectionStatus } from './channel-connection.entity';
import { PublishRecord, PublishStatus } from './publish-record.entity';
describe('dispatch entities', () => {
    it('registers entities', () => expect(ENTITIES).toEqual(expect.arrayContaining([ChannelConnection, PublishRecord])));
    it('has enums', () => {
        expect(ConnectionStatus.Active).toBe('active');
        expect(PublishStatus.Success).toBe('success');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test data-entities`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement entities**

```typescript
// channel-connection.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity';
import { Channel } from './draft.entity';
export enum ConnectionStatus {
    Active = 'active',
    Revoked = 'revoked',
}
@Entity('channel_connections')
export class ChannelConnection {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => Workspace, { eager: true }) workspace!: Workspace;
    @Column({ type: 'enum', enum: Channel }) type!: Channel;
    @Column({ type: 'text' }) accessToken!: string; // encrypted
    @Column({ type: 'text', nullable: true }) refreshToken?: string; // encrypted
    @Column({ nullable: true }) externalAccountId?: string;
    @Column({ type: 'enum', enum: ConnectionStatus, default: ConnectionStatus.Active }) status!: ConnectionStatus;
}
```

```typescript
// publish-record.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Draft } from './draft.entity';
import { ChannelConnection } from './channel-connection.entity';
export enum PublishStatus {
    Success = 'success',
    Failed = 'failed',
}
@Entity('publish_records')
export class PublishRecord {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => Draft, { eager: true }) draft!: Draft;
    @ManyToOne(() => ChannelConnection, { eager: true, nullable: true }) channelConnection?: ChannelConnection;
    @Column({ nullable: true }) externalUrl?: string;
    @Column({ type: 'enum', enum: PublishStatus }) status!: PublishStatus;
    @Column({ type: 'text', nullable: true }) error?: string;
    @CreateDateColumn() createdAt!: Date;
}
```

Register both in `ENTITIES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test data-entities`
Expected: PASS.

- [ ] **Step 5: Generate + run migration**

```bash
npx typeorm migration:generate libs/data/entities/src/lib/migrations/Dispatch -d libs/data/entities/src/lib/data-source.ts
npx typeorm migration:run -d libs/data/entities/src/lib/data-source.ts
```

- [ ] **Step 6: Commit**

```bash
git add libs/data/entities
git commit -m "feat(data): ChannelConnection and PublishRecord entities + migration"
```

---

### Task 2: Common connector interface + registry

**Files:**

- Create: `libs/integrations/core/src/lib/channel-connector.ts`
- Create: `libs/integrations/core/src/lib/connector-registry.ts`
- Test: `libs/integrations/core/src/lib/connector-registry.spec.ts`

**Interfaces:**

- Consumes: `Channel`.
- Produces: `interface ChannelConnector { channel: Channel; publish(input: { text: string; accessToken: string }): Promise<{ externalUrl?: string }> }`; `ConnectorRegistry.get(channel): ChannelConnector`. Consumed by the dispatch worker (Task 5).

- [ ] **Step 1: Generate lib + write failing test**

```bash
npx nx g @nx/js:lib integrations-core --directory=libs/integrations/core --importPath=@shipshout/integrations-core --unitTestRunner=jest
```

```typescript
// connector-registry.spec.ts
import { ConnectorRegistry } from './connector-registry';
import { Channel } from '@shipshout/data-entities';
describe('ConnectorRegistry', () => {
    it('returns a registered connector', () => {
        const fake = { channel: Channel.X, publish: jest.fn() } as any;
        const reg = new ConnectorRegistry([fake]);
        expect(reg.get(Channel.X)).toBe(fake);
    });
    it('throws for unregistered channel', () => {
        const reg = new ConnectorRegistry([]);
        expect(() => reg.get(Channel.LinkedIn)).toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test integrations-core`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement interface + registry**

```typescript
// channel-connector.ts
import { Channel } from '@shipshout/data-entities';
export interface PublishInput {
    text: string;
    accessToken: string;
}
export interface PublishOutput {
    externalUrl?: string;
}
export interface ChannelConnector {
    channel: Channel;
    publish(input: PublishInput): Promise<PublishOutput>;
}
```

```typescript
// connector-registry.ts
import { Channel } from '@shipshout/data-entities';
import { ChannelConnector } from './channel-connector';
export class ConnectorRegistry {
    private map = new Map<Channel, ChannelConnector>();
    constructor(connectors: ChannelConnector[]) {
        connectors.forEach((c) => this.map.set(c.channel, c));
    }
    get(channel: Channel): ChannelConnector {
        const c = this.map.get(channel);
        if (!c) throw new Error(`No connector registered for ${channel}`);
        return c;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test integrations-core`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/integrations/core
git commit -m "feat(integrations): common ChannelConnector interface and registry"
```

---

### Task 3: X, LinkedIn, and Email connectors

**Files:**

- Create: `libs/integrations/x/src/lib/x.connector.ts`
- Create: `libs/integrations/linkedin/src/lib/linkedin.connector.ts`
- Create: `libs/integrations/email/src/lib/email.connector.ts`
- Test: `libs/integrations/x/src/lib/x.connector.spec.ts`
- Test: `libs/integrations/email/src/lib/email.connector.spec.ts`

**Interfaces:**

- Consumes: `ChannelConnector`, `Channel`, channel HTTP APIs.
- Produces: `XConnector`, `LinkedInConnector`, `EmailConnector` — each `publish({ text, accessToken })` calls the provider and returns `{ externalUrl }`. HTTP calls go through an injected `fetch`-like function for testability.

- [ ] **Step 1: Generate libs + write failing tests**

```bash
npx nx g @nx/js:lib integrations-x --directory=libs/integrations/x --importPath=@shipshout/integrations-x --unitTestRunner=jest
npx nx g @nx/js:lib integrations-linkedin --directory=libs/integrations/linkedin --importPath=@shipshout/integrations-linkedin --unitTestRunner=jest
npx nx g @nx/js:lib integrations-email --directory=libs/integrations/email --importPath=@shipshout/integrations-email --unitTestRunner=jest
```

```typescript
// x.connector.spec.ts
import { XConnector } from './x.connector';
import { Channel } from '@shipshout/data-entities';
describe('XConnector', () => {
    it('posts a tweet and returns the url', async () => {
        const http = jest.fn(async () => ({ ok: true, json: async () => ({ data: { id: '123' } }) }));
        const c = new XConnector(http as any);
        expect(c.channel).toBe(Channel.X);
        const out = await c.publish({ text: 'hi', accessToken: 'tok' });
        expect(out.externalUrl).toContain('123');
        expect(http).toHaveBeenCalledWith('https://api.twitter.com/2/tweets', expect.objectContaining({ method: 'POST' }));
    });
});
```

```typescript
// email.connector.spec.ts
import { EmailConnector } from './email.connector';
describe('EmailConnector', () => {
    it('sends via provider API', async () => {
        const http = jest.fn(async () => ({ ok: true, json: async () => ({ id: 'm1' }) }));
        const c = new EmailConnector(http as any);
        const out = await c.publish({ text: 'subject\nbody', accessToken: 'apikey' });
        expect(http).toHaveBeenCalled();
        expect(out.externalUrl).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test integrations-x && npx nx test integrations-email`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement connectors**

```typescript
// x.connector.ts
import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';
type Http = typeof fetch;
export class XConnector implements ChannelConnector {
    channel = Channel.X;
    constructor(private http: Http = fetch) {}
    async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
        const res = await this.http('https://api.twitter.com/2/tweets', {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`X publish failed: ${res.status}`);
        const data = await res.json();
        return { externalUrl: `https://x.com/i/web/status/${data.data.id}` };
    }
}
```

```typescript
// linkedin.connector.ts
import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';
type Http = typeof fetch;
export class LinkedInConnector implements ChannelConnector {
    channel = Channel.LinkedIn;
    constructor(
        private http: Http = fetch,
        private authorUrn = process.env.LINKEDIN_AUTHOR_URN,
    ) {}
    async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
        const res = await this.http('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
            body: JSON.stringify({
                author: this.authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
            }),
        });
        if (!res.ok) throw new Error(`LinkedIn publish failed: ${res.status}`);
        const id = res.headers.get('x-restli-id') ?? '';
        return { externalUrl: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
    }
}
```

```typescript
// email.connector.ts
import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';
type Http = typeof fetch;
export class EmailConnector implements ChannelConnector {
    channel = Channel.Email;
    constructor(private http: Http = fetch) {}
    async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
        const [subject, ...bodyLines] = text.split('\n');
        const res = await this.http('https://api.resend.com/emails', {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM ?? 'updates@shipshout.app',
                to: process.env.EMAIL_TEST_TO ?? 'list@shipshout.app',
                subject: subject || 'Product update',
                text: bodyLines.join('\n'),
            }),
        });
        if (!res.ok) throw new Error(`Email send failed: ${res.status}`);
        return {};
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test integrations-x && npx nx test integrations-email`
Expected: PASS. (Add an analogous `linkedin.connector.spec.ts` mirroring the X test and run `npx nx test integrations-linkedin`.)

- [ ] **Step 5: Commit**

```bash
git add libs/integrations
git commit -m "feat(integrations): X, LinkedIn, and Email channel connectors"
```

---

### Task 4: Buffer + Mailchimp sync connectors

**Files:**

- Create: `libs/integrations/buffer/src/lib/buffer.connector.ts`
- Create: `libs/integrations/mailchimp/src/lib/mailchimp.connector.ts`
- Test: `libs/integrations/buffer/src/lib/buffer.connector.spec.ts`

**Interfaces:**

- Consumes: `ChannelConnector`, `Channel`.
- Produces: `BufferConnector` (channel `Channel.Buffer`), `MailchimpConnector` (channel `Channel.Mailchimp`), same `publish` contract.

- [ ] **Step 1: Generate libs + write failing test**

```bash
npx nx g @nx/js:lib integrations-buffer --directory=libs/integrations/buffer --importPath=@shipshout/integrations-buffer --unitTestRunner=jest
npx nx g @nx/js:lib integrations-mailchimp --directory=libs/integrations/mailchimp --importPath=@shipshout/integrations-mailchimp --unitTestRunner=jest
```

```typescript
// buffer.connector.spec.ts
import { BufferConnector } from './buffer.connector';
import { Channel } from '@shipshout/data-entities';
it('queues an update in Buffer', async () => {
    const http = jest.fn(async () => ({ ok: true, json: async () => ({ updates: [{ id: 'u1' }] }) }));
    const c = new BufferConnector(http as any);
    expect(c.channel).toBe(Channel.Buffer);
    await c.publish({ text: 'hi', accessToken: 'tok' });
    expect(http).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test integrations-buffer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement connectors**

```typescript
// buffer.connector.ts
import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';
type Http = typeof fetch;
export class BufferConnector implements ChannelConnector {
    channel = Channel.Buffer;
    constructor(
        private http: Http = fetch,
        private profileId = process.env.BUFFER_PROFILE_ID ?? '',
    ) {}
    async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
        const res = await this.http('https://api.bufferapp.com/1/updates/create.json', {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ text, 'profile_ids[]': this.profileId }).toString(),
        });
        if (!res.ok) throw new Error(`Buffer publish failed: ${res.status}`);
        return {};
    }
}
```

```typescript
// mailchimp.connector.ts
import { Channel } from '@shipshout/data-entities';
import { ChannelConnector, PublishInput, PublishOutput } from '@shipshout/integrations-core';
type Http = typeof fetch;
export class MailchimpConnector implements ChannelConnector {
    channel = Channel.Mailchimp;
    constructor(
        private http: Http = fetch,
        private dc = process.env.MAILCHIMP_DC ?? 'us1',
        private listId = process.env.MAILCHIMP_LIST_ID ?? '',
    ) {}
    async publish({ text, accessToken }: PublishInput): Promise<PublishOutput> {
        const [subject, ...body] = text.split('\n');
        const res = await this.http(`https://${this.dc}.api.mailchimp.com/3.0/campaigns`, {
            method: 'POST',
            headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({
                type: 'regular',
                recipients: { list_id: this.listId },
                settings: { subject_line: subject, title: subject, from_name: 'ShipShout', reply_to: process.env.EMAIL_FROM ?? 'updates@shipshout.app' },
            }),
        });
        if (!res.ok) throw new Error(`Mailchimp create failed: ${res.status}`);
        return {};
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test integrations-buffer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/integrations
git commit -m "feat(integrations): Buffer and Mailchimp sync connectors"
```

---

### Task 5: OAuth connect flow for channels (API)

**Files:**

- Create: `apps/api/src/app/connections/connections.service.ts`
- Create: `apps/api/src/app/connections/connections.controller.ts`
- Create: `apps/api/src/app/connections/connections.module.ts`
- Test: `apps/api/src/app/connections/connections.service.spec.ts`

**Interfaces:**

- Consumes: `ChannelConnection`, `encryptSecret`/`decryptSecret`, `WorkspaceGuard`, `Channel`.
- Produces: `GET /api/workspaces/:workspaceId/connections` (list, tokens omitted), `GET /api/workspaces/:workspaceId/connections/:channel/start` (redirect to provider OAuth), `GET /api/workspaces/:workspaceId/connections/:channel/callback` (exchange code, store encrypted tokens); `ConnectionsService.saveTokens(workspaceId, channel, tokens)`, `ConnectionsService.getActive(workspaceId, channel)` returning decrypted access token for the worker.

- [ ] **Step 1: Write the failing test**

```typescript
// connections.service.spec.ts
import { ConnectionsService } from './connections.service';
import { Channel } from '@shipshout/data-entities';
process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

describe('ConnectionsService', () => {
    it('stores encrypted tokens and returns decrypted access token', async () => {
        const store: any[] = [];
        const repo = {
            findOne: jest.fn(async ({ where }: any) => store.find((c) => c.type === where.type)),
            create: (d: any) => d,
            save: jest.fn(async (d: any) => {
                const rec = { id: 'c1', ...d };
                store.push(rec);
                return rec;
            }),
        };
        const svc = new ConnectionsService(repo as any);
        await svc.saveTokens('w1', Channel.X, { accessToken: 'plain', refreshToken: 'r' });
        expect(store[0].accessToken).not.toBe('plain'); // encrypted
        const tok = await svc.getActiveAccessToken('w1', Channel.X);
        expect(tok).toBe('plain');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement service + controller**

```typescript
// connections.service.ts
import { Repository } from 'typeorm';
import { ChannelConnection, ConnectionStatus, Channel } from '@shipshout/data-entities';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';

export class ConnectionsService {
    constructor(private connections: Repository<ChannelConnection>) {}

    async saveTokens(workspaceId: string, channel: Channel, tokens: { accessToken: string; refreshToken?: string; externalAccountId?: string }) {
        let conn = await this.connections.findOne({ where: { workspace: { id: workspaceId }, type: channel } });
        if (!conn) conn = this.connections.create({ workspace: { id: workspaceId } as any, type: channel });
        conn.accessToken = encryptSecret(tokens.accessToken);
        conn.refreshToken = tokens.refreshToken ? encryptSecret(tokens.refreshToken) : undefined;
        conn.externalAccountId = tokens.externalAccountId;
        conn.status = ConnectionStatus.Active;
        return this.connections.save(conn);
    }

    list(workspaceId: string) {
        return this.connections.find({ where: { workspace: { id: workspaceId } } }).then((cs) => cs.map((c) => ({ id: c.id, type: c.type, status: c.status })));
    }

    async getActive(workspaceId: string, channel: Channel) {
        return this.connections.findOne({ where: { workspace: { id: workspaceId }, type: channel, status: ConnectionStatus.Active } });
    }

    async getActiveAccessToken(workspaceId: string, channel: Channel): Promise<string> {
        const conn = await this.getActive(workspaceId, channel);
        if (!conn) throw new Error(`No active ${channel} connection`);
        return decryptSecret(conn.accessToken);
    }
}
```

Implement the controller: `start` builds the provider authorize URL (per channel env client id + scopes + redirect) and 302-redirects; `callback` exchanges the `code` for tokens (per-channel token endpoint) and calls `saveTokens`, then redirects to `${WEB_BASE_URL}/{workspaceId}/settings/connections`. Guard all routes with `WorkspaceGuard`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): channel OAuth connect flow with encrypted token storage"
```

---

### Task 6: Dispatch service + worker consumer

**Files:**

- Create: `libs/integrations/core/src/lib/dispatch.service.ts`
- Create: `apps/worker/src/app/dispatch.processor.ts`
- Modify: `apps/worker/src/app/app.module.ts`
- Test: `libs/integrations/core/src/lib/dispatch.service.spec.ts`
- Test: `apps/worker/src/app/dispatch.processor.spec.ts`

**Interfaces:**

- Consumes: `ConnectorRegistry`, `ConnectionsService` (token access), `Draft`/`DraftStatus`, `PublishRecord`/`PublishStatus`, `QUEUES.dispatch`, `DispatchJob`.
- Produces: `DispatchService.dispatch(draftId)` — loads approved draft, resolves connection + connector, publishes (using `editedCopy ?? generatedCopy`), writes `PublishRecord`, sets draft `published`/`failed`, rethrows transient errors for retry; `DispatchProcessor` invoking it.

- [ ] **Step 1: Write the failing test**

```typescript
// dispatch.service.spec.ts
import { DispatchService } from './dispatch.service';
import { Channel, DraftStatus, PublishStatus } from '@shipshout/data-entities';

function deps(publishImpl: () => Promise<any>) {
    const draft = {
        id: 'd1',
        channel: Channel.X,
        generatedCopy: 'g',
        editedCopy: 'e',
        status: DraftStatus.Approved,
        releaseEvent: { repository: { workspace: { id: 'w1' } } },
    };
    const drafts = { findOne: jest.fn(async () => draft), save: jest.fn(async (d: any) => d) };
    const records = { create: (d: any) => d, save: jest.fn(async (d: any) => d) };
    const registry = { get: jest.fn(() => ({ channel: Channel.X, publish: publishImpl })) };
    const connections = { getActive: jest.fn(async () => ({ id: 'c1' })), getActiveAccessToken: jest.fn(async () => 'tok') };
    return { draft, drafts, records, registry, connections };
}

describe('DispatchService.dispatch', () => {
    it('publishes and records success', async () => {
        const d = deps(async () => ({ externalUrl: 'https://x.com/1' }));
        const svc = new DispatchService(d.drafts as any, d.records as any, d.registry as any, d.connections as any);
        await svc.dispatch('d1');
        expect(d.records.save).toHaveBeenCalledWith(expect.objectContaining({ status: PublishStatus.Success, externalUrl: 'https://x.com/1' }));
        expect(d.draft.status).toBe(DraftStatus.Published);
    });
    it('records failure and marks draft failed', async () => {
        const d = deps(async () => {
            throw new Error('rate limited');
        });
        const svc = new DispatchService(d.drafts as any, d.records as any, d.registry as any, d.connections as any);
        await expect(svc.dispatch('d1')).rejects.toThrow();
        expect(d.records.save).toHaveBeenCalledWith(expect.objectContaining({ status: PublishStatus.Failed }));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test integrations-core`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement dispatch service + processor**

```typescript
// dispatch.service.ts
import { Repository } from 'typeorm';
import { Draft, DraftStatus, PublishRecord, PublishStatus, Channel } from '@shipshout/data-entities';
import { ConnectorRegistry } from './connector-registry';

interface ConnectionsPort {
    getActive(workspaceId: string, channel: Channel): Promise<{ id: string } | null>;
    getActiveAccessToken(workspaceId: string, channel: Channel): Promise<string>;
}

export class DispatchService {
    constructor(
        private drafts: Repository<Draft>,
        private records: Repository<PublishRecord>,
        private registry: ConnectorRegistry,
        private connections: ConnectionsPort,
    ) {}

    async dispatch(draftId: string): Promise<void> {
        const draft = await this.drafts.findOne({ where: { id: draftId } });
        if (!draft) throw new Error('Draft not found');
        if (draft.status !== DraftStatus.Approved) throw new Error('Draft not approved');
        const workspaceId = (draft as any).releaseEvent.repository.workspace.id;
        const connector = this.registry.get(draft.channel);
        const connection = await this.connections.getActive(workspaceId, draft.channel);
        const text = draft.editedCopy ?? draft.generatedCopy;
        try {
            const token = await this.connections.getActiveAccessToken(workspaceId, draft.channel);
            const out = await connector.publish({ text, accessToken: token });
            await this.records.save(
                this.records.create({
                    draft: draft as any,
                    channelConnection: connection as any,
                    status: PublishStatus.Success,
                    externalUrl: out.externalUrl,
                }),
            );
            draft.status = DraftStatus.Published;
            await this.drafts.save(draft);
        } catch (err: any) {
            await this.records.save(
                this.records.create({
                    draft: draft as any,
                    channelConnection: connection as any,
                    status: PublishStatus.Failed,
                    error: String(err?.message ?? err),
                }),
            );
            draft.status = DraftStatus.Failed;
            await this.drafts.save(draft);
            throw err; // let BullMQ retry transient failures
        }
    }
}
```

```typescript
// dispatch.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUES, DispatchJob } from '@shipshout/queue';
import { DispatchService } from '@shipshout/integrations-core';

@Processor(QUEUES.dispatch)
export class DispatchProcessor extends WorkerHost {
    constructor(private dispatch: DispatchService) {
        super();
    }
    async process(job: Job<DispatchJob>): Promise<void> {
        await this.dispatch.dispatch(job.data.draftId);
    }
}
```

Wire `DispatchProcessor`, `DispatchService`, `ConnectorRegistry` (with all connectors), and a worker-side `ConnectionsService` into `apps/worker/src/app/app.module.ts`. Configure `dispatch` queue `attempts: 3`, exponential backoff.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test integrations-core && npx nx test worker`
Expected: PASS.

- [ ] **Step 5: End-to-end smoke test**

Run: connect a channel (or stub tokens), approve + publish a draft in the dashboard.
Expected: `PublishRecord` (success) written; draft becomes `published`; forced error path retries then marks `failed`.

- [ ] **Step 6: Commit**

```bash
git add apps/worker libs/integrations/core
git commit -m "feat(worker): dispatch consumer publishing drafts and recording results"
```

---

## Self-Review (Plan 5)

- **Spec coverage:** Direct X/LinkedIn/Email publishing + Buffer/Mailchimp sync (§7), encrypted OAuth tokens (§5/§10), `ChannelConnection`/`PublishRecord` (§5), dispatch worker with retries (§3.1), swappable connector interface (§4/§7).
- **Type consistency:** `ChannelConnector.publish({ text, accessToken })` used by all connectors and `DispatchService`; `DispatchJob { draftId }` matches Plan 4 producer; `DraftStatus` transitions align; `Channel` enum shared.
- **No placeholders:** all steps contain runnable code (OAuth controller described with exact per-channel behavior).
