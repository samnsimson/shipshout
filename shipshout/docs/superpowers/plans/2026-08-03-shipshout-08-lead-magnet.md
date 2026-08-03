# ShipShout Plan 8 — Public Lead Magnet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, unauthenticated "GitHub Release Notes → Tweet Generator" that reuses the AI engine, rate-limited by IP, with a sign-up CTA.

**Architecture:** A public API endpoint (no session/guard) accepts pasted release notes, applies IP rate limiting, calls `AiEngine` with the pure `buildPrompt` for the X channel, and returns a tweet draft. A public Next.js page renders the form and result. No data is persisted.

**Tech Stack:** NestJS (public controller + in-memory/Redis rate limiter), `@shipshout/ai`, `@shipshout/core-domain`, Next.js.

## Global Constraints

- Same as Plans 1–7 Global Constraints.
- The endpoint is **unauthenticated** but **rate-limited by IP** and length-capped on input.
- No persistence of user-submitted content beyond ephemeral request processing.
- Reuses `buildPrompt` + `AiEngine`; no duplicated prompt logic.

---

### Task 1: IP rate limiter (Redis-backed, testable)

**Files:**
- Create: `libs/shared/util/src/lib/rate-limiter.ts`
- Test: `libs/shared/util/src/lib/rate-limiter.spec.ts`

**Interfaces:**
- Consumes: an injected store with `incr(key)` + `expire(key, seconds)` (Redis in prod, fake in tests).
- Produces: `RateLimiter.check(key: string): Promise<{ allowed: boolean; remaining: number }>` — fixed window (`limit` per `windowSeconds`).

- [ ] **Step 1: Write the failing test**

```typescript
// rate-limiter.spec.ts
import { RateLimiter } from './rate-limiter';

function fakeStore() {
  const counts = new Map<string, number>();
  return { counts,
    incr: jest.fn(async (k:string)=>{ const n=(counts.get(k)??0)+1; counts.set(k,n); return n; }),
    expire: jest.fn(async ()=>{}),
  };
}

describe('RateLimiter', () => {
  it('allows up to the limit then blocks', async () => {
    const store = fakeStore();
    const rl = new RateLimiter(store as any, 3, 60);
    expect((await rl.check('ip:1')).allowed).toBe(true);
    await rl.check('ip:1'); await rl.check('ip:1');
    expect((await rl.check('ip:1')).allowed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test shared-util`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// rate-limiter.ts
export interface CounterStore { incr(key: string): Promise<number>; expire(key: string, seconds: number): Promise<void>; }
export class RateLimiter {
  constructor(private store: CounterStore, private limit: number, private windowSeconds: number) {}
  async check(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const n = await this.store.incr(key);
    if (n === 1) await this.store.expire(key, this.windowSeconds);
    return { allowed: n <= this.limit, remaining: Math.max(0, this.limit - n) };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test shared-util`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/util
git commit -m "feat(util): fixed-window IP rate limiter with injectable store"
```

---

### Task 2: Public generation endpoint

**Files:**
- Create: `apps/api/src/app/public/public-generate.service.ts`
- Create: `apps/api/src/app/public/public.controller.ts`
- Create: `apps/api/src/app/public/public.module.ts`
- Create: `libs/shared/contracts/src/lib/public.contracts.ts`
- Test: `apps/api/src/app/public/public-generate.service.spec.ts`

**Interfaces:**
- Consumes: `AiEngine`, `buildPrompt`, `RateLimiter`, `Tone`, `Channel`.
- Produces: `POST /api/public/tweet` `{ releaseNotes: string }` → `{ tweet: string }` (429 when rate-limited); `PublicGenerateService.generateTweet(ip, releaseNotes): Promise<{ tweet: string }>`. `PublicTweetSchema` (releaseNotes max 4000 chars).

- [ ] **Step 1: Write contract + failing test**

```typescript
// public.contracts.ts
import { z } from 'zod';
export const PublicTweetSchema = z.object({ releaseNotes: z.string().min(1).max(4000) });
export type PublicTweetDto = z.infer<typeof PublicTweetSchema>;
```

```typescript
// public-generate.service.spec.ts
import { PublicGenerateService } from './public-generate.service';

function make(allowed: boolean) {
  const engine = { generate: jest.fn(async ()=>({ text:'🚀 New release!', provider:'openai', model:'m', latencyMs:1 })) };
  const rl = { check: jest.fn(async ()=>({ allowed, remaining: 0 })) };
  return { engine, rl, svc: new PublicGenerateService(engine as any, rl as any) };
}

describe('PublicGenerateService.generateTweet', () => {
  it('returns a tweet when under the rate limit', async () => {
    const { svc, engine } = make(true);
    const out = await svc.generateTweet('1.2.3.4', 'Refactored auth');
    expect(out.tweet).toContain('New release');
    expect(engine.generate).toHaveBeenCalled();
  });
  it('throws a rate-limit error when over the limit', async () => {
    const { svc, engine } = make(false);
    await expect(svc.generateTweet('1.2.3.4', 'x')).rejects.toThrow(/rate/i);
    expect(engine.generate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement service + controller**

```typescript
// public-generate.service.ts
import { AiEngine } from '@shipshout/ai';
import { RateLimiter } from '@shipshout/shared-util';
import { buildPrompt, CHANNEL_CONSTRAINTS } from '@shipshout/core-domain';
import { Tone, Channel } from '@shipshout/data-entities';

export class PublicGenerateService {
  constructor(private engine: AiEngine, private limiter: RateLimiter) {}
  async generateTweet(ip: string, releaseNotes: string): Promise<{ tweet: string }> {
    const { allowed } = await this.limiter.check(`public-tweet:${ip}`);
    if (!allowed) throw new Error('Rate limit exceeded. Please try again later.');
    const prompt = buildPrompt({ commitSummary: releaseNotes, tone: Tone.HypeStartup, emojiPolicy: true, channel: Channel.X });
    const r = await this.engine.generate(prompt, { maxTokens: 120 });
    const max = CHANNEL_CONSTRAINTS[Channel.X].maxChars ?? 280;
    return { tweet: r.text.slice(0, max) };
  }
}
```

```typescript
// public.controller.ts
import { Body, Controller, Post, Req, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PublicTweetSchema } from '@shipshout/contracts';
import { PublicGenerateService } from './public-generate.service';

@Controller('public')
export class PublicController {
  constructor(private svc: PublicGenerateService) {}
  @Post('tweet')
  async tweet(@Req() req: any, @Body() body: unknown) {
    const parsed = PublicTweetSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip ?? 'unknown').trim();
    try {
      return await this.svc.generateTweet(ip, parsed.data.releaseNotes);
    } catch (e: any) {
      if (/rate/i.test(e?.message)) throw new HttpException(e.message, HttpStatus.TOO_MANY_REQUESTS);
      throw e;
    }
  }
}
```

Wire `PublicModule` (provides `PublicGenerateService`, `AiEngine`, and a `RateLimiter` backed by a Redis `CounterStore`, e.g. limit 5 / 3600s) into `app.module.ts`. This controller has NO `WorkspaceGuard`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api libs/shared/contracts
git commit -m "feat(api): public rate-limited tweet generator endpoint"
```

---

### Task 3: Public lead-magnet page

**Files:**
- Create: `apps/web/src/app/tools/tweet-generator/page.tsx`
- Create: `apps/web/src/app/tools/tweet-generator/generator.tsx`
- Test: `apps/web/src/app/tools/tweet-generator/generator.spec.tsx`

**Interfaces:**
- Consumes: public endpoint `/api/public/tweet`.
- Produces: an unauthenticated page: textarea for release notes, Generate button, result display, copy-to-clipboard, and a sign-up CTA linking to `/login`.

- [ ] **Step 1: Write the failing test**

```typescript
// generator.spec.tsx
import { generateTweet } from './generator';
it('calls the public endpoint', async () => {
  const spy = jest.spyOn(global,'fetch' as any).mockResolvedValue({ ok:true, json: async ()=>({ tweet:'hi' }) } as any);
  process.env.NEXT_PUBLIC_API_BASE_URL='http://api.test';
  const out = await generateTweet('notes');
  expect(out.tweet).toBe('hi');
  expect(spy).toHaveBeenCalledWith('http://api.test/api/public/tweet', expect.objectContaining({ method:'POST' }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement page + client component**

```tsx
// tools/tweet-generator/generator.tsx
'use client';
import { useState } from 'react';

export async function generateTweet(releaseNotes: string): Promise<{ tweet: string }> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const res = await fetch(`${base}/api/public/tweet`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ releaseNotes }),
  });
  if (res.status === 429) throw new Error('Rate limit reached — sign up for more.');
  if (!res.ok) throw new Error('Generation failed');
  return res.json();
}

export function Generator() {
  const [notes, setNotes] = useState(''); const [tweet, setTweet] = useState(''); const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function run() {
    setErr(''); setLoading(true);
    try { setTweet((await generateTweet(notes)).tweet); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={8} style={{ width:'100%' }}
        placeholder="Paste your GitHub release notes or commit log..." />
      <button onClick={run} disabled={loading || !notes}>{loading ? 'Generating…' : 'Generate tweet'}</button>
      {err && <p style={{ color:'crimson' }}>{err}</p>}
      {tweet && (
        <div style={{ border:'1px solid #ddd', borderRadius:8, padding:16, marginTop:16 }}>
          <p>{tweet}</p>
          <button onClick={()=>navigator.clipboard.writeText(tweet)}>Copy</button>
        </div>
      )}
      <p style={{ marginTop:24 }}>Want automatic multi-channel posts on every release? <a href="/login">Sign up for ShipShout →</a></p>
    </div>
  );
}
```

```tsx
// tools/tweet-generator/page.tsx
import { Generator } from './generator';
export default function TweetGeneratorPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Release Notes → Tweet Generator</h1>
      <p>Turn your dev release notes into a ready-to-post tweet, free.</p>
      <Generator />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test web`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: visit `/tools/tweet-generator` (logged out), paste notes, Generate.
Expected: tweet returned; 6th request within the window shows the rate-limit CTA message.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): public release-notes-to-tweet generator lead magnet"
```

---

## Self-Review (Plan 8)

- **Spec coverage:** Public unauthenticated generator reusing the AI engine (§9), IP rate limiting + abuse cap + no persistence (§9), sign-up CTA (§9), input length cap (§9).
- **Type consistency:** reuses `buildPrompt`/`CHANNEL_CONSTRAINTS`/`AiEngine`/`Channel`/`Tone` exactly as defined in Plan 3; `RateLimiter` from Plan 8 Task 1.
- **No placeholders:** all steps contain runnable code.
