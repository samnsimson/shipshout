# Auth Endpoints Design (Login, Register, Password Reset, Social)

**Date:** 2026-08-10  
**Status:** Approved for planning  
**Library:** `@shipshout/auth`  
**Package manager:** bun

## Goal

Expose Nest HTTP endpoints under `/auth` for email/password register, login, forgot-password, reset-password, and Google/GitHub OAuth start — wrapping Better Auth via `AuthService.api`, returning session cookies plus user/session JSON where applicable, with a pluggable email adapter (logging stub now; Resend later).

## Decisions

| Topic                   | Choice                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Surface                 | Nest `AuthController` wrappers (option A)                                                         |
| Password reset          | Both forgot + reset                                                                               |
| Email                   | Logging stub + `EmailAdapter` for later Resend/other                                              |
| Login/register response | Cookie **and** `{ user, session }` body                                                           |
| Social                  | `GET /auth/google` / `GET /auth/github`; callbacks stay on Better Auth `basePath` `/auth-service` |
| Approach                | Thin controller → `AuthService.api.*`                                                             |

## Architecture

```
Client
  → POST /auth/register|login|forgot-password|reset-password
  → GET  /auth/google|github
       AuthController (@AllowAnonymous, DTOs, OpenAPI)
         → AuthService.api.signUpEmail | signInEmail |
              requestPasswordReset | resetPassword | signInSocial
         ← Set-Cookie + { user, session } for register/login
         ← { ok: true } for forgot/reset
         ← redirect for social start

Better Auth basePath /auth-service
  → OAuth callback /callback/:provider (provider dashboard URLs)

createAuth
  emailAndPassword.sendResetPassword → EmailAdapter.send
     default LoggingEmailAdapter
     optional override via AuthModule.forRootAsync
```

## Components

| Piece                            | Responsibility                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `AuthController`                 | Public Nest routes; thin; maps BA errors to Nest HTTP exceptions                      |
| `dto/`                           | Register, Login, ForgotPassword, ResetPassword request DTOs; AuthSession response DTO |
| `EmailAdapter` + `EMAIL_ADAPTER` | `send({ to, subject, html?, text? })`                                                 |
| `LoggingEmailAdapter`            | Default: log reset URL / payload                                                      |
| `createAuth`                     | Wire providers + `sendResetPassword` to adapter                                       |
| `AuthModule.forRootAsync`        | Validate options; register controller, adapter provider; optional `emailAdapter`      |
| Better Auth `/auth-service`      | OAuth callbacks (+ SDK if used)                                                       |

### Routes

| Method | Path                    | Body / notes          |
| ------ | ----------------------- | --------------------- |
| `POST` | `/auth/register`        | email, password, name |
| `POST` | `/auth/login`           | email, password       |
| `POST` | `/auth/forgot-password` | email                 |
| `POST` | `/auth/reset-password`  | token, newPassword    |
| `GET`  | `/auth/google`          | start OAuth redirect  |
| `GET`  | `/auth/github`          | start OAuth redirect  |

## Data flow

1. **Register / login:** Validate DTO → `signUpEmail` / `signInEmail` with `fromNodeHeaders` → forward `Set-Cookie` → return `{ user, session }`.
2. **Forgot:** `requestPasswordReset` → adapter sends (logs) reset URL → always `{ ok: true }`.
3. **Reset:** `resetPassword` with token + new password → `{ ok: true }` (no auto sign-in this pass).
4. **Social:** `signInSocial` → redirect to provider → callback on `/auth-service/callback/...` → session cookie.

## Error handling & constraints

- Map Better Auth errors to Nest: `400` validation, `401` bad credentials, `409` when BA indicates existing email; else `500`.
- Forgot-password must not leak whether the email exists.
- Preserve all `Set-Cookie` headers (including multiples).
- Prefer rejecting empty social client id/secret at options validation when social is expected; do not silently start OAuth with empty credentials.
- Out of scope: Resend implementation, email verification UX, auto sign-in after reset, account-linking UI, changing `basePath`.
- Nest library path does not read `process.env` for email (adapter injected); CLI `export const auth` may still use env.

## Testing

- Unit: DTO validation; `LoggingEmailAdapter` (spy); `AuthController` with mocked `AuthService.api` (body shape, cookies, social provider args, forgot/reset `{ ok: true }`); module accepts custom adapter.
- No live OAuth or real email in this pass.

## Success criteria

- Swagger documents all six routes with DTOs.
- Register/login set session cookie and return user/session JSON.
- Forgot/reset work end-to-end against BA with logging adapter.
- Google/GitHub Nest routes initiate OAuth; callbacks succeed when provider apps point at `/auth-service/callback/...`.
