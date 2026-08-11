# Request-Scoped Transaction Logging Design

**Date:** 2026-08-09  
**Status:** Approved for planning  
**Libraries:** `@shipshout/core`, `@shipshout/logger`  
**Package manager:** bun

## Goal

Every Nest `Logger` call during an HTTP request (DI or `new Logger(...)`) includes the transaction id as a Winston metadata field and a `[id] ` message prefix. Bootstrap and other non-request logs stay plain (no fake id). Middleware continues to resolve/propagate `x-transaction-id` from request in through response out.

## Decisions

| Topic                  | Choice                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Output shape           | Structured field `transactionId` + message prefix `[id] ` (option C)                  |
| Scope                  | Request-scoped only; bootstrap/CLI/jobs omit id                                       |
| Coverage               | Any Nest `Logger` during a request (middleware, controllers, services, Nest pipeline) |
| Mechanism              | Node `AsyncLocalStorage` + Winston format enrichment                                  |
| Session / cookie store | Out of scope — wrong lifetime for per-request ids                                     |
| Header                 | Existing `x-transaction-id` (`TRANSACTION_ID_HEADER`)                                 |

## Architecture

```
Request in
  → LoggerMiddleware
       • resolve transactionId (header or UUID)
       • set req/res headers + req.transactionId
       • RequestContext.run({ transactionId }, () => next())
  → Nest pipeline (guards / pipes / controllers / services…)
       • Nest Logger → Winston LoggerService (existing main.ts wiring)
       • Winston format reads RequestContext.getTransactionId():
           - info.transactionId when present
           - message prefix `[transactionId] ` when present
  → response finish log (same Nest Logger → same enrichment)

No ALS context (bootstrap / CLI):
  → logs unchanged (no placeholder id)
```

Ownership:

- **`@shipshout/core`** — `TRANSACTION_ID_HEADER`, `RequestContext` (ALS `run` / `getTransactionId`), middleware enters ALS
- **`@shipshout/logger`** — Winston Nest logger + format that calls `getTransactionId` from core (single ALS; do not duplicate the store)

Dependency direction: `logger` → `core` for context reads only. Core must not depend on logger (middleware keeps using Nest `Logger`).

## Components

### `RequestContext` (`@shipshout/core`)

- Module-private `AsyncLocalStorage<{ transactionId: string }>` (or equivalent typed store).
- `run(store, fn)` — enter context for the duration of `fn` (middleware wraps `next`).
- `getTransactionId(): string | undefined` — returns id when inside `run`, otherwise `undefined`.
- Exported from the core public API so logger (and future call sites) can read without touching Express.

### `LoggerMiddleware` (existing)

- Keep resolve/propagate behavior: trim incoming header; missing/blank → `randomUUID()`; set request header, `req.transactionId`, response header.
- Enter `RequestContext.run({ transactionId }, …)` before continuing the pipeline so in/out logs and everything after see ALS.
- Drop manual `[${transactionId}]` prefixes from log messages — enrichment supplies the prefix. Messages stay like `→ METHOD path` / `← METHOD path status`.
- Register finish listener inside the ALS `run` so the async `finish` callback still sees the same store (Node ALS preserves context across `res.on('finish')` when registered inside `run`).

### Winston enrich format (`@shipshout/logger`)

- Custom `winston.format` (or equivalent) applied in `LoggerModule.instance` before (or as part of) the existing `nestLike` combine.
- When `getTransactionId()` returns a value:
    - set `info.transactionId`
    - if `info.message` is a string and does not already start with `[${id}]`, prepend `[${id}] `
- When absent: leave message and metadata unchanged.

### App wiring

- Keep `LoggerModule.getLogger(...)` in `main.ts` as the Nest app logger.
- Keep middleware applied via `CoreModule` / `AppModule` on `{*path}` (unchanged route pattern).

## Data flow

1. Client may send `x-transaction-id`.
2. Middleware normalizes id, writes headers / `req.transactionId`, enters ALS, logs inbound via Nest Logger.
3. Downstream Nest Logger calls hit Winston; format attaches id + prefix from ALS.
4. On `finish`, middleware logs outbound; format still sees ALS.
5. ALS ends when the middleware `run` callback completes; later unrelated work has no id.

## Error handling & constraints

- Missing/blank incoming header → generate UUID; never throw for id resolution.
- Invalid or oversized header → treat as missing and generate UUID (do not reject the request for logging reasons). Cap: if trimmed length is empty or greater than 128 characters, regenerate.
- Outside ALS → omit transaction id; no `-` / `system` placeholder.
- Double-prefix guard: if message already starts with `[${id}]`, do not prefix again.
- Out of scope this pass: external log shipping, sampling, PII redaction, renaming the header, wrapping third-party `console` that bypasses Nest Logger.

## Testing

Specs under `__tests__` following existing lib conventions.

- **Unit — `RequestContext`:** `run` sets context; nested `run` isolates; after exit, `getTransactionId()` is `undefined`.
- **Unit — enrich format:** with ALS active → `transactionId` metadata + `[id] ` prefix; without ALS → unchanged; already-prefixed message stays single-prefixed.
- **Unit — middleware:** missing header → UUID generated, set on req/res, ALS active for `next`; present header → reused; in/out Nest Logger calls run inside ALS (spy/assert enrichment path, not only string contains).
- **Integration:** optional / light for v1. Prefer unit coverage of ALS + format. Skip a full Nest HTTP capture harness unless already cheap to add.

## Out of scope

- `nestjs-cls` or other third-party CLS packages
- Express session / cookie-backed storage for transaction ids
- Auto-injecting ids into non-Nest loggers or raw `console`
- Changing `TRANSACTION_ID_HEADER` name or OpenAPI documentation of the header
- Log aggregation / shipping configuration

## Success criteria

- A controller/service `this.logger.log('hello')` during a request produces output with both `transactionId` metadata and a `[id] ` message prefix matching the response `x-transaction-id`.
- Middleware in/out lines use the same enrichment (no duplicated manual prefixes).
- App bootstrap logs have neither field nor prefix.
- Existing header reuse and generate-on-missing behavior preserved.
