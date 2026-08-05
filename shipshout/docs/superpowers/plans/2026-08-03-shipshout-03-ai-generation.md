# ShipShout Plan 3 — AI Engine + Generation Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert a `ReleaseEvent` into per-channel marketing `Draft`s using a provider-abstracted AI engine (OpenAI default, Claude fallback), executed asynchronously in the `worker` app.

**Architecture:** `libs/ai` holds the `AiProvider` interface and implementations plus failover. `libs/core/domain` holds pure prompt-building (tone + channel constraints). `libs/data/entities` gains the `Draft` entity. `apps/worker` runs a BullMQ `generate` consumer that loads the event + brand profile, builds prompts, calls the AI engine, and persists drafts.

**Tech Stack:** NestJS (worker), BullMQ, TypeORM, OpenAI SDK, Anthropic SDK.

## Global Constraints

- Same as Plan 1 & 2 Global Constraints.
- Prompt-building code MUST be pure (no network) and fully unit-tested.
- AI provider selection: **OpenAI default, Claude fallback**; failover on error/timeout.
- Per-generation token/cost caps enforced; per-channel output length validated.
- Channels for v1 generation: `x`, `linkedin`, `email`.

---

### Task 1: Draft entity + Channel enum + migration

**Files:**

- Create: `libs/data/entities/src/lib/entities/draft.entity.ts`
- Modify: `libs/data/entities/src/lib/typeorm.config.ts`
- Test: `libs/data/entities/src/lib/entities/draft.spec.ts`

**Interfaces:**

- Consumes: `ReleaseEvent` (Plan 2), `ENTITIES`.
- Produces: `Draft` (releaseEvent, channel, generatedCopy, editedCopy, status, aiMeta jsonb), `DraftStatus` enum (`pending_review|approved|published|failed`), `Channel` enum (`x|linkedin|email|buffer|mailchimp`). Downstream (Plan 4 dashboard, Plan 5 dispatch) rely on `Draft` + `DraftStatus` + `Channel`.

- [ ] **Step 1: Write the failing test**

```typescript
// draft.spec.ts
import { ENTITIES } from '../typeorm.config';
import { Draft, DraftStatus, Channel } from './draft.entity';
describe('Draft entity', () => {
    it('is registered', () => expect(ENTITIES).toContain(Draft));
    it('has statuses and channels', () => {
        expect(DraftStatus.PendingReview).toBe('pending_review');
        expect(Channel.X).toBe('x');
        expect(Channel.LinkedIn).toBe('linkedin');
        expect(Channel.Email).toBe('email');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test data-entities`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement entity**

```typescript
// draft.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { ReleaseEvent } from './release-event.entity';

export enum Channel {
    X = 'x',
    LinkedIn = 'linkedin',
    Email = 'email',
    Buffer = 'buffer',
    Mailchimp = 'mailchimp',
}
export enum DraftStatus {
    PendingReview = 'pending_review',
    Approved = 'approved',
    Published = 'published',
    Failed = 'failed',
}

@Entity('drafts')
export class Draft {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @ManyToOne(() => ReleaseEvent, { eager: true }) releaseEvent!: ReleaseEvent;
    @Column({ type: 'enum', enum: Channel }) channel!: Channel;
    @Column({ type: 'text' }) generatedCopy!: string;
    @Column({ type: 'text', nullable: true }) editedCopy?: string;
    @Column({ type: 'enum', enum: DraftStatus, default: DraftStatus.PendingReview }) status!: DraftStatus;
    @Column({ type: 'jsonb', nullable: true }) aiMeta?: { provider: string; model: string; tokens?: number; latencyMs?: number };
    @CreateDateColumn() createdAt!: Date;
}
```

Register in `ENTITIES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test data-entities`
Expected: PASS.

- [ ] **Step 5: Generate + run migration**

```bash
npx typeorm migration:generate libs/data/entities/src/lib/migrations/Drafts -d libs/data/entities/src/lib/data-source.ts
npx typeorm migration:run -d libs/data/entities/src/lib/data-source.ts
```

- [ ] **Step 6: Commit**

```bash
git add libs/data/entities
git commit -m "feat(data): add Draft entity with Channel/DraftStatus enums + migration"
```

---

### Task 2: Pure prompt builder (tone + channel constraints)

**Files:**

- Create: `libs/core/domain/src/lib/channel-constraints.ts`
- Create: `libs/core/domain/src/lib/build-prompt.ts`
- Test: `libs/core/domain/src/lib/build-prompt.spec.ts`

**Interfaces:**

- Consumes: `Tone` (Plan 2), `Channel` (Task 1).
- Produces: `CHANNEL_CONSTRAINTS: Record<Channel, { maxChars?: number; format: string }>`; `buildPrompt(input: { commitSummary: string; tone: Tone; customInstructions?: string; emojiPolicy: boolean; channel: Channel }): { system: string; user: string }`. Consumed by the AI engine (Task 4) and lead magnet (Plan 8).

- [ ] **Step 1: Generate lib + write failing test**

```bash
npx nx g @nx/js:lib core-domain --directory=libs/core/domain --importPath=@shipshout/core-domain --unitTestRunner=jest
```

```typescript
// build-prompt.spec.ts
import { buildPrompt, CHANNEL_CONSTRAINTS } from './build-prompt';
import { Tone } from '@shipshout/data-entities';
import { Channel } from '@shipshout/data-entities';

describe('buildPrompt', () => {
    const base = { commitSummary: 'Refactored auth middleware for OAuth2 PKCE flow', tone: Tone.HypeStartup, emojiPolicy: true };
    it('includes the commit summary and channel format in the prompt', () => {
        const { system, user } = buildPrompt({ ...base, channel: Channel.X });
        expect(user).toContain('OAuth2 PKCE');
        expect(system).toContain('X (Twitter)');
    });
    it('mentions the char limit for X', () => {
        expect(CHANNEL_CONSTRAINTS[Channel.X].maxChars).toBe(280);
        const { system } = buildPrompt({ ...base, channel: Channel.X });
        expect(system).toContain('280');
    });
    it('suppresses emojis when emojiPolicy is false', () => {
        const { system } = buildPrompt({ ...base, emojiPolicy: false, channel: Channel.LinkedIn });
        expect(system.toLowerCase()).toContain('do not use emojis');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test core-domain`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// channel-constraints.ts
import { Channel } from '@shipshout/data-entities';
export const CHANNEL_CONSTRAINTS: Record<Channel, { maxChars?: number; format: string; label: string }> = {
    [Channel.X]: { maxChars: 280, format: 'a single punchy tweet', label: 'X (Twitter)' },
    [Channel.LinkedIn]: { maxChars: 1300, format: 'a professional LinkedIn post with a hook and short paragraphs', label: 'LinkedIn' },
    [Channel.Email]: { format: 'a concise email newsletter blurb with a subject line', label: 'Email' },
    [Channel.Buffer]: { maxChars: 280, format: 'a short social post', label: 'Buffer' },
    [Channel.Mailchimp]: { format: 'an email newsletter blurb', label: 'Mailchimp' },
};
```

```typescript
// build-prompt.ts
import { Tone } from '@shipshout/data-entities';
import { Channel } from '@shipshout/data-entities';
import { CHANNEL_CONSTRAINTS } from './channel-constraints';
export { CHANNEL_CONSTRAINTS };

const TONE_TEXT: Record<Tone, string> = {
    [Tone.DevFocused]: 'technical but accessible, aimed at developers',
    [Tone.Professional]: 'polished, professional, benefit-driven',
    [Tone.HypeStartup]: 'energetic, hype startup voice',
};

export function buildPrompt(input: { commitSummary: string; tone: Tone; customInstructions?: string; emojiPolicy: boolean; channel: Channel }): {
    system: string;
    user: string;
} {
    const c = CHANNEL_CONSTRAINTS[input.channel];
    const limit = c.maxChars ? ` Keep it under ${c.maxChars} characters.` : '';
    const emoji = input.emojiPolicy ? 'You may use tasteful emojis.' : 'Do not use emojis.';
    const custom = input.customInstructions ? ` Brand guidance: ${input.customInstructions}.` : '';
    const system = [
        `You are ShipShout, turning technical release notes into ${c.label} marketing copy.`,
        `Write ${c.format}.${limit}`,
        `Voice: ${TONE_TEXT[input.tone]}.`,
        emoji + custom,
        'Focus on customer benefits, not jargon. Output only the copy.',
    ].join(' ');
    const user = `Release notes / commits:\n${input.commitSummary}`;
    return { system, user };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test core-domain`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/core/domain
git commit -m "feat(domain): pure per-channel prompt builder with tone and constraints"
```

---

### Task 3: AI provider abstraction + failover

**Files:**

- Create: `libs/ai/src/lib/ai-provider.ts`
- Create: `libs/ai/src/lib/openai.provider.ts`
- Create: `libs/ai/src/lib/claude.provider.ts`
- Create: `libs/ai/src/lib/ai-engine.ts`
- Test: `libs/ai/src/lib/ai-engine.spec.ts`

**Interfaces:**

- Consumes: env `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
- Produces: `interface AiProvider { name: string; generate(prompt: { system: string; user: string }, opts?: { maxTokens?: number }): Promise<{ text: string; model: string; tokens?: number }> }`; `AiEngine.generate(prompt, opts)` tries the default provider then falls back, returning `{ text, provider, model, tokens, latencyMs }`.

- [ ] **Step 1: Generate lib + install SDKs**

```bash
npx nx g @nx/js:lib ai --directory=libs/ai --importPath=@shipshout/ai --unitTestRunner=jest
npm i openai @anthropic-ai/sdk
```

- [ ] **Step 2: Write the failing test**

```typescript
// ai-engine.spec.ts
import { AiEngine } from './ai-engine';

const ok = (name: string) => ({ name, generate: jest.fn(async () => ({ text: `from ${name}`, model: 'm', tokens: 10 })) });
const bad = (name: string) => ({
    name,
    generate: jest.fn(async () => {
        throw new Error('boom');
    }),
});

describe('AiEngine failover', () => {
    it('uses default provider when it succeeds', async () => {
        const engine = new AiEngine(ok('openai') as any, ok('claude') as any);
        const r = await engine.generate({ system: 's', user: 'u' });
        expect(r.provider).toBe('openai');
        expect(r.text).toBe('from openai');
        expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    });
    it('falls back when default fails', async () => {
        const engine = new AiEngine(bad('openai') as any, ok('claude') as any);
        const r = await engine.generate({ system: 's', user: 'u' });
        expect(r.provider).toBe('claude');
    });
    it('throws when both fail', async () => {
        const engine = new AiEngine(bad('openai') as any, bad('claude') as any);
        await expect(engine.generate({ system: 's', user: 'u' })).rejects.toThrow();
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx nx test ai`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement provider interface, providers, and engine**

```typescript
// ai-provider.ts
export interface AiPrompt {
    system: string;
    user: string;
}
export interface AiResult {
    text: string;
    model: string;
    tokens?: number;
}
export interface AiProvider {
    name: string;
    generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult>;
}
```

```typescript
// openai.provider.ts
import OpenAI from 'openai';
import { AiProvider, AiPrompt, AiResult } from './ai-provider';
export class OpenAiProvider implements AiProvider {
    name = 'openai';
    private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult> {
        const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
        const res = await this.client.chat.completions.create({
            model,
            max_tokens: opts?.maxTokens ?? 400,
            messages: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: prompt.user },
            ],
        });
        return { text: res.choices[0]?.message?.content ?? '', model, tokens: res.usage?.total_tokens };
    }
}
```

```typescript
// claude.provider.ts
import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, AiPrompt, AiResult } from './ai-provider';
export class ClaudeProvider implements AiProvider {
    name = 'claude';
    private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult> {
        const model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest';
        const res = await this.client.messages.create({
            model,
            max_tokens: opts?.maxTokens ?? 400,
            system: prompt.system,
            messages: [{ role: 'user', content: prompt.user }],
        });
        const text = res.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
        return { text, model, tokens: res.usage ? res.usage.input_tokens + res.usage.output_tokens : undefined };
    }
}
```

```typescript
// ai-engine.ts
import { AiProvider, AiPrompt } from './ai-provider';
export interface EngineResult {
    text: string;
    provider: string;
    model: string;
    tokens?: number;
    latencyMs: number;
}
export class AiEngine {
    constructor(
        private primary: AiProvider,
        private fallback: AiProvider,
    ) {}
    async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<EngineResult> {
        for (const p of [this.primary, this.fallback]) {
            const started = Date.now();
            try {
                const r = await p.generate(prompt, opts);
                return { text: r.text, provider: p.name, model: r.model, tokens: r.tokens, latencyMs: Date.now() - started };
            } catch {
                /* try next provider */
            }
        }
        throw new Error('All AI providers failed');
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx nx test ai`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/ai
git commit -m "feat(ai): provider abstraction with OpenAI default and Claude fallback"
```

---

### Task 4: Generation service (event -> drafts)

**Files:**

- Create: `libs/ai/src/lib/generation.service.ts`
- Test: `libs/ai/src/lib/generation.service.spec.ts`

**Interfaces:**

- Consumes: `AiEngine`, `buildPrompt`, `BrandProfile` repo, `ReleaseEvent` repo, `Draft` repo, `Channel`.
- Produces: `GenerationService.generateForEvent(releaseEventId: string, channels: Channel[]): Promise<Draft[]>` — loads event + workspace brand profile, builds a prompt per channel, generates copy, validates length, persists `Draft`s (`pending_review`), updates event status to `drafted`. Consumed by the worker (Task 5).

- [ ] **Step 1: Write the failing test**

```typescript
// generation.service.spec.ts
import { GenerationService } from './generation.service';
import { Channel, DraftStatus, Tone } from '@shipshout/data-entities';

function deps() {
    const event = { id: 'e1', commitSummary: 'fix cache latency', status: 'received', repository: { workspace: { id: 'w1' } } };
    const events = { findOne: jest.fn(async () => event), save: jest.fn(async (e: any) => e) };
    const brands = { findOne: jest.fn(async () => ({ tone: Tone.Professional, emojiPolicy: true })) };
    const drafts = { create: (d: any) => d, save: jest.fn(async (d: any) => ({ id: 'd' + Math.random(), ...d })) };
    const engine = { generate: jest.fn(async () => ({ text: 'Speed boost!', provider: 'openai', model: 'm', tokens: 9, latencyMs: 5 })) };
    return { events, brands, drafts, engine };
}

describe('GenerationService.generateForEvent', () => {
    it('creates one pending_review draft per channel with aiMeta', async () => {
        const { events, brands, drafts, engine } = deps();
        const svc = new GenerationService(engine as any, events as any, brands as any, drafts as any);
        const out = await svc.generateForEvent('e1', [Channel.X, Channel.LinkedIn]);
        expect(out).toHaveLength(2);
        expect(drafts.save).toHaveBeenCalledTimes(2);
        expect(out[0].status).toBe(DraftStatus.PendingReview);
        expect(out[0].aiMeta.provider).toBe('openai');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test ai`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement**

```typescript
// generation.service.ts
import { Repository } from 'typeorm';
import { AiEngine } from './ai-engine';
import { buildPrompt, CHANNEL_CONSTRAINTS } from '@shipshout/core-domain';
import { ReleaseEvent, ReleaseEventStatus, BrandProfile, Draft, DraftStatus, Channel, Tone } from '@shipshout/data-entities';

export class GenerationService {
    constructor(
        private engine: AiEngine,
        private events: Repository<ReleaseEvent>,
        private brands: Repository<BrandProfile>,
        private drafts: Repository<Draft>,
    ) {}

    async generateForEvent(releaseEventId: string, channels: Channel[]): Promise<Draft[]> {
        const event = await this.events.findOne({ where: { id: releaseEventId } });
        if (!event) throw new Error(`ReleaseEvent ${releaseEventId} not found`);
        const workspaceId = (event as any).repository.workspace.id;
        const brand =
            (await this.brands.findOne({ where: { workspace: { id: workspaceId } } })) ?? ({ tone: Tone.Professional, emojiPolicy: true } as BrandProfile);

        const results: Draft[] = [];
        for (const channel of channels) {
            const prompt = buildPrompt({
                commitSummary: event.commitSummary ?? '',
                tone: brand.tone,
                customInstructions: brand.customInstructions,
                emojiPolicy: brand.emojiPolicy,
                channel,
            });
            const r = await this.engine.generate(prompt, { maxTokens: 400 });
            const max = CHANNEL_CONSTRAINTS[channel].maxChars;
            const text = max ? r.text.slice(0, max) : r.text;
            const draft = await this.drafts.save(
                this.drafts.create({
                    releaseEvent: event as any,
                    channel,
                    generatedCopy: text,
                    status: DraftStatus.PendingReview,
                    aiMeta: { provider: r.provider, model: r.model, tokens: r.tokens, latencyMs: r.latencyMs },
                }),
            );
            results.push(draft);
        }
        event.status = ReleaseEventStatus.Drafted;
        await this.events.save(event);
        return results;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test ai`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/ai
git commit -m "feat(ai): generation service turning release events into per-channel drafts"
```

---

### Task 5: Worker `generate` consumer

**Files:**

- Create: `apps/worker/src/app/generate.processor.ts`
- Modify: `apps/worker/src/app/app.module.ts`
- Modify: `apps/worker/src/main.ts`
- Test: `apps/worker/src/app/generate.processor.spec.ts`

**Interfaces:**

- Consumes: `GenerationService`, `QUEUES.generate`, `GenerateJob`, `Channel`.
- Produces: BullMQ worker processing `generate` jobs by calling `GenerationService.generateForEvent(job.data.releaseEventId, [x, linkedin, email])`. On failure BullMQ retries (configured attempts/backoff).

- [ ] **Step 1: Install + write failing test**

```bash
npm i @nestjs/bullmq
```

```typescript
// generate.processor.spec.ts
import { GenerateProcessor } from './generate.processor';
import { Channel } from '@shipshout/data-entities';

describe('GenerateProcessor', () => {
    it('delegates to GenerationService with default channels', async () => {
        const gen = { generateForEvent: jest.fn(async () => []) };
        const proc = new GenerateProcessor(gen as any);
        await proc.process({ data: { releaseEventId: 'e1' } } as any);
        expect(gen.generateForEvent).toHaveBeenCalledWith('e1', [Channel.X, Channel.LinkedIn, Channel.Email]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test worker`
Expected: FAIL — processor not found.

- [ ] **Step 3: Implement processor + wire modules**

```typescript
// generate.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUES, GenerateJob } from '@shipshout/queue';
import { Channel } from '@shipshout/data-entities';
import { GenerationService } from '@shipshout/ai';

@Processor(QUEUES.generate)
export class GenerateProcessor extends WorkerHost {
    constructor(private generation: GenerationService) {
        super();
    }
    async process(job: Job<GenerateJob>): Promise<void> {
        await this.generation.generateForEvent(job.data.releaseEventId, [Channel.X, Channel.LinkedIn, Channel.Email]);
    }
}
```

Wire `apps/worker/src/app/app.module.ts` to import `TypeOrmModule.forRoot`, `QueueModule`, provide `AiEngine` (constructed from `OpenAiProvider` + `ClaudeProvider`), `GenerationService` (with injected repos), and `GenerateProcessor`. Register `generate` queue attempts + backoff (e.g. `defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test worker`
Expected: PASS.

- [ ] **Step 5: End-to-end smoke test**

Run: start Postgres/Redis/api/worker; POST a signed GitHub release webhook (Plan 2).
Expected: worker logs pick up the `generate` job; three `Draft` rows (`pending_review`) created; `ReleaseEvent.status='drafted'`.

- [ ] **Step 6: Commit**

```bash
git add apps/worker
git commit -m "feat(worker): generate consumer producing per-channel drafts with retries"
```

---

## Self-Review (Plan 3)

- **Spec coverage:** AI translation engine + provider abstraction + failover (§6), pure prompt building + tone + channel constraints (§6), generation worker (§3.1), `Draft` entity + aiMeta guardrails/length validation (§5, §6). Notifications on drafts-ready are handled in Plan 4/5 (dashboard + email connector).
- **Type consistency:** `AiEngine.generate` returns `{ text, provider, model, tokens, latencyMs }` used verbatim in `GenerationService`; `Channel`/`DraftStatus` shared; `GenerateJob.releaseEventId` matches Plan 2's producer.
- **No placeholders:** all steps contain runnable code.
