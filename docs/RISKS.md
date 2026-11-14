# RISKS

Likelihood (L) / Impact (I): H/M/L. Review at every phase exit.

| # | Risk | L | I | Mitigation | Owner / step |
|---|---|:-:|:-:|---|---|
| R1 | **Meta Business verification / App Review delays** (weeks, rejections) block Lead Ads & WhatsApp | H | H | Submit verification week 1 (0.0); build against dev-mode app + Lead Ads Testing Tool + WA test number; Phase 4 can run while waiting; website form & import cover lead intake meanwhile; App Review screencast prepared early (3.14) | Company + 0.0, 3.14 |
| R2 | **WhatsApp 24-hour window** — reps try to message cold leads, messages fail, or quality rating drops | H | M | UI enforces window (composer switches to templates), API returns `window_closed`; templates pre-approved in AR+EN week 2–3; `throttle:messages`; opt-out handling (5.4); show quality rating in settings | 3.9, 5.4 |
| R3 | **Duplicate leads** (same person via FB + WA + form; phone formats vary) | H | M | E.164 + normalized email indexes; DuplicateDetector on every path (manual, import, webhooks); flag + link not auto-merge; duplicates saved view; manual merge (5.4); FB `external_id` uniqueness | 2.1, 2.3, 5.4 |
| R4 | **Lost webhooks** (server down, deploy, bug) → lost leads | M | H | Store-first-then-process; 200 fast; retries + failed list + Retry button; FB daily backfill for 48h; alert if no leads 72h; zero-downtime deploys; Meta retries for up to 36h anyway | 3.1, 3.5, 3.14 |
| R5 | **Permission leaks** (rep sees others' data via list, search, export, report, timeline, realtime channel) | M | H | Single `visibleTo` scope; 404 binding; route audit test; per-role dataset tests per endpoint; channel auth tests; 100% coverage on Policies/Visibility; security review step | 1.3, 5.1 |
| R6 | **Scope creep** (solo dev, many modules, company requests during demo) | H | H | MVP gate with feedback triage; backlog section; each step one PR; no new module without updating PLAN; phase exit criteria are the contract | PLAN gates |
| R7 | **Arabic PDF rendering** (broken letter shaping, RTL tables, mixed numbers) | M | M | mPDF with embedded Plex Arabic + `autoLangToFont`; sample PDFs signed off by company in 4.5; parser-based test; fallback Browsershot if mPDF fails specific needs | 4.5 |
| R8 | **RTL bugs** (physical CSS, icons, charts, DnD keyboard) | H | M | Logical-only lint rule; `DirIcon`; SSR `dir`; screenshot pairs per PR; RTL Playwright smoke + visual diff; native-speaker review (5.3) | 1.5, 5.3 |
| R9 | **Laravel 13 / Next 16 breaking changes & newer-than-training APIs** | M | M | Upgrade first (0.2) before features; read bundled Next docs (`frontend/AGENTS.md`); pin versions; Dependabot weekly | 0.2, 0.4 |
| R10 | **Local env friction on Windows** (PHP 8.2, no Docker; slow bind mounts) | H | L | Docker Desktop + WSL2 + Sail via `backend/sail` wrapper; repo stays on the Windows drive (move into WSL if bind-mount speed hurts); ports shifted to coexist with XAMPP (ADR-027) | 0.1 |
| R11 | **Realtime infra** (Reverb behind proxy, websockets + TLS, scaling) | M | M | Forge Reverb integration; staging verification in 1.15; UI degrades gracefully (refetch on focus, polling fallback for inbox) | 1.15 |
| R12 | **Round-robin race / unfair assignment** under bursty webhooks | M | M | Row lock on assignment rule; concurrency test; manual reassign; "away" flag | 2.4 |
| R13 | **Email deliverability / threading** (SPF/DKIM missing, replies not threaded) | M | M | DNS checklist; Postmark domain verification; plus-addressed Reply-To + header threading; inbound fixtures tests | 3.11, 3.12 |
| R14 | **Data migration from current tool** messy | M | M | Import tool built in Phase 2 with error reports; dry-run on staging; reconciliation | 2.17, 5.7 |
| R15 | **Single VPS failure** | L | H | Nightly + hourly off-site backups, quarterly restore drill, provider snapshots, documented rebuild via Forge (< 2h) | 5.5, 5.6 |
| R16 | **Secrets leakage** (integration tokens in logs, responses, audit) | L | H | Encrypted cast; masking; activitylog exclusions; Sentry scrubbing; tests asserting masking | 3.2, 06-security |
| R17 | **Currency/FX ambiguity** in reports (deals in multiple currencies) | M | L | Default currency + manual rates table; reports show "converted at configured rates" note; Q1 asked early | 1.11, 4.7 |
| R18 | **Kanban concurrent edits** | M | L | `lock_version` 409 + realtime updates | 2.8, 2.9 |
| R19 | **Company dependencies late** (DNS, users list, pipeline stages, templates) | M | M | Dated checklist in 0.0; demo uses seeded defaults; blockers escalated at phase exits | 0.0 |
| R20 | **Mobile store rejection** (privacy labels, login demo account, push permission copy) | M | M | Demo reviewer account, privacy policy, store guidelines checklist in 6.11 | 6.11 |
| R21 | **Postmark account approval** (manual review for new accounts) | M | M | Apply at Phase 3 start; alternative SES/Mailgun via same parser interface | 3.11 |
| R22 | **Performance with Arabic full-text** (ngram index size, relevance) | L | M | ngram token size 2; limit search to name/email/phone; measure in 5.2 | 2.20, 5.2 |
