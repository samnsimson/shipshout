# Global Exception Handler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a catch-all `GlobalExceptionFilter` in `@shipshout/core` that returns a consistent JSON error body (including `transactionId`), and register it in `shipshout-api-svc` via `app.useGlobalFilters`.

**Architecture:** One `@Catch()` filter constructed with `new GlobalExceptionFilter()` (no DI). It reads `RequestContext.getTransactionId()`, maps `HttpException` to Nest-like fields, and maps unknown errors to a generic 500. Apps opt in in `main.ts`. `CoreModule` does not register `APP_FILTER`.

**Tech Stack:** NestJS 11 (`ExceptionFilter`, `HttpException`, `Logger`), Express request/response via Nest `ArgumentsHost`, existing `RequestContext` ALS, Jest, bun

## Global Constraints

- Response body: `{ statusCode, message, error, transactionId, path, timestamp }` (`transactionId: string | null`).
- Unexpected errors: client always sees `"Internal server error"` / `"Internal Server Error"`; log full error with stack.
- Register with `app.useGlobalFilters(new GlobalExceptionFilter())` in `main.ts` only — not via `CoreModule` / `APP_FILTER`.
- Do not remap Better Auth / TypeORM / Zod inside the filter.
- Specs under `libs/core/src/lib/__tests__/`; Prettier 4-space, single quotes, printWidth 160; one-line single-statement `if`s.
- Package manager: bun.

## File map

| File | Responsibility |
| --- | --- |
| `libs/core/src/lib/filters/http-error-response.ts` | `HttpErrorResponse` type |
| `libs/core/src/lib/filters/global-exception.filter.ts` | Catch-all Nest exception filter |
| `libs/core/src/lib/__tests__/global-exception.filter.spec.ts` | Unit tests for the filter |
| `libs/core/src/index.ts` | Re-export filter + type |
| `apps/shipshout-api-svc/src/main.ts` | `useGlobalFilters(new GlobalExceptionFilter())` |

---

### Task 1: `GlobalExceptionFilter` + unit tests

**Files:**
- Create: `libs/core/src/lib/filters/http-error-response.ts`
- Create: `libs/core/src/lib/filters/global-exception.filter.ts`
- Create: `libs/core/src/lib/__tests__/global-exception.filter.spec.ts`
- Modify: `libs/core/src/index.ts`

**Interfaces:**
- Produces:
  - `export type HttpErrorResponse = { statusCode: number; message: string | string[]; error: string; transactionId: string | null; path: string; timestamp: string }`
  - `export class GlobalExceptionFilter implements ExceptionFilter` with `catch(exception: unknown, host: ArgumentsHost): void`
- Consumes: `RequestContext.getTransactionId(): string | undefined`

- [ ] **Step 1: Write the failing tests**

Create `libs/core/src/lib/__tests__/global-exception.filter.spec.ts`:

```typescript
import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, Logger, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { HttpErrorResponse } from '../filters/http-error-response';
import { RequestContext } from '../request-context';

function createHost(path = '/auth/login'): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status } as unknown as Response;
    const request = { url: path, method: 'POST' } as unknown as Request;
    const host = {
        switchToHttp: () => ({
            getResponse: () => response,
            getRequest: () => request,
        }),
    } as ArgumentsHost;
    return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
    const filter = new GlobalExceptionFilter();

    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('maps HttpException with transactionId from RequestContext', () => {
        const { host, status, json } = createHost('/auth/login');

        RequestContext.run({ transactionId: 'tx-1' }, () => {
            filter.catch(new UnauthorizedException('Invalid credentials'), host);
        });

        expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
        const body = json.mock.calls[0][0] as HttpErrorResponse;
        expect(body).toEqual(
            expect.objectContaining({
                statusCode: 401,
                message: 'Invalid credentials',
                error: 'Unauthorized',
                transactionId: 'tx-1',
                path: '/auth/login',
            }),
        );
        expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('sets transactionId null when RequestContext is empty', () => {
        const { host, json } = createHost();
        filter.catch(new BadRequestException('bad'), host);
        expect((json.mock.calls[0][0] as HttpErrorResponse).transactionId).toBeNull();
    });

    it('preserves validation message arrays', () => {
        const { host, status, json } = createHost();
        const messages = ['login must be a string', 'password must be longer than or equal to 8 characters'];
        filter.catch(new BadRequestException({ message: messages, error: 'Bad Request', statusCode: 400 }), host);

        expect(status).toHaveBeenCalledWith(400);
        expect((json.mock.calls[0][0] as HttpErrorResponse).message).toEqual(messages);
        expect((json.mock.calls[0][0] as HttpErrorResponse).error).toBe('Bad Request');
    });

    it('maps unknown errors to generic 500 and logs the original error', () => {
        const { host, status, json } = createHost('/boom');
        const err = new Error('secret db failure');

        filter.catch(err, host);

        expect(status).toHaveBeenCalledWith(500);
        expect(json.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                statusCode: 500,
                message: 'Internal server error',
                error: 'Internal Server Error',
                path: '/boom',
                transactionId: null,
            }),
        );
        expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('secret db failure'), expect.any(String));
    });

    it('logs HttpException 5xx with error level', () => {
        const { host } = createHost();
        filter.catch(new HttpException('upstream failed', HttpStatus.BAD_GATEWAY), host);
        expect(Logger.prototype.error).toHaveBeenCalled();
        expect(Logger.prototype.warn).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test core --skip-nx-cache`

Expected: FAIL — cannot resolve `../filters/global-exception.filter` (or similar missing module).

- [ ] **Step 3: Add response type**

Create `libs/core/src/lib/filters/http-error-response.ts`:

```typescript
export type HttpErrorResponse = {
    statusCode: number;
    message: string | string[];
    error: string;
    transactionId: string | null;
    path: string;
    timestamp: string;
};
```

- [ ] **Step 4: Implement `GlobalExceptionFilter`**

Create `libs/core/src/lib/filters/global-exception.filter.ts`:

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequestContext } from '../request-context';
import { HttpErrorResponse } from './http-error-response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const body = this.toErrorResponse(exception, request.url ?? request.path ?? '');
        if (body.statusCode >= 500) this.logger.error(this.logMessage(exception, body), exception instanceof Error ? exception.stack : undefined);
        else this.logger.warn(this.logMessage(exception, body));

        response.status(body.statusCode).json(body);
    }

    private toErrorResponse(exception: unknown, path: string): HttpErrorResponse {
        const transactionId = RequestContext.getTransactionId() ?? null;
        const timestamp = new Date().toISOString();

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const raw = exception.getResponse();
            const message = this.extractMessage(raw, exception.message);
            const error = this.extractError(raw, statusCode);
            return { statusCode, message, error, transactionId, path, timestamp };
        }

        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
            transactionId,
            path,
            timestamp,
        };
    }

    private extractMessage(raw: string | object, fallback: string): string | string[] {
        if (typeof raw === 'string') return raw;
        if (raw && typeof raw === 'object' && 'message' in raw) {
            const message = (raw as { message: unknown }).message;
            if (typeof message === 'string' || Array.isArray(message)) return message as string | string[];
        }
        return fallback;
    }

    private extractError(raw: string | object, statusCode: number): string {
        if (raw && typeof raw === 'object' && 'error' in raw) {
            const error = (raw as { error: unknown }).error;
            if (typeof error === 'string') return error;
        }
        return HttpStatus[statusCode] ?? 'Error';
    }

    private logMessage(exception: unknown, body: HttpErrorResponse): string {
        if (exception instanceof HttpException) return `${body.statusCode} ${body.path} ${typeof body.message === 'string' ? body.message : body.message.join('; ')}`;
        if (exception instanceof Error) return `${body.statusCode} ${body.path} ${exception.message}`;
        return `${body.statusCode} ${body.path} Unexpected error`;
    }
}
```

Note on `HttpStatus[statusCode]`: Nest’s numeric enum reverse-maps to names like `UNAUTHORIZED`, `BAD_REQUEST`. If tests expect title-case Nest strings (`Unauthorized`, `Bad Request`), normalize:

```typescript
private statusText(statusCode: number): string {
    const key = HttpStatus[statusCode];
    if (typeof key !== 'string') return 'Error';
    return key
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
```

Use `statusText` in `extractError` when `raw` has no `error` field. Prefer matching Nest’s default filter strings so clients stay familiar (`Unauthorized`, `Bad Request`, `Internal Server Error`).

- [ ] **Step 5: Export from package entry**

Modify `libs/core/src/index.ts` — add:

```typescript
export * from './lib/filters/global-exception.filter';
export * from './lib/filters/http-error-response';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx nx test core --skip-nx-cache`

Expected: all core suites PASS, including the five new filter cases.

- [ ] **Step 7: Commit**

```bash
git add libs/core/src/lib/filters/http-error-response.ts \
  libs/core/src/lib/filters/global-exception.filter.ts \
  libs/core/src/lib/__tests__/global-exception.filter.spec.ts \
  libs/core/src/index.ts
git commit -m "$(cat <<'EOF'
Add GlobalExceptionFilter to core with consistent error JSON.

EOF
)"
```

---

### Task 2: Register filter in `shipshout-api-svc`

**Files:**
- Modify: `apps/shipshout-api-svc/src/main.ts`

**Interfaces:**
- Consumes: `GlobalExceptionFilter` from `@shipshout/core`
- Produces: global filter registration at bootstrap (no new public API)

- [ ] **Step 1: Wire `useGlobalFilters` in bootstrap**

Modify `apps/shipshout-api-svc/src/main.ts`:

```typescript
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GlobalExceptionFilter } from '@shipshout/core';
import { Swagger } from '@shipshout/swagger';
import { AppModule } from './app/app.module';
import { LoggerModule } from '@shipshout/logger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: LoggerModule.getLogger('shipshout-api-svc'),
        bodyParser: false,
    });

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // ... existing Swagger + listen unchanged
}
```

Do **not** change `CoreModule` or `AppModule` providers.

- [ ] **Step 2: Typecheck / build the API app**

Run: `npx nx build shipshout-api-svc --skip-nx-cache`

Expected: build succeeds (filter import resolves from `@shipshout/core`).

- [ ] **Step 3: Commit**

```bash
git add apps/shipshout-api-svc/src/main.ts
git commit -m "$(cat <<'EOF'
Register GlobalExceptionFilter in shipshout-api-svc bootstrap.

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Catch-all filter in `@shipshout/core` | Task 1 |
| Body `{ statusCode, message, error, transactionId, path, timestamp }` | Task 1 |
| `transactionId` from ALS or `null` | Task 1 |
| Generic 500 for unexpected errors + server log | Task 1 |
| Validation `message: string[]` preserved | Task 1 |
| `useGlobalFilters` in `main.ts` | Task 2 |
| `CoreModule` unchanged / no `APP_FILTER` | Task 2 (explicit non-change) |
| No domain remapping in filter | Task 1 (HttpException / unknown only) |
| Export from core index | Task 1 |
