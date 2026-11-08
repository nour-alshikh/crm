# UI Components (shadcn/ui)

Adopted for three concrete things — a `Toast` for notifications, a
`DropdownMenu` for the header's user menu, and `Form` primitives that wrap
the `react-hook-form` + `zod` setup already in place — not as a wholesale
redesign. See [forms.md](./forms.md) for why `react-hook-form`/`zod` were
chosen; this doc is about the components layered on top.

## Why this pairs well with what's already here

shadcn isn't an npm dependency in the usual sense — components are copied
into `src/components/ui/*` as code the project owns, not installed as a
black box. It requires Tailwind (already in use) and its `Form` component is
built specifically to wrap `react-hook-form` (already adopted) — `<Form>` is
literally `FormProvider` re-exported, `<FormField>` wraps `Controller`,
`<FormMessage>` just reads `formState.errors`. No parallel validation system,
no conflict with `lib/schemas.ts` or `lib/form-errors.ts` — both are
untouched.

## What changed

- **Toast** (`src/components/ui/sonner.tsx`, mounted as `<Toaster />` in the
  root layout): replaces inline error text for anything that isn't a
  per-field validation message. The four auth forms' top-level errors
  (network failures, rate limiting, anything `applyServerErrors` couldn't
  map to a specific field) now call `toast.error(message)` instead of
  rendering a banner above the form. `AvatarUploader` uses it for both
  success and failure — there's no page navigation on avatar
  upload/remove, so a toast is the only feedback the user gets.
  Field-level errors (email format, password length) stay inline via
  `FormMessage`, right under the input — that's still the correct place for
  them, toast is for everything else.
- **`DropdownMenu`** (`src/components/site-header.tsx`): replaces the
  hand-rolled `useState` + `mousedown`-listener click-outside logic with
  shadcn's version, which additionally gets keyboard navigation and focus
  trapping the hand-rolled one didn't have.
- **`Form`/`Input`/`Button`**: the four auth forms now render through
  shadcn's `FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`
  instead of hand-rolled `<label>`/`<input>`/error-`<span>` markup. Same
  `useForm`/`zodResolver` calls underneath, same `lib/schemas.ts` types —
  this changed presentation, not validation.
- **`Table`** (`/admin/users`): swapped the plain HTML table for shadcn's,
  mostly for visual consistency with everything else now using the same
  design tokens.

## Things that needed fixing along the way

None of this was a clean drop-in — worth knowing if reusing this template
and running `shadcn add` again later:

- **The `form` component doesn't install from this CLI/registry
  combination** (`shadcn@4.18.0`, `base-nova` preset) — `shadcn add form`
  silently creates nothing, and `shadcn view form` returns an empty stub.
  `src/components/ui/form.tsx` is hand-written instead, following the
  standard shadcn Form pattern (react-hook-form `Controller` + `FormProvider`
  wrapped in React Context) — this part hasn't changed across shadcn
  versions since it's pure React/RHF, not tied to Radix or Base UI. One
  deliberate simplification: `FormControl` doesn't use a generic
  "asChild"/polymorphic slot primitive — it directly `cloneElement`s its one
  child (always a single `<Input>` in this project's forms), which avoids
  depending on Base UI's exact composition API for a case that doesn't need
  full polymorphism.
- **`shadcn init` broke the Geist font.** It rewrote `globals.css`'s
  `--font-sans` to `var(--font-sans)` — circular, since the actual variable
  `layout.tsx`'s `next/font` setup defines is `--font-geist-sans`. Fixed by
  pointing it at the right variable. Worth checking after any future
  `shadcn init`/`add` run that touches `globals.css`.
- **`shadcn init` silently disabled dark mode.** It switched from this
  project's `@media (prefers-color-scheme: dark)` (automatic, no JS needed)
  to a `.dark` class-based toggle (shadcn's default, meant to be flipped by
  `next-themes` or similar) — but there's no theme toggle in this app, so
  the class would simply never apply and the site would stay light-only
  regardless of OS preference. Restored the media-query variant alongside
  the `.dark` class block (kept both — the class-based one costs nothing to
  leave in place if a toggle gets added later, and the two blocks are noted
  as needing to stay in sync).
- **Base UI, not Radix**, is what this preset uses under the hood
  (`@base-ui/react/*` in `package.json`) — a different but comparable
  headless-primitives library. Doesn't affect anything at the level this
  project uses these components; noted here only because most shadcn
  examples/docs online still assume Radix, so component internals (if ever
  read directly) will look different from what's commonly documented.

## Adding a new shadcn component

```bash
cd frontend
npx shadcn@latest add <component>
```

Check the diff before committing — as above, `init`/`add` can rewrite
`globals.css` or other shared files in ways that aren't obviously wrong at a
glance.
