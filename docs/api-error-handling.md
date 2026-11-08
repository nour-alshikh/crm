# API Error Handling

Every error the API returns — validation, auth, permissions, not-found, rate
limits, or a genuine bug — comes back in one consistent JSON shape:

```json
{ "message": "Human-readable message", "errors": { "field": ["..."] } }
```

`errors` is only present for validation failures (422). Everything else is just
`{ "message": "..." }`.

## Why this needed handling

Without it, the shape depended entirely on which layer threw: Laravel's default
validation response looks like the above, but an unhandled exception returns
`{ message, exception, file, line, trace }` — and when `APP_DEBUG=true`, that
trace is the *full* stack trace, file paths included. That's not hypothetical —
it showed up constantly while building and testing this backend (see any of the
earlier debugging output in this repo's history). Fine for a local dev session
where a human is reading it; a real liability if `APP_DEBUG` ever ends up `true`
in production, since it means anyone hitting a broken endpoint gets a tour of the
server's file paths and internals.

## How it works

`app/Exceptions/ApiExceptionRenderer.php` maps any `Throwable` to a status code
and message:

| Exception | Status | Message |
|---|---|---|
| `ValidationException` | 422 | Laravel's message + `errors` |
| `AuthenticationException` | 401 | `Unauthenticated.` |
| `AuthorizationException` / Spatie's `UnauthorizedException` | 403 | the exception's message |
| `ModelNotFoundException` / `NotFoundHttpException` | 404 | `Resource not found.` |
| `ThrottleRequestsException` | 429 | `Too many requests.` |
| any other `HttpExceptionInterface` (CSRF mismatch, method not allowed, etc.) | its own status | the exception's message |
| anything else (a real bug) | 500 | see below |

For that last case — an actual unhandled exception, not an expected 4xx —
the response depends on `APP_DEBUG`:

- **`false`** (how production should be configured): `{ "message": "Server error." }`.
  Nothing else. The real exception is still written to
  `storage/logs/laravel.log` via `Log::error()` — hiding it from the client
  doesn't mean losing it.
- **`true`** (local dev): the client gets the real message plus a nested `debug`
  object (`exception`, `file`, `line`, `trace`) — still a predictable, parseable
  shape, just with extra detail attached instead of a redesigned response.

Wired up in `bootstrap/app.php`'s `withExceptions()`: any request matching
`api/*` or expecting JSON is routed through `ApiExceptionRenderer`; everything
else (there are no real HTML routes in this app, but the fallback exists) keeps
Laravel's normal rendering.

## Frontend

No changes needed. `frontend/src/lib/api.ts`'s `ApiError` already reads
`data?.message` and `data?.errors` generically from any JSON error response —
it was written that way from the start, so it was already compatible with a
fully consistent backend shape once the backend actually provided one.

## Verifying it

```bash
php artisan tinker --execute="dd(config('app.debug'));"   # confirm current setting

# trigger each shape (from a running server):
curl -H "Accept: application/json" http://localhost:8000/api/nonexistent      # 404
curl -H "Accept: application/json" http://localhost:8000/api/user             # 401
curl -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
  http://localhost:8000/api/register -d '{}'                                  # 422
```

To see the 500 behavior change with `APP_DEBUG`, flip it in `.env`, run
`php artisan config:clear`, and hit any endpoint that throws.
