# CLAUDE.md — CRM project rules

Internal single-tenant CRM (Arabic/English, RTL/LTR). Monorepo: `backend/` (Laravel 13 API), `frontend/` (Next.js 16), `mobile/` (Expo, Phase 6), `docs/`.

**Before any work:** read `docs/PLAN.md` (find the current step), `docs/DECISIONS.md`, and the doc for the area you touch (`01`–`09`). Work one PLAN step per branch/PR. Don't start a step whose dependencies aren't done.

## Golden rules
1. **Always update docs when changing behavior** — the relevant `docs/0x-*.md`, `PLAN.md` checklist, and a `DECISIONS.md` entry for any non-obvious choice (with rejected alternative).
2. **No step is done without tests** (see Testing). CI must be green.
3. **Every list/search/report/export/timeline/channel query uses `->visibleTo($user)`.** Never check role names in code — check permissions (`$user->can('leads.assign')`) or Policies.
4. **No hard-coded user-facing strings** (frontend messages in `src/messages/{ar,en}.json`, backend in `lang/{ar,en}`). Lookup values come from DB `name_ar`/`name_en`.
5. **Logical CSS only** (`ms-/me-/ps-/pe-/start-/end-/text-start`). No `ml-/mr-/left-/right-/text-left`. Directional icons via `<DirIcon>`.
6. **No color literals** in components — tokens from `docs/09-design-system.md` only. Stage/tag colors are palette keys.
7. **Money = integer minor units + currency.** Never floats.
8. Ask before adding a dependency not listed in the docs.
9. Next.js 16 differs from older versions — read `frontend/node_modules/next/dist/docs/` before using an API (`frontend/AGENTS.md`).

## Backend conventions (Laravel)
- Routes: `/api/v1/*` in `routes/api.php`; webhooks in `routes/webhooks.php`. Every v1 route: `auth:sanctum` + `permission:` middleware or `can:` Policy (the route audit test enforces this).
- Structure per module: migration → enum(s) `app/Enums` → model (`HasVisibilityScope`, `SoftDeletes`, `LogsActivity` when audited, `HasCustomFields`/`Taggable` if applicable) → Policy → FormRequests `app/Http/Requests/V1/<Module>/{Index,Store,Update}<Model>Request` → Resource `app/Http/Resources/V1/<Model>Resource` (includes `can` block) → Controller `app/Http/Controllers/Api/V1/<Model>Controller` (thin) → business logic in `app/Actions/<Module>/<Verb><Noun>.php` (final, single `handle()`), reusable logic in `app/Services`.
- All input through FormRequests; all output through API Resources. No `$request->all()` into models.
- Filtering/sorting via spatie/laravel-query-builder with explicit whitelists.
- Errors: throw `DomainException` subclasses for business rules → `{message, code: "domain_error"}`; never return ad-hoc error arrays.
- Side effects (mail, webhooks processing, imports, notifications, external APIs) are **queued** on the right queue (`webhooks|default|notifications|mail|imports`). Jobs are idempotent.
- Realtime events implement `ShouldBroadcast`, use private channels from `routes/channels.php`, call `->toOthers()` for user-initiated changes.
- Naming: tables plural snake, models singular Pascal, enum cases Pascal with snake string values, permissions `entity.action` (`leads.view_team`).
- Migrations are expand/contract safe (no rename/drop of in-use columns in the same release).
- After changing requests/resources/routes: `composer api:spec` then in `frontend/` `npm run api:types`; commit both.
- Quality: `composer check` (Pint, Larastan, Pest) must pass.

## Frontend conventions (Next.js)
- Routes under `src/app/[locale]/(app)/…` / `(auth)`. Feature code in `src/features/<module>/{api.ts,schema.ts,columns.tsx,components/}`.
- API calls only through the typed client `src/lib/api/client.ts` (openapi-fetch). Types come from generated `schema.d.ts` — never hand-write response types.
- Server state = TanStack Query (keys from `src/lib/api/query-keys.ts`). Table/filter state in URL params. No global state library.
- Forms = react-hook-form + zod; server 422 → `applyServerErrors`.
- UI from `src/components/ui` (shadcn, token-styled) and `src/components/crm`; add new shared components to the design-system §8 table and `/dev/design`.
- Formatting only via `src/lib/format.ts` (Intl, Western digits, company timezone).
- Hide actions with the resource `can` block / `usePermission`, but never rely on the UI for security.
- Check every screen in `/ar` and `/en`, light and dark.
- Quality: `npm run lint && npm run typecheck && npm run test` must pass.

## API response format
- Success: `{ "data": … }`, lists add `meta` + `links`. Errors: `{ "message", "code", "errors"? }` (codes in `docs/03-api.md`).
- Dates ISO 8601 UTC. Money `{amount_minor, currency}`. Lookups include `name`, `name_ar`, `name_en`.

## Testing requirements
- Backend (Pest): every endpoint gets happy path, validation, and **per-role authorization + visibility** tests using `tests/Datasets/roles.php` and `makeVisibilityWorld()`. Unit tests for every Action/Service. Webhooks tested with fixture payloads and faked HTTP. Tests run on MySQL.
- Frontend: Vitest for utilities/hooks/components with logic; Playwright for the critical flows in `docs/07-testing.md` (keep them green).
- Bug fix = failing test first.

## Git & commits
- Branch per PLAN step: `step/2.3-leads-api`. PR title `[2.3] Leads API (CRUD, dedupe)`; PR body lists acceptance criteria checked + AR/EN screenshots for UI.
- Conventional Commits: `feat(leads): add duplicate detection`, `fix(deals): …`, `docs: …`, `test: …`, `chore: …`, `refactor: …`. Small commits per sub-task.
- Never commit `.env`, secrets, or generated build output (generated `openapi.json`/`schema.d.ts` ARE committed).
- Tick the step in `docs/PLAN.md` checklist in the PR that completes it.
