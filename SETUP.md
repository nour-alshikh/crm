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

## Bootstrap

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link

cd ../frontend
npm install
cp .env.example .env.local
```
