# 07 — Testing

Rule: **no step is done without its tests passing in CI.** Every behavior change updates tests and docs in the same PR.

## Backend (Pest 5)

Setup (step 0.3): convert `tests/` to Pest, `RefreshDatabase` on MySQL (same engine as prod — SQLite hides collation/JSON/fulltext differences), parallel testing (`php artisan test --parallel`, wired into CI in 0.6), Larastan, Pint.

**As built (0.3):**
- `composer check` = `lint` (Pint `--test`, Laravel preset + `declare_strict_types`) → `analyse` (Larastan level 6, pre-existing template issues frozen in `phpstan-baseline.neon`, which may only shrink) → `test` (Pest 5 / PHPUnit 13). Run it as `./sail composer check`; `composer format` fixes style.
- `tests/Pest.php`: Feature tests extend `Tests\TestCase` with `RefreshDatabase` on the MySQL `testing` DB. `spa()` sends the frontend's `Origin`/`Referer` so Sanctum starts a session, as the real SPA does (phpunit.xml pins `SANCTUM_STATEFUL_DOMAINS=localhost:3000`). Unit tests stay framework-free.
- CSRF is not exercised in tests: Laravel skips `PreventRequestForgery` while running unit tests. The CSRF behaviour is covered by manual/E2E checks (ADR-028).
- `tests/Arch.php` (own `Arch` testsuite in phpunit.xml): no debug functions, `App`/`Database` use strict types, no `env()` in classes, plus a file scan forbidding `env()` in `bootstrap/` and `routes/`.
- Current suites: `Feature/Auth` (login ok/fail/validation/throttle, `/user`, logout, password reset incl. no-enumeration), `Feature/Http/TrustedProxiesTest`.
- Local speed: the first test of a run rebuilds the schema (~30 s on an HDD-backed Docker disk; see ADR-029). After that, tests take ~0.3 s each.

### Layers
| Layer | What | Location |
|---|---|---|
| Unit | Services & actions with no HTTP: `PhoneNormalizer`, `EmailNormalizer`, `DuplicateDetector`, `RoundRobinAssigner` (incl. concurrency), `MoneyCalculator` (quote totals, tax, discounts, rounding), `ThreadResolver`, signature verifiers, `Visibility` builder SQL | `tests/Unit` |
| Feature — API | Every endpoint: happy path, validation (422 shape), authorization (per role), visibility (cross-user/team leakage), pagination/filter/sort, resource JSON shape (`assertJsonStructure` + snapshot of keys) | `tests/Feature/<Module>/` |
| Feature — jobs/webhooks | Webhook endpoints with fixture payloads (`tests/Fixtures/meta/*.json`, `postmark/*.json`), signature valid/invalid, dedupe, job processing with `Http::fake()` for Graph API / WA / Postmark | `tests/Feature/Integrations/` |
| Feature — broadcast | `Event::fake()` / `Broadcast` assertions that events dispatch on correct private channels; channel auth tests per role | `tests/Feature/Realtime/` |
| Architecture | Pest arch tests: controllers don't use `DB::`/models' `query()` without `visibleTo`; no `dd`/`dump`; `App\Actions` final; Requests extend FormRequest; no `env()` outside config | `tests/Arch.php` |
| Security | Route authorization audit (every `/api/v1` route has auth + permission/policy); mass-assignment; CSV injection escaping | `tests/Feature/Security/` |

### Per-role matrix pattern
```php
// tests/Datasets/roles.php
dataset('roles', ['admin', 'manager', 'rep', 'support']);

it('lists leads according to visibility', function (string $role, int $expectedCount) {
    [$me, $world] = makeVisibilityWorld($role); // own lead, teammate lead, other-team lead, customer
    actingAs($me)->getJson('/api/v1/leads')->assertOk()->assertJsonCount($expectedCount, 'data');
})->with([
    ['admin', 3], ['manager', 2], ['rep', 1], ['support', 0],
]);
```
`makeVisibilityWorld()` helper (step 1.3) builds a fixed world used by every module's visibility tests. Each module adds: list, show (200 vs 404), update (200 vs 403/404), delete, assign, export — × 4 roles.

### Coverage target
Backend line coverage ≥ 80% overall, **100% of Policies, Visibility, Actions** (enforced via `--min` in CI for the whole suite; per-folder reviewed in PR).

## Frontend

| Tool | Scope |
|---|---|
| `tsc --noEmit` | strict types incl. generated API types |
| ESLint | Next config + RTL physical-class ban + no literal strings + no color literals |
| Vitest + Testing Library + MSW | utilities (`format`, money, table URL params), hooks with mocked API, components with logic (StatusPill mapping, Kanban reorder, LostReasonDialog flow, applyServerErrors) |
| Playwright | E2E against real Laravel (Sail in CI) seeded with `E2ESeeder` |

**As built (0.4):**
- Scripts: `typecheck` (tsc), `lint` (ESLint), `format` / `format:check` (Prettier 3, `printWidth` 100, Tailwind class sorting via `prettier-plugin-tailwindcss` with `cn`/`cva`), `test` / `test:watch` (Vitest 5 + jsdom), `e2e` (Playwright, chromium).
- Vitest: `vitest.config.mts` + `vitest.setup.ts` (jest-dom matchers, RTL cleanup, MSW server, cookie/localStorage reset). MSW is strict: an unhandled request fails the test (`onUnhandledFrame: "error"`, the MSW 3 name). Register handlers per test with `server.use(...)` and `apiUrl()` from `src/test/msw-server.ts`. Tests live next to code as `*.test.ts(x)` under `src/`.
- No `@vitejs/plugin-react`: Vite compiles TSX itself (ADR-030).
- Tests for react-hook-form state must read `formState.errors` inside the hook, like real forms do, or RHF won't re-render.
- Playwright: `playwright.config.ts`, specs in `e2e/`. Locally it reuses `npm run dev`; with `CI` set it runs the production build. `e2e/auth.spec.ts` (guest redirect, login, wrong credentials) is skipped in CI until 0.6 sets `E2E_BACKEND=1`. `expect` timeout is 30 s because local Docker sits on an HDD.

### Playwright critical flows (must stay green)
1. **Login** (ar + en) → dashboard shows; logout.
2. **Create lead** manually → duplicate warning appears for existing phone → save → appears in list with correct owner (round-robin).
3. **Convert lead** → contact + company + deal created → redirected to deal; lead status converted.
4. **Move deal stage** on Kanban by drag (and keyboard) → persists after reload; drag to Lost requires reason.
5. **Task**: create with reminder → complete from tasks page.
6. **Permissions**: rep cannot see teammate's lead (direct URL → not found page); support sees customer read-only.
7. **Reply in inbox** (Phase 3): seeded conversation, send text inside window → message shows "sent" (WA API faked by `FakeWhatsAppClient` bound in `testing` env); outside window composer only offers templates.
8. **Import** (Phase 2): upload fixture CSV → progress → error report downloadable.
9. **Quote** (Phase 4): create from deal → PDF downloads (ar) → send.
10. **RTL smoke**: visit each main page in `/ar`, assert `dir=rtl`, take screenshots (visual diff on main pages with `toHaveScreenshot`, threshold 0.2%).

## CI pipeline (GitHub Actions)

`.github/workflows/ci.yml`, triggered on PR + push to `main`:

```
jobs:
  backend:
    services: mysql:8.4, redis:7
    steps: checkout → setup-php 8.3/8.4 (matrix optional) → composer install (cache) →
           pint --test → phpstan (larastan) → php artisan test --parallel --coverage --min=80 →
           composer audit → scramble export → upload openapi.json artifact
  frontend:
    needs: backend (for openapi.json)
    steps: checkout → node 22 → npm ci (cache) → api:types → git diff --exit-code src/lib/api/schema.d.ts →
           lint → typecheck → vitest run → next build → npm audit --omit=dev (warn)
  e2e:
    needs: [backend, frontend]
    steps: docker compose (Sail) up → migrate --seed --class=E2ESeeder → next build && start →
           npx playwright test (chromium; firefox nightly) → upload report/traces on failure
```

Branch protection on `main`: all jobs green + up-to-date branch. Nightly workflow: full Playwright (chromium + webkit), `composer outdated`, backup restore test on staging (Phase 5).
