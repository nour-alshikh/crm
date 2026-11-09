# 01 — Architecture

## System diagram

```mermaid
flowchart LR
  subgraph Clients
    B[Browser<br/>Next.js app]
    M[Expo mobile app<br/>Phase 6]
  end
  subgraph VPS["Production VPS (Forge)"]
    N[Nginx<br/>TLS]
    W[Next.js server<br/>next start :3000]
    A[Laravel API<br/>PHP-FPM]
    H[Horizon workers<br/>webhooks · default · imports · mail · notifications]
    S[Scheduler<br/>schedule:work]
    R[Reverb<br/>:8080 websockets]
    DB[(MySQL 8.4)]
    RD[(Redis<br/>queue · cache · broadcast)]
    FS[(Storage<br/>local disk → S3-compatible later)]
  end
  subgraph External
    FB[Meta Graph API<br/>Lead Ads]
    WA[WhatsApp Cloud API]
    PM[Postmark<br/>out + inbound]
    WEB[Company website form]
    EXP[Expo Push]
    SEN[Sentry]
  end
  B -- "crm.example.com (pages + /api, /sanctum rewrites)" --> N --> W
  W -- "rewrite /api/* /sanctum/* /broadcasting/*" --> A
  B -- "wss://ws.crm.example.com" --> N --> R
  M -- "Bearer token https://api.crm.example.com/api/v1" --> N --> A
  A --> DB & RD & FS
  H --> DB & RD & FS
  H -- broadcast --> R
  FB & WA & PM & WEB -- webhooks --> N --> A
  H -- fetch lead / send msg --> FB & WA & PM
  H -- push --> EXP
  A & H & W -.-> SEN
```

## Repo structure

```
/                     CLAUDE.md, README.md, SETUP.md, .github/workflows/, docker-compose.yml (Sail)
backend/              Laravel 13 API
frontend/             Next.js 16 web app
mobile/               Expo app (Phase 6)
docs/                 00–09 plan docs, PLAN.md, RISKS.md, DECISIONS.md, legacy template docs
```

## Backend folder structure (target)

```
backend/app/
  Actions/                 single-purpose business operations (ConvertLead, MoveDealToStage, AssignLeadRoundRobin…)
  Enums/                   LeadStatus, StageType, ActivityType, TaskPriority, Channel, MessageStatus, QuoteStatus…
  Events/                  LeadCreated, DealStageChanged, MessageReceived… (ShouldBroadcast where realtime)
  Exceptions/              ApiExceptionRenderer (existing), DomainException subclasses
  Http/
    Controllers/Api/V1/    one controller per resource (+ invokable for actions)
    Controllers/Webhooks/  FacebookWebhookController, WhatsAppWebhookController, PostmarkInboundController, WebsiteFormController
    Middleware/            SetLocale (existing), VerifyMetaSignature, VerifyPostmarkBasicAuth, VerifyFormApiKey
    Requests/V1/<Module>/  Store/Update/Index (filters) requests
    Resources/V1/          API Resources
  Integrations/
    Meta/                  GraphClient, LeadAdsService, WhatsAppClient, TemplateSync
    Email/                 InboundEmailParser (interface) + PostmarkInboundParser, ThreadResolver
  Jobs/                    ProcessWebhookLog, FetchFacebookLead, ImportLeadsChunk, SendWhatsAppMessage, SendTaskReminder…
  Listeners/
  Models/                  + Concerns/ (HasVisibilityScope, HasCustomFields, HasTimeline, Taggable, NormalizesContactInfo)
  Notifications/
  Policies/
  Providers/
  Services/                DuplicateDetector, PhoneNormalizer, MoneyFormatter, ReportQuery…
  Support/                 HasTranslations (existing), Visibility (scope builder), Envelope helpers
backend/routes/
  api.php                  `/api/v1/*` (prefix applied in bootstrap/app.php)
  webhooks.php             `/webhooks/*` (no auth, signature middleware, no CSRF)
  channels.php             broadcast channel auth
  console.php              schedule
backend/tests/
  Feature/<Module>/        per-endpoint + per-role tests
  Unit/                    services, actions
  Pest.php, Datasets/roles.php
```

## Frontend folder structure (target)

```
frontend/src/
  app/
    [locale]/
      (auth)/login, forgot-password, reset-password     ← public, split-screen layout
      (app)/layout.tsx                                   ← AppShell (sidebar + topbar), auth guard
      (app)/dashboard, leads, leads/[id], contacts, contacts/[id], companies, companies/[id],
            deals (board|list), deals/[id], tasks, inbox, inbox/[conversationId], quotes, quotes/[id],
            reports, notifications, settings/{profile,users,teams,roles,pipelines,lead-sources,
            lost-reasons,products,templates,custom-fields,tags,integrations,webhooks,audit}
      dev/design                                         ← design-system playground (dev only)
    layout.tsx                                           ← minimal root (fonts)
  components/
    ui/          shadcn primitives (restyled)
    crm/         StatusPill, StageChip, Money, DataTable, KanbanBoard… (see 09-design-system §8)
    shell/       AppSidebar, Topbar, CommandPalette, NotificationBell, LocaleSwitcher, ThemeToggle
    forms/       field components bound to react-hook-form
  features/<module>/   api.ts (query/mutation hooks), schema.ts (zod), columns.tsx, components/
  lib/
    api/         client.ts (openapi-fetch + CSRF + errors), schema.d.ts (GENERATED), query-keys.ts
    echo.ts      Laravel Echo setup
    design/      semantic.ts (domain → token map)
    format.ts    money, date, phone (Intl)
  i18n/          routing.ts, request.ts, navigation.ts
  messages/      ar.json, en.json
  proxy.ts       next-intl middleware + auth redirect (Next 16 `proxy` convention)
```

## Auth flows

### Web (Sanctum SPA cookie via same-origin rewrites)

```mermaid
sequenceDiagram
  participant Br as Browser (crm.example.com)
  participant Nx as Next.js (rewrites)
  participant La as Laravel API
  Br->>Nx: GET /sanctum/csrf-cookie
  Nx->>La: proxy
  La-->>Br: Set-Cookie XSRF-TOKEN, crm_session (domain crm.example.com)
  Br->>Nx: POST /api/v1/auth/login {email,password} + X-XSRF-TOKEN
  Nx->>La: proxy (Origin/Referer = crm.example.com ∈ SANCTUM_STATEFUL_DOMAINS)
  La-->>Br: 200 {data:user, permissions[]} + session regen + auth_status=1 cookie
  Br->>Nx: GET /en/leads (proxy.ts sees auth_status → allow)
  Br->>Nx: GET /api/v1/leads (cookie)
  Nx->>La: proxy → auth:sanctum resolves session
  Br->>Nx: POST /api/v1/auth/logout → session invalidated, auth_status cleared
```

- `auth_status` is a UX hint for `proxy.ts` redirects only; **every API call is authorized server-side**.
- Session lifetime 8h sliding; "remember me" 30 days.
- Login throttled 5/min per email+IP; lockout notice translated.

### Mobile (Phase 6, Sanctum tokens)

```mermaid
sequenceDiagram
  participant App as Expo app
  participant La as Laravel API
  App->>La: POST /api/v1/auth/token {email,password,device_name}
  La-->>App: {token, user, permissions}
  App->>App: store token in expo-secure-store
  App->>La: GET /api/v1/me  Authorization: Bearer …
  App->>La: POST /api/v1/devices {expo_push_token, platform}
  App->>La: DELETE /api/v1/auth/token (logout → revoke current token)
```

Tokens: abilities `["mobile"]`, expiry 90 days, listed + revocable in Settings → Profile → Devices.

## Realtime flow

```mermaid
sequenceDiagram
  participant WH as Webhook (WhatsApp)
  participant Q as Horizon job
  participant DB as MySQL
  participant R as Reverb
  participant U as Assignee browser (Echo)
  WH->>Q: ProcessWebhookLog
  Q->>DB: upsert conversation + message
  Q->>R: broadcast MessageReceived on private-user.{assigneeId} and private-conversation.{id}
  R-->>U: event
  U->>U: TanStack Query setQueryData / invalidate ['conversations'], toast, unread++
```

Channels (`routes/channels.php`):
- `private-user.{id}` — notifications, assignment events (only that user).
- `private-team.{id}` — Kanban updates (`DealMoved`, `DealUpdated`) for team members & managers.
- `private-pipeline.{id}` — board-level updates for admins/view_all.
- `private-conversation.{id}` — messages + status ticks; authorized via ConversationPolicy@view.

Echo `authorizer` posts to `/broadcasting/auth` through the Next rewrite (same-origin cookie). Client ignores events it caused (`X-Socket-ID` header → `->toOthers()`).

## Queue / webhook flow

```mermaid
flowchart TD
  A[POST /webhooks/whatsapp] --> B{Verify signature<br/>X-Hub-Signature-256}
  B -- invalid --> X[401, log nothing but metric]
  B -- valid --> C[INSERT webhook_logs<br/>status=pending, payload, headers, dedupe_key]
  C --> D{dedupe_key exists?}
  D -- yes --> E[200 OK, skip]
  D -- no --> F[dispatch ProcessWebhookLog on 'webhooks' queue]
  F --> G[200 OK  <100ms]
  F --> H[Job: route by provider+type]
  H --> I[Fetch extra data e.g. Graph API lead]
  I --> J[Normalize phone/email → DuplicateDetector]
  J --> K[Create/link Lead or Contact, Conversation, Message, Activity]
  K --> L[Assign round-robin if new]
  L --> M[Broadcast + Notification]
  M --> N[webhook_logs status=processed]
  H -- exception --> O[retries 5x backoff 10s,60s,5m,30m,2h → status=failed, error]
  O --> P[Settings → Webhooks: Retry button → re-dispatch]
```

## Environments

| Env | Web | API | DB | Mail | Meta |
|---|---|---|---|---|---|
| local | `localhost:3000` | `localhost:8000` (Sail) | Sail MySQL | Mailpit `:8025` | Meta test app + ngrok/cloudflared tunnel for webhooks |
| staging | `staging.crm.<co>` | `api.staging.crm.<co>` | separate DB on staging VPS | Postmark sandbox server | Meta app in dev mode, test page & WA test number |
| production | `crm.<co>` | `api.crm.<co>` | prod MySQL, nightly backups offsite | Postmark live | Live app, verified business, real number |

Config via `.env` only; `config:cache` in staging/prod. Feature flags in `config/crm.php` (`features.inbox`, `features.facebook`, …) so unfinished integrations can ship dark.
