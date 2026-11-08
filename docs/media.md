# Media / File Uploads

File uploads via [spatie/laravel-medialibrary](https://spatie.be/docs/laravel-medialibrary),
currently wired up for one thing: user avatars.

> **Core infra vs. example content.** `spatie/laravel-medialibrary` itself, the
> `apiFetch()` `FormData` handling, and the queued-vs-`nonQueued()` conversion
> tradeoff are reusable patterns — reuse them for whatever media you actually need.
> The `avatar` collection, `AvatarController`, and `AvatarUploader` component are a
> **worked example** built on top of that: keep and rename if you want user avatars,
> otherwise delete and follow the same pattern (see
> [Adding a new media collection](#adding-a-new-media-collection) below, and
> [SETUP.md](../SETUP.md#decide-what-to-keep-from-the-example-content)).

## How it works

The `User` model implements `HasMedia` with a single-file `avatar` collection and a
`thumb` conversion (150×150, sharpened). Uploading a new avatar replaces the old one
automatically (`singleFile()`).

The `thumb` conversion is marked `->nonQueued()`. By default,
`spatie/laravel-medialibrary` generates conversions on the queue
(`queue_conversions_by_default => true` in `config/media-library.php`), which means
nothing shows up until a queue worker actually processes the job. For something as
small and fast as an avatar thumbnail, that's a footgun in local dev (no worker
running → thumb never appears) for no real benefit, so it's generated synchronously
on upload instead.

## Backend (`backend/`)

- `app/Models/User.php` — `HasMedia`, `InteractsWithMedia`, `registerMediaCollections()`,
  `registerMediaConversions()`.
- `app/Http/Controllers/AvatarController.php` — `store()` (validates `image`, max
  5MB, then `addMediaFromRequest('avatar')->toMediaCollection('avatar')`) and
  `destroy()` (`clearMediaCollection('avatar')`).
- `routes/api.php` — `POST /api/user/avatar`, `DELETE /api/user/avatar`, both
  behind `auth:sanctum`.
- `app/Http/Controllers/Auth/AuthController.php` — `formatUser()` includes
  `avatar_url` (via `getFirstMediaUrl('avatar', 'thumb')`, or `null`) in every auth
  response, same place `roles`/`permissions` live
  ([authorization.md](./authorization.md)).
- `config/media-library.php` — `disk_name` defaults to `public`. Files are served
  from `storage/app/public` via the `public/storage` symlink
  (`php artisan storage:link` — already run; the symlink itself isn't committed,
  it's regenerated per-environment).

Env vars that matter:

```
APP_URL=http://localhost:8000   # generated avatar URLs are built from this —
                                 # missing the port here silently breaks every
                                 # image (see authentication.md)
```

Optional overrides (see `config/media-library.php`):

```
MEDIA_DISK=public
QUEUE_CONVERSIONS_BY_DEFAULT=true   # irrelevant for the avatar thumb specifically,
                                     # since that conversion opts out with nonQueued()
```

## Frontend (`frontend/`)

- `src/lib/api.ts` — `apiFetch()` detects a `FormData` body and skips the
  JSON `Content-Type`/serialization it otherwise forces, so the browser can set its
  own multipart boundary. Without this, file uploads would be sent as broken JSON.
- `src/contexts/auth-context.tsx` — `uploadAvatar(file)` and `removeAvatar()`.
  Both update `avatar_url` in local state directly from the response instead of
  triggering a full `/api/user` refetch.
- `src/components/avatar-uploader.tsx` — the actual UI: current avatar (or a
  fallback initial), a hidden file input triggered by a button, a remove button
  (shown only when an avatar exists), and backend validation errors surfaced
  inline (e.g. wrong file type, over 5MB).
- `src/app/dashboard/page.tsx` — renders `<AvatarUploader />`.
- `src/types/auth.ts` — `User.avatar_url: string | null`.

## Adding a new media collection

```php
// app/Models/SomeModel.php
public function registerMediaCollections(): void
{
    $this->addMediaCollection('attachments'); // omit singleFile() to allow many
}
```

Conversions are opt-in per collection — decide per use case whether they need to be
queued (large/bulk images: yes, keep the default) or not (small, upload-blocking
thumbnails: `->nonQueued()`, as done for avatars).
