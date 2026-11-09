# 05 — Integrations

All integrations share one pipeline (see `01-architecture.md` → queue/webhook flow):

**webhook → verify signature → store raw in `webhook_logs` (dedupe key) → 200 immediately → queued `ProcessWebhookLog` on `webhooks` queue → provider handler → normalise + dedupe → create/link lead/contact/conversation → assign → broadcast + notify → mark processed.** Failed logs: 5 retries with backoff, then `failed`; Settings → Webhooks shows payload, error, **Retry**.

Core classes (built once in step 3.1):
- `WebhookLog` model, `RecordWebhook` action, `ProcessWebhookLog` job (`ShouldBeUnique` by log id, `$tries=5`, `backoff=[10,60,300,1800,7200]`).
- `WebhookHandler` interface `handle(WebhookLog $log): void` → `FacebookLeadgenHandler`, `WhatsAppMessageHandler`, `WhatsAppStatusHandler`, `PostmarkInboundHandler`, `PostmarkEventHandler`, `WebsiteFormHandler`.
- `IntegrationSettings` service reading encrypted `integration_settings` (cached 5 min, busted on save).
- Local dev: `cloudflared tunnel --url http://localhost:8000` (free, stable named tunnel) for Meta/Postmark callbacks.

---

## 1. Facebook Lead Ads

### Company prepares (week 1)
1. Meta Business Manager account, **Business Verification** submitted (1–4 weeks).
2. Admin role on the Facebook Page(s) running lead ads, Page connected to Business Manager.
3. Meta Developer app (type *Business*) owned by the Business Manager; add developer as app admin.
4. Privacy policy URL + data deletion instructions URL on company website (required for App Review).

### Permissions & review
- Permissions: `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`, `business_management` (if pages are owned via BM). Advanced Access requires **App Review** (screencast of the CRM using them) + Business Verification.
- Until approved: app in **Development mode** — works for app admins/developers/testers and pages they admin. Use **Meta Lead Ads Testing Tool** (`developers.facebook.com/tools/lead-ads-testing`) to fire test leads.
- Token strategy: **System User** in Business Manager with the Page assigned → generate a **never-expiring Page access token** (preferred over user tokens that expire in 60 days). Store encrypted in `facebook_pages.access_token`.

### Code plan
1. Settings → Integrations → Facebook: fields App ID, App Secret, Verify Token (generated), System User token. "Load pages" → `GET /me/accounts` → choose pages → store page tokens.
2. Subscribe page: `POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`; App Dashboard → Webhooks → Page object → `leadgen` field → callback `https://api…/webhooks/meta`, verify token.
3. `GET /webhooks/meta` returns `hub.challenge` if `hub.verify_token` matches.
4. `POST /webhooks/meta`: verify `X-Hub-Signature-256` = `sha256=` HMAC(app_secret, **raw body**); store one `webhook_logs` row per `entry.changes[]` with dedupe key `fb:leadgen:{leadgen_id}`.
5. `FacebookLeadgenHandler` → `FetchFacebookLead` → `GET /{leadgen_id}?fields=created_time,field_data,ad_id,ad_name,adset_name,campaign_id,campaign_name,form_id,platform` with page token (Graph API version pinned in config, e.g. `v24.0` — verify current at implementation).
6. Forms: on first lead from unknown `form_id`, fetch `GET /{form_id}?fields=name,questions` → create `facebook_forms` row with auto mapping (`full_name`, `first_name`, `last_name`, `email`, `phone_number`, `company_name`, `job_title`, `city`); unmapped questions → custom fields or `external_meta.answers`. Admin can edit mapping per form.
7. Create lead: source `facebook`, `external_id = leadgen_id` (unique → idempotent), `source_detail = "{campaign_name} — {form name}"`, `external_meta` (ids, platform fb/ig), dedupe, round-robin (form's `default_team_id` or global), notify.
8. Backfill command `crm:facebook:backfill {form} --since=` using `GET /{form_id}/leads` (covers webhook outages; scheduled daily for last 48h, idempotent by `external_id`).

---

## 2. WhatsApp Cloud API (official Meta)

### Company prepares (week 1 — critical path)
1. **Verified Meta Business** (same as above).
2. **Dedicated phone number** never registered on WhatsApp/WhatsApp Business app (or deleted from it), able to receive SMS/voice OTP.
3. WhatsApp Business Account (WABA) in Business Manager, display name approved (must match brand).
4. Payment method on WABA (conversation-based/ per-message pricing — check current Meta pricing).
5. Initial message templates drafted in **both Arabic (`ar`) and English (`en_US`)**: `lead_welcome`, `follow_up`, `demo_reminder`, `quote_sent` (category *utility* where possible).

### Concepts to respect
- **24-hour customer service window:** free-form messages only within 24h of the customer's last inbound message (`conversations.last_inbound_at`). Outside → **approved template** only. API enforces this too; UI must prevent it.
- Message statuses via webhook: `sent → delivered → read`, or `failed` (with error code, e.g. 131047 re-engagement required, 131026 undeliverable).
- Media: inbound media comes as `media_id` → `GET /{media_id}` → URL (expires ~5 min) → download with token → store in medialibrary.
- Throughput/quality rating & tier limits on business-initiated conversations — surfaced in Settings.

### Code plan
1. Settings → WhatsApp: WABA ID, Phone Number ID, permanent System User token (`whatsapp_business_messaging`, `whatsapp_business_management`), App Secret (shared Meta app), Verify Token. "Send test message".
2. Webhook subscription: app → WhatsApp → Webhooks → fields `messages` (includes statuses). Same `/webhooks/meta` endpoint, routed by `object = whatsapp_business_account`.
3. `WhatsAppMessageHandler` (dedupe `wa:msg:{wamid}`): find/create `conversation` (channel whatsapp, thread_key = sender E.164) → link to contact by `whatsapp_e164`/`phone_e164`, else lead by `phone_e164`, else **create lead** (source whatsapp, name from `contacts[].profile.name`) → store `message` (in, received) → update `last_inbound_at`, `last_message_at` → `activities` row (type whatsapp) → broadcast `MessageReceived` → notify assignee.
4. `WhatsAppStatusHandler` (dedupe `wa:status:{wamid}:{status}`): update message status/timestamps; failures → notify sender with translated error.
5. Outbound `SendWhatsAppMessage` job (queue `default`, tries 3): `POST /{phone_number_id}/messages` (`type: text` or `type: template` with `components` params, language code by contact `preferred_locale`); save `wamid` as `external_id`; status `sent` when API accepts.
6. Template management: `TemplateSync` pulls `GET /{waba_id}/message_templates` (name, language, status, components) → `message_templates`; scheduled hourly + manual button. Create/submit templates stays in Meta UI (v1) — link out from screen.
7. Opt-out: inbound "STOP"/"إيقاف" → flag `contacts.whatsapp_opt_out` (Phase 5 hardening) and block business-initiated templates.

---

## 3. Email

### Company prepares (Phase 3 start)
- Sending domain (e.g. `mail.<co>` or main domain) DNS: **SPF**, **DKIM** (Postmark records), **DMARC** `p=none` → `quarantine` later, **Return-Path** CNAME.
- Inbound: a Postmark inbound address; company forwards `sales@<co>` to it (Google Workspace / M365 routing rule) **or** points an MX for a subdomain (`reply.<co>`) to Postmark.
- Decide sender identity: per-user `Name <name@co>` (requires Sender Signature per user or domain verification — domain verification covers all) — default: domain verified, From = user name + user email, Reply-To = `reply+{conversation_ulid}@reply.<co>`.

### Code plan
1. Outbound: Laravel mailer `postmark` (symfony/postmark-mailer). `SendConversationEmail` job builds Mailable with headers: `Message-ID: <{ulid}@reply.<co>>`, `In-Reply-To` + `References` from last inbound in the conversation; stores message (out, queued→sent). Postmark message stream `outbound`; transactional system mail (password reset, notifications) on a separate stream.
2. Inbound: Postmark inbound webhook → `/webhooks/postmark/inbound` (basic auth). `PostmarkInboundParser` → DTO {from, to, cc, subject, text, html, message_id, in_reply_to, references, attachments}.
3. Threading (`ThreadResolver`): (a) Reply-To plus-address `reply+{ulid}` → conversation; (b) `In-Reply-To`/`References` match `messages.external_id`; (c) else new conversation with thread_key = Message-ID; link by sender `email_normalized` to contact → lead → else create lead (source email).
4. Sanitize HTML (`symfony/html-sanitizer`), strip quoted reply for preview (`email-reply-parser`), store attachments as media (size limit 20 MB total).
5. Delivery events webhook (bounce, spam complaint) → message status failed + mark email invalid on contact.
6. Fallback option (documented, not built): IMAP polling via `webklex/laravel-imap` behind same `InboundEmailParser` interface.
7. Local dev: Mailpit for outbound; inbound tested with fixture JSON posted to the webhook (Pest + `cloudflared` for manual).

---

## 4. Website form

### Company prepares
- Access to website code (or the agency) to add a form POST / JS snippet.
- Cloudflare Turnstile site key (optional, free) if spam appears.

### Code plan
1. Settings → Integrations → Website form: create **form key** (shown once; stored hashed + 8-char prefix for lookup), allowed origins, default team, lead source (default `website`).
2. `POST /public/v1/leads` JSON or form-encoded: `name|first_name,last_name, email, phone, company, message, utm_*, page_url, website (honeypot), cf_turnstile_token?`.
3. Middleware chain: CORS (allowed origins per key) → `throttle:public-form` → `VerifyFormApiKey` → honeypot (filled → return 200 but drop, log as ignored) → optional Turnstile verify.
4. Store as webhook log (provider `website`) → same handler pipeline → lead with `external_meta.utm` + `page_url`.
5. Deliver a copy-paste snippet in Settings (plain HTML form + 20-line fetch script, bilingual success message).

---

## 5. Excel/CSV import (in-app, Phase 2)

1. Upload (≤ 10 MB, ≤ 20k rows, `.csv/.xlsx`) → `maatwebsite/excel` reads headers + first 5 rows.
2. Mapping UI auto-suggests by header name (EN + AR synonyms: "الاسم", "الجوال", "البريد الإلكتروني"…).
3. Options: source, team, assignee (or round-robin), dedupe policy `skip` / `link (mark duplicate)` / `create anyway`, default status.
4. `ImportLeads` → chunked jobs (500 rows, queue `imports`, `Bus::batch`) → per-row validation + normalisation; progress via broadcast to `private-user.{id}`.
5. Finish: summary + downloadable **error report xlsx** (original row + error column). Notification to user.

---

## Company preparation timeline (summary)

| Week | Item |
|---|---|
| 1 | Business verification submitted; WA number chosen; Page admin access; Meta dev app created; domains/DNS access; VPS/Forge |
| 2–3 | WABA set up, display name approved; WA templates submitted (AR+EN) |
| Phase 3 start | Email DNS (SPF/DKIM/DMARC/Return-Path), inbound forwarding; Postmark account approved (Postmark manually reviews new accounts) |
| Phase 3 mid | App Review submission for Lead Ads permissions (needs working staging + screencast) |
| Phase 5 | Live mode switch, production tokens, website snippet deployed |
