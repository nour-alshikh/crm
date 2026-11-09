# 07 — Testing

Rule: **no step is done without its tests passing in CI.** Every behavior change updates tests and docs in the same PR.

## Backend (Pest 5)

Setup (step 0.3): convert `tests/` to Pest, `RefreshDatabase` on MySQL (same engine as prod — SQLite hides collation/JSON/fulltext differences), parallel testing (`php artisan test --parallel`), Larastan, Pint.

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
