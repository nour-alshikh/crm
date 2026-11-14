# 03 — API

Base: `/api/v1` (web through Next rewrite at same origin; mobile direct to `api.crm.<co>`). Webhooks: `/webhooks/*`. OpenAPI: `GET /docs/api.json` (Scramble), UI at `/docs/api` (local/staging only, admin in prod). The committed spec is `backend/openapi.json` (`composer api:spec`); the frontend generates `src/lib/api/schema.d.ts` from it (`npm run api:types`). CI fails if either drifts.

## Conventions

- **Auth:** `auth:sanctum` (session cookie or Bearer token). Every route also has a permission middleware or Policy.
- **Locale:** `Accept-Language: ar|en` (web sends it from route locale; mobile from device). `SetLocale` middleware (existing) → translated validation messages & `name` resolution. Lookups always return both `name_ar` and `name_en` **plus** `name` (current locale) for convenience.
- **Success:** `{ "data": … }`; lists add `meta` + `links` (Laravel paginator).
- **Errors (existing `ApiExceptionRenderer`, extended):**
  ```json
  { "message": "The given data was invalid.", "code": "validation_failed", "errors": { "email": ["…"] } }
  ```
  `code` values: `unauthenticated` 401, `forbidden` 403, `not_found` 404, `method_not_allowed` 405, `validation_failed` 422, `conflict` 409 (stale `lock_version`, duplicate), `csrf_mismatch` 419, `rate_limited` 429, `domain_error` 422 (business rule, e.g. "lost reason required"; throw an `App\Exceptions\DomainException` subclass), `http_error` (other 4xx), `server_error` 500. Messages translated (`lang/{en,ar}/errors.php`). Details: `docs/api-error-handling.md`.
- **Pagination:** `?page=1&per_page=25` (max 100). Kanban + mobile infinite lists: `?cursor=` (cursor pagination) on `/deals/board` and `/conversations`, `/activities`.
- **Filtering:** `filter[status]=new,contacted&filter[assigned_to]=me|12&filter[source]=facebook&filter[created_between]=2026-01-01,2026-01-31&filter[q]=ahmad&filter[tag]=vip&filter[cf.industry]=bank` — implemented with **spatie/laravel-query-builder** (allowed filters/sorts whitelisted per controller).
- **Sorting:** `?sort=-created_at,name`.
- **Includes:** `?include=company,assignee,tags` (whitelisted).
- **Sparse fields:** not supported (YAGNI).
- **Writes** return the full resource. Deletes return 204.
- **Idempotency:** `POST` on leads/quotes accepts `Idempotency-Key` header (mobile retries) → cached 24h in Redis.
- **Optimistic locking:** deal updates/moves send `lock_version`; mismatch → 409 with current resource.
- **Dates:** ISO 8601 UTC in/out (`2026-11-09T08:30:00Z`); date-only fields `YYYY-MM-DD`.
- **Money:** `{ "amount_minor": 1250000, "currency": "SAR" }`; resources also expose `amount_formatted` per locale.
- **Rate limits:** `api` 120/min per user; `auth` 5/min per email+IP; `exports` 5/hour per user; `webhooks` 600/min per provider IP; `public-form` 10/min per IP + 1000/day per key.
- **Realtime:** mutating requests honor `X-Socket-ID` so broadcasts skip the sender.

## Endpoints

Permission column: `perm:` = permission middleware; `policy:` = Policy ability (which itself uses permissions + visibility); `—` = any authenticated user.

### Auth & me
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/sanctum/csrf-cookie` | public | (outside v1) |
| POST | `/auth/login` | public, throttle auth | `{email,password,remember}` → user + permissions |
| POST | `/auth/logout` | — | |
| POST | `/auth/forgot-password`, `/auth/reset-password` | public | existing controllers moved |
| POST | `/auth/token` | public, throttle | mobile: `{email,password,device_name}` → `{token,user}` |
| DELETE | `/auth/token` | token | revoke current |
| GET | `/me` | — | user, roles, permissions[], team, preferences, unread counts |
| PATCH | `/me` | — | name, phone, locale, timezone, preferences |
| PATCH | `/me/password` | — | current + new |
| POST/DELETE | `/me/avatar` | — | existing |
| PATCH | `/me/away` | — | toggle `is_away` |
| GET/DELETE | `/me/tokens[/{id}]` | — | list/revoke devices |
| POST/DELETE | `/devices[/{token}]` | — | push tokens (Phase 6) |

Registration endpoint **removed** (internal app; admins create users).

### Users, teams, roles (Settings)
| Method | Path | Permission |
|---|---|---|
| GET | `/users` | perm:users.manage (full) — `/users/options` for pickers: `—` (id, name, avatar, team, active) |
| POST/PATCH | `/users[/{user}]` | perm:users.manage — invite email with set-password link |
| POST | `/users/{user}/deactivate`, `/activate` | perm:users.manage — deactivate offers reassign-all |
| POST | `/users/{user}/reassign-records` | perm:users.manage `{to_user_id, entities[]}` queued |
| CRUD | `/teams` | perm:teams.manage |
| GET/PATCH | `/teams/{team}/assignment-rule` | perm:teams.manage |
| GET | `/roles`, `/permissions` | perm:roles.manage |
| PATCH | `/roles/{role}` | perm:roles.manage (sync permissions; system roles cannot be deleted) |

### Lookups & config
| Method | Path | Permission |
|---|---|---|
| GET | `/lookups` | — one call: lead_sources, lost_reasons, pipelines+stages, currencies, tags, custom_fields, enums (statuses w/ labels). ETag cached |
| CRUD | `/lead-sources`, `/lost-reasons`, `/tags`, `/currencies` | perm:settings.manage (tags create: `—`) |
| CRUD | `/pipelines`, `/pipelines/{p}/stages` | perm:settings.manage |
| PATCH | `/pipelines/{p}/stages/reorder` | perm:settings.manage `{ids:[…]}` |
| CRUD | `/custom-fields` | perm:settings.manage |
| GET/PATCH | `/settings/company` | read `—`, write perm:settings.manage (name, timezone, default currency, default country, working days) |
| CRUD | `/saved-views` | — own; shared visible to all |

### Leads
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/leads` | policy:viewAny + `visibleTo` scope | filters: status, source, assigned_to, team, tag, created_between, q, duplicates_only, cf.* ; sort: created_at, last_activity_at, name |
| POST | `/leads` | perm:leads.create | runs dedupe → response includes `duplicates: [{type,id,name,match:"phone"}]`; auto-assign if `assigned_to` omitted and rule active |
| GET | `/leads/{lead}` | policy:view | includes custom fields, tags, duplicates |
| PATCH | `/leads/{lead}` | policy:update | |
| DELETE | `/leads/{lead}` | policy:delete (perm:leads.delete) | soft |
| POST | `/leads/{lead}/assign` | perm:leads.assign | `{user_id}` |
| POST | `/leads/bulk` | perm:leads.assign / leads.delete | `{ids[], action: assign|status|delete|tag, payload}` max 500, queued if >100 |
| POST | `/leads/{lead}/convert` | policy:convert | `{contact:{…}|contact_id, company:{…}|company_id|null, deal:{title,pipeline_id,stage_id,amount_minor,currency,expected_close_date}|null}` → single DB transaction, returns `{contact,company,deal}` |
| POST | `/leads/{lead}/mark-duplicate` | policy:update | `{of_lead_id|of_contact_id}` |
| GET | `/leads/check-duplicates?phone=&email=` | perm:leads.create | live check while typing |
| POST | `/imports` | perm:leads.import | multipart file (csv/xlsx ≤ 10 MB, ≤ 20k rows) → `{id, headers[], sample_rows[]}` |
| PATCH | `/imports/{import}` | owner | `{mapping, options}` then `POST /imports/{import}/start` |
| GET | `/imports/{import}` | owner/admin | progress; `error_report_url` when done |
| POST | `/leads/export` | perm:leads.export | same filters → queued → notification with download link (signed, 24h) |

### Contacts & companies
| Method | Path | Permission |
|---|---|---|
| CRUD | `/contacts` | policies; filters: company, assigned_to, tag, is_customer, q, cf.* |
| CRUD | `/companies` | policies |
| GET | `/contacts/{c}/timeline`, `/companies/{c}/timeline`, `/leads/{l}/timeline`, `/deals/{d}/timeline` | policy:view; cursor; merges activities, messages (Phase 3), stage changes, tasks completed; `?types=call,note` |
| POST | `/contacts/{c}/assign`, `/companies/{c}/assign` | perm:contacts.assign |
| POST | `/contacts/export`, `/companies/export` | perm:*.export |
| GET/POST/DELETE | `/{entity}/{id}/attachments` | policy:update (support: view only) |

### Deals & pipeline
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/deals` | visibleTo | list view; filters: pipeline, stage, status, assigned_to, team, close_between, amount range, q |
| GET | `/deals/board?pipeline_id=` | visibleTo | `{stages:[{id, totals:{count, amount_minor_default, weighted_minor_default}, deals:[…first 50], next_cursor}]}`; `GET /deals/board/stages/{stage}?cursor=` for more |
| POST | `/deals` | perm:deals.create | |
| GET/PATCH/DELETE | `/deals/{deal}` | policies; PATCH requires `lock_version` |
| POST | `/deals/{deal}/move` | policy:update | `{stage_id, position_after_id|null, lock_version, lost_reason_id?, lost_note?}`; moving to `lost` without reason → 422 `domain_error`; to won → sets closed_at, marks contact/company `is_customer`; writes stage history + activity; broadcasts `DealMoved` |
| POST | `/deals/{deal}/reopen` | policy:update | |
| POST | `/deals/{deal}/assign` | perm:deals.reassign | |
| GET | `/deals/{deal}/stage-history` | policy:view | |
| CRUD | `/deals/{deal}/products` | policy:update (Phase 4) | recalculates `amount_minor` if `amount_from_products` |
| POST | `/deals/export` | perm:deals.export | |

### Activities & tasks
| Method | Path | Permission |
|---|---|---|
| POST | `/activities` | policy:create on subject (`subject_type`, `subject_id`) — support may only create `note` on customers |
| PATCH/DELETE | `/activities/{a}` | author within 24h, or perm:activities.manage |
| GET | `/tasks` | visibleTo; views: `filter[view]=mine|today|overdue|upcoming|completed`, `filter[taskable]=deal:12` |
| POST | `/tasks` | perm:tasks.create; assigning to others needs tasks.assign_others |
| PATCH/DELETE | `/tasks/{t}` | policy |
| POST | `/tasks/{t}/complete`, `/reopen` | policy:update |

### Notifications & search
| Method | Path | Permission |
|---|---|---|
| GET | `/notifications?filter[unread]=1` | — own |
| POST | `/notifications/{id}/read`, `/notifications/read-all` | — |
| GET | `/search?q=` | — ; returns top 5 per type (leads, contacts, companies, deals) through `visibleTo` |
| GET | `/audit?subject_type=&subject_id=` | perm:audit.view (record-level history also visible on record to those who can view it: `GET /{entity}/{id}/history`) |

### Inbox (Phase 3)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/conversations` | visibleTo | `filter[channel]`, `filter[status]`, `filter[unread]=1`, `filter[assigned_to]=me`; cursor |
| GET | `/conversations/{c}` | policy:view | includes contact/lead, `window_expires_at` (WA 24h) |
| GET | `/conversations/{c}/messages?cursor=` | policy:view | newest first |
| POST | `/conversations/{c}/messages` | perm:inbox.reply + policy:reply | WA: `{type:text, body}` inside window, `{type:template, template_id, params[]}` outside (else 422 `domain_error: window_closed`); email: `{subject, body_html, cc[]}`, attachments via multipart |
| POST | `/conversations` | perm:inbox.reply | start new: `{channel, contact_id|lead_id, …}` (WA must be template) |
| POST | `/conversations/{c}/read` | policy:view | |
| POST | `/conversations/{c}/assign`, `/close`, `/reopen`, `/link` | policy | link to lead/contact manually |
| GET | `/message-templates?channel=` | — | |
| POST | `/message-templates/sync` | perm:templates.manage | pulls WA templates from Graph API |
| CRUD | `/message-templates` (email/local) | perm:templates.manage | |

### Integrations admin (Phase 3)
| Method | Path | Permission |
|---|---|---|
| GET/PATCH | `/integrations/{provider}` | perm:integrations.manage — values write-only (masked on read: `••••last4`) |
| POST | `/integrations/{provider}/test` | perm:integrations.manage |
| GET/POST | `/integrations/facebook/pages` (+ `/subscribe`), `/integrations/facebook/forms/{form}` (mapping) | perm:integrations.manage |
| CRUD | `/form-keys` | perm:integrations.manage — key shown once at creation |
| GET | `/webhook-logs` | perm:webhooks.manage — filters provider/status/date |
| GET | `/webhook-logs/{log}` | perm:webhooks.manage |
| POST | `/webhook-logs/{log}/retry`, `/webhook-logs/retry-failed` | perm:webhooks.manage |

### Quotes (Phase 4)
| Method | Path | Permission |
|---|---|---|
| GET | `/quotes` | visibleTo (via deal) |
| POST | `/deals/{deal}/quotes` | perm:quotes.create + policy:update deal (prefill from deal products) |
| GET/PATCH/DELETE | `/quotes/{q}` | policy (only `draft` editable) |
| GET | `/quotes/{q}/pdf?locale=ar|en` | policy:view → `application/pdf` stream |
| POST | `/quotes/{q}/send` | perm:quotes.send `{to[], cc[], subject, message, locale}` → queued mail with PDF, status `sent` |
| POST | `/quotes/{q}/accept`, `/reject`, `/duplicate` | policy:update |
| CRUD | `/products` | read `—`, write perm:products.manage |

### Reports (Phase 4)
All accept `filter[from]`, `filter[to]`, `filter[team_id]`, `filter[user_id]`, `filter[pipeline_id]`; scoped by `reports.view_all` (any team) or `reports.view_team` (own team only); reps get own-only versions via `/reports/me`.
| GET | Path | Returns |
|---|---|---|
| | `/reports/pipeline` | open value & weighted value per stage (default currency) |
| | `/reports/conversion` | funnel: count entering each stage, stage-to-stage conversion %, avg days in stage |
| | `/reports/reps` | per rep: leads assigned, contacted %, deals won/lost, won value, win rate, activities count, avg response time |
| | `/reports/sources` | leads, conversions, won value per source |
| | `/reports/won-lost` | won/lost counts & value over time; lost reasons breakdown |
| | `/reports/activities` | activities per type per rep per week |
| | `/dashboard` | KPI bundle for home (role-aware) |
| POST | `/reports/{report}/export` | perm:reports.export → queued xlsx |

### Mobile-specific (Phase 6 — not needed by web)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/token`, DELETE `/auth/token` | token auth |
| POST/DELETE | `/devices` | Expo push token |
| GET | `/mobile/home` | today's tasks, my latest 10 leads, quick stats, unread inbox count — one round-trip |
| POST | `/quick-add` | `{kind: lead|note|call, …}` with `Idempotency-Key` |
| POST | `/activities/call-log` | `{phone_e164, duration_seconds, outcome, direction}` → resolves contact/lead by phone |
| GET | `/lookup/phone/{e164}` | find lead/contact by phone (incoming call screen) |
| GET | `/sync/changes?since=` | (optional, later) changed ids for offline cache |

### Webhooks (no auth; signature middleware; excluded from CSRF & `api` throttle)
| Method | Path | Verification |
|---|---|---|
| GET | `/webhooks/meta` | hub.verify_token challenge (shared FB + WA app) |
| POST | `/webhooks/meta` | `X-Hub-Signature-256` HMAC-SHA256(app_secret, raw body) — routes `object=page` (leadgen) and `object=whatsapp_business_account` |
| POST | `/webhooks/postmark/inbound` | HTTP Basic auth in URL + IP allowlist (Postmark ranges) |
| POST | `/webhooks/postmark/events` | same (delivery/bounce/open) |
| POST | `/public/v1/leads` | `X-Form-Key` header (hashed lookup) + Origin allowlist + throttle + honeypot field `website` must be empty + optional Turnstile token |

## Example resource (Lead)

```json
{
  "data": {
    "id": 4812, "ulid": "01JC…",
    "first_name": "أحمد", "last_name": "الحربي", "full_name": "أحمد الحربي",
    "company_name": "شركة الأفق", "email": "ahmad@ofuq.sa", "phone": "0551234567", "phone_e164": "+966551234567",
    "status": { "value": "new", "label": "جديد" },
    "source": { "id": 1, "key": "facebook", "name": "فيسبوك", "name_ar": "فيسبوك", "name_en": "Facebook" },
    "source_detail": "Ramadan Campaign — ERP Form",
    "assignee": { "id": 7, "name": "Sara Ali", "avatar_url": null },
    "team": { "id": 1, "name": "مبيعات الرياض" },
    "tags": [{ "id": 3, "name": "VIP", "color": "amber" }],
    "custom_fields": { "industry": "bank", "employees": 250 },
    "duplicates": [{ "type": "contact", "id": 921, "name": "Ahmad Alharbi", "match": "phone" }],
    "converted": null,
    "last_activity_at": "2026-11-08T13:02:11Z", "created_at": "2026-11-08T12:59:40Z",
    "can": { "update": true, "delete": false, "assign": false, "convert": true }
  }
}
```

`can` block on every resource (computed from Policies) so the UI hides actions without duplicating rules.

## Typed client pipeline

1. `php artisan scramble:export --path=../frontend/openapi.json` (composer script `composer api:spec`).
2. `npx openapi-typescript openapi.json -o src/lib/api/schema.d.ts` (npm script `api:types`).
3. `src/lib/api/client.ts`: `createClient<paths>()` from openapi-fetch with middleware: CSRF bootstrap, `Accept-Language`, `X-Socket-ID`, error normalization → `ApiError {status, code, message, errors}` (keeps existing `applyServerErrors` contract).
4. CI fails if regenerated `schema.d.ts` differs from committed (`git diff --exit-code`).
