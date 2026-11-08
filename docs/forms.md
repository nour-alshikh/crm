# Forms (react-hook-form + zod)

Replaces manual `useState` per field (and a separate `errors: Record<string,
string[]>` state for server-side validation) with `react-hook-form` +
`zodResolver`, across the four auth forms: login, register, forgot-password,
reset-password.

## Why

Two fields (login) is fine hand-rolled. Four (register) is already a lot of
repeated `useState` + `onChange` boilerplate. A form library pays for itself
once a project has more than a couple of these — client-side validation,
error display, and submit-state tracking are handled consistently instead of
reimplemented per page.

## How it works

- `src/lib/schemas.ts` — one zod schema per form (`loginSchema`,
  `registerSchema`, `forgotPasswordSchema`, `resetPasswordFormSchema`). The
  payload types (`LoginPayload`, `RegisterPayload`, etc.) are `z.infer`'d from
  the schemas instead of being hand-written interfaces — one definition, not
  two that can drift apart. `types/auth.ts` now only holds `User` (an API
  response shape, not a form input).
- Each page: `useForm<Payload>({ resolver: zodResolver(schema) })`, then
  `{...form.register("fieldName")}` on each input and
  `form.formState.errors.fieldName?.message` to display it.
- `form.formState.isSubmitting` replaces the manual `isSubmitting` state
  entirely — react-hook-form tracks it automatically while an async
  `handleSubmit` callback is in flight.
- `src/components/field-error.tsx` — a two-line shared component so every
  field's error renders identically instead of four slightly-different
  `{error && <span>...}` blocks.

## Server-side errors render exactly like client-side ones

`src/lib/form-errors.ts`'s `applyServerErrors(form, error, knownFields)` maps
a failed API call's `{ errors: { field: [...] } }` onto the matching
react-hook-form field via `form.setError()`, so a Laravel validation failure
shows up in the same place, styled the same way, as a zod validation failure.
Genuine top-level errors (network failure, 500, rate limiting — anything
without a per-field breakdown) go to `form.setError("root", ...)`, rendered
above the form via `form.formState.errors.root?.message`.

`knownFields` is not optional, and that's deliberate — a bug caught while
building this: `resetPasswordFormSchema` only has `password` and
`password_confirmation` (token/email come from the reset link's URL query
string, not user input), but the backend can return an error keyed `email`
(an invalid or expired token — see
[password-reset.md](./password-reset.md)). Calling `form.setError("email",
...)` on a form with no registered `email` field is a no-op nothing renders —
the error would silently vanish. `applyServerErrors` requires the caller to
list every field the form actually has; anything the backend returns outside
that list gets folded into the top-level message instead of disappearing.
Verified directly: submitting an invalid token returns
`{"errors":{"email":["This password reset token is invalid."]}}`, and with
the fix that renders as the form's top-level error.

## A smaller nuance worth knowing

Laravel's `confirmed` validation rule (used on `password` in
`RegisterRequest`/`ResetPasswordRequest`) attaches a mismatch failure to the
`password` field, not `password_confirmation` — but the zod schema's
`.refine()` for the same check attaches it to `password_confirmation`. In
practice this rarely surfaces: zod validates client-side before the request
is even sent, so the server-side path only runs if that client check is
somehow bypassed. When it does, the error is still visible — just under
"Password" instead of "Confirm password." Not worth engineering around for a
fallback path this unlikely; worth knowing about if a report ever says the
confirmation error "shows in the wrong place."

## Adding a new form

```ts
// lib/schemas.ts
export const thingSchema = z.object({
  name: z.string().min(1, "Required"),
});
export type ThingPayload = z.infer<typeof thingSchema>;
```

```tsx
const form = useForm<ThingPayload>({ resolver: zodResolver(thingSchema) });

async function onSubmit(values: ThingPayload) {
  try {
    await apiFetch("/api/thing", { method: "POST", body: JSON.stringify(values) });
  } catch (err) {
    const message = applyServerErrors(form, err, ["name"]);
    if (message) form.setError("root", { message });
  }
}
```
