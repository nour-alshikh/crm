# 09 — Design System ("Tide & Saffron")

Status: **approved direction** (deep teal + amber, IBM Plex). Applied to code in
PLAN step **0.5** (tokens) and **1.6** (app shell). Until then this doc is the spec.

## 1. Intent

A CRM is used 8 hours a day by sales reps, in two scripts (Arabic RTL, English
LTR), mostly in tables, boards and forms. The system must be:

- **Calm under density** — warm paper background, ink text, borders over
  shadows. Color is reserved for meaning (stage, status, channel, money).
- **Recognisable, not generic** — a dark ink sidebar in *both* themes, deep
  teal brand, a single saffron/amber highlight used sparingly (≤ 1 per view
  region) for "attention here": hot lead, today's KPI, unread, primary empty-state CTA.
- **Bilingual-first** — every rule below is written in logical directions
  (start/end), never left/right.
- **Consistent by construction** — all color comes from tokens; stage colors
  are stored as *token keys* in the DB, never hex, so dark mode and contrast
  stay correct for admin-configured data.

## 2. Color tokens

OKLCH. shadcn variable names are kept (so generated shadcn components work
unchanged) and extended with semantic tokens. Contrast verified (WCAG 2.x,
ratio vs. its usual surface):

| Pair | Light | Dark |
|---|---|---|
| foreground on background | 16.6 | 16.5 |
| muted-foreground on card | 6.0 | 6.6 |
| primary-foreground on primary | 4.9 | 7.9 |
| primary (as text/link) on card | 5.1 | 7.5 |
| highlight-foreground on highlight | 9.1 | — |
| destructive / success / warning / info text on card | 5.2 / 5.2 / 5.1 / 4.8 | ≥ 5.6 |
| sidebar-foreground on sidebar | 11.6 | — |

Rules:
- **Amber (`highlight`) never carries white text.** Always `highlight-foreground` (dark brown-ink).
- Status is never color-only: pair with icon or label.
- shadcn's `accent` stays a **neutral hover surface**; brand amber is `highlight` (avoids shadcn hover turning orange).

### 2.1 Ready-to-paste CSS (replaces `:root`/`.dark` in `frontend/src/app/globals.css`)

```css
:root {
  --radius: 0.625rem;                         /* 10px */

  /* Surfaces & text */
  --background: oklch(0.985 0.005 85);        /* warm paper */
  --foreground: oklch(0.22 0.02 250);         /* blue-black ink */
  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --popover: oklch(1 0 0);
  --popover-foreground: var(--foreground);
  --muted: oklch(0.955 0.006 85);
  --muted-foreground: oklch(0.50 0.015 250);
  --accent: oklch(0.955 0.012 195);           /* neutral-teal hover surface */
  --accent-foreground: oklch(0.30 0.05 210);
  --border: oklch(0.91 0.008 85);
  --input: oklch(0.88 0.01 85);

  /* Brand */
  --primary: oklch(0.52 0.11 195);            /* deep teal */
  --primary-foreground: oklch(0.99 0.005 195);
  --secondary: oklch(0.95 0.02 195);          /* teal wash */
  --secondary-foreground: oklch(0.38 0.07 195);
  --highlight: oklch(0.82 0.15 80);           /* saffron */
  --highlight-foreground: oklch(0.25 0.05 60);
  --ring: oklch(0.52 0.11 195);

  /* Semantic (solid = text/icon on light surface; soft = tinted bg) */
  --destructive: oklch(0.56 0.21 25);
  --success: oklch(0.52 0.13 155);
  --warning: oklch(0.55 0.14 55);
  --info: oklch(0.55 0.13 245);

  /* Sidebar: ink in BOTH themes */
  --sidebar: oklch(0.21 0.03 240);
  --sidebar-foreground: oklch(0.86 0.015 240);
  --sidebar-primary: oklch(0.74 0.11 190);
  --sidebar-primary-foreground: oklch(0.18 0.03 220);
  --sidebar-accent: oklch(0.27 0.03 240);
  --sidebar-accent-foreground: oklch(0.97 0.005 240);
  --sidebar-border: oklch(1 0 0 / 8%);
  --sidebar-ring: oklch(0.74 0.11 190);

  /* Charts (categorical, ordered for max adjacent contrast) */
  --chart-1: oklch(0.55 0.11 195);  /* teal   */
  --chart-2: oklch(0.78 0.15 75);   /* amber  */
  --chart-3: oklch(0.55 0.15 275);  /* indigo */
  --chart-4: oklch(0.63 0.17 15);   /* rose   */
  --chart-5: oklch(0.66 0.14 140);  /* green  */
  --chart-6: oklch(0.60 0.03 250);  /* slate  */

  /* Stage / label palette — keys stored in DB (pipeline_stages.color, tags.color) */
  --stage-slate:   oklch(0.55 0.03 250);
  --stage-sky:     oklch(0.60 0.12 230);
  --stage-teal:    oklch(0.55 0.11 195);
  --stage-indigo:  oklch(0.52 0.15 275);
  --stage-violet:  oklch(0.55 0.17 300);
  --stage-rose:    oklch(0.58 0.18 10);
  --stage-orange:  oklch(0.62 0.16 50);
  --stage-amber:   oklch(0.70 0.15 80);
  --stage-emerald: oklch(0.55 0.13 160);
  --stage-lime:    oklch(0.65 0.15 130);

  --shadow-color: 240 30% 15%;
}

.dark {
  --background: oklch(0.17 0.02 240);         /* ink navy */
  --foreground: oklch(0.95 0.008 85);
  --card: oklch(0.21 0.022 240);
  --popover: oklch(0.23 0.022 240);
  --muted: oklch(0.25 0.02 240);
  --muted-foreground: oklch(0.70 0.015 240);
  --accent: oklch(0.28 0.025 240);
  --accent-foreground: oklch(0.95 0.008 85);
  --border: oklch(1 0 0 / 9%);
  --input: oklch(1 0 0 / 14%);
  --primary: oklch(0.72 0.11 190);
  --primary-foreground: oklch(0.18 0.03 220);
  --secondary: oklch(0.28 0.035 200);
  --secondary-foreground: oklch(0.88 0.04 190);
  --highlight: oklch(0.82 0.14 80);
  --highlight-foreground: oklch(0.22 0.04 60);
  --ring: oklch(0.72 0.11 190);
  --destructive: oklch(0.68 0.19 25);
  --success: oklch(0.72 0.13 155);
  --warning: oklch(0.78 0.14 65);
  --info: oklch(0.72 0.11 240);
  --sidebar: oklch(0.145 0.02 240);           /* a step darker than bg */
  --sidebar-accent: oklch(0.22 0.025 240);
  /* stage colors: +0.12 L for legibility on dark */
  --stage-slate: oklch(0.68 0.03 250);  --stage-sky: oklch(0.72 0.11 230);
  --stage-teal: oklch(0.70 0.11 195);   --stage-indigo: oklch(0.68 0.14 275);
  --stage-violet: oklch(0.70 0.15 300); --stage-rose: oklch(0.70 0.16 10);
  --stage-orange: oklch(0.74 0.15 55);  --stage-amber: oklch(0.80 0.14 80);
  --stage-emerald: oklch(0.70 0.13 160);--stage-lime: oklch(0.78 0.15 130);
  --shadow-color: 240 40% 3%;
}
```

Also mirror `.dark` inside the existing `@media (prefers-color-scheme: dark) { :root:not(.light) { … } }` block (template convention — see `docs/theming.md`).

### 2.2 Tailwind v4 mapping (add to `@theme inline`)

```css
--color-highlight: var(--highlight);
--color-highlight-foreground: var(--highlight-foreground);
--color-success: var(--success);
--color-warning: var(--warning);
--color-info: var(--info);
--color-chart-6: var(--chart-6);
--color-stage-slate: var(--stage-slate);   /* …one line per stage key */
--font-sans: var(--font-plex-sans), var(--font-plex-arabic), ui-sans-serif, system-ui;
--font-arabic: var(--font-plex-arabic), var(--font-plex-sans), ui-sans-serif;
--font-mono: var(--font-plex-mono), ui-monospace;
--shadow-xs: 0 1px 2px hsl(var(--shadow-color) / 0.06);
--shadow-sm: 0 1px 3px hsl(var(--shadow-color) / 0.08), 0 1px 2px hsl(var(--shadow-color) / 0.04);
--shadow-lg: 0 12px 32px -8px hsl(var(--shadow-color) / 0.18);
```

Soft tints are derived, not separate tokens:
`bg-[color-mix(in_oklch,var(--stage-teal)_14%,transparent)]` → wrapped in a
`tint()` utility class: `.tint-success`, `.tint-stage-teal` etc. (generated in
CSS with `@utility tint-*`).

### 2.3 Domain color map (single source: `frontend/src/lib/design/semantic.ts`)

| Domain value | Token | Icon (lucide) |
|---|---|---|
| Lead status new | info | `sparkles` |
| contacted | stage-sky | `phone-outgoing` |
| qualified | success | `badge-check` |
| unqualified | stage-slate | `circle-slash` |
| converted | primary | `arrow-right-left` (flips in RTL) |
| Deal won / lost / open | success / destructive / stage of current column | `trophy` / `x-circle` / — |
| Task overdue / today / upcoming | destructive / highlight / muted | `alarm-clock` |
| Priority high / medium / low | destructive / warning / muted | `chevrons-up` / `equal` / `chevron-down` |
| Source Facebook / WhatsApp / Email / Website / Manual / Import | stage-indigo / stage-emerald / stage-sky / stage-teal / stage-slate / stage-violet | channel glyph (custom SVG for FB/WA, lucide otherwise) |

Default pipeline stage keys: New Lead `slate` → Contacted `sky` → Qualified
`teal` → Demo `indigo` → Proposal Sent `violet` → Negotiation `amber` →
Won `emerald` / Lost `rose`.

## 3. Typography

- **Families:** IBM Plex Sans Arabic + IBM Plex Sans (designed as one
  system → matching x-height/weight across scripts in mixed strings like
  "شركة Acme"). IBM Plex Mono for IDs, phone numbers in tables, code.
  Loaded via `next/font/google` (`subsets: ["arabic","latin"]`, weights 400/500/600/700, `display: "swap"`).
- **Base size 14px** (data density), body 15px on reading surfaces (notes, emails).
- **Scale** (rem @16): `xs .75` · `sm .8125` · `base .875` · `md 1` · `lg 1.125` · `xl 1.375` · `2xl 1.75` · `3xl 2.25` (KPI numbers only).
- **Line-height:** Latin 1.5, Arabic 1.7 (`:lang(ar) { line-height: 1.7 }`) — Arabic ascenders/diacritics clip otherwise.
- **Arabic rules:** no `uppercase`, no `letter-spacing`, no italic (use weight/color for emphasis). Headings weight 600 not 700 (Plex Arabic 700 is heavy).
- **Numbers:** `font-variant-numeric: tabular-nums` on all tables, money, KPIs. Digits: Western (0-9) in both locales by default (ADR-011); `Intl.NumberFormat(locale, { numberingSystem: "latn" })`.
- **Mixed-direction text:** wrap user content that may be other-script in `<bdi>`; phone/email/IDs always `dir="ltr"` inside RTL.

## 4. Space, size, shape

- 4px grid. Common steps: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- **Density:** table rows 40px (comfortable) / 32px (compact, user toggle stored per user). Inputs/buttons 36px default, 32px `sm`, 40px `lg`. Touch targets on mobile web ≥ 40px.
- **Radius:** inputs/buttons 8px (`md`), cards/sheets 12px (`xl`), dialogs 14px, badges/pills full, avatars full.
- **Elevation:** level 0 = border only (default for cards on paper bg); level 1 `shadow-sm` = popovers/menus; level 2 `shadow-lg` = dialogs, dragged Kanban card. No shadows in tables.
- **Layout widths:** app content fluid; forms max 720px; reading panes (email/note) max 68ch.

## 5. Motion

- Durations: 120ms (hover/press), 180ms (popover/menu), 240ms (sheet/dialog), 320ms (page-level, theme reveal already exists).
- Easing: `cubic-bezier(0.2, 0, 0, 1)` enter, `cubic-bezier(0.4, 0, 1, 1)` exit.
- Kanban: dragged card lifts (scale 1.02, `shadow-lg`, 2° tilt toward drag direction); drop target column gets tinted background of its stage color.
- Realtime: new inbox message / notification slides in + 1s `highlight` soft pulse on the row. Never animate numbers in tables.
- `prefers-reduced-motion`: all of the above collapse to opacity fades ≤ 120ms.

## 6. Iconography

- lucide-react, 16px in dense UI, 20px in nav, stroke 1.75.
- **Directional icons flip in RTL** via a `<DirIcon>` wrapper (`rtl:-scale-x-100`): arrows, chevrons, `arrow-right-left`, `log-out`, `reply`, `send`. Non-directional icons (phone, check, clock) never flip.
- Channel brand glyphs (Facebook, WhatsApp) as monochrome SVG in `components/icons/` tinted by token — no full-color brand logos except in Settings → Integrations.

## 7. App shell

```
┌──────────┬──────────────────────────────────────────────────────┐
│  ◆ CRM   │  ⌕ Search (⌘K)            [+ Quick add]  🔔3  AR/EN ◐ │ topbar 56px, card bg, bottom border
│──────────│──────────────────────────────────────────────────────│
│ ▌Dashbrd │  Page title                       [secondary] [Primary]│ page header
│  Leads 12│  Filters / saved views ─────────────────────────────── │
│  Contacts│                                                        │
│  Companies│  content (table / board / detail)                     │
│  Deals   │                                                        │
│  Tasks  3│                                                        │
│  Inbox ● │                                                        │
│──────────│                                                        │
│  Settings│                                                        │
│  (avatar)│                                                        │
└──────────┴──────────────────────────────────────────────────────┘
 sidebar 248px / 64px collapsed, ink bg, on inline-START (right in Arabic)
 active item: teal 3px bar on inline-start edge + sidebar-accent bg
 counts: muted pill; unread inbox: amber dot (the one highlight in nav)
```

- **Record quick view:** clicking a row opens a `Sheet` from the inline-end side (left in AR); "Open full page" goes to `/[locale]/leads/[id]`.
- **Detail page layout:** header (name, status pill, owner avatar, primary actions) → two columns on ≥1280px: main (tabs: Timeline · Details · Deals · Tasks · Files) + side rail 320px (key facts, tags, custom fields).
- **Mobile web (<768px):** sidebar becomes bottom sheet nav; tables become card lists; Kanban becomes stage-tabbed list.

## 8. Component inventory

Base (shadcn, restyled by tokens): Button, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Dialog, AlertDialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs, Table, Badge, Avatar, Skeleton, Sonner, Command, Calendar, Form.

Button variants: `default` (teal), `secondary` (teal wash), `outline`, `ghost`, `destructive`, `highlight` (amber — **only** for one hero action per screen, e.g. "Convert lead", "Mark won").

CRM components (`frontend/src/components/crm/`):

| Component | Notes |
|---|---|
| `StatusPill` | tint bg + solid text + icon; props: `kind` (lead/deal/task/quote), `value` |
| `StageChip` | dot + name in current locale; color from stage key |
| `SourceBadge` | channel glyph + label |
| `Money` | `amount_minor` + `currency` → `Intl.NumberFormat`, tabular, `dir=ltr` |
| `PhoneLink` / `EmailLink` / `WhatsAppLink` | E.164 display, `dir=ltr`, click-to-act |
| `UserAvatar` / `AvatarStack` | existing `user-avatar.tsx` extended; initials fallback works for Arabic names (first letter of first + last word) |
| `RelativeTime` | `Intl.RelativeTimeFormat`, absolute on tooltip |
| `DataTable` | TanStack Table: toolbar (search, filters, column toggle, density), saved views, sticky header, bulk-action bar (slides up from bottom, ink bg), server pagination |
| `FilterBar` | chips, removable; filter state in URL search params |
| `EmptyState` | icon in teal wash circle, one sentence, one CTA |
| `StatCard` | label, KPI (2xl, tabular), delta (success/destructive with arrow), optional sparkline; "today" card uses highlight top border |
| `Timeline` / `TimelineItem` | vertical rail on inline-start, icon per activity type, grouped by day |
| `KanbanBoard` / `KanbanColumn` / `DealCard` | column header tinted by stage, total value + weighted; card: 3px stage rail on inline-start, title, company, Money, owner avatar, close date (red if past) |
| `ConversationList` / `MessageBubble` / `Composer` | outbound bubble = teal wash, inbound = card; status ticks (sent/delivered/read/failed); 24h-window banner in highlight tint |
| `CommandPalette` | ⌘K / Ctrl K: global search (leads, contacts, companies, deals) + actions |
| `EntityPicker` | async Combobox for user/contact/company/deal |
| `DateRangePicker` | presets: today, 7d, 30d, this quarter, custom |
| `TranslatableInput` | existing; extended with tabbed AR/EN |
| `ConfirmDialog`, `PageHeader`, `SectionCard`, `KeyValueList` | layout helpers |

## 9. Signature moments (what makes it not-plain, used sparingly)

1. **Ink sidebar** with teal active bar — instant recognition.
2. **Login / onboarding:** split screen — ink panel with a subtle Islamic-geometric line pattern (8-point star lattice, SVG, `sidebar-border` stroke at 8% opacity) + product line in both languages; form on paper.
3. **Dashboard header:** faint teal radial wash behind KPI row (only here).
4. **Kanban:** stage-tinted columns, lift-and-tilt drag, confetti-free "Won" moment = card flashes emerald tint + toast with deal value.
5. **Amber means "look here"** — users learn it fast because it's rare.

## 10. RTL rules (enforced in review)

- Tailwind logical utilities only: `ms-/me-/ps-/pe-/start-/end-/border-s/rounded-s`, `text-start`. ESLint rule (custom `no-restricted-syntax` on class strings matching `\b(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|border-l|border-r)-`) — PLAN step 1.5.
- `dir` set on `<html>` from locale route segment (server-rendered — fixes current client-side flash).
- Sheets/drawers open from `end`; toasts at `bottom-end`; sidebar at `start`.
- Charts: x-axis reversed in RTL for time series (`reversed` prop in Recharts), legends at end.
- Kanban column order follows reading direction (first stage at start).
- Test every new screen in both locales before marking a step done (screenshot pair in PR).

## 11. Accessibility

- AA contrast for all text (verified above); focus ring 2px `ring` + 2px offset, never removed.
- Kanban drag also keyboard-operable (@dnd-kit keyboard sensor) + "Move to stage" menu fallback.
- Every icon-only button has `aria-label` (translated).
- Live regions for realtime toasts and inbox (`aria-live="polite"`).

## 12. Governance

- New color? Add a token here first, then CSS. No hex/oklch literals in components (lint: `no-restricted-syntax` for `#[0-9a-f]{3,6}` / `oklch(` in `.tsx`).
- New component? Add to §8 table in the same PR.
- A `/[locale]/dev/design` page (dev-only, PLAN step 0.5) renders every token, component and state in both themes × both directions — the living reference.
