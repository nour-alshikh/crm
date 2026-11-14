# Deployment

Backend (Laravel) and frontend (Next.js) deploy separately. Which setup you use
depends on whether the two share a parent domain.

## Option A — shared parent domain (direct)

e.g. `api.example.com` + `app.example.com`. The browser calls the API directly,
exactly like local dev.

- Frontend: `NEXT_PUBLIC_API_URL=https://api.example.com`
- Backend: `SESSION_DOMAIN=.example.com`,
  `SANCTUM_STATEFUL_DOMAINS=app.example.com`,
  `FRONTEND_URLS=https://app.example.com`

## Option B — no shared domain (proxy) — e.g. `*.vercel.app`

Sanctum cookie auth needs the session cookie on a domain the browser sends to
the API, and `proxy.ts` needs the `auth_status` cookie on the frontend's own
domain. With `*.vercel.app` + `crm.example.com` neither is possible directly, so
the frontend proxies the API instead:

```
browser ──> my-app.vercel.app/api/*      ──rewrite──> backend/api/*
browser ──> my-app.vercel.app/sanctum/*  ──rewrite──> backend/sanctum/*
```

The browser only ever talks to the Vercel origin, Laravel's `Set-Cookie`
headers come back through it, and because they carry no `Domain` attribute the
browser stores them on the Vercel host. No auth code changes — it's the same
cookie flow, just same-origin.

Enable it by setting `BACKEND_URL` on the frontend (see `next.config.ts`). When
set, rewrites are added and `NEXT_PUBLIC_API_URL` is forced to `""` so the API
client calls relative paths.

### Frontend env (Vercel project, root directory `frontend`)

| Var | Value |
|---|---|
| `BACKEND_URL` | `https://crm.noor.reeras.site` |
| `NEXT_PUBLIC_AUTH_STATUS_COOKIE` | must match backend `AUTH_STATUS_COOKIE` (default `auth_status`) |

Both are read at **build time** — redeploy after changing them.

### Backend env

| Var | Value | Why |
|---|---|---|
| `SESSION_DOMAIN` | `null` | Host-only cookies. Any domain value is rejected by the browser on the Vercel host. |
| `SESSION_SECURE_COOKIE` | `true` | HTTPS only. |
| `SANCTUM_STATEFUL_DOMAINS` | `my-app.vercel.app` | Sanctum only starts a session for requests whose `Origin`/`Referer` matches. Comma-separate to add more. |
| `FRONTEND_URLS` | `https://my-app.vercel.app` | First entry builds password-reset links. |
| `TRUSTED_PROXIES` | `*` | Every request now arrives from a Vercel IP. Without this, per-IP rate limiting puts all users in one bucket. Read via `config('app.trusted_proxies')` by `App\Http\Middleware\TrustProxies`, so it survives `config:cache` (before step 0.3 it was read with `env()` in `bootstrap/app.php` and silently ignored once config was cached). |

Then `php artisan config:clear` (or `config:cache`) on the server.

### Caveats

- **Preview deployments** get their own URLs (`my-app-git-branch-….vercel.app`)
  that aren't in `SANCTUM_STATEFUL_DOMAINS`, so login won't work there. Add
  specific preview hosts if you need them; Sanctum does not support wildcards.
- **`TRUSTED_PROXIES=*`** means `X-Forwarded-For` is believed from anyone who
  can reach the backend directly, so a client hitting the backend URL (not via
  Vercel) can spoof its IP to dodge rate limits. Vercel publishes no fixed
  egress IP range, so `*` is the practical choice; if that matters, block
  direct public access to the backend or move to Option A.
- **Latency**: every API call takes an extra hop through Vercel's edge.
- **Avatars / media URLs** still point straight at the backend (`APP_URL`).
  That's fine — they're public files and need no cookies.
