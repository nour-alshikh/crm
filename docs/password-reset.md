# Password Reset

Standard "forgot password" flow, built entirely on Laravel's own password broker —
no custom token generation, hashing, or expiry logic.

## How it works

1. User submits their email on `/forgot-password`. The frontend calls
   `POST /api/v1/auth/forgot-password`.
2. `PasswordResetController::forgotPassword()` calls `Password::sendResetLink()`
   and **always returns the same message**, regardless of whether the email is
   registered — this endpoint can't be used to enumerate accounts.
3. Laravel's built-in `ResetPassword` notification generates a token (stored,
   hashed, in `password_reset_tokens`) and emails a link. Locally,
   `MAIL_MAILER=log` means that email lands in `storage/logs/laravel.log` instead
   of actually sending — grep that file for the link while testing.
4. The link points at the frontend, not a Laravel route:
   `{FRONTEND_URL}/reset-password?token=...&email=...`. That's not automatic —
   `AppServiceProvider::boot()` overrides `ResetPassword::createUrlUsing()` to
   build that URL, since a Laravel `route('password.reset', ...)` doesn't exist in
   an API-only backend.
5. The frontend's `/reset-password` page reads `token`/`email` from the query
   string and calls `POST /api/v1/auth/reset-password` with those plus a new password.
6. `PasswordResetController::resetPassword()` calls `Password::reset()`, which
   validates the token, updates the password (hashed), and invalidates the token
   — reusing it fails with "This password reset token is invalid."

Resetting the password does **not** log the user in — they're redirected to
`/login` afterward and sign in normally with the new password. Nothing here
touches the Sanctum session cookie; see [authentication.md](./authentication.md)
for how that works separately.

## Backend (`backend/`)

- `app/Http/Controllers/Auth/PasswordResetController.php` — `forgotPassword`,
  `resetPassword`.
- `app/Http/Requests/Auth/ForgotPasswordRequest.php`,
  `ResetPasswordRequest.php` — validation only (`email`; `token`/`email`/`password`
  confirmed).
- `app/Providers/AppServiceProvider.php` — the `createUrlUsing()` override
  described above. Reads the frontend origin from `config('cors.allowed_origins')`
  rather than calling `env()` directly, so it still works once config is cached in
  production.
- `routes/api.php` — `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, both
  under the same `throttle:10,1` group as login.
- Uses `config/auth.php`'s existing `passwords.users` broker config (60 minute
  expiry, 60 second resend throttle) and the `password_reset_tokens` table already
  created by the default Laravel migration — nothing to add there.

## Frontend (`frontend/`)

- `src/app/forgot-password/page.tsx` — email form, shows the generic success
  message returned by the API.
- `src/app/reset-password/page.tsx` — reads `token`/`email` from
  `useSearchParams()`, new-password form, redirects to `/login` on success.
- Both call the typed API client (`api.POST(...)`) directly rather than going through `AuthProvider` — neither
  action changes the current session/user state, so there's nothing for the auth
  context to update.
- `src/proxy.ts` — `/forgot-password` is guest-only (redirects away if already
  logged in), but `/reset-password` is deliberately **not** — a mailed reset link
  should still work for someone who happens to be logged in elsewhere, since it's
  authenticated by the token in the URL, not the session cookie.
- `src/types/auth.ts` — `ForgotPasswordPayload`, `ResetPasswordPayload`.

## Testing locally

```bash
# trigger a reset link
curl -X POST http://localhost:8000/api/v1/auth/forgot-password -d '{"email":"test@example.com"}' ...

# find the link (MAIL_MAILER=log)
grep "reset-password?token=" backend/storage/logs/laravel.log
```
