# 04 — Frontend (Next.js web)

Stack: Next 16.x App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui (Base UI primitives — already initialised), next-intl 4, TanStack Query 5, TanStack Table, react-hook-form + zod 4, @dnd-kit/core + sortable, Recharts 3, laravel-echo + pusher-js, openapi-fetch. Visual rules: **`09-design-system.md`**.

> Next 16 has breaking changes vs. older docs (e.g. `middleware.ts` → `proxy.ts`). Read `frontend/node_modules/next/dist/docs/` before each new API (see `frontend/AGENTS.md`).

## Route map

All app routes live under `/[locale]` with `locale ∈ {ar, en}`; `/` redirects to the user's saved locale (cookie `NEXT_LOCALE`, then `Accept-Language`, default `ar`).

| Route | Page | Permission gate (UI) |
|---|---|---|
| `/[l]/login` · `/forgot-password` · `/reset-password` | split-screen auth | guest |
| `/[l]/dashboard` | role-aware KPIs, my tasks today, recent leads, pipeline mini-chart | any |
| `/[l]/leads` | DataTable + saved views + bulk bar | leads.view_* |
| `/[l]/leads/new` | form (also in Sheet from list) | leads.create |
| `/[l]/leads/[id]` | detail: header actions (assign, convert, status), tabs Timeline / Details / Files, side rail | view |
| `/[l]/leads/[id]/convert` | 3-step convert wizard (contact → company → deal) | leads.convert |
| `/[l]/leads/import` · `/import/[importId]` | upload → map columns → options → progress → result | leads.import |
| `/[l]/contacts` · `/[id]` | table · detail with timeline, deals, tasks, conversations | contacts.view_* / customers.view |
| `/[l]/companies` · `/[id]` | table · detail with contacts, deals, timeline | companies.view_* |
| `/[l]/deals` | **board** (default) ⇄ list toggle, pipeline switcher | deals.view_* |
| `/[l]/deals/[id]` | detail: stage progress bar (clickable), value, contacts, products, quotes, timeline | view |
| `/[l]/tasks` | tabs Today · Overdue · Upcoming · Done; list grouped by date | any |
| `/[l]/inbox` · `/[conversationId]` | 3-pane: conversations list · thread · contact panel | inbox.* (Phase 3) |
| `/[l]/quotes` · `/[id]` · `/deals/[id]/quotes/new` | quote builder with live totals + PDF preview | Phase 4 |
| `/[l]/reports` · `/reports/[report]` | report cards → detail with filters + export | reports.* (Phase 4) |
| `/[l]/notifications` | full list | any |
| `/[l]/settings/profile` · `/security` · `/devices` | own account | any |
| `/[l]/settings/users` · `teams` · `roles` | admin | users/teams/roles.manage |
| `/[l]/settings/pipelines` (+ `[id]` stage editor) · `lead-sources` · `lost-reasons` · `tags` · `custom-fields` · `currencies` · `company` | config | settings.manage |
| `/[l]/settings/products` · `templates` | Phase 3/4 | products/templates.manage |
| `/[l]/settings/integrations` (+ `/facebook`, `/whatsapp`, `/email`, `/website-form`) · `webhooks` | Phase 3 | integrations/webhooks.manage |
| `/[l]/settings/audit` | audit log viewer | audit.view |
| `/[l]/dev/design` | design-system playground | dev only (`notFound()` in prod) |

## Layout & shell

- `app/[locale]/layout.tsx`: `<html lang dir>` (server, from locale), fonts (Plex Sans/Arabic/Mono variables), `NextIntlClientProvider`, `ThemeProvider` (existing next-themes), `QueryProvider`, `Toaster` (position `bottom-end` logical → computed per dir).
- `(auth)/layout.tsx`: split-screen ink panel with geometric pattern.
- `(app)/layout.tsx`: client `AuthGate` (uses `/me` query; redirects on 401) + `AppShell` = `AppSidebar` + `Topbar` + `<main>`; mounts `EchoProvider` and `CommandPalette`.
- `proxy.ts` (Next 16): compose next-intl middleware + existing `auth_status` redirect logic, now locale-aware (`/ar/leads` → `/ar/login?redirect=…`).
- Sidebar items are filtered by permissions from `/me`; counts (overdue tasks, unread inbox, new leads assigned) from `/me` + realtime increments.

## Data fetching & state

- **Server state:** TanStack Query only. One `features/<module>/api.ts` per module exporting `useLeads(filters)`, `useLead(id)`, `useCreateLead()`, etc., built on typed `apiClient`. Query keys centralised in `lib/api/query-keys.ts`: `['leads', 'list', filters]`, `['leads', 'detail', id]`, `['timeline', entity, id]`.
- **Lookups:** `useLookups()` loads `/lookups` once (staleTime 10 min, ETag); provides `stageById`, `sourceByKey`, `t(lookup)` → picks `name_ar|name_en` by locale.
- **URL state:** table filters/sort/page/view live in search params (`nuqs`-style small helper `useTableParams`) → shareable links, back button works.
- **Client UI state:** React state/context only (sidebar collapsed, density) persisted to `/me.preferences` (debounced) — no Redux/Zustand.
- **Mutations:** invalidate affected keys; optimistic updates only for Kanban move, task complete, mark read.
- **Realtime:** `EchoProvider` subscribes `private-user.{id}` always; pages subscribe to `private-team.{id}`/`conversation.{id}` on mount. Events update caches via `queryClient.setQueryData` (Kanban) or invalidate (lists).
- **Errors:** `ApiError` → toast for non-field errors (translated by `code`), inline for 422 (`applyServerErrors`, existing). 401 → `/login`. 403 → `<Forbidden>` state. 409 → "This record was changed by someone else" + refetch.
- **Rendering:** pages are client components inside a server layout (auth is cookie/session-based against Laravel; SSR data fetching would need cookie forwarding — deferred, not needed for an internal tool). Static shell + skeletons = fast enough.

## Pages & key components

### Leads list
`PageHeader` (title, count, `Import`, `Export`, `New lead`) → `SavedViewsTabs` (My leads · New today · Unassigned (managers) · Duplicates · custom) → `FilterBar` (status, source, owner, team, tags, created date, custom fields) → `DataTable` columns: select, name+company (link), `StatusPill`, `SourceBadge`, phone (`PhoneLink`), owner (`UserAvatar`), last activity (`RelativeTime`), created, tags; row click → `LeadQuickView` Sheet. Bulk bar: assign, change status, tag, delete.

### Lead detail
Header: name, `StatusPill`, `SourceBadge`, owner picker (if `can.assign`), actions: Log call · Add note · Add task · WhatsApp · Email · **Convert** (highlight button). Duplicate banner (warning tint) with "View" / "Mark as duplicate". Tabs: Timeline (`ActivityComposer` on top: note/call/meeting tabs) · Details (editable `KeyValueList` + custom fields) · Files. Side rail: contact info, source details (campaign/form/ad), tags, assignment history.

### Convert wizard (Dialog, 3 steps)
1. Contact: create from lead data (prefilled) or pick existing (dedupe suggestions first).
2. Company: create (from `company_name`) / pick / skip.
3. Deal: optional; pipeline, stage, title (default "<Company> — <Source>"), amount, currency, close date.
Submit → one API call → redirect to deal (or contact). Errors shown per step.

### Deals board (Kanban)
- `KanbanBoard` horizontal scroll, one `KanbanColumn` per open stage + collapsed Won/Lost drop zones at the end.
- Column header: `StageChip`, count, total `Money`, weighted value (muted).
- `DealCard`: title, company, `Money`, owner avatar, close date (destructive if past), rotting dot if `stage_entered_at` > `rotting_days`.
- dnd-kit: `DndContext` with Pointer (activation distance 6px), Touch (delay 200ms) and Keyboard sensors; `SortableContext` per column (`verticalListSortingStrategy`); `DragOverlay` for lifted card. In RTL, columns render in DOM order with `dir=rtl` so horizontal order flips automatically; keyboard sensor's coordinate getter swaps Left/Right in RTL.
- On drop: optimistic move in cache → `POST /deals/{id}/move` with `position_after_id` + `lock_version`. Lost zone opens `LostReasonDialog` before sending (cancel = revert). 409/422 → revert + toast.
- Realtime `DealMoved` from others → apply to cache (skip if self via socket id).
- Virtualisation not needed (≤ 50 cards per column loaded, "Load more" at column bottom).
- Accessibility fallback: card menu "Move to stage…".

### Tasks
List grouped by day with check-to-complete (optimistic), priority icon, related record chip, `TaskDialog` for create/edit (title, related entity picker, assignee, due date+time, reminder preset 15m/1h/1d/custom, priority).

### Inbox (Phase 3)
Three panes ≥ 1280px (list 340px · thread fluid · context 320px); ≤ 1024 collapses to list → thread navigation. Conversation row: channel glyph, name, last message preview (`<bdi>`), time, unread badge (highlight). Thread: day separators, `MessageBubble` (out = secondary tint, in = card), status ticks, media previews, email messages rendered in sandboxed iframe (`srcdoc`, sanitized server-side). Composer: WA text / template picker (variables form) — when 24h window closed composer shows banner and only template mode; email: subject, cc, rich text (Tiptap minimal), attachments.

### Settings — Pipeline editor
Stage list with drag reorder, inline edit name_ar/name_en, color swatch picker (palette keys only), probability slider, type selector; validation: one won + one lost.

### Dashboard (Phase 2 basic, Phase 4 full)
Row of `StatCard`s (role-aware: rep = my open deals value, tasks due today, new leads assigned, won this month; manager = team versions + win rate), "My tasks today", "Recent leads", pipeline bar chart (Recharts, colors from stage keys).

## Shared UI components

See `09-design-system.md §8` for the full inventory. Built in this order (each with a `dev/design` entry): Button variants → StatusPill/StageChip/SourceBadge → Money/PhoneLink/RelativeTime → PageHeader/SectionCard/KeyValueList → EmptyState → DataTable (+FilterBar, SavedViews, BulkBar) → EntityPicker → Sheet quick view → Timeline/ActivityComposer → KanbanBoard → StatCard → Inbox components.

## i18n & RTL rules

- Messages in `src/messages/{ar,en}.json`, namespaced by module (`leads.list.title`). TypeScript-checked keys via next-intl `AppConfig` augmentation. ICU for plurals (`{count, plural, zero {} one {} two {} few {} many {} other {}}` — Arabic needs all six).
- No hard-coded user-facing strings (ESLint `i18next/no-literal-string`-style rule via `eslint-plugin-react` custom config, step 1.5).
- Lookup labels come from API (`name_ar/name_en`), never from message files.
- Dates/numbers/money only through `lib/format.ts` (`Intl`, `numberingSystem: "latn"`, company timezone).
- Logical CSS only (see design system §10). `<DirIcon>` for directional icons.
- Every PR touching UI: screenshot in `ar` and `en`.

## Form patterns

- react-hook-form + zod (existing convention, `docs/forms.md`). Zod schemas live in `features/<module>/schema.ts`; request/response **types** come from generated OpenAPI types — zod infers form values, a `toPayload()` maps to the typed request body (compile error if API changes).
- Server 422 → `applyServerErrors(form, err)` (existing).
- Phone inputs: country select (default company country) + national number → sent raw, backend normalises; show E.164 preview.
- Money input: locale-formatted display, stores minor units.
- Translatable lookup inputs: `TranslatableInput` (existing) with AR/EN side by side; both required.
- Unsaved-changes guard on long forms (convert wizard, quote builder).
- Submit buttons show pending state; forms disabled while pending.

## Testing (frontend)

- Vitest + Testing Library for components with logic (Money, format, Kanban reorder util, filter↔URL mapping, permission helpers).
- Playwright E2E for critical flows (see `07-testing.md`), run against seeded staging-like stack in CI, in both locales for smoke.
