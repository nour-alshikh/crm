# Layout

Before this, every page was its own island — `<main>` and nothing else,
including its own copy of the logout button and the "Manage users" link
(duplicated in `dashboard/page.tsx`, only present there, nowhere else).

## `SiteHeader`

`src/components/site-header.tsx` — a client component rendered once, in the
root layout above `{children}`, so it's present on every page without each
page needing to render it itself.

- **Guest** (`user === null`, not loading): "Log in" / "Register" links.
- **Loading** (`isLoading === true`): renders nothing. The alternative —
  a skeleton — wasn't worth it for how briefly this state is visible in
  practice; revisit if that stops being true.
- **Authenticated**: an avatar-or-initial + name button that opens a small
  dropdown menu (click-outside-to-close via a `mousedown` listener attached
  only while the menu is open, not globally) containing:
  - `Dashboard`
  - `Manage users` — only rendered when `can("manage-users")`, same check
    used everywhere else permission-gated UI exists (see
    [authorization.md](./authorization.md))
  - `Log out`

`src/app/layout.tsx`:

```tsx
<AuthProvider>
  <SiteHeader />
  {children}
</AuthProvider>
```

Has to be inside `AuthProvider`, not outside it — `useAuth()` needs the
provider above it in the tree.

## What moved out of `dashboard/page.tsx`

The dashboard page no longer renders its own logout button or "Manage users"
link — both now live only in `SiteHeader`, once, instead of duplicated on
every page that happened to need them. `dashboard/page.tsx` is back to just
page content: the avatar uploader and a welcome message.

## Why the header's authenticated state doesn't appear in the initial HTML

Curling any page shows the "Your App" brand text but not the guest links or
user menu until JavaScript runs. That's not a bug introduced here — it's the
same client-driven auth architecture documented in
[authentication.md](./authentication.md): `useAuth()`'s `user` comes from a
`useQuery` that only fetches after the browser mounts, so `isLoading` is
`true` for the entire server-rendered HTML and `SiteHeader` correctly renders
nothing for that state until hydration resolves it.

## Adding a new authenticated-only nav item

Add it inside the `user ? (...) : (...)` branch in `SiteHeader`, gated by
`can()`/`hasRole()` the same way `Manage users` is if it's permission-specific,
or unconditionally (like `Dashboard`) if every logged-in user should see it.
