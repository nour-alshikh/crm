# 08 — Deployment

Target: Laravel **Forge** managing two Ubuntu 24.04 LTS VPSs (ADR-015). Existing `docs/deployment.md` (template) explains the Next.js rewrite proxy mode — still valid.

| Env | Server | Size | Domains |
|---|---|---|---|
| staging | VPS-1 | 2 vCPU / 4 GB | `staging.crm.<co>`, `api.staging.crm.<co>`, `ws.staging.crm.<co>` |
| production | VPS-2 | 4 vCPU / 8 GB / 80 GB SSD | `crm.<co>`, `api.crm.<co>`, `ws.crm.<co>` |

Managed MySQL (provider) is optional; default = MySQL on the same VPS with backups (30 users is light).

## Server setup (Forge)

1. Provision "App server" with PHP 8.4 (≥ 8.3), MySQL 8.4, Redis, Nginx, Node 22, Supervisor; enable UFW (22, 80, 443 only), unattended security upgrades, fail2ban.
2. Sites:
   - `api.crm.<co>` → repo `backend/` as web directory root `backend/public`; Let's Encrypt.
   - `crm.<co>` → Nginx reverse proxy to `127.0.0.1:3000` (Next.js `next start`), Let's Encrypt.
   - `ws.crm.<co>` → Forge's **Reverb** integration (Nginx proxy to `127.0.0.1:8080`, websocket upgrade headers, increased `worker_connections`/`ulimit`).
3. Daemons (Supervisor via Forge):
   - `php artisan horizon` (one process; Horizon manages workers per queue in `config/horizon.php`: webhooks 2–4, default 2, notifications 2, mail 1, imports 1).
   - `php artisan reverb:start --host=127.0.0.1 --port=8080`.
   - `node .next/standalone/server.js` (or `npm run start`) with `PORT=3000` for the web app (Next `output: "standalone"`).
4. Scheduler: Forge "Scheduler" → `php artisan schedule:run` every minute (task reminders, FB backfill, WA template sync, prune webhook logs, backups, `horizon:snapshot`, rotting-deal digest).
5. Redis: `maxmemory-policy noeviction` (queues must not be evicted); separate DB indexes for cache/queue/session.
6. Storage: `storage/app/private` on local disk; `php artisan storage:link`. (Swap to S3-compatible via env if disk becomes a concern.)

## Zero-downtime deploys

Forge **Envoyer-style zero-downtime** (Forge "Zero Downtime Deployments" feature, release directories + symlink) or deploy script:

```bash
# backend (api site)
cd $FORGE_RELEASE_DIRECTORY/backend
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
php artisan migrate --force          # migrations must be backward-compatible (expand → contract)
php artisan optimize                 # config, route, view, event cache
php artisan horizon:terminate        # Supervisor restarts Horizon with new code
php artisan reverb:restart
php artisan queue:restart
# frontend (web site)
cd $FORGE_RELEASE_DIRECTORY/frontend
npm ci && npm run build              # standalone output
sudo supervisorctl restart crm-web
```

Rules: migrations are **expand/contract** (add column → deploy code → backfill → drop old next release); never rename columns in one step. Feature flags (`config/crm.php`) for dark launches.

## Env variables

### backend `.env`
```
APP_NAME=CRM  APP_ENV=production  APP_KEY=  APP_DEBUG=false  APP_URL=https://api.crm.<co>
APP_PREVIOUS_KEYS=
FRONTEND_URL=https://crm.<co>   FRONTEND_URLS=https://crm.<co>
SANCTUM_STATEFUL_DOMAINS=crm.<co>   SESSION_DOMAIN=crm.<co>   SESSION_DRIVER=redis   SESSION_LIFETIME=480
SESSION_SECURE_COOKIE=true   SESSION_COOKIE=crm_session   AUTH_STATUS_COOKIE=auth_status
DB_CONNECTION=mysql DB_HOST=127.0.0.1 DB_PORT=3306 DB_DATABASE=crm DB_USERNAME=crm DB_PASSWORD=
REDIS_HOST=127.0.0.1 REDIS_PASSWORD= REDIS_PORT=6379
QUEUE_CONNECTION=redis  CACHE_STORE=redis
BROADCAST_CONNECTION=reverb
REVERB_APP_ID= REVERB_APP_KEY= REVERB_APP_SECRET= REVERB_HOST=ws.crm.<co> REVERB_PORT=443 REVERB_SCHEME=https
REVERB_SERVER_HOST=127.0.0.1 REVERB_SERVER_PORT=8080
MAIL_MAILER=postmark  POSTMARK_API_KEY= POSTMARK_MESSAGE_STREAM_ID=outbound  MAIL_FROM_ADDRESS=crm@<co> MAIL_FROM_NAME="CRM"
POSTMARK_INBOUND_USER= POSTMARK_INBOUND_PASSWORD=  EMAIL_REPLY_DOMAIN=reply.<co>
META_GRAPH_VERSION=v24.0   # verify current
CRM_DEFAULT_LOCALE=ar CRM_TIMEZONE=Asia/Riyadh CRM_DEFAULT_CURRENCY=USD CRM_DEFAULT_COUNTRY=SA
ADMIN_EMAIL= ADMIN_PASSWORD=          # first deploy only, then remove
BACKUP_DISK=b2  BACKUP_ARCHIVE_PASSWORD=  AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= AWS_DEFAULT_REGION= AWS_BUCKET= AWS_ENDPOINT=
SENTRY_LARAVEL_DSN=  SENTRY_TRACES_SAMPLE_RATE=0.1
HORIZON_ALLOWED_EMAILS=admin@<co>
TURNSTILE_SECRET=
```
Meta/WhatsApp/Facebook secrets are **not** env vars — entered in Settings → Integrations (encrypted in DB) so admins can rotate without deploys. Exception: none.

### frontend env
```
BACKEND_URL=http://127.0.0.1:8000      # rewrite target (same VPS → internal; or https://api.crm.<co>)
NEXT_PUBLIC_REVERB_KEY=  NEXT_PUBLIC_REVERB_HOST=ws.crm.<co>  NEXT_PUBLIC_REVERB_PORT=443  NEXT_PUBLIC_REVERB_SCHEME=https
NEXT_PUBLIC_AUTH_STATUS_COOKIE=auth_status
NEXT_PUBLIC_SENTRY_DSN=  SENTRY_AUTH_TOKEN=   # source maps upload at build
```

## Staging → production process

1. Feature branch → PR → CI green → merge to `main` → **auto-deploy to staging** (Forge quick deploy on `main`).
2. Smoke test on staging (Playwright smoke suite run by GitHub Action against staging URL after deploy webhook).
3. Tag release `vX.Y.Z` (changelog from conventional commits) → GitHub Action calls Forge deploy hook for **production** (manual approval via GitHub Environments).
4. Post-deploy: Sentry release marked, `/up` health check, Horizon dashboard green.
5. Rollback: Forge zero-downtime → "Rollback" to previous release (only if no destructive migration — which expand/contract guarantees).

## Monitoring & error tracking

- **Sentry** (Laravel + Next.js) — errors, performance traces 10%, release tracking, PII scrubbing.
- **Laravel Pulse** (optional, cheap) on `/pulse` for slow queries/requests/jobs; or Horizon metrics + `horizon:snapshot`.
- **Uptime**: Forge heartbeats for scheduler; external uptime check (UptimeRobot/BetterStack) on `https://crm.<co>`, `https://api.crm.<co>/up`, Reverb TCP.
- **Queue alerts**: Horizon long-wait notifications (webhooks > 60s) → email/Slack.
- **Webhook health**: daily digest of failed `webhook_logs` to admins; alert if no FB lead received for 72h while ads are active (setting).
- **Logs**: `daily` channel, 14 days; Forge log viewer; errors to Sentry.
- **Backups**: `backup:monitor`, quarterly restore drill to staging (`php artisan backup:restore`-style script documented in `docs/runbooks/restore.md`, created in step 5.6).

## Local development

- Docker Desktop (WSL2) + **Laravel Sail** (`compose.yaml` at `backend/`, run via the `backend/sail` wrapper): `laravel.test` (PHP 8.4), `mysql` 8.4, `redis`, `mailpit`. Host ports: API 8000, MySQL 3307, Redis 6379, Mailpit 8025 (ADR-027). Queue worker + log tail via `./sail composer workers`; Reverb + Horizon will run inside the app container via `./sail artisan reverb:start` / `horizon` (Phase 1.13). Full instructions: `SETUP.md`.
- Frontend runs on host (`npm run dev`) for fast HMR, `NEXT_PUBLIC_API_URL=http://localhost:8000` (existing direct mode) or `BACKEND_URL` proxy mode to mirror prod.
- `cloudflared` named tunnel for Meta/Postmark webhooks.
