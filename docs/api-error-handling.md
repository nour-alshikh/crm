# API Error Handling

Every error the API returns (validation, auth, permissions, not-found, rate
limits, business rules, or a genuine bug) comes back in one shape:

```json
{ "message": "Translated, user-safe message", "code": "validation_failed", "errors": { "field": ["..."] } }
```

- `code`: always present, stable and machine-readable. **Branch on `code`**, never on
  `message` or the HTTP status alone.
- `message`: always present, translated via `Accept-Language` (`lang/{en,ar}/errors.php`
  plus Laravel's validation messages), safe to show to users.
- `errors`: only for `validation_failed` (field → messages).

## Codes

| Code | Status | Raised by |
|---|---|---|
| `unauthenticated` | 401 | not signed in / expired session (`AuthenticationException`) |
| `forbidden` | 403 | Policy denial (keeps a Policy's own translated reason) or missing permission (spatie) |
| `not_found` | 404 | unknown route, missing model (route-model binding) |
| `method_not_allowed` | 405 | wrong HTTP verb |
| `conflict` | 409 | `abort(409, '…')`, e.g. stale `lock_version`; an explicit message is kept |
| `csrf_mismatch` | 419 | missing/expired XSRF token (session expired) |
| `validation_failed` | 422 | FormRequest / `ValidationException`, with `errors` |
| `domain_error` | 422 | a business rule (`App\Exceptions\DomainException` subclass) |
| `rate_limited` | 429 | throttling; `Retry-After` header included |
| `http_error` | other 4xx | any other HTTP exception |
| `server_error` | 500 | unhandled exception (a bug); see below |

The list lives in three places that must agree: this table, `docs/03-api.md`, and
`App\OpenApi\ErrorEnvelope::CODES`, which feeds the `ApiErrorCode` schema in the
OpenAPI spec and from there the frontend's `ApiErrorCode` type.

## Business rules: `DomainException`

Controllers never return ad-hoc error arrays. For a business rule, throw a subclass
of `App\Exceptions\DomainException` with an already-translated message:

```php
final class LostReasonRequired extends DomainException {}

throw new LostReasonRequired(__('deals.lost_reason_required'));
// → 422 { "message": "…", "code": "domain_error" }
```

Override `status()` / `errorCode()` only when a rule really needs a different
status or code. Add the code to the table above if so.

## 500s and `APP_DEBUG`

For an actual unhandled exception, the response depends on `APP_DEBUG`:

- **`false`** (production): `{ "message": "<translated server_error>", "code": "server_error" }`.
  Nothing else. The exception is still written to `storage/logs/laravel.log`.
- **`true`** (local dev): the real message plus a `debug` object (`exception`,
  `file`, `line`, `trace`). Same shape, extra detail.

Never deploy with `APP_DEBUG=true`: the `debug` block exposes file paths and internals.

## Where it's wired

- `app/Exceptions/ApiExceptionRenderer.php`: exception → `{message, code, errors?}`.
- `bootstrap/app.php` → `withExceptions()`: requests to `api/*` or expecting JSON go
  through the renderer.
- `app/OpenApi/ErrorEnvelope.php`: documents `code` on every error response in the spec.
- Tests: `tests/Feature/Http/ErrorEnvelopeTest.php` (every status, Arabic translation,
  debug on/off).

## Frontend

The typed client (`frontend/src/lib/api/client.ts`) rejects every non-2xx response
with `ApiError` (`src/lib/api/errors.ts`): `status`, `code` (typed `ApiErrorCode`),
`message`, `errors?`. Non-JSON bodies (proxy/gateway errors) become
`server_error`/`http_error` with a generic message. Forms map `errors` onto fields with
`applyServerErrors` (`src/lib/form-errors.ts`).

```ts
try {
  await api.POST("/auth/login", { body: values });
} catch (err) {
  if (err instanceof ApiError && err.code === "rate_limited") { /* … */ }
}
```

## Verifying it

```bash
curl -H "Accept: application/json" http://localhost:8000/api/v1/nope        # 404 not_found
curl -H "Accept: application/json" http://localhost:8000/api/v1/user        # 401 unauthenticated
curl -H "Accept: application/json" -H "Accept-Language: ar" \
     http://localhost:8000/api/v1/user                                      # 401, Arabic message
```
