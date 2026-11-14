# Authentication

Cookie-based SPA authentication via [Laravel Sanctum](https://laravel.com/docs/sanctum) —
not tokens, not JWT.

## Why cookies, not JWT

Frontend (`frontend/`, Next.js) and backend (`backend/`, Laravel) share a top-level
domain in this setup (`localhost` locally). That's exactly what Sanctum's SPA mode is
for, and it avoids the usual JWT failure mode: a bearer token sitting in browser JS
where any XSS can read it. If frontend and backend ever move to unrelated domains,
see [Beyond this setup](#beyond-this-setup) below.

## How it works

```
Browser (Next.js, localhost:3000)
  │
  │  fetch(..., { credentials: "include" })
  ▼
Laravel API (localhost:8000)
  │  Sanctum: EnsureFrontendRequestsAreStateful
  │  → cookie-based session, CSRF-protected
  ▼
Authenticated request
```

1. The frontend calls `GET /sanctum/csrf-cookie` once, which sets an `XSRF-TOKEN`
   cookie. Every non-GET request reads that cookie and sends it back as the
   `X-XSRF-TOKEN` header (handled in `frontend/src/lib/api/client.ts`).
   Since Laravel 13 the check is done by `PreventRequestForgery` (configured in
   `config/sanctum.php`). A request with `Sec-Fetch-Site: same-origin` (the
   rewrite/proxy mode) passes on that header alone. Anything else, including
   direct mode where `localhost:3000` → `:8000` counts as `same-site`, must
   carry the token. Keep sending the token in both modes (ADR-028).
2. `POST /api/v1/auth/login` authenticates via a normal Laravel session, not a
   token. There is no registration endpoint: this is an internal app, and admins
   create users. The session cookie (`app_session`) is what keeps
   the user logged in.
3. Every subsequent request includes that cookie automatically
   (`credentials: "include"`), so `GET /api/v1/user` returns the current user.
4. Logout invalidates the Laravel session server-side and clears the cookie.
5. Login also queues a second marker cookie (`auth_status`; encrypted
   like every Laravel cookie, only its presence matters),
   cleared on logout. The Laravel session cookie is set on *every* request
   regardless of auth state, so it can't be used to infer "logged in" —
   `auth_status` is what `proxy.ts` actually checks (see below).

The Laravel API is the only thing that actually enforces authentication. A `proxy.ts`
redirect on the frontend is UX, not a security boundary — see
[authorization.md](./authorization.md#enforcement-boundary) for why that distinction
matters more once roles are involved.

## Backend (`backend/`)

- `config/sanctum.php` — `stateful` domains that get cookie-based auth
  (`localhost:3000` by default).
- `config/cors.php` — `supports_credentials: true`, origins read from `FRONTEND_URLS`.
- `bootstrap/app.php` — registers Sanctum's `statefulApi()` middleware.
- `app/Http/Controllers/Auth/AuthController.php`: `login`, `logout`, `user`
  endpoints (responses are `{ data: UserResource }`).
- `routes/api.php`: route definitions, served under `/api/v1`
  (`apiPrefix` in `bootstrap/app.php`), including the `throttle:10,1` guard on
  `/auth/*`.

Forgot/reset password is a separate flow built on top of this — see
[password-reset.md](./password-reset.md).

Env vars that matter (see `.env.example`):

```
APP_URL=http://localhost:8000     # must include the port — see note below
SESSION_DOMAIN=localhost          # must cover both frontend and backend hosts
SESSION_COOKIE=app_session         # explicit name, decoupled from APP_NAME
AUTH_STATUS_COOKIE=auth_status     # proxy.ts's login-state marker, see below
SANCTUM_STATEFUL_DOMAINS=localhost:3000
FRONTEND_URLS=http://localhost:3000
```

`APP_URL` needs the port locally (`:8000`) — without it, any absolute URL Laravel
generates (e.g. avatar URLs in [media.md](./media.md)) points at port 80 instead of
the dev server.

## Frontend (`frontend/`)

- `src/lib/api/client.ts`: typed `openapi-fetch` client (base `/api/v1`). Its
  middleware ensures the CSRF cookie exists before writes, attaches `X-XSRF-TOKEN`
  and `Accept-Language`, always sends `credentials: "include"`, and turns non-2xx
  responses into `ApiError` (see [api-error-handling.md](./api-error-handling.md)).
- `src/contexts/auth-context.tsx` — `AuthProvider` / `useAuth()`. Hydrates the
  current user from `GET /api/v1/user` on mount, exposes `login`, `logout`, avatar upload/remove.
- `src/proxy.ts` — this Next.js version renamed `middleware.ts` to `proxy.ts`
  (v16+). Redirects based on **`auth_status` cookie presence only** — it can't
  inspect the opaque Laravel session, so it's a UX shortcut, not enforcement.
  Protects `/dashboard` and `/admin`; keeps `/login` and `/forgot-password` guest-only.
- `src/app/login`, `src/app/dashboard`: example pages using
  `useAuth()`.

Forgot/reset password pages are covered in
[password-reset.md](./password-reset.md), not here.

Env vars (see `.env.example`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_STATUS_COOKIE=auth_status   # must match backend AUTH_STATUS_COOKIE
```

## Running locally

See [SETUP.md](../SETUP.md#local-development) (Docker/Sail backend + `npm run dev`).
Log in with the seeded `test@example.com` / `password` user (role `user`).

## Beyond this setup

- **Frontend and backend on different domains**: Sanctum's cookie mode requires a
  shared top-level domain. If that changes, swap the frontend's auth calls for a
  small BFF (Next.js route handlers holding a Sanctum token server-side) instead of
  rewriting the backend — Sanctum supports both modes side by side.
- **Mobile app**: issue a Sanctum personal access token (`$user->createToken(...)`,
  already available via `HasApiTokens` on the `User` model) instead of a session
  cookie. Runs against the same backend, same users, no conflict with the web SPA's
  cookie auth.
