# Global Exception Handler Design (Core Library)

**Date:** 2026-08-10  
**Status:** Approved for planning  
**Library:** `@shipshout/core`  
**App wiring:** `shipshout-api-svc` `main.ts`  
**Package manager:** bun

## Goal

Provide a catch-all Nest exception filter in `@shipshout/core` that returns a consistent JSON error body (including `transactionId` from request context) for all Nest `HttpException`s and unexpected failures, registered explicitly via `app.useGlobalFilters` in each HTTP app.

## Decisions

| Topic             | Choice                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| Scope             | Nest-like rich body + `transactionId` (option B from brainstorm)                    |
| Response shape    | `{ statusCode, message, error, transactionId, path, timestamp }`                    |
| Unexpected errors | Always generic client message `"Internal server error"`; log full error server-side |
| Registration      | `app.useGlobalFilters(new GlobalExceptionFilter())` in `main.ts` (Approach 3)       |
| `CoreModule`      | Unchanged — does **not** register `APP_FILTER`                                      |
| Domain mapping    | Out of scope — Better Auth / ORM / Zod stay mapped to `HttpException` at call sites |

## Architecture

```
Request (LoggerMiddleware → RequestContext ALS)
  → Nest pipeline (guards / pipes / controllers / services)
  → throw HttpException | unknown Error
       GlobalExceptionFilter (@Catch())
         • read RequestContext.getTransactionId()
         • build error body
         • log (warn 4xx / error 5xx; stack for unexpected)
         • res.status(statusCode).json(body)
```

Ownership:

- **`@shipshout/core`** — `GlobalExceptionFilter`, response type, public export
- **HTTP apps** — instantiate and register the filter in `main.ts`
- **`RequestContext`** — existing ALS; filter only reads `getTransactionId()`

## Components

### `GlobalExceptionFilter`

- Implements `ExceptionFilter` with `@Catch()` (catch-all).
- Constructed with `new GlobalExceptionFilter()` (no DI required).
- Uses Nest `Logger` (`new Logger(GlobalExceptionFilter.name)`).
- Reads `transactionId` via `RequestContext.getTransactionId()`; response field is `string | null` when absent (e.g. no middleware / non-HTTP).

### Response body

```ts
{
  statusCode: number;
  message: string | string[];
  error: string;
  transactionId: string | null;
  path: string;
  timestamp: string; // ISO-8601
}
```

| Case            | `statusCode`     | `message`                                         | `error`                                                 | Logging                                         |
| --------------- | ---------------- | ------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| `HttpException` | exception status | Nest `getResponse()` message (string or string[]) | Nest `error` string when present, else HTTP status text | `warn` for 4xx; `error` for 5xx                 |
| Anything else   | `500`            | `"Internal server error"`                         | `"Internal Server Error"`                               | `error` with original exception (include stack) |

`path` comes from the HTTP request URL/path. `timestamp` is `new Date().toISOString()` at handle time.

### App wiring (`shipshout-api-svc`)

In `main.ts`, after `NestFactory.create`:

```ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

Keep existing `ValidationPipe`. Validation failures remain `BadRequestException` and flow through this filter unchanged (message may be `string[]`).

### Public API

Re-export `GlobalExceptionFilter` (and the response type if exported) from `libs/core/src/index.ts`.

## Data flow

1. Client may send `x-transaction-id`; middleware enters ALS.
2. Handler or pipe throws.
3. Filter builds body; prefers ALS `transactionId`, else `null`.
4. Client receives JSON body; response may still carry `x-transaction-id` from middleware.

## Testing

Unit tests in `libs/core` for the filter:

- `HttpException` → correct status + body fields; `transactionId` when ALS set, else `null`
- `BadRequestException` with `message: string[]` preserved
- Unknown `Error` → 500 + generic message; logger invoked with original error
- `path` and `timestamp` present

## Non-goals

- Mapping Better Auth `APIError`, TypeORM, or Zod inside the filter
- Swagger/OpenAPI error schema documentation (follow-up)
- Registering the filter via `APP_FILTER` / `CoreModule`
- Changing auth `mapAuthError` behavior

## Success criteria

- Failed Nest HTTP responses from `shipshout-api-svc` use the agreed JSON shape
- `transactionId` appears when request context is active
- Unexpected errors never leak internal messages to clients
- Filter is opt-in per app via `main.ts`
