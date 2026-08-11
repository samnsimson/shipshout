# Request-Scoped Transaction Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich every Nest/Winston log during an HTTP request with `transactionId` metadata and a `[id] ` message prefix via AsyncLocalStorage, while keeping bootstrap logs plain.

**Architecture:** `@shipshout/core` owns `RequestContext` (ALS) and enters it from `LoggerMiddleware`. `@shipshout/logger` adds a Winston format that reads `getTransactionId()` from core. Middleware drops manual id prefixes; enrichment supplies them.

**Tech Stack:** NestJS 11, Node `AsyncLocalStorage`, Winston 3, nest-winston, bun, Jest + `@swc/jest`

## Global Constraints

- Output: structured field `transactionId` + message prefix `[id] ` when ALS is active.
- Request-scoped only — no fake id outside ALS.
- Coverage: any Nest `Logger` during a request (DI or `new Logger`).
- Single ALS in core; logger depends on core; core must not depend on logger.
- Header: `x-transaction-id` (`TRANSACTION_ID_HEADER`); blank/empty or trimmed length > 128 → generate UUID.
- Double-prefix guard: do not prepend if message already starts with `[${id}]`.
- Specs under `__tests__/`; Prettier 4-space indent, single quotes, printWidth 160.
- Single-statement `if` bodies stay one-line without braces (workspace rule).
- No nestjs-cls, no session store, no Nest HTTP integration harness in this pass.

## File map

| File                                                          | Responsibility                                   |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `libs/core/src/lib/request-context.ts`                        | ALS store + `run` / `getTransactionId`           |
| `libs/core/src/index.ts`                                      | Export RequestContext                            |
| `libs/core/src/lib/middlewares/logger.middleware.ts`          | Resolve id, enter ALS, log without manual prefix |
| `libs/core/src/lib/__tests__/request-context.spec.ts`         | ALS unit tests                                   |
| `libs/core/src/lib/__tests__/logger.middleware.spec.ts`       | Middleware unit tests                            |
| `libs/core/tsconfig.lib.json`                                 | Exclude `__tests__`                              |
| `libs/logger/src/lib/transaction-id.format.ts`                | Winston enrich format                            |
| `libs/logger/src/lib/logger.module.ts`                        | Wire format into `combine`                       |
| `libs/logger/src/index.ts`                                    | Export format for tests/reuse                    |
| `libs/logger/src/lib/__tests__/transaction-id.format.spec.ts` | Format unit tests                                |
| `libs/logger/package.json`                                    | Add `@shipshout/core` dependency                 |
| `libs/logger/tsconfig.lib.json`                               | Reference core + exclude `__tests__`             |

---

### Task 1: RequestContext ALS in `@shipshout/core`

**Files:**

- Create: `libs/core/src/lib/request-context.ts`
- Create: `libs/core/src/lib/__tests__/request-context.spec.ts`
- Modify: `libs/core/src/index.ts`
- Modify: `libs/core/tsconfig.lib.json`

**Interfaces:**

- Consumes: `node:async_hooks` `AsyncLocalStorage`
- Produces:
    - `export type RequestContextStore = { transactionId: string }`
    - `export const RequestContext = { run<T>(store: RequestContextStore, fn: () => T): T; getTransactionId(): string | undefined }`

- [ ] **Step 1: Write the failing test**

Create `libs/core/src/lib/__tests__/request-context.spec.ts`:

```ts
import { RequestContext } from '../request-context';

describe('RequestContext', () => {
    it('exposes transactionId inside run and clears after exit', () => {
        expect(RequestContext.getTransactionId()).toBeUndefined();

        let seen: string | undefined;
        RequestContext.run({ transactionId: 'outer' }, () => {
            seen = RequestContext.getTransactionId();
        });

        expect(seen).toBe('outer');
        expect(RequestContext.getTransactionId()).toBeUndefined();
    });

    it('isolates nested run stores', () => {
        RequestContext.run({ transactionId: 'outer' }, () => {
            expect(RequestContext.getTransactionId()).toBe('outer');
            RequestContext.run({ transactionId: 'inner' }, () => {
                expect(RequestContext.getTransactionId()).toBe('inner');
            });
            expect(RequestContext.getTransactionId()).toBe('outer');
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx nx test core --testPathPattern=request-context`
Expected: FAIL (module / `RequestContext` missing)

- [ ] **Step 3: Write minimal implementation**

Create `libs/core/src/lib/request-context.ts`:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
    transactionId: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export const RequestContext = {
    run<T>(store: RequestContextStore, fn: () => T): T {
        return storage.run(store, fn);
    },

    getTransactionId(): string | undefined {
        return storage.getStore()?.transactionId;
    },
};
```

Update `libs/core/src/index.ts` to add:

```ts
export * from './lib/request-context';
```

Update `libs/core/tsconfig.lib.json` `exclude` to include `"src/**/__tests__/**"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx nx test core --testPathPattern=request-context`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/core/src/lib/request-context.ts libs/core/src/lib/__tests__/request-context.spec.ts libs/core/src/index.ts libs/core/tsconfig.lib.json
git commit -m "Add RequestContext AsyncLocalStorage in core."
```

---

### Task 2: Enter ALS from LoggerMiddleware

**Files:**

- Modify: `libs/core/src/lib/middlewares/logger.middleware.ts`
- Create: `libs/core/src/lib/__tests__/logger.middleware.spec.ts`

**Interfaces:**

- Consumes: `RequestContext.run`, `TRANSACTION_ID_HEADER`, `randomUUID`
- Produces: middleware that sets headers/`req.transactionId`, runs `next` + finish listener inside ALS, logs `→` / `←` without manual `[id]` prefixes

- [ ] **Step 1: Write the failing middleware tests**

Create `libs/core/src/lib/__tests__/logger.middleware.spec.ts`:

```ts
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { TRANSACTION_ID_HEADER } from '../constants/transaction-id';
import { LoggerMiddleware, RequestWithTransactionId } from '../middlewares/logger.middleware';
import { RequestContext } from '../request-context';

function mockReq(headers: Record<string, string | undefined> = {}): Request {
    return {
        header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
        headers: { ...headers },
        method: 'GET',
        originalUrl: '/api/health',
        url: '/api/health',
    } as unknown as Request;
}

function mockRes(): Response & { headers: Record<string, string> } {
    const headers: Record<string, string> = {};
    return {
        headers,
        setHeader: (name: string, value: string) => {
            headers[name.toLowerCase()] = value;
        },
        on: jest.fn(),
        statusCode: 200,
    } as unknown as Response & { headers: Record<string, string> };
}

describe('LoggerMiddleware', () => {
    const middleware = new LoggerMiddleware();

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('generates a UUID when header is missing and enters ALS for next', () => {
        const req = mockReq();
        const res = mockRes();
        let idInsideNext: string | undefined;

        middleware.use(req, res, () => {
            idInsideNext = RequestContext.getTransactionId();
        });

        expect(idInsideNext).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect((req as RequestWithTransactionId).transactionId).toBe(idInsideNext);
        expect(res.headers[TRANSACTION_ID_HEADER]).toBe(idInsideNext);
        expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringMatching(/^→ GET /));
    });

    it('reuses a valid incoming header', () => {
        const req = mockReq({ [TRANSACTION_ID_HEADER]: '  client-id-1  ' });
        const res = mockRes();
        let idInsideNext: string | undefined;

        middleware.use(req, res, () => {
            idInsideNext = RequestContext.getTransactionId();
        });

        expect(idInsideNext).toBe('client-id-1');
        expect(res.headers[TRANSACTION_ID_HEADER]).toBe('client-id-1');
    });

    it('regenerates when header exceeds 128 characters', () => {
        const oversized = 'x'.repeat(129);
        const req = mockReq({ [TRANSACTION_ID_HEADER]: oversized });
        const res = mockRes();
        let idInsideNext: string | undefined;

        middleware.use(req, res, () => {
            idInsideNext = RequestContext.getTransactionId();
        });

        expect(idInsideNext).not.toBe(oversized);
        expect(idInsideNext).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('registers finish listener inside ALS so outbound log sees context', () => {
        const req = mockReq({ [TRANSACTION_ID_HEADER]: 'finish-id' });
        const res = mockRes();
        let finishHandler: (() => void) | undefined;
        (res.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
            if (event === 'finish') finishHandler = handler;
        });

        middleware.use(req, res, () => undefined);
        expect(finishHandler).toBeDefined();

        finishHandler!();
        expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringMatching(/^← GET /));
        // Last call happens while ALS still active for the listener chain started in run
        expect(RequestContext.getTransactionId()).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx nx test core --testPathPattern=logger.middleware`
Expected: FAIL (manual prefixes still present and/or ALS not entered)

- [ ] **Step 3: Update middleware**

Replace `libs/core/src/lib/middlewares/logger.middleware.ts` with:

```ts
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { TRANSACTION_ID_HEADER } from '../constants/transaction-id';
import { RequestContext } from '../request-context';

export type RequestWithTransactionId = Request & { transactionId: string };

const MAX_TRANSACTION_ID_LENGTH = 128;

function resolveTransactionId(req: Request): string {
    const incoming = req.header(TRANSACTION_ID_HEADER)?.trim();
    if (!incoming || incoming.length > MAX_TRANSACTION_ID_LENGTH) return randomUUID();
    return incoming;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(LoggerMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        const transactionId = resolveTransactionId(req);

        req.headers[TRANSACTION_ID_HEADER] = transactionId;
        (req as RequestWithTransactionId).transactionId = transactionId;
        res.setHeader(TRANSACTION_ID_HEADER, transactionId);

        const path = req.originalUrl || req.url;

        RequestContext.run({ transactionId }, () => {
            this.logger.log(`→ ${req.method} ${path}`);

            res.on('finish', () => {
                this.logger.log(`← ${req.method} ${path} ${res.statusCode}`);
            });

            next();
        });
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx nx test core`
Expected: all core specs PASS

- [ ] **Step 5: Commit**

```bash
git add libs/core/src/lib/middlewares/logger.middleware.ts libs/core/src/lib/__tests__/logger.middleware.spec.ts
git commit -m "Enter RequestContext from LoggerMiddleware."
```

---

### Task 3: Winston transaction-id format + logger dependency on core

**Files:**

- Create: `libs/logger/src/lib/transaction-id.format.ts`
- Create: `libs/logger/src/lib/__tests__/transaction-id.format.spec.ts`
- Modify: `libs/logger/src/lib/logger.module.ts`
- Modify: `libs/logger/src/index.ts`
- Modify: `libs/logger/package.json`
- Modify: `libs/logger/tsconfig.lib.json`

**Interfaces:**

- Consumes: `RequestContext.getTransactionId` from `@shipshout/core`
- Produces: `export const transactionIdFormat = winston.format(...)` that sets `info.transactionId` and prefixes string `info.message` when id present

- [ ] **Step 1: Add workspace dependency and write failing format tests**

In `libs/logger/package.json` dependencies add:

```json
"@shipshout/core": "workspace:*"
```

In `libs/logger/tsconfig.lib.json`:

- add `"src/**/__tests__/**"` to `exclude`
- set `"references": [{ "path": "../core/tsconfig.lib.json" }]`

Create `libs/logger/src/lib/__tests__/transaction-id.format.spec.ts`:

```ts
import { RequestContext } from '@shipshout/core';
import { transactionIdFormat } from '../transaction-id.format';

describe('transactionIdFormat', () => {
    const format = transactionIdFormat();

    it('leaves info unchanged outside ALS', () => {
        const info = format.transform({ level: 'info', message: 'hello' }, {}) as {
            message: string;
            transactionId?: string;
        };

        expect(info.message).toBe('hello');
        expect(info.transactionId).toBeUndefined();
    });

    it('adds metadata and message prefix inside ALS', () => {
        RequestContext.run({ transactionId: 'abc-123' }, () => {
            const info = format.transform({ level: 'info', message: 'hello' }, {}) as {
                message: string;
                transactionId?: string;
            };

            expect(info.transactionId).toBe('abc-123');
            expect(info.message).toBe('[abc-123] hello');
        });
    });

    it('does not double-prefix an already prefixed message', () => {
        RequestContext.run({ transactionId: 'abc-123' }, () => {
            const info = format.transform({ level: 'info', message: '[abc-123] hello' }, {}) as {
                message: string;
                transactionId?: string;
            };

            expect(info.transactionId).toBe('abc-123');
            expect(info.message).toBe('[abc-123] hello');
        });
    });
});
```

Run `bun install` at repo root after package.json change if needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx nx test logger --testPathPattern=transaction-id.format`
Expected: FAIL (format module missing)

- [ ] **Step 3: Implement format and wire LoggerModule**

Create `libs/logger/src/lib/transaction-id.format.ts`:

```ts
import { RequestContext } from '@shipshout/core';
import * as winston from 'winston';

export const transactionIdFormat = winston.format((info) => {
    const transactionId = RequestContext.getTransactionId();
    if (!transactionId) return info;

    info.transactionId = transactionId;

    if (typeof info.message === 'string') {
        const prefix = `[${transactionId}]`;
        if (!info.message.startsWith(prefix)) info.message = `${prefix} ${info.message}`;
    }

    return info;
});
```

Update `libs/logger/src/lib/logger.module.ts` `format.combine` to include `transactionIdFormat()` **before** timestamp/ms/nestLike:

```ts
format: winston.format.combine(
    transactionIdFormat(),
    winston.format.timestamp(),
    winston.format.ms(),
    nestWinstonModuleUtilities.format.nestLike(name, {
        colors: true,
        prettyPrint: true,
        processId: true,
        appName: true,
    }),
),
```

Export from `libs/logger/src/index.ts`:

```ts
export * from './lib/transaction-id.format';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx nx test logger` and `bunx nx test core` and `bunx nx build logger`
Expected: PASS / build succeeds

- [ ] **Step 5: Commit**

```bash
git add libs/logger/src/lib/transaction-id.format.ts libs/logger/src/lib/__tests__/transaction-id.format.spec.ts libs/logger/src/lib/logger.module.ts libs/logger/src/index.ts libs/logger/package.json libs/logger/tsconfig.lib.json bun.lock
git commit -m "Enrich Winston logs with request transaction id."
```

---

## Spec coverage checklist

| Spec requirement                                 | Task                  |
| ------------------------------------------------ | --------------------- |
| RequestContext ALS run/get                       | Task 1                |
| Middleware enters ALS, headers, no manual prefix | Task 2                |
| Header blank / >128 regenerate                   | Task 2                |
| Winston metadata + prefix + double-prefix guard  | Task 3                |
| logger → core dependency; core no logger dep     | Task 3                |
| Unit tests for ALS, format, middleware           | Tasks 1–3             |
| App main.ts / `{*path}` unchanged                | N/A (already correct) |
| No integration harness                           | Explicitly skipped    |
