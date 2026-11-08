# Data Fetching (TanStack Query)

`@tanstack/react-query` replaces hand-rolled `useEffect` + `useState` loading/error
plumbing for anything that fetches from the API. Before this, every page that
needed server data (`AuthProvider`'s current-user fetch, the admin users list)
duplicated the same `isLoading`/`error`/`data` state and the same
fetch-in-an-effect pattern. That gets repetitive fast, and none of it gets
caching, dedup, or refetch-on-window-focus for free the way a query library does.

## Setup

- `src/providers/query-provider.tsx` — `QueryProvider`, a client component
  creating one `QueryClient` per browser session via `useState`'s lazy
  initializer (not per render — that stable instance is what makes caching
  between components work at all). Wraps `AuthProvider` in
  `src/app/layout.tsx`, so any component can call `useQuery`/`useMutation`.
- Default `staleTime: 60_000` — data is considered fresh for a minute before a
  background refetch is triggered on refocus/remount; `retry: 1` for the general
  default (individual queries override this where it doesn't make sense — see
  below).
- `ReactQueryDevtools` is mounted but only rendered when
  `NODE_ENV === "development"`.

## `AuthProvider`: fetch backed by `useQuery`, mutations backed by `useMutation`

This was the highest-value place to apply it — virtually every page depends on
`useAuth()`, and the current-user fetch was the original hand-rolled
`useEffect` + `isLoading` pattern.

`src/contexts/auth-context.tsx`:

- `useQuery(["auth", "user"], fetchCurrentUser)` replaces the old
  `useEffect` + manual `isLoading` state. `retry: false` — a `401` here means
  "not logged in," which `fetchCurrentUser` already turns into a *successful*
  result (`data: null`), not a thrown error. Retrying on a genuine failure isn't
  useful for an auth check either, so this stays off entirely rather than using
  the default retry-3-times behavior, which would just delay the login page
  showing up.
- `login`, `register`, `logout`, `uploadAvatar`, `removeAvatar` are each a
  `useMutation`, writing their result straight into the `["auth", "user"]` query
  cache via `queryClient.setQueryData()` on success — no extra round trip to
  `/api/user` after logging in, since the mutation response already has the
  data.
- **The public API is unchanged.** `useAuth()` still returns
  `{ user, isLoading, login, register, logout, can, hasRole, uploadAvatar,
  removeAvatar }`, and `login`/`register`/`logout`/`uploadAvatar`/`removeAvatar`
  are still plain `async` functions that throw `ApiError` on failure
  (`mutateAsync` re-throws the mutation's error). Every consumer — login page,
  register page, dashboard, `AvatarUploader` — needed **zero changes**.

## `AdminUsersPage`: the other converted example

`src/app/admin/users/page.tsx` — the users list was the other clear instance of
the old pattern (a plain `useEffect` fetching `/api/admin/users` into local
state). Now:

```tsx
const { data: users = [], isLoading, error } = useQuery({
  queryKey: ["admin", "users"],
  queryFn: () => apiFetch<{ users: AdminUser[] }>("/api/admin/users").then((d) => d.users),
  enabled: !isAuthLoading && isAuthorized,
});
```

`enabled` is doing the same job the old `if (isAuthLoading || !isAuthorized) return;`
guard did — don't fetch until the (UX-only, see
[authorization.md](./authorization.md#enforcement-boundary)) permission check has
resolved one way or the other.

## A bug this surfaced

Wiring this up meant running `npm run build` for the first time since the
project was scaffolded (previously only `next dev` and `tsc --noEmit` had been
run). That caught a real, pre-existing issue unrelated to TanStack Query:
`useSearchParams()` in `/login` and `/reset-password` requires a `Suspense`
boundary to prerender — `next dev` doesn't enforce this, only a production
build does. Both pages now export a thin wrapper that renders the actual form
inside `<Suspense fallback={null}>`. Worth remembering: `next dev` passing isn't
sufficient evidence a page is actually shippable — `next build` catches things
dev mode doesn't.

## Adding a new query

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["something", id],
  queryFn: () => apiFetch<Something>(`/api/something/${id}`),
});
```

For anything that changes server state, use `useMutation` and either
`queryClient.setQueryData()` (cheap, when the mutation response already has the
new data — see `AuthProvider` above) or `queryClient.invalidateQueries()` (when
it doesn't, and a refetch is the simplest way to get the new state).
