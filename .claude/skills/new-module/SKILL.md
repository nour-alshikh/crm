---
name: new-module
description: Scaffold a new feature module (migration, model, FormRequest, Policy, Resource, TS type, routes, frontend page/form) following this project's required structure. Use when adding a brand-new feature.
---

### Creating New Modules — REQUIRED STRUCTURE

This is a **Next.js frontend + Laravel API backend** project (Sanctum
cookie auth, not Inertia — the two apps talk over `NEXT_PUBLIC_API_URL`,
they don't share a request/response cycle). `Post` is a live, working
reference module built specifically to copy from — see
[`docs/reference-module.md`](../../docs/reference-module.md) for what each
piece of it demonstrates and why. When in doubt about a pattern below, go
read the actual file it names.

#### Backend

1. **Migration** — `database/migrations/..._create_<table>_table.php`
   ```bash
   php artisan make:migration create_<table>_table
   ```
2. **Enums** (only for fields with a fixed set of values) —
   `app/Enums/<Thing>.php`, a native backed `enum ... : string`. See
   `app/Enums/PostStatus.php`.
3. **Model** — `app/Models/<Model>.php`: `$fillable` + `$casts` (cast enum
   columns to the enum class, not string).
4. **FormRequests** — `app/Http/Requests/<Model>/{Store,Update}<Model>Request.php`
   ```bash
   php artisan make:request <Model>/Store<Model>Request
   ```
   Validate enum fields with `new Enum(<Thing>::class)`. Store requires
   fields; Update makes them `sometimes`.
5. **Policy** (only if authorization is more than "any authenticated
   user") — `app/Policies/<Model>Policy.php`, registered automatically by
   Laravel's naming convention, gated in routes via `can:update,<model>`.
6. **TypeScript contract class** — `app/TypeScript/<Model>Type.php`, a
   `#[TypeScript]`-attributed class with typed public readonly properties
   matching the API response, plus a `fromModel()` named constructor. This
   is the single source of truth for the response shape — see
   `app/TypeScript/PostType.php`.
7. **Resource** — `app/Http/Resources/<Model>Resource.php`
   ```bash
   php artisan make:resource <Model>Resource
   ```
   `toArray()` returns `(array) <Model>Type::fromModel($this->resource)` —
   don't hand-build the array a second time.
8. **Routes** — add to `routes/api.php` inside the `auth:sanctum` group,
   with policy middleware where relevant:
   ```php
   Route::get('/<things>', [ThingController::class, 'index']);
   Route::post('/<things>', [ThingController::class, 'store'])->middleware('can:create,'.Thing::class);
   Route::put('/<things>/{thing}', [ThingController::class, 'update'])->middleware('can:update,thing');
   Route::delete('/<things>/{thing}', [ThingController::class, 'destroy'])->middleware('can:delete,thing');
   ```
9. Regenerate frontend types: `composer types` (from `backend/`).

#### Frontend

1. **Types** — `src/types/<model>.ts`: re-export from the generated file,
   don't hand-declare fields.
   ```ts
   export type { <Model>Type as <Model> } from "./generated";
   ```
2. **Zod schema** — add to `src/lib/schemas.ts`, mirroring the backend
   FormRequest's rules by hand (this project's established convention —
   see [`docs/forms.md`](../../docs/forms.md)). For any enum field, type its
   option list `satisfies readonly <Thing>[]` against the generated union
   so a backend enum change is a compile error here, not silent drift.
3. **Form component** — `src/components/<model>-form.tsx`: `useForm` +
   `zodResolver`, shadcn `Form`/`FormField`/`FormItem`/`FormControl`, one
   `<FormField>` per column. Use `apiFetch` (`src/lib/api.ts`) inside a
   `useMutation`, never raw `fetch`. On error, call
   `applyServerErrors(form, err, [...knownFields])` so backend validation
   errors render inline like client-side ones.
4. **Page** — `src/app/<model>/page.tsx`: `useQuery(["<models>"], ...)` for
   the list, the form component for create/edit, `useMutation` for
   delete — all invalidating the same query key on success. Gate on
   `useAuth()`'s `user`/`isLoading` the same way `dashboard/page.tsx` and
   `posts/page.tsx` do.
5. Add a nav link in `src/components/site-header.tsx` if the module should
   actually be reachable (Posts deliberately isn't — it's a reference, not
   a feature).

#### Key patterns (MUST FOLLOW — see `docs/*.md` for the reasoning)

- **Data fetching**: `@tanstack/react-query`'s `useQuery`/`useMutation`,
  never a hand-rolled `useEffect` + `useState` loading/error dance. See
  [`docs/data-fetching.md`](../../docs/data-fetching.md).
- **API calls**: always through `apiFetch` (`src/lib/api.ts`) — it handles
  the CSRF cookie, credentials, and error shape. Never call `fetch`
  directly against the API.
- **Forms**: `react-hook-form` + `zodResolver`, never manual
  `useState`-per-field. See [`docs/forms.md`](../../docs/forms.md).
- **Errors**: `applyServerErrors` for forms, `toast.error(...)` (Sonner)
  for everything else. See
  [`docs/api-error-handling.md`](../../docs/api-error-handling.md).
- **Types**: generated from the backend
  (`app/TypeScript/*.php` → `composer types` →
  `frontend/src/types/generated.ts`), never hand-duplicated. See
  [`docs/reference-module.md`](../../docs/reference-module.md).
- **Authorization**: Laravel Policies + route middleware
  (`can:update,<model>`) on the backend; `useAuth().can("<permission>")` on
  the frontend for UI gating only — the backend is the real authority. See
  [`docs/authorization.md`](../../docs/authorization.md).

**Checklist:**
- ✅ Backend: Migration, Model, FormRequests, Resource, TypeScript type,
  Routes (+ Policy if needed, Enums if needed)
- ✅ `composer types` run after any backend shape change
- ✅ Frontend: `types/<model>.ts`, zod schema, form component, page
- ✅ Nav link added only if the module is meant to be user-facing
