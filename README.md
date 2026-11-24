# CRM

An internal CRM for a software company (~30 staff: sales reps, sales managers, admins and support).
It collects leads from every channel, moves them through a configurable pipeline to won or lost, and hands won customers over to support. Arabic and English, with full RTL/LTR support.

> **Status:** in active development. Phase 0 (toolchain, design system, CI, API v1) is done, and Phase 1 (auth, roles, i18n, app shell, settings) is in progress. See the [plan](docs/PLAN.md).

<!-- Add 2–3 screenshots here once the app shell is ready (e.g. leads table, deal Kanban, Arabic RTL view). -->

## What it will do

**MVP**
- Auth, roles and permissions, with record-level visibility rules per role
- Leads with de-duplication, round-robin assignment, CSV/Excel import and export, and convert-to-deal
- Contacts, companies, and deals on a Kanban board
- Configurable pipelines and stages, lead sources, lost reasons, tags and custom fields
- Activities, tasks and reminders, in-app notifications, audit log

**After the MVP**
- Shared inbox for WhatsApp and email
- Facebook Lead Ads and website form integrations
- Quotes with Arabic/English PDF
- Dashboard and reports
- Expo mobile app on the same `/api/v1`

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Laravel 13 (PHP 8.4), Sanctum SPA cookie auth, spatie/laravel-permission, spatie/laravel-medialibrary, Scramble (OpenAPI) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, react-hook-form + zod |
| Data | MySQL 8.4, Redis |
| Quality | Pest, Larastan, Pint, Vitest, Playwright, GitHub Actions CI |
| Local dev | Docker via Laravel Sail (PHP, MySQL, Redis, Mailpit) |

## Architecture at a glance

```
Next.js SPA  ──(same-origin rewrite proxy)──▶  Laravel API /api/v1
   │                                              │
   ├─ TanStack Query (cache, refetch)            ├─ Sanctum cookie auth
   ├─ typed API client (from OpenAPI)            ├─ Policies + roles/permissions   
   └─ i18n (ar/en, RTL/LTR)                      └─ one JSON error envelope for every error
```

## Key decisions

Decisions are recorded ADR-style in [docs/DECISIONS.md](docs/DECISIONS.md). A few of them:

- **Cookie-based SPA auth (Sanctum) behind a same-origin proxy** with httpOnly session cookies instead of tokens kept in localStorage.
- **One consistent JSON error envelope** for the whole API, so the frontend handles every error the same way.
- **Typed client generated from OpenAPI (Scramble)**, so the frontend and backend contracts can't silently drift apart.
- **Built in small planned steps.** Each step in the plan has a goal, files, commands and acceptance criteria, and ships as its own PR.

## Run it locally

Requires Docker Desktop and Node. Full setup, ports and the no-Docker alternative are in [SETUP.md](SETUP.md).

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

API: http://localhost:8000 · App: http://localhost:3000 · Mailpit: http://localhost:8025
Log in with the seeded `test@example.com` user (password `password`).

## Documentation

**Project plan:** start with [docs/PLAN.md](docs/PLAN.md) (step-by-step plan).
[00 Overview](docs/00-overview.md) · [01 Architecture](docs/01-architecture.md) · [02 Database](docs/02-database.md) · [03 API](docs/03-api.md) · [04 Frontend](docs/04-frontend.md) · [05 Integrations](docs/05-integrations.md) · [06 Security](docs/06-security.md) · [07 Testing](docs/07-testing.md) · [08 Deployment](docs/08-deployment.md) · [09 Design system](docs/09-design-system.md) · [Decisions](docs/DECISIONS.md) · [Risks](docs/RISKS.md)

**How the foundation works:**
- [Authentication](docs/authentication.md): cookie-based SPA auth via Sanctum and how the frontend and backend talk to each other
- [Password reset](docs/password-reset.md): forgot/reset flow on Laravel's password broker
- [Authorization](docs/authorization.md): roles and permissions, and where the frontend/backend boundary sits
- [Media](docs/media.md): file uploads via medialibrary
- [API error handling](docs/api-error-handling.md): the shared JSON error shape
- [Production readiness](docs/production-readiness.md): policies, rate limiting, moving off SQLite
- [Data fetching](docs/data-fetching.md): TanStack Query instead of hand-rolled `useEffect` fetching
- [Forms](docs/forms.md): react-hook-form + zod, with server errors on the same path as client errors
- [Layout](docs/layout.md) · [UI components](docs/ui-components.md) · [i18n](docs/i18n.md) · [Theming](docs/theming.md) · [Deployment](docs/deployment.md)
