# Dark / light mode

`next-themes` was already a dependency (installed with the shadcn preset)
but unused — `globals.css` had a comment explaining that dark mode only
ever followed `prefers-color-scheme`, with no toggle, because nothing set
the `.dark` class it also defines. This adds the toggle.

## How it works

- `src/components/theme-provider.tsx` — a thin wrapper around
  `next-themes`'s `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`,
  `enableSystem`), mounted in `src/app/layout.tsx` inside `AuthProvider`/`I18nProvider`.
  `next-themes` handles the three things a hand-rolled toggle would
  otherwise have to: reading `localStorage` before paint via an inline
  script it injects (no flash of the wrong theme), applying `.dark` to
  `<html>`, and reacting to the OS preference changing live when the
  choice is "system".
- `src/components/theme-toggle.tsx` — a simple light/dark switch (button,
  sun/moon icon) in `SiteHeader`, next to the language switcher. Not a
  three-way light/dark/system control — `defaultTheme="system"` already
  means a first-time visitor gets the OS preference with no explicit
  choice needed; the toggle is for the (common) case of wanting the app in
  a specific mode regardless of the OS setting. `next-themes` persists
  whatever's picked to `localStorage` itself.
- `resolvedTheme` (what `useTheme()` needs to know whether to show the sun
  or the moon) is `undefined` until mounted — `ThemeToggle` tracks its own
  `mounted` boolean so the very first client render doesn't flash one icon
  then immediately swap to the other.
- `globals.css` already had both the `.dark` class block and the
  `@media (prefers-color-scheme: dark)` block, kept in sync — the comment
  there calling out that duplication predates this change and still
  applies verbatim; the media-query block is now the pre-hydration/no-JS
  fallback rather than the only mechanism.

## Adding dark-mode support to a new component

Use the existing semantic tokens (`bg-background`, `text-foreground`,
`bg-card`, `border-border`, `text-muted-foreground`, ...) instead of literal
colors (`bg-white`, `text-black`, `border-gray-200`) — every token already
has a `.dark` value defined in `globals.css`, so a component built entirely
from tokens gets dark mode for free, no `dark:` variants to write per
component. Reach for Tailwind's `dark:` variant directly only for the rare
case a token can't express (e.g. swapping an image, not just a color).

## Known gap

No contrast audit has been run against the dark palette — it's the same
`oklch` values shadcn's `init` generated, not hand-tuned or WCAG-verified
here.
