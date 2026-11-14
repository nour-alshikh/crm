# Setting up a new project from this template

Checklist for turning a fresh clone/"Use this template" copy into a real project.

## Rename the identity

- [ ] `backend/.env` (copy from `.env.example`) — set `APP_NAME` to the real
      project name.
- [ ] `frontend/src/app/layout.tsx` — replace the placeholder `title` and
      `description` in `metadata`.
- [ ] `frontend/package.json` — `"name"` field.
- [ ] `frontend/src/components/site-header.tsx` — the "Your App" brand text.
- [ ] Root `README.md` — replace the `# Template` heading with the real
      project name.

## Domains and cookies

The `app_session` / `SANCTUM_STATEFUL_DOMAINS` / `FRONTEND_URLS` defaults assume
`localhost:3000` + `localhost:8000`. Once you have real domains:

- [ ] `backend/.env`: `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URLS`,
      `APP_URL` (include the port if not 80/443).
- [ ] `frontend/.env.local`: `NEXT_PUBLIC_API_URL`.
- [ ] Rename `SESSION_COOKIE` / `NEXT_PUBLIC_SESSION_COOKIE` if you want something
      project-specific instead of the generic `app_session` — just keep both sides
      in sync (see [docs/authentication.md](./docs/authentication.md)).

See [docs/authentication.md](./docs/authentication.md#beyond-this-setup) if the
frontend and backend won't share a top-level domain at all — that changes the auth
approach, not just the env vars.

## Decide what to keep from the example content

A few things in this template are working examples, not stubs — decide per project
whether to rename-and-keep or delete them:

- `admin` role, `manage-users` permission, `/api/admin/users`,
  `frontend/src/app/admin/users` — a full example of a permission-gated
  feature. Fine as your actual admin area if you rename it; delete if you don't
  need one yet (see [docs/authorization.md](./docs/authorization.md)).
- `avatar` media collection on `User`, `AvatarController`, `AvatarUploader` —
  a full example of a file upload. Keep if you want user avatars; otherwise
  delete and follow the same pattern for whatever you actually need
  (see [docs/media.md](./docs/media.md)).
- `Post` model, `PostPolicy`, `/api/posts` — a full example of per-record
  ("can this user edit *this* record") authorization via a Laravel Policy.
  Delete `Post` and follow the same shape for whatever ownership-checked
  resource you actually need; keep the `Gate::before` admin bypass in
  `AppServiceProvider` regardless (see
  [docs/production-readiness.md](./docs/production-readiness.md)).
- Seeded `test@example.com` user in `DatabaseSeeder` — remove once you don't
  need a throwaway dev login.

## Local development

The backend runs in Docker via **Laravel Sail** (`backend/compose.yaml`):
PHP 8.4, MySQL 8.4, Redis, Mailpit. The frontend runs natively with Node.
See DECISIONS 027 for why and for the alternatives.

| Service | URL / port on your machine |
|---|---|
| API | http://localhost:8000 (`/up` = health check) |
| Mailpit (caught mail) | http://localhost:8025 |
| MySQL | `127.0.0.1:3307`, user `sail` / `password`, DBs `crm` + `testing` |
| Redis | `127.0.0.1:6379` |
| Frontend | http://localhost:3000 |

The ports are shifted (8000 rather than 80, 3307 rather than 3306) so the stack
can run while XAMPP's Apache/MySQL are also running.

### Option A — Docker (recommended)

Prerequisites: Docker Desktop (WSL2 backend, hardware virtualization enabled in
BIOS), Node 22+, Git Bash. A host PHP/Composer is needed only for the very first
`composer install`; after that everything runs in the container.

```bash
cd backend
composer install              # or: docker run --rm -v "$(pwd)":/app -w /app composer install --ignore-platform-reqs
cp .env.example .env
./sail up -d                  # first run builds the PHP 8.4 image (several minutes)
./sail artisan key:generate
./sail artisan migrate --seed
./sail artisan storage:link
./sail composer workers       # queue worker + log tail (leave running in its own terminal)

cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```

API changes (routes, FormRequests, Resources): run `./sail composer api:spec`, then
`npm run api:types` in `frontend/`, and commit `backend/openapi.json` and
`frontend/src/lib/api/schema.d.ts`; CI fails if they drift. API docs UI:
http://localhost:8000/docs/api.

Frontend checks (all must pass before a PR): `npm run typecheck && npm run lint &&
npm run format:check && npm run test && npm run build`. `npm run format` fixes
formatting. E2E: first run `npx playwright install chromium`, then `npm run e2e`.
It needs the Sail backend running and seeded, and reuses a running `npm run dev`.

Windows notes: set the user env var `PLAYWRIGHT_BROWSERS_PATH=D:\ms-playwright`
(or any non-system drive) before installing browsers, or they go to `C:`
(~300 MB per browser). Always run unit tests via `npm run test`, not bare
`npx vitest`: the launcher in `scripts/vitest.mjs` works around a drive-letter
casing bug.

`./sail` is a small wrapper at `backend/sail`. On Linux/macOS/WSL it calls
`vendor/bin/sail`. In Git Bash on Windows, where the vendor script refuses to
run, it calls `docker compose` instead. Before every PR: `./sail composer check` (Pint + Larastan + Pest; `./sail composer format`
fixes style). Useful commands: `./sail ps`,
`./sail logs -f`, `./sail test`, `./sail shell`, `./sail mysql`, `./sail down`
(add `-v` to wipe the DB volume).

Windows note: the repo can live on a normal drive (e.g. `D:\Projects\CRM`).
Bind-mount file access is slower than inside the WSL filesystem, but it's fine
for this project. Docker Desktop's disk image location is set in
Settings → Resources (we use `D:\Docker\wsl-data`).

### Option B — native PHP (e.g. a second machine on XAMPP/Herd)

Requires PHP ≥ 8.3 to run the app (Laravel 13). **PHP 8.4 is needed to run the
tests** once Pest 5 lands in step 0.3. You also need a MySQL-compatible
server. CI runs MySQL 8.4, so that is the reference: MariaDB mostly works, but
SQL/JSON differences surface there first.

1. Create databases `crm` and `testing`.
2. `cp .env.example .env`, then change: `DB_HOST=127.0.0.1`, `DB_USERNAME=root`,
   `DB_PASSWORD=` (yours), `REDIS_HOST=127.0.0.1`, `MAIL_HOST=127.0.0.1`.
   Without Redis, use `QUEUE_CONNECTION=database` and `CACHE_STORE=database`.
   Without Mailpit, use `MAIL_MAILER=log`.
3. `composer install && php artisan key:generate && php artisan migrate --seed && php artisan storage:link`
4. `composer dev` (API on :8000 + queue + logs). Tests use the `testing`
   database (`phpunit.xml`), so set its credentials via `DB_USERNAME`/`DB_PASSWORD`
   in `.env`.

Horizon (Phase 1.13) needs `pcntl`, which does not exist on Windows PHP. A
native Windows machine can run queues with `queue:listen`, but not the Horizon
dashboard.
