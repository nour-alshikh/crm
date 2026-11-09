# 06 — Security

## Roles → permissions

Permissions are the only thing code checks (`$user->can('leads.assign')`, `@can`, `permission:` middleware, Policies). Roles are just bundles seeded by `RolePermissionSeeder` and editable in Settings → Roles (except `admin`, which also gets `Gate::before` bypass — existing template pattern).

| Permission | Admin | Sales Manager | Sales Rep | Support |
|---|:-:|:-:|:-:|:-:|
| **Settings & admin** | | | | |
| users.manage, teams.manage, roles.manage | ✓ | | | |
| settings.manage (pipelines, sources, lost reasons, tags, custom fields, currencies, company) | ✓ | | | |
| products.manage, templates.manage | ✓ | ✓ | | |
| integrations.manage, webhooks.manage | ✓ | | | |
| audit.view | ✓ | ✓ (own team records) | | |
| **Leads** | | | | |
| leads.view_all | ✓ | | | |
| leads.view_team | ✓ | ✓ | | |
| leads.view_own | ✓ | ✓ | ✓ | |
| leads.create | ✓ | ✓ | ✓ | |
| leads.update (visible) | ✓ | ✓ | ✓ (own) | |
| leads.delete | ✓ | ✓ | | |
| leads.assign (incl. bulk) | ✓ | ✓ (within team) | | |
| leads.convert | ✓ | ✓ | ✓ (own) | |
| leads.import, leads.export | ✓ | ✓ | | |
| **Contacts / Companies** | | | | |
| contacts.view_all / companies.view_all | ✓ | | | |
| contacts.view_team / companies.view_team | ✓ | ✓ | | |
| contacts.view_own / companies.view_own | ✓ | ✓ | ✓ | |
| customers.view (is_customer records + their deals, read-only) | ✓ | ✓ | | ✓ |
| contacts.create/update, companies.create/update | ✓ | ✓ | ✓ (own) | |
| contacts.delete, companies.delete | ✓ | ✓ | | |
| contacts.assign, companies.assign | ✓ | ✓ | | |
| contacts.export, companies.export | ✓ | ✓ | | |
| **Deals** | | | | |
| deals.view_all / view_team / view_own | ✓/✓/✓ | –/✓/✓ | –/–/✓ | |
| deals.create, deals.update | ✓ | ✓ | ✓ (own) | |
| deals.delete | ✓ | ✓ | | |
| deals.reassign | ✓ | ✓ (within team) | | |
| deals.export | ✓ | ✓ | | |
| **Activities & tasks** | | | | |
| activities.create (on visible records) | ✓ | ✓ | ✓ | notes only on customers |
| activities.manage (edit/delete others') | ✓ | ✓ | | |
| tasks.view_all / view_team / view_own | ✓/✓/✓ | –/✓/✓ | –/–/✓ | –/–/✓ |
| tasks.create | ✓ | ✓ | ✓ | ✓ |
| tasks.assign_others | ✓ | ✓ | | |
| **Inbox, quotes, reports** | | | | |
| inbox.view (visible conversations), inbox.reply | ✓ | ✓ | ✓ (own) | view customers' |
| quotes.create, quotes.send | ✓ | ✓ | ✓ (own deals) | |
| reports.view_all | ✓ | | | |
| reports.view_team | ✓ | ✓ | | |
| reports.export | ✓ | ✓ | | |

"(own)" and "(within team)" are enforced by Policies + visibility scope, not by extra permissions.

## Data visibility rules (`VisibleTo` scope)

`Model::query()->visibleTo($user)` — the **only** way list/search/report/export queries start. Implemented in `App\Support\Visibility` and the `HasVisibilityScope` trait:

```
if user.can('{entity}.view_all')           → no constraint
else OR-group of:
  user.can('{entity}.view_team') && team_id = user.team_id
  user.can('{entity}.view_own')  && assigned_to = user.id
  [contacts/companies] exists deal where assigned_to = user.id (ADR-009)
  [activities/tasks/conversations] subject visible to user (join-based), or assigned_to = user.id
  user.can('customers.view') && is_customer = true      (contacts/companies; deals of customers)
if none apply → where 1=0
```

- Policies' `view/update/delete` call the same scope (`Model::visibleTo($user)->whereKey($id)->exists()`) — one source of truth; no duplicated logic.
- Managers assigning within team: `LeadPolicy@assign` checks target user `team_id` = manager's team.
- Route-model binding returns 404 (not 403) for records outside visibility to avoid ID enumeration (`resolveRouteBinding` uses `visibleTo` for `/api/v1` routes).
- Exports, reports, global search, timeline, `/lookup/phone`, broadcasting channel auth — all use `visibleTo` and have a test proving a rep can't see another rep's data.
- Jobs run without a user: system context explicitly bypasses (`Visibility::system()`), never implicitly.

## Endpoint authorization

Every route in `03-api.md` lists its permission/policy. Enforced by:
1. A **route audit test** (`tests/Feature/Security/RouteAuthorizationTest.php`) iterating `Route::getRoutes()` under `api/v1` asserting each has `auth:sanctum` and either a `permission:`/`can:` middleware or is on an explicit allowlist (e.g. `/me`).
2. Per-module role datasets: every endpoint × every role → expected status (200/403/404). See `07-testing.md`.

## Authentication hardening

- Passwords: Laravel default bcrypt/argon2id, min 10 chars + `Password::uncompromised()`.
- Login throttle 5/min per email+IP; generic error message.
- Session: Redis driver, `http_only`, `secure` in prod, `same_site=lax`, regenerated on login, invalidated on logout and on deactivation (delete sessions by user id) and password change (other sessions).
- Deactivated users: middleware rejects on every request; tokens revoked.
- Optional TOTP 2FA for admins (Phase 5, Laravel Fortify's 2FA actions or `pragmarx/google2fa`).
- Registration route removed.

## CORS / CSRF

- Web goes through Next.js rewrites → **same origin** → no CORS needed for the web app. `config/cors.php` allows only `FRONTEND_URLS` (kept for local direct mode) with `supports_credentials=true`.
- CSRF: Sanctum stateful requests require `X-XSRF-TOKEN` (existing). `SANCTUM_STATEFUL_DOMAINS` = web domain(s) only.
- Mobile: Bearer tokens, not stateful → no CSRF; CORS irrelevant for native.
- Webhooks: outside `web`/`api` stateful middleware; no CSRF; signature-verified.
- Public form: CORS per form key's `allowed_origins`.

## Secrets handling

- `.env` never committed; `.env.example` lists every key (see `08-deployment.md`).
- Integration credentials entered in UI → `integration_settings.value` with Laravel `encrypted` cast (APP_KEY). **APP_KEY rotation** procedure documented (use `APP_PREVIOUS_KEYS`).
- API responses never return secrets (masked `••••abcd`); audit log excludes secret values (`$logExcept`).
- Form keys & tokens stored hashed (SHA-256), shown once.
- Forge stores env; staging and prod have different Meta apps/tokens.
- Dependabot/Renovate for composer + npm; `composer audit` and `npm audit --omit=dev` in CI.

## Webhook signature verification

| Provider | Method |
|---|---|
| Meta (FB + WA) | `X-Hub-Signature-256: sha256=<hex>` = HMAC-SHA256(app_secret, raw request body); `hash_equals`; GET verify via `hub.verify_token` |
| Postmark | HTTPS + Basic auth credentials embedded in webhook URL + source IP allowlist (Postmark publishes ranges) |
| Website form | `X-Form-Key` hashed lookup + origin allowlist + honeypot + rate limit (+ Turnstile) |

Invalid signatures: 401, counted (metric/log at warning), payload **not** stored (prevents log flooding).

## Rate limiting

Defined in `AppServiceProvider::boot` (`RateLimiter::for`): `api` 120/min/user, `auth` 5/min/email+IP, `exports` 5/h/user, `imports` 10/h/user, `webhooks` 600/min/IP, `public-form` 10/min/IP + 1000/day/key, `messages` 30/min/user (outbound WA/email — protects WABA quality rating).

## Input/output safety

- All input via FormRequests; mass assignment via `$fillable` only.
- Inbound email HTML sanitized server-side; rendered in sandboxed iframe (`sandbox` without `allow-scripts`).
- File uploads: mime + extension allowlist (pdf, images, office docs, csv/xlsx), max size, stored on private disk, served via signed temporary URLs; no execution path.
- CSV export: prefix cells starting with `= + - @` with `'` (formula injection).
- Raw SQL only with bindings; reports use query builder.

## Audit logging

- spatie/laravel-activitylog on: Lead, Contact, Company, Deal, Task, Quote, User (role/team/active changes), PipelineStage, IntegrationSetting (key only, value excluded), Role permission sync.
- Logged: causer, event, changed attributes (old → new), IP & user agent (via `tapActivity`), request id.
- Business timeline (`activities`) is separate and user-facing; audit is in Settings → Audit and on each record's "History" tab.
- Retention: 2 years, pruned by scheduled `activitylog:clean`.

## Backups

- **spatie/laravel-backup**: DB dump hourly (keep 48h), daily full (DB + `storage/app/private`) kept 30 days, weekly 12 weeks; to off-site S3-compatible storage (Backblaze B2 / Hetzner Storage Box / Wasabi), encrypted archive (`BACKUP_ARCHIVE_PASSWORD`).
- `backup:monitor` daily; failure → email + Slack/Telegram.
- **Restore drill** each quarter onto staging (documented in `08-deployment.md`).
- Forge server snapshots weekly (provider-level) as second layer.

## Privacy

- Data export for a contact (JSON/xlsx) and hard-delete after soft-delete grace (30 days) by admin — Phase 5.
- PII in logs avoided: webhook payloads stored only in `webhook_logs` (access controlled, pruned), not app logs; Sentry `send_default_pii=false` with scrubbing of phone/email.
