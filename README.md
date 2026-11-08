# CRM

A decoupled app: a Laravel API (`backend/`) and a Next.js SPA (`frontend/`).

Starting a new project from this template? See [SETUP.md](./SETUP.md).

## Docs

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

```bash
# backend
cd backend
php artisan migrate --seed
php artisan serve --port=8000

# frontend (separate terminal)
cd frontend
npm run dev
```

Visit `http://localhost:3000/register` to create an account, or use the seeded
`test@example.com` user (role `user`).
