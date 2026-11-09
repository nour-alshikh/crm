# 00 — Overview

## Summary

Internal, single-tenant CRM for one software company (~30 staff: sales reps,
sales managers, admins, support). Collects leads from every channel (Facebook
Lead Ads, WhatsApp, email, website form, manual, CSV/Excel import), tracks them
through a configurable pipeline to won/lost, and hands won customers to
support. Arabic + English with full RTL/LTR. Web (Next.js) now; Expo mobile
app later on the same `/api/v1`.

## Starting point (important)

This repo is **not empty**. It is an evolved starter template (see root
`README.md`, `SETUP.md`, existing `docs/*.md`):

| Already present | Version | Plan action |
|---|---|---|
| Laravel API (`backend/`) | 12.x, PHP ^8.2 | Upgrade to **Laravel 13** (needs PHP 8.3) in step 0.2 |
| Sanctum SPA cookie auth + `auth_status` marker cookie | Sanctum 4 | Keep (ADR-003) |
| JSON error envelope (`ApiExceptionRenderer`) | — | Keep, extend to full envelope (ADR-006) |
| spatie/laravel-permission, medialibrary | 6.x / 11.x | Upgrade permission → 8.x |
| spatie/laravel-typescript-transformer | 3.x | **Replace** with Scramble OpenAPI (ADR-005) |
| Next.js (`frontend/`) | 16.3, React 19.2, Tailwind 4, shadcn (Base UI) | Keep; bump to latest 16.x |
| Custom i18n context (localStorage, client-side `dir`) | — | **Replace** with `next-intl` locale routing `/ar` `/en` (ADR-008) |
| TanStack Query, react-hook-form + zod, sonner, next-themes | — | Keep |
| Next rewrite proxy (`BACKEND_URL`) for cross-domain cookies | — | Keep — core of auth design |
| `Post` example module, `test@example.com` seed | — | Delete once Leads exists (step 2.3) |
| Docs: authentication, authorization, forms, i18n, theming… | — | Kept as "how it works" references; numbered docs `00–09` are the project plan |

Folder name stays `frontend/` (brief says `/web`): renaming buys nothing and breaks
existing docs/CI paths. `mobile/` is added in Phase 6. (ADR-001)

## Scope

**MVP (demo gate after Phase 2):** auth & roles, i18n/RTL, settings (users,
teams, pipelines/stages, lead sources, lost reasons, custom fields, tags),
leads (incl. dedupe, round-robin, import/export, convert), contacts,
companies, deals + Kanban, activities, tasks & reminders, in-app notifications,
audit log basics.

**Post-MVP:** Inbox (WhatsApp + email), Facebook Lead Ads, website form,
quotes + PDF, dashboard & reports, email notifications polish, mobile app.

**Out of scope (v1):** multi-tenancy, marketing automation/campaign sending,
telephony/VoIP, invoicing/payments, customer portal, AI scoring, calendar sync
(Google/Outlook) — listed in "Later" backlog in `PLAN.md`.

## Assumptions (confirm or correct)

1. Single company, single default currency (configurable in settings, default **USD**); deals may carry another currency, reports convert using a manually maintained rate table (no live FX). → Q1
2. Single timezone for the company (configurable, default `Asia/Riyadh`); stored UTC. → Q2
3. Western digits (0–9) in both languages (ADR-011). → Q3
4. One sales team at launch but teams are modeled (managers see team).
5. A user belongs to exactly **one** team (simplifies scoping). Admins have no team requirement.
6. Leads and deals are separate: a lead is pre-qualification; converting creates Contact (+ Company) + Deal. Leads arriving from an existing contact's phone/email are flagged as duplicate and linked, not auto-merged.
7. Support/Viewer sees **companies/contacts with ≥ 1 won deal** and their deals, read-only + notes.
8. Email provider: **Postmark** (outbound + inbound webhook) unless the company already pays for another (ADR-014). → Q4
9. Hosting: one VPS (Hetzner/DigitalOcean) managed by **Laravel Forge**, Next.js on the **same VPS** behind Nginx, subdomains `crm.<company>` (web) and `api.crm.<company>` (API), `ws.crm.<company>` (Reverb). (ADR-015)
10. Developer machine is Windows; local PHP is 8.2 and Docker is not installed → step 0.1 installs Docker Desktop (WSL2) and uses Sail.

## Open questions (with proposed defaults)

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Default currency? Multiple currencies on deals? | USD default, multi-currency allowed on deals/quotes |
| Q2 | Company timezone & working week (Sun–Thu vs Mon–Fri)? | Asia/Riyadh, Sun–Thu (affects reminders, reports) |
| Q3 | Arabic-Indic digits (٠١٢) in Arabic UI? | No, Western digits |
| Q4 | Existing email provider / mailbox (Google Workspace, M365)? | Postmark; sales@ inbound forwarding |
| Q5 | Is a sales rep allowed to *see* (not edit) unassigned leads to self-claim? | No; managers assign (round-robin does the rest) |
| Q6 | Lead → round-robin across which users? | Active reps of the lead's team, skipping users marked "away" |
| Q7 | Quote numbering & tax (VAT 15%?) | `Q-2026-0001`, configurable tax % per quote line, default 15% |
| Q8 | Data retention / deletion requests? | Soft delete; admin hard-delete after 30 days via command |
| Q9 | Domain names and who controls DNS? | Needed by end of Phase 0 (see company checklist) |
| Q10 | SSO (Google/Microsoft) needed? | No — email + password, optional TOTP 2FA in Phase 5 |

## Company must provide (owner = company, not developer)

| Item | Needed by | Blocks |
|---|---|---|
| Domain + DNS access (web, api, ws subdomains) | end Phase 0 | staging deploy |
| VPS + Forge account (or approval to buy) | end Phase 0 | staging |
| Meta Business Manager **verified** | **week 1** (takes 1–4 weeks) | WhatsApp, Lead Ads |
| Dedicated phone number for WhatsApp (not on any WhatsApp app) | week 1 | WhatsApp |
| Admin access to the Facebook Page(s) running Lead Ads | week 1 | Lead Ads |
| Email domain DNS (SPF, DKIM, DMARC, inbound MX/forward) | Phase 3 start | email |
| Logo / brand name (optional — design system works without) | Phase 1 | — |
| List of users, teams, real pipeline stages, lost reasons, products | Phase 1 end | seed for demo |
| Sample lead export (CSV/Excel) from current tool | Phase 2 | import mapping |
| Arabic + English quote template text, tax/legal footer | Phase 4 | quotes |

## Glossary

| Term | Meaning |
|---|---|
| **Lead** | An unqualified inbound or entered person/opportunity from any source. Statuses: new, contacted, qualified, unqualified, converted. |
| **Contact** | A known person (customer or prospect) after conversion or manual creation. May belong to a Company. |
| **Company** | An organisation (account). Has contacts and deals. |
| **Deal** | A specific sales opportunity with value, currency, pipeline, stage, owner, expected close date. |
| **Pipeline** | An ordered set of stages a deal moves through (e.g. "New Sales", "Renewals"). |
| **Stage** | A step in a pipeline: order, color key, win probability, type `open` / `won` / `lost`. |
| **Activity** | Something that happened: call, meeting, note, email, WhatsApp message, stage change. Polymorphic on lead/contact/deal. |
| **Task** | Something that must happen: due date, priority, assignee, reminder. |
| **Conversation** | A thread on one channel (WhatsApp number or email thread) with a lead/contact. |
| **Owner / assignee** | `assigned_to` user responsible for the record. |
| **Visibility scope** | The rule set deciding which records a user may see (own / team / all / won-customers). |
| **Weighted pipeline** | Σ deal value × stage win probability for open deals. |
| **Minor units** | Money as integer smallest unit (cents/halalas). |

## Brief review — contradictions, risks, gaps

1. **"Empty project folder" vs reality** — repo has a working template; plan evolves it (ADR-001).
2. **BFF vs Sanctum SPA** — brief asks to choose; template already solves cross-subdomain with same-origin rewrite proxy. Chosen: keep Sanctum SPA cookies through Next rewrites (ADR-003). A full BFF adds a token store with no benefit for 30 users.
3. **next-intl locale routing vs template's client i18n** — migration needed (step 1.4); current approach flashes LTR before RTL.
4. **Type generation** — brief: OpenAPI; template: TS-transformer. Chosen Scramble (ADR-005).
5. **Support role sees "won customers"** but data model had no customer flag → add `companies.is_customer` / `contacts.is_customer` + `customer_since`, set on first won deal.
6. **`assigned_to` + `team_id` on every customer table** — for contacts/companies with deals by multiple reps this is ambiguous. Rule: contact/company `assigned_to` = account owner; visibility also granted if the user owns any deal on it (ADR-009).
7. **Activity log naming clash** — spatie activitylog's table is `activity_log`; CRM `activities` is a different thing. Kept separate, named clearly.
8. **"Products/packages on a deal" in MVP (module 3) but products settings + quotes are Phase 4** — deal products moved to Phase 4 with quotes; MVP deal has value only.
9. **Notifications module (10) not in MVP list** but task reminders (module 5) need it → in-app + database notifications enter MVP (step 2.12); email/push later.
10. **Mobile push needs `device_tokens`** — planned in Phase 6 migrations, not earlier.
11. **WhatsApp outbound templates require Meta approval per template** — template sync, not authoring-only.
12. **Missing:** GDPR-ish data export/delete, login throttling/2FA, user deactivation (vs delete), "away" status for round-robin, currency handling, attachments size limits, global search — all added to plan.
13. **Arabic PDF** — dompdf breaks Arabic shaping; use **mPDF** (native Arabic/RTL) or Browsershot (Chromium). Chosen mPDF (ADR-017).
14. **Local env** — PHP 8.2 installed, Laravel 13 needs 8.3; Docker not installed.
