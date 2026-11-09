# Prompt for Claude Code — CRM Project Planning

> Paste everything below this line into Claude Code, from the root of an empty project folder.

---

You are a senior full-stack architect. Your job in this session is **planning only**: produce a complete, step-by-step implementation plan for the CRM system described below. **Do not write application code yet.** I will execute the plan with you phase by phase afterwards.

## 1. How to work

1. First, read this whole brief. Then ask me any clarifying questions you genuinely need answered before planning (batch them, max 10). Propose a default answer for each so I can just confirm.
2. After I answer, write the plan into files under `/docs` (structure in section 9).
3. Every step in the plan must be small enough to finish and verify in one sitting (roughly 1–4 hours of work), and must list: goal, exact files/folders to create or change, commands to run, acceptance criteria, and tests to write.
4. Order steps by dependency. Never reference something that hasn't been built in an earlier step.
5. Mark which steps can run in parallel and which block others.
6. When you're unsure about a version, package or API, check the official docs instead of guessing, and note the version you planned against.
7. Keep a "Decisions" log (ADR-style, short) for every non-obvious choice, with the alternative you rejected and why.

## 2. Project context

- **Product:** an internal CRM for **one software company** (single-tenant), about **30 employees** (sales reps, sales managers, admins, support).
- **Goal:** collect leads from every channel in one place and track them until a deal is won or lost, then hand the customer to support.
- **Languages:** Arabic and English, full **RTL/LTR** support on web and mobile. Every user-facing string translatable; stored lookup values (stages, sources, lost reasons) have `name_ar` and `name_en`.
- **Lead sources:** Facebook Lead Ads, WhatsApp, email, website form, manual entry, Excel/CSV import.
- **Clients:** web app (Next.js) now; **React Native (Expo) mobile app later** using the same API. The API must be designed for both from day one.
- **Developer:** I'm building this mostly solo. Favor simple, conventional, well-documented choices over clever ones.

## 3. Tech stack (fixed)

### Backend — Laravel (API only)
- Latest stable Laravel, PHP 8.3+, MySQL 8 (or PostgreSQL — recommend one in the plan and justify).
- **REST API** under `/api/v1`, JSON only, versioned, consistent response/error envelope, API Resources for all output, Form Requests for all input.
- **Auth:** Laravel Sanctum. Plan the exact flow for (a) Next.js web and (b) the future mobile app. Recommend whether Next.js should use Sanctum SPA cookie auth or token auth stored in an httpOnly cookie via Next.js server (BFF pattern), considering web and API on different subdomains.
- **Roles/permissions:** spatie/laravel-permission + Laravel Policies + a reusable query scope so users only see records they're allowed to.
- **Queues:** Redis + Laravel Horizon. All webhook processing, imports, emails, and notifications are queued.
- **Realtime:** Laravel Reverb + Laravel Echo on the client (inbox messages, notifications, Kanban updates).
- **Other packages to evaluate:** spatie/laravel-activitylog (audit), spatie/laravel-medialibrary or plain Storage (attachments), spatie/laravel-backup, maatwebsite/excel (import/export), Scribe or Scramble (OpenAPI docs), libphonenumber-for-php (E.164 phone normalization), Pest (tests), Larastan + Pint (quality).
- Generate an **OpenAPI spec** from the API so the frontend can generate TypeScript types from it.

### Frontend — Next.js (web)
- Latest stable Next.js, App Router, TypeScript (strict), Tailwind CSS, shadcn/ui.
- `next-intl` for i18n with locale routing (`/ar`, `/en`), RTL via `dir` on `<html>` and Tailwind logical properties.
- TanStack Query for server state, TanStack Table for data tables, react-hook-form + zod for forms, @dnd-kit for the Kanban board, Recharts for charts, Laravel Echo + pusher-js client for Reverb.
- Typed API client generated from the Laravel OpenAPI spec (e.g. openapi-typescript + openapi-fetch). No hand-written duplicate types.

### Mobile — React Native (later phase, plan it now)
- Expo + Expo Router + NativeWind, same API, Sanctum token auth, Expo push notifications, RTL via I18nManager.
- Scope is a field-sales companion, not the full web app (see section 6).

### Repo & infra
- Recommend either a monorepo (`/backend`, `/web`, `/mobile`, `/docs`) or separate repos, and justify.
- Local dev with Docker (Laravel Sail or a custom docker-compose: PHP, MySQL/Postgres, Redis, Mailpit, Reverb).
- CI with GitHub Actions: lint, static analysis, tests for backend and web on every PR.
- Production: a VPS for Laravel (needs queues, Horizon, Reverb, scheduler) — suggest Laravel Forge/Ploi or manual setup; Vercel or the same VPS for Next.js. Include environments: local, staging, production.

## 4. Roles & permissions

| Role | Sees | Can do |
|---|---|---|
| Admin | Everything | System settings, users, teams, pipeline stages, integrations |
| Sales Manager | All leads/deals of their team | Assign/reassign leads and deals, reports |
| Sales Rep | Only records assigned to them | Edit own leads/deals, log activities, reply on WhatsApp/email |
| Support / Viewer | Won customers | Read + add notes |

Use granular permissions (e.g. `leads.view_all`, `leads.view_team`, `deals.reassign`, `settings.manage`) mapped to roles, not role checks scattered in code. Every role's access must be covered by feature tests.

## 5. Modules & features

1. **Leads** — manual/automatic creation, source, status (new, contacted, qualified, unqualified, converted), duplicate detection by normalized phone/email, round-robin auto-assignment (configurable), bulk assign, import (CSV/Excel, queued, with error report), export, **convert lead → Contact + Company + Deal in one transaction**.
2. **Contacts & Companies** — full profile, tags, custom fields, and a unified **timeline** (activities, messages, deals, stage changes) per contact.
3. **Deals & Pipeline** — configurable pipelines and stages (order, color, win probability, type open/won/lost), **Kanban board** with drag & drop, deal value and currency, expected close date, stage history, lost reason required when marking lost, products/packages on a deal.
   - Default stages for a software company: New Lead → Contacted → Qualified → Demo → Proposal Sent → Negotiation → Won / Lost.
4. **Activities** — calls, meetings, notes, emails, WhatsApp messages, stage changes; polymorphic (attached to lead, contact, or deal).
5. **Tasks & reminders** — due date, priority, assignee, polymorphic relation, overdue view, scheduled reminder notifications.
6. **Inbox** — WhatsApp + email conversations in one screen, reply from inside the CRM, auto-link messages to the right lead/contact, unread counts, realtime.
7. **Quotes** — products/packages (one-time, monthly, yearly), quote PDF in Arabic and English, send by email, status tracking.
8. **Dashboard & reports** — pipeline value and weighted pipeline, conversion per stage, rep performance, lead sources, won/lost reasons, date and team filters, Excel export.
9. **Settings** — users, teams, roles, pipelines/stages, lead sources, lost reasons, products, message templates, custom fields, integration credentials (encrypted).
10. **Notifications** — in-app (realtime), email, and later mobile push.
11. **Audit log** — who changed what and when on key entities.

**MVP = modules 1–5 + 9 + basic auth/roles.** Everything else comes after the MVP is demoed.

## 6. Mobile app scope (future phase)

Login, Home (today's tasks, my latest leads, quick stats), Leads/Contacts list + detail + one-tap call/WhatsApp, Deals list + change stage (no full Kanban), Inbox with replies, Tasks, Quick add (lead/note/call log), push notifications. Settings, reports and imports stay web-only. Plan any API endpoints the mobile app needs that the web doesn't.

## 7. Integrations

All integrations follow one pattern: **webhook endpoint → verify signature → store raw payload in `webhook_logs` → return 200 immediately → queued job processes it → link to lead/contact → notify assignee in realtime.** Include a retry button for failed webhooks.

- **Facebook Lead Ads:** Meta app, page subscription to `leadgen` webhook, fetch lead data from the Graph API using the `leadgen_id` and a Page access token, map form fields to lead fields, store campaign/form info. Note the permissions and App Review required, and plan development with Meta's Lead Ads testing tool while review is pending.
- **WhatsApp Cloud API (official, Meta):** inbound messages and status webhooks (sent/delivered/read/failed), outbound text inside the 24-hour customer-service window, **approved templates** outside it, template management screen, media messages. Business verification and a dedicated number are prerequisites — flag them as week-1 tasks for the company.
- **Email:** outbound via SMTP or a provider (Mailgun/Postmark/SES); inbound via provider inbound webhooks (preferred) or IMAP polling; thread replies using `Message-ID`, `In-Reply-To`, and `References` headers.
- **Website form:** public endpoint protected by API key + rate limiting + optional honeypot/captcha.

## 8. Data model (starting point — refine it)

Review, correct, and complete this. Output the final version as a schema document with columns, types, indexes, foreign keys, and an ER diagram in Mermaid.

- `users`, `teams`, Spatie permission tables
- `lead_sources`, `leads` (incl. `assigned_to`, `team_id`, `external_id`, `raw_payload` json, conversion fields)
- `companies`, `contacts`
- `pipelines`, `pipeline_stages`, `deals`, `deal_stage_history`, `lost_reasons`
- `products`, `deal_products`, `quotes`, `quote_items`
- `activities` (polymorphic), `tasks` (polymorphic)
- `conversations`, `messages`, `message_templates`
- `tags` + `taggables`, `custom_fields` + `custom_field_values`, `attachments`
- `notifications`, `activity_log`, `integration_settings` (encrypted), `webhook_logs`, `personal_access_tokens`, `device_tokens` (mobile push)

Requirements: soft deletes on business entities, indexes on normalized `phone` and `email` for dedupe, `assigned_to` + `team_id` on every customer-data table for visibility scoping, money stored as integer minor units or decimal (decide and justify).

## 9. What to deliver (files under `/docs`)

1. `00-overview.md` — summary, scope, assumptions, open questions, glossary (lead, contact, deal, pipeline, stage, activity).
2. `01-architecture.md` — system diagram (Mermaid), repo structure, folder structure for backend and web, auth flow diagrams for web and mobile, realtime flow, queue/webhook flow, environments.
3. `02-database.md` — full schema, ERD, migration order, seeders (realistic demo data in Arabic and English).
4. `03-api.md` — every endpoint: method, path, permission, request validation, response shape, pagination/filter/sort conventions, error format, rate limits.
5. `04-frontend.md` — route map (with locales), layout/shell, every page and its components, state/data-fetching approach, shared UI components list, RTL rules, form patterns, Kanban implementation notes.
6. `05-integrations.md` — step-by-step setup and code plan for Facebook, WhatsApp, email, website form, including what the company must prepare (accounts, verification, numbers, tokens).
7. `06-security.md` — authorization matrix (role × permission × endpoint), data visibility rules, secrets handling, webhook signature verification, rate limiting, CORS/CSRF, backups, audit logging.
8. `07-testing.md` — test strategy: Pest feature tests per module and per role, unit tests for services, Playwright E2E for critical web flows (login, create lead, convert, move deal stage, reply in inbox), CI pipeline.
9. `08-deployment.md` — server setup, Horizon/Reverb/scheduler supervision, zero-downtime deploys, env variables list, staging → production process, monitoring and error tracking.
10. **`PLAN.md` — the master step-by-step plan.** Structure:
    - Phases: **0 Setup → 1 Foundation (auth, roles, i18n, settings) → 2 Core CRM MVP (leads, contacts, companies, deals/Kanban, activities, tasks) → MVP demo gate → 3 Integrations & Inbox → 4 Quotes, dashboard, reports → 5 Hardening & web launch → 6 Mobile app → mobile release gate.**
    - Each phase: goal, exit criteria, estimated duration for a solo developer.
    - Each step, numbered (e.g. `2.4`), with: **Goal · Depends on · Backend tasks · Frontend tasks · Files · Commands · Tests · Acceptance criteria · Estimate**.
    - Backend and frontend work for the same feature sit in the same step or adjacent steps, so each feature is usable end to end before moving on.
    - A checklist version at the end (`- [ ]`) I can tick off.
11. `RISKS.md` — risks (Meta approvals, WhatsApp 24h window, duplicate leads, lost webhooks, permission leaks, scope creep, Arabic PDF rendering, RTL bugs) with mitigation for each.
12. `CLAUDE.md` at the repo root — the coding conventions and project rules you'll follow in later sessions (naming, folder structure, API response format, testing requirements, commit style, "always update docs when changing behavior").

## 10. Quality bar for the plan

- No vague steps like "build the leads module". Break it into model/migration, policy, requests, resource, controller, routes, tests, API client types, list page, detail page, form, etc.
- Every step ends in something I can run and verify.
- Call out what the company (not me) must provide and by when: Meta Business verification, WhatsApp number, Facebook page access, email domain/DNS, server, domain names.
- Flag anything in this brief that is contradictory, risky, or missing.

Start with your clarifying questions.
