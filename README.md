# CRM

A decoupled app: a Laravel API (`backend/`) and a Next.js SPA (`frontend/`).

Starting a new project from this template? See [SETUP.md](./SETUP.md).

## Project plan

Start with [docs/PLAN.md](./docs/PLAN.md) (master step-by-step plan) and
[CLAUDE.md](./CLAUDE.md) (project rules). Plan docs:
[00 Overview](./docs/00-overview.md) ·
[01 Architecture](./docs/01-architecture.md) ·
[02 Database](./docs/02-database.md) ·
[03 API](./docs/03-api.md) ·
[04 Frontend](./docs/04-frontend.md) ·
[05 Integrations](./docs/05-integrations.md) ·
[06 Security](./docs/06-security.md) ·
[07 Testing](./docs/07-testing.md) ·
[08 Deployment](./docs/08-deployment.md) ·
[09 Design system](./docs/09-design-system.md) ·
[Decisions](./docs/DECISIONS.md) · [Risks](./docs/RISKS.md)

## Template docs (how the existing foundation works)

- [Authentication](./docs/authentication.md) — cookie-based SPA auth via Laravel
  Sanctum, how the frontend and backend talk to each other, running locally.
- [Password reset](./docs/password-reset.md) — forgot/reset password flow built on
  Laravel's password broker.
- [Authorization](./docs/authorization.md) — roles/permissions via
  spatie/laravel-permission, adding new ones, the frontend/backend enforcement
  boundary.
- [Media](./docs/media.md) — file uploads via spatie/laravel-medialibrary, currently
  wired up for user avatars.
- [API error handling](./docs/api-error-handling.md) — one consistent JSON error
  shape across the whole API, and why `APP_DEBUG` matters more than it looks like
  it should.
- [Production readiness](./docs/production-readiness.md) — per-record
  authorization via Policies, general API rate limiting, and moving off SQLite.
- [Data fetching](./docs/data-fetching.md) — TanStack Query for caching,
  dedup, and refetch-on-focus instead of hand-rolled `useEffect` fetching.
- [Forms](./docs/forms.md) — react-hook-form + zod instead of manual `useState`
  per field, with server-side validation errors rendered through the same path
  as client-side ones.
- [Layout](./docs/layout.md) — a shared header with a user menu and logout,
  instead of each page rendering its own nav.
- [UI components](./docs/ui-components.md) — shadcn/ui for Toast, DropdownMenu,
  and Form primitives layered on the existing react-hook-form + zod setup, plus
  what its init step broke and how it was fixed.
- [i18n](./docs/i18n.md) — translatable data fields (`TranslatableInput`,
  JSON columns keyed by locale) and translated dashboard UI strings, en/ar.
- [Theming](./docs/theming.md) — dark/light mode via `next-themes`, and
  keeping new components dark-mode-compatible for free via design tokens.

- [Deployment](./docs/deployment.md) — deploying backend and frontend
  separately, including the `BACKEND_URL` proxy mode for hosts like
  `*.vercel.app` that share no domain with the API.

## Quick start

Requires Docker Desktop + Node. Full setup, ports and the no-Docker alternative
are in [SETUP.md](./SETUP.md#local-development).

```bash
# backend (Docker/Sail: PHP 8.4, MySQL 8.4, Redis, Mailpit)
cd backend
composer install && cp .env.example .env
./sail up -d
./sail artisan key:generate && ./sail artisan migrate --seed

# frontend (separate terminal)
cd frontend
npm install && cp .env.example .env.local
npm run dev
```

API: http://localhost:8000 · App: http://localhost:3000 · Mailpit: http://localhost:8025.
Log in with the seeded `test@example.com` user (password `password`).
