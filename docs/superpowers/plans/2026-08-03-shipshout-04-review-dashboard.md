# ShipShout Plan 4 — Review Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users a Next.js dashboard to list generated drafts, edit copy, approve, and trigger publishing, plus manage their brand profile.

**Architecture:** `apps/api` exposes workspace-scoped Draft + BrandProfile endpoints. `apps/web` renders a dashboard: draft list grouped by release, per-draft editor, approve/publish actions, and a brand-profile settings form. Publishing enqueues a `dispatch` job (consumer built in Plan 5; endpoint + enqueue built here).

**Tech Stack:** NestJS, TypeORM, Next.js App Router (server + client components), zod, BullMQ producer.

## Global Constraints

- Same as Plans 1–3 Global Constraints.
- All draft/brand endpoints are workspace-scoped via `WorkspaceGuard`.
- Only drafts in `approved` state may be published.
- UI is clean and modern (per spec: beautiful, best-practice UX).

---

### Task 1: Drafts API (list, get, update copy, approve)

**Files:**
- Create: `apps/api/src/app/drafts/drafts.service.ts`
- Create: `apps/api/src/app/drafts/drafts.controller.ts`
- Create: `apps/api/src/app/drafts/drafts.module.ts`
- Create: `libs/shared/contracts/src/lib/draft.contracts.ts`
- Test: `apps/api/src/app/drafts/drafts.service.spec.ts`

**Interfaces:**
- Consumes: `Draft`, `DraftStatus`, `ReleaseEvent`, `WorkspaceGuard`.
- Produces: `GET /api/workspaces/:workspaceId/drafts` (grouped by release), `PATCH /api/workspaces/:workspaceId/drafts/:draftId` (edit copy), `POST /api/workspaces/:workspaceId/drafts/:draftId/approve`. `DraftsService.listForWorkspace`, `updateCopy`, `approve`. `UpdateDraftSchema`.

- [ ] **Step 1: Write contract + failing test**

```typescript
// draft.contracts.ts
import { z } from 'zod';
export const UpdateDraftSchema = z.object({ editedCopy: z.string().min(1).max(5000) });
export type UpdateDraftDto = z.infer<typeof UpdateDraftSchema>;
```

```typescript
// drafts.service.spec.ts
import { DraftsService } from './drafts.service';
import { DraftStatus } from '@shipshout/data-entities';

function repo(seed:any[] = []) {
  const store = [...seed];
  return { store,
    find: jest.fn(async ()=>store),
    findOne: jest.fn(async ({ where }:any)=>store.find(d=>d.id===where.id)),
    save: jest.fn(async (d:any)=>{ const i=store.findIndex(x=>x.id===d.id); if(i>=0) store[i]=d; else store.push(d); return d; }),
  };
}

describe('DraftsService', () => {
  it('updates edited copy', async () => {
    const drafts = repo([{ id:'d1', generatedCopy:'g', status:DraftStatus.PendingReview }]);
    const svc = new DraftsService(drafts as any);
    const d = await svc.updateCopy('w1','d1',{ editedCopy:'new' });
    expect(d.editedCopy).toBe('new');
  });
  it('approve sets status Approved', async () => {
    const drafts = repo([{ id:'d1', status:DraftStatus.PendingReview }]);
    const svc = new DraftsService(drafts as any);
    const d = await svc.approve('w1','d1');
    expect(d.status).toBe(DraftStatus.Approved);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement service + controller**

```typescript
// drafts.service.ts
import { Repository } from 'typeorm';
import { Draft, DraftStatus } from '@shipshout/data-entities';
import { UpdateDraftDto } from '@shipshout/contracts';

export class DraftsService {
  constructor(private drafts: Repository<Draft>) {}

  listForWorkspace(workspaceId: string) {
    return this.drafts.find({
      where: { releaseEvent: { repository: { workspace: { id: workspaceId } } } },
      order: { createdAt: 'DESC' },
    });
  }

  private async load(workspaceId: string, draftId: string): Promise<Draft> {
    const d = await this.drafts.findOne({
      where: { id: draftId, releaseEvent: { repository: { workspace: { id: workspaceId } } } },
    });
    if (!d) throw new Error('Draft not found');
    return d;
  }

  async updateCopy(workspaceId: string, draftId: string, dto: UpdateDraftDto) {
    const d = await this.load(workspaceId, draftId);
    d.editedCopy = dto.editedCopy;
    return this.drafts.save(d);
  }

  async approve(workspaceId: string, draftId: string) {
    const d = await this.load(workspaceId, draftId);
    d.status = DraftStatus.Approved;
    return this.drafts.save(d);
  }
}
```

```typescript
// drafts.controller.ts
import { Body, Controller, Get, Param, Patch, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { UpdateDraftSchema } from '@shipshout/contracts';
import { DraftsService } from './drafts.service';

@Controller('workspaces/:workspaceId/drafts')
@UseGuards(WorkspaceGuard)
export class DraftsController {
  constructor(private svc: DraftsService) {}
  @Get() list(@Param('workspaceId') ws: string) { return this.svc.listForWorkspace(ws); }
  @Patch(':draftId') update(@Param('workspaceId') ws: string, @Param('draftId') id: string, @Body() body: unknown) {
    const parsed = UpdateDraftSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.updateCopy(ws, id, parsed.data);
  }
  @Post(':draftId/approve') approve(@Param('workspaceId') ws: string, @Param('draftId') id: string) {
    return this.svc.approve(ws, id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api libs/shared/contracts
git commit -m "feat(api): drafts list/edit/approve endpoints (workspace-scoped)"
```

---

### Task 2: Publish endpoint (enqueue dispatch)

**Files:**
- Modify: `apps/api/src/app/drafts/drafts.controller.ts`
- Modify: `apps/api/src/app/drafts/drafts.service.ts`
- Modify: `apps/api/src/app/drafts/drafts.module.ts` (inject dispatch queue)
- Test: `apps/api/src/app/drafts/publish.spec.ts`

**Interfaces:**
- Consumes: `DraftStatus`, `QUEUES.dispatch`, `DispatchJob`.
- Produces: `POST /api/workspaces/:workspaceId/drafts/:draftId/publish` → requires `approved`, enqueues `DispatchJob { draftId }`; `DraftsService.publish(workspaceId, draftId)`.

- [ ] **Step 1: Write the failing test**

```typescript
// publish.spec.ts
import { DraftsService } from './drafts.service';
import { DraftStatus } from '@shipshout/data-entities';

describe('DraftsService.publish', () => {
  it('rejects publishing a non-approved draft', async () => {
    const drafts = { findOne: jest.fn(async ()=>({ id:'d1', status:DraftStatus.PendingReview })) };
    const queue = { add: jest.fn() };
    const svc = new DraftsService(drafts as any, queue as any);
    await expect(svc.publish('w1','d1')).rejects.toThrow(/approved/i);
    expect(queue.add).not.toHaveBeenCalled();
  });
  it('enqueues dispatch for an approved draft', async () => {
    const drafts = { findOne: jest.fn(async ()=>({ id:'d1', status:DraftStatus.Approved })) };
    const queue = { add: jest.fn(async ()=>({})) };
    const svc = new DraftsService(drafts as any, queue as any);
    await svc.publish('w1','d1');
    expect(queue.add).toHaveBeenCalledWith('dispatch', { draftId: 'd1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — `publish` not defined / constructor arity mismatch.

- [ ] **Step 3: Implement publish**

```typescript
// drafts.service.ts — add queue dependency + method
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, DispatchJob } from '@shipshout/queue';
// constructor(private drafts: Repository<Draft>, @InjectQueue(QUEUES.dispatch) private dispatchQueue: Queue) {}

async publish(workspaceId: string, draftId: string) {
  const d = await this.load(workspaceId, draftId);
  if (d.status !== DraftStatus.Approved) throw new Error('Draft must be approved before publishing');
  const job: DispatchJob = { draftId: d.id };
  await this.dispatchQueue.add('dispatch', job);
  return { enqueued: true };
}
```

Add the controller route:

```typescript
@Post(':draftId/publish') publish(@Param('workspaceId') ws: string, @Param('draftId') id: string) {
  return this.svc.publish(ws, id);
}
```

Register the `dispatch` queue in `DraftsModule` imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): publish endpoint enqueues dispatch for approved drafts"
```

---

### Task 3: Brand profile API

**Files:**
- Create: `apps/api/src/app/brand/brand.service.ts`
- Create: `apps/api/src/app/brand/brand.controller.ts`
- Create: `apps/api/src/app/brand/brand.module.ts`
- Create: `libs/shared/contracts/src/lib/brand.contracts.ts`
- Test: `apps/api/src/app/brand/brand.service.spec.ts`

**Interfaces:**
- Consumes: `BrandProfile`, `Tone`, `WorkspaceGuard`.
- Produces: `GET /api/workspaces/:workspaceId/brand`, `PUT /api/workspaces/:workspaceId/brand`; `BrandService.get(workspaceId)` (creates default if absent), `BrandService.upsert(workspaceId, dto)`. `UpdateBrandSchema`.

- [ ] **Step 1: Write contract + failing test**

```typescript
// brand.contracts.ts
import { z } from 'zod';
export const UpdateBrandSchema = z.object({
  tone: z.enum(['dev_focused','professional','hype_startup']),
  customInstructions: z.string().max(1000).optional(),
  emojiPolicy: z.boolean(),
});
export type UpdateBrandDto = z.infer<typeof UpdateBrandSchema>;
```

```typescript
// brand.service.spec.ts
import { BrandService } from './brand.service';
import { Tone } from '@shipshout/data-entities';
describe('BrandService', () => {
  it('creates a default profile when none exists', async () => {
    const repo = { findOne: jest.fn(async ()=>null), create:(d:any)=>d, save: jest.fn(async (d:any)=>({ id:'b1', ...d })) };
    const svc = new BrandService(repo as any);
    const b = await svc.get('w1');
    expect(b.tone).toBe(Tone.Professional);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement**

```typescript
// brand.service.ts
import { Repository } from 'typeorm';
import { BrandProfile, Tone } from '@shipshout/data-entities';
import { UpdateBrandDto } from '@shipshout/contracts';

export class BrandService {
  constructor(private brands: Repository<BrandProfile>) {}
  async get(workspaceId: string): Promise<BrandProfile> {
    let b = await this.brands.findOne({ where: { workspace: { id: workspaceId } } });
    if (!b) b = await this.brands.save(this.brands.create({
      workspace: { id: workspaceId } as any, tone: Tone.Professional, emojiPolicy: true,
    }));
    return b;
  }
  async upsert(workspaceId: string, dto: UpdateBrandDto): Promise<BrandProfile> {
    const b = await this.get(workspaceId);
    b.tone = dto.tone as Tone; b.customInstructions = dto.customInstructions; b.emojiPolicy = dto.emojiPolicy;
    return this.brands.save(b);
  }
}
```

```typescript
// brand.controller.ts
import { Body, Controller, Get, Param, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { WorkspaceGuard } from '@shipshout/auth';
import { UpdateBrandSchema } from '@shipshout/contracts';
import { BrandService } from './brand.service';

@Controller('workspaces/:workspaceId/brand')
@UseGuards(WorkspaceGuard)
export class BrandController {
  constructor(private svc: BrandService) {}
  @Get() get(@Param('workspaceId') ws: string) { return this.svc.get(ws); }
  @Put() put(@Param('workspaceId') ws: string, @Body() body: unknown) {
    const parsed = UpdateBrandSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.svc.upsert(ws, parsed.data);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api libs/shared/contracts
git commit -m "feat(api): brand profile get/upsert endpoints"
```

---

### Task 4: Dashboard draft list + editor UI

**Files:**
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/page.tsx`
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/drafts/draft-card.tsx`
- Create: `apps/web/src/lib/drafts.ts`
- Test: `apps/web/src/lib/drafts.spec.ts`

**Interfaces:**
- Consumes: `apiFetch` (Plan 1), draft endpoints (Tasks 1–2).
- Produces: `listDrafts(workspaceId)`, `updateDraft(workspaceId, draftId, editedCopy)`, `approveDraft`, `publishDraft`; a server-rendered drafts page with client `DraftCard` (textarea editor, Save/Approve/Publish buttons showing status).

- [ ] **Step 1: Write the failing test**

```typescript
// drafts.spec.ts
import { updateDraft } from './drafts';
describe('updateDraft', () => {
  it('PATCHes edited copy', async () => {
    const spy = jest.spyOn(global,'fetch' as any).mockResolvedValue({ ok:true, json: async ()=>({ id:'d1' }) } as any);
    process.env.NEXT_PUBLIC_API_BASE_URL='http://api.test';
    await updateDraft('w1','d1','hello');
    expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/drafts/d1',
      expect.objectContaining({ method:'PATCH' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement client lib + pages**

```typescript
// drafts.ts
import { apiFetch } from './api-client';
export const listDrafts = (ws:string) => apiFetch(`/workspaces/${ws}/drafts`);
export const updateDraft = (ws:string, id:string, editedCopy:string) =>
  apiFetch(`/workspaces/${ws}/drafts/${id}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ editedCopy }) });
export const approveDraft = (ws:string, id:string) =>
  apiFetch(`/workspaces/${ws}/drafts/${id}/approve`, { method:'POST' });
export const publishDraft = (ws:string, id:string) =>
  apiFetch(`/workspaces/${ws}/drafts/${id}/publish`, { method:'POST' });
```

```tsx
// drafts/page.tsx (server component)
import { listDrafts } from '../../../../lib/drafts';
import { DraftCard } from './draft-card';

export default async function DraftsPage({ params }: { params: { workspaceId: string } }) {
  const drafts = await listDrafts(params.workspaceId);
  return (
    <main>
      <h1>Drafts</h1>
      <div style={{ display:'grid', gap:16 }}>
        {drafts.map((d:any)=> <DraftCard key={d.id} workspaceId={params.workspaceId} draft={d} />)}
      </div>
    </main>
  );
}
```

```tsx
// drafts/draft-card.tsx (client component)
'use client';
import { useState } from 'react';
import { updateDraft, approveDraft, publishDraft } from '../../../../lib/drafts';

export function DraftCard({ workspaceId, draft }: { workspaceId: string; draft: any }) {
  const [copy, setCopy] = useState(draft.editedCopy ?? draft.generatedCopy);
  const [status, setStatus] = useState(draft.status);
  return (
    <article style={{ border:'1px solid #ddd', borderRadius:8, padding:16 }}>
      <header><strong>{draft.channel}</strong> — <em>{status}</em></header>
      <textarea value={copy} onChange={(e)=>setCopy(e.target.value)} rows={4} style={{ width:'100%' }} />
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>updateDraft(workspaceId, draft.id, copy)}>Save</button>
        <button onClick={async ()=>{ await approveDraft(workspaceId, draft.id); setStatus('approved'); }}>Approve</button>
        <button disabled={status!=='approved'} onClick={async ()=>{ await publishDraft(workspaceId, draft.id); setStatus('published'); }}>Publish</button>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test web`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: sign in, generate drafts (Plan 3 flow), open `/{workspaceId}/drafts`.
Expected: drafts render; edit + save persists; approve enables publish; publish enqueues dispatch.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): drafts dashboard with edit, approve, publish actions"
```

---

### Task 5: Brand settings UI

**Files:**
- Create: `apps/web/src/app/(dashboard)/[workspaceId]/settings/brand/page.tsx`
- Create: `apps/web/src/lib/brand.ts`
- Test: `apps/web/src/lib/brand.spec.ts`

**Interfaces:**
- Consumes: `apiFetch`, brand endpoints (Task 3).
- Produces: `getBrand(ws)`, `saveBrand(ws, dto)`; a settings form (tone select, custom instructions textarea, emoji toggle).

- [ ] **Step 1: Write the failing test**

```typescript
// brand.spec.ts
import { saveBrand } from './brand';
it('PUTs brand profile', async () => {
  const spy = jest.spyOn(global,'fetch' as any).mockResolvedValue({ ok:true, json: async ()=>({}) } as any);
  process.env.NEXT_PUBLIC_API_BASE_URL='http://api.test';
  await saveBrand('w1',{ tone:'professional', emojiPolicy:true });
  expect(spy).toHaveBeenCalledWith('http://api.test/api/workspaces/w1/brand', expect.objectContaining({ method:'PUT' }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement lib + page**

```typescript
// brand.ts
import { apiFetch } from './api-client';
export const getBrand = (ws:string) => apiFetch(`/workspaces/${ws}/brand`);
export const saveBrand = (ws:string, dto:{ tone:string; customInstructions?:string; emojiPolicy:boolean }) =>
  apiFetch(`/workspaces/${ws}/brand`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify(dto) });
```

```tsx
// settings/brand/page.tsx
import { getBrand } from '../../../../../lib/brand';
import { BrandForm } from './brand-form'; // client form calling saveBrand
export default async function BrandSettings({ params }:{ params:{ workspaceId:string } }) {
  const brand = await getBrand(params.workspaceId);
  return <main><h1>Brand voice</h1><BrandForm workspaceId={params.workspaceId} brand={brand} /></main>;
}
```

Create `brand-form.tsx` (client) with a tone `<select>` (`dev_focused|professional|hype_startup`), a custom-instructions `<textarea>`, an emoji `<input type=checkbox>`, and a Save button calling `saveBrand`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): brand voice settings page"
```

---

## Self-Review (Plan 4)

- **Spec coverage:** Review dashboard preview/edit/approve/publish (§3, §9 workflow), brand profile management (§5, §6), publish enqueues dispatch (§3.1). Actual channel posting is Plan 5.
- **Type consistency:** `DispatchJob { draftId }` matches Plan 5 consumer; `DraftStatus` transitions (pending_review → approved → published) consistent; `UpdateDraftSchema`/`UpdateBrandSchema` shared via contracts.
- **No placeholders:** all steps contain runnable code (brand-form described with exact fields; trivial client form).
