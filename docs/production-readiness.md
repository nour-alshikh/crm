# Production Readiness

Three smaller, mostly-independent pieces that matter more once this stops being a
local-only project: per-record authorization, a general rate-limiting ceiling, and
moving off the default SQLite database.

## Per-record authorization (Policies)

[Authorization](./authorization.md) covers *roles and permissions* — "is this user
an admin," "can this user manage users at all." That answers coarse questions but
not "can **this** user edit **this specific** post." That's what Laravel Policies
are for, and they're a separate, complementary mechanism, not a replacement for
Spatie's roles/permissions.

> **Core infra vs. example content.** The `Gate::before` admin bypass is reusable —
> keep it. The `Post` model, `PostPolicy`, and `/api/v1/posts` endpoints are a
> **worked example** of the pattern, not required scaffolding: follow the same
> shape for whatever ownership-checked resource you actually need, then delete
> `Post` (see [SETUP.md](../SETUP.md#decide-what-to-keep-from-the-example-content)).

### How it works

- `app/Policies/PostPolicy.php` — `create` (any authenticated user), `update` and
  `delete` (only `$user->id === $post->user_id`). Laravel auto-discovers this via
  naming convention (`App\Models\Post` → `App\Policies\PostPolicy`); nothing to
  register manually.
- `app/Providers/AppServiceProvider.php` — `Gate::before(fn ($user, $ability) =>
  $user->hasRole('admin') ? true : null)`. This makes **every** Policy in the app
  auto-bypass for admins, without each policy needing its own
  `|| $user->hasRole('admin')` check. Returning `null` (not `false`) is what lets
  non-admins fall through to the policy's own logic instead of being auto-denied.
- `routes/api.php` — authorization happens at the route, not inside the
  controller: `->middleware('can:update,post')` (resolves `post` from the route's
  `{post}` model binding) and `->middleware('can:create,'.Post::class)` (no
  instance yet, so the policy method gets the class name instead). This mirrors
  the existing `permission:manage-users` middleware style — declarative, at the
  route, not buried in the controller body.
- `PostController` itself contains zero authorization logic — it's pure CRUD. That
  split (routes decide *if*, controllers decide *what*) is the point.

### Verified

Registered two users, created a post as one, confirmed the other gets 403 on both
update and delete, confirmed the owner can update their own post, then promoted
the second user to `admin` and confirmed they could edit and delete the first
user's post — the `Gate::before` bypass working as intended. Also re-checked the
existing `permission:manage-users` route still 403s a plain user, to make sure the
new global `Gate::before` didn't interfere with Spatie's own authorization path.

## General API rate limiting

Until now, only register/login/forgot-password/reset-password were throttled
(`throttle:10,1`). Every other endpoint — `/api/v1/user`, `/api/v1/user/avatar`,
`/api/v1/admin/users` — had **no rate limit at all**.

- `bootstrap/app.php` — `$middleware->throttleApi();` appends a `throttle:api`
  middleware to the entire `api` middleware group, so it applies to every route
  in `routes/api.php` automatically.
- `app/Providers/AppServiceProvider.php` — defines what `'api'` actually means:
  `RateLimiter::for('api', fn ($request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()))`.
  60 requests/minute, keyed by user ID when authenticated, IP otherwise.
- The existing `throttle:10,1` on register/login/forgot-password/reset-password
  stays as an *additional*, tighter layer on top — both apply simultaneously
  (nested middleware), so those specific endpoints get 10/min instead of the
  general 60/min, while everything else gets 60/min.

### Verified

Confirmed `X-RateLimit-Limit: 60` / `X-RateLimit-Remaining` headers on an
authenticated request to `/api/v1/user` (no route-specific throttle), and
`X-RateLimit-Limit: 10` on `/api/v1/auth/login` (the tighter limiter's headers win when
both layers are active, since it's the innermost/last-executing one).

## Database: moving off SQLite

`config/database.php` already ships `mysql` and `pgsql` connections — Laravel's
default skeleton, untouched. Nothing to add there. Switching is an env-only
change:

```
DB_CONNECTION=pgsql        # or mysql
DB_HOST=127.0.0.1
DB_PORT=5432                # 3306 for mysql
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

Then `php artisan migrate --seed` against the new connection — every migration in
this project (`users`, `sessions`, `personal_access_tokens`, permission tables,
`media`, `posts`) uses Laravel's schema builder, not raw SQLite-specific syntax,
so nothing else needs to change.

`SESSION_DRIVER=database`, `CACHE_STORE=database`, and `QUEUE_CONNECTION=database`
all point at whichever `DB_CONNECTION` is active — switching the database switches
all three along with it, nothing extra to configure.

`.env.example`'s `DB_CONNECTION=sqlite` default is intentional and should stay —
zero-setup local dev is worth keeping as the default; production is where this
changes, via `.env` on that environment, not by changing the example file's
default for everyone.
