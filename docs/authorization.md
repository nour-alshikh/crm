# Authorization

Roles and permissions via [spatie/laravel-permission](https://spatie.be/docs/laravel-permission),
layered on top of the [authentication](./authentication.md) Sanctum sets up.

> **Core infra vs. example content.** The middleware aliases, `HasRoles` trait,
> `can()`/`hasRole()`, and `roles`/`permissions` on the user payload are reusable
> plumbing — keep them as-is in a new project. The specific `admin` role,
> `manage-users` permission, `Admin\UserController`, and `/admin/users` page are a
> **worked example**, not required scaffolding: rename them into your actual admin
> area, or delete them if you don't need one yet. See
> [SETUP.md](../SETUP.md#decide-what-to-keep-from-the-example-content).

## Enforcement boundary

The Laravel API is the only thing that actually enforces anything. Anything on the
frontend (`can()` checks, hiding a link) is UX — hiding a button doesn't stop an API
call. A user who bypasses the frontend entirely (curl, devtools) still hits the same
403 from Laravel. This was verified directly: a plain `user`-role account gets a 200
through the frontend's `proxy.ts` cookie check (it doesn't know about permissions)
but a 403 from the Laravel API itself when it actually tries to call an admin-only
endpoint.

## Backend (`backend/`)

- `bootstrap/app.php` — registers the `role`, `permission`, and
  `role_or_permission` middleware aliases.
- `app/Models/User.php` — `HasRoles` trait.
- `database/seeders/RolePermissionSeeder.php` — seeds a baseline `admin` / `user`
  role setup: `admin` gets a `manage-users` permission, `user` gets nothing extra.
  Called from `DatabaseSeeder`.
- `app/Http/Resources/UserResource.php`: includes `roles` and flattened
  `permissions` in every auth response (login and `/api/v1/user`) so the frontend
  doesn't need a second round trip. There is no self-registration; admins create
  users.
- `app/Http/Controllers/Admin/UserController.php` — example endpoint gated by
  `permission:manage-users`.
- `routes/api.php` — `/api/v1/admin/users` wrapped in
  `Route::middleware('permission:manage-users')`.

### Adding a new role or permission

```php
// database/seeders/RolePermissionSeeder.php
$editPosts = Permission::firstOrCreate(['name' => 'edit-posts']);
$editor = Role::firstOrCreate(['name' => 'editor']);
$editor->givePermissionTo($editPosts);
```

Then gate a route:

```php
Route::middleware('permission:edit-posts')->group(function () {
    // ...
});
```

(or `role:editor`, or `role_or_permission:editor|edit-posts`).

## Frontend (`frontend/`)

- `src/contexts/auth-context.tsx` — `can(permission)` and `hasRole(role)`, both
  reading from the `roles`/`permissions` arrays already present on `user` (no
  separate fetch).
- `src/app/admin/users/page.tsx` — example page gated by `can("manage-users")`:
  redirects away if the check fails, and still handles a 403 from the API
  gracefully (defense in depth — the client-side check is only a shortcut).
- `src/app/dashboard/page.tsx` — links to `/admin/users` only when
  `can("manage-users")` is true.
- `src/proxy.ts` — protects `/admin` the same way it protects `/dashboard`
  ([authentication.md](./authentication.md)): cookie presence only, not permission-aware.
  A logged-in user without the permission will pass the proxy and get redirected
  client-side instead, after the real API check fails.

Usage:

```tsx
const { can, hasRole } = useAuth();

if (can("edit-posts")) { /* ... */ }
if (hasRole("editor")) { /* ... */ }
```

## Promoting a user (example)

```bash
php artisan tinker --execute="
  \$u = App\Models\User::where('email', 'someone@example.com')->first();
  \$u->assignRole('admin');
"
```
