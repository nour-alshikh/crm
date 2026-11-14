# Reference module (Posts)

`Post` isn't a feature this app needs — it exists purely so a complete
module, every layer wired end to end, is somewhere in the codebase to copy
from when building the next real one. It's deliberately not linked from
`SiteHeader` (see [layout.md](./layout.md)), but the code is otherwise live:
`/posts` still works for any logged-in user, `php artisan test` would still
cover it if tests existed, `composer types` still regenerates its TS types.
Delete it once the project has a real module to point to instead.

## What it demonstrates, layer by layer

- **Migration + native PHP enums for the DB layer** — `status`/`category`
  are backed enums (`app/Enums/PostStatus.php`, `PostCategory.php`), `tags`
  is a JSON array of a third enum's values (`PostTag.php`). Cast on the model
  (`app/Models/Post.php`) so `$post->status` is a real `PostStatus` instance,
  not a string.
- **FormRequest validation with `Enum` rules** —
  `app/Http/Requests/Post/{Store,Update}PostRequest.php`. Store requires the
  enum fields; Update makes them `sometimes`.
- **Owner-only authorization via Policy** — `app/Policies/PostPolicy.php`,
  gated in `routes/api.php` (`can:update,post` / `can:delete,post`). See
  [authorization.md](./authorization.md) for how that's wired generally.
- **API Resource decoupling the response from the Eloquent model** —
  `app/Http/Resources/PostResource.php` builds through a typed class
  (below) rather than hand-shaping an array.
- **Backend → frontend type generation** —
  `PostResource` is a plain `JsonResource`; Scramble infers its shape (and
  the `PostStatus`/`PostCategory`/`PostTag` enums) into the OpenAPI spec.
  Run `./sail composer api:spec` (backend) then `npm run api:types`
  (frontend) after changing resources, requests or routes, and commit
  `backend/openapi.json` + `frontend/src/lib/api/schema.d.ts`; CI fails if
  they drift. `frontend/src/types/post.ts` only aliases the generated
  types, the pattern every module's `types/x.ts` should follow instead of
  hand-declaring fields that can drift from the backend.
- **zod schema mirroring the backend's validation rules** —
  `frontend/src/lib/schemas.ts`'s `postSchema`, following the same
  hand-mirroring convention as the auth schemas (see
  [forms.md](./forms.md)). The enum option lists
  (`postStatusOptions`/`postCategoryOptions`/`postTagOptions`) are typed
  `satisfies readonly PostStatus[]` etc. against the *generated* union, so
  renaming or removing a backend enum case is a compile error here instead
  of a silent drift.
- **A translatable field** — `title` is a `{ en, ar }` JSON object, not a
  plain string, edited via `<TranslatableInput>` in `post-form.tsx` and
  displayed via `resolveTranslation()` in `page.tsx`. See
  [i18n.md](./i18n.md) for the full backend↔frontend wiring; copy this
  field, not `body`, when a new module needs a translatable one.
- **`z.coerce` fields needing input/output types to diverge** —
  `reading_minutes`/`priority` are numbers coerced from form state; zod's
  input type for a coerced field differs from its output type, which
  `useForm` needs told explicitly. See `PostFormInput` vs `PostFormValues`
  in `schemas.ts` and the triple-generic `useForm<PostFormInput, unknown,
  PostFormValues>()` in `post-form.tsx`. Skip this complexity for any field
  that isn't coerced — every other field just uses one inferred type.
- **One field per HTML input archetype** —
  `frontend/src/components/post-form.tsx` deliberately has exactly one of
  each: text, textarea, radio (styled as a selectable card), checkbox
  (styled as a selectable card), select, multiselect (a real dropdown —
  `frontend/src/components/multi-select.tsx`, not a native `<select
  multiple>`), number, range (`Slider`), date. Copy whichever ones the new
  module's fields actually need; this file has more field variety than any
  real module should.
- **List + mutate with cache invalidation** —
  `frontend/src/app/posts/page.tsx`: one `useQuery` for the list, one
  `PostForm` reused for create/edit, delete via `useMutation`, all
  invalidating the same `["posts"]` query key. See
  [data-fetching.md](./data-fetching.md) for the react-query conventions
  this follows.

## Copying it for a new module

Backend (rename `Post`/`post` → your model throughout):

1. `database/migrations/..._create_<table>_table.php`
2. `app/Enums/*.php` — only if a field is a fixed set of values
3. `app/Models/<Model>.php` — `$fillable` + `$casts`
4. `app/Http/Requests/<Model>/{Store,Update}<Model>Request.php`
5. `app/Policies/<Model>Policy.php` — only if authorization is more than "any
   authenticated user"
6. `app/TypeScript/<Model>Type.php`
7. `app/Http/Resources/<Model>Resource.php`
8. Routes in `routes/api.php`
9. `composer types`

Frontend:

1. `src/types/<model>.ts` — re-export from `./generated`
2. `src/lib/schemas.ts` — zod schema mirroring the Request rules
3. `src/components/<model>-form.tsx`
4. `src/app/<model>/page.tsx`
