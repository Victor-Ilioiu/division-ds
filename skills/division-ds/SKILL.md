---
name: division-ds
description: Use when building or changing UI with Division DS (React 19, Tailwind 4, Radix; 72 components). Covers which component and token to use, the composition rules prop types cannot express (providers, FormField, button gaps, card borders), planning a screen's states, and how to check the result. Load it before writing any screen or component in a project that has Division DS components.
---

# Division DS

Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.

This file is the core: what every screen needs. The topic and command files below hold the rest; load one when the work reaches it, not before.

## Plan first

Before writing a screen, list its regions and, for each, its states: empty, loading, error, success, and disabled or no permission. Pick a component for each from `public/llms.txt` by its "Best for" and "Not for". `commands/build.md` is the whole procedure.

## Where things are

| You want | Read |
|---|---|
| Every component, one line each with best for and not for | `public/llms.txt` |
| One component: props, examples, keyboard, mistakes | `public/docs/components/<slug>.md` |
| Which token to use for what | `public/llms-tokens.txt` |
| Shared helpers: form errors, money, links, theme, streamed text | `public/docs/helpers.md` |
| The same as data | `public/manifest/components.json`, `public/manifest/tokens.json` |

Outside this repository, read the same files online: `https://victor-ilioiu.vercel.app/systems/division-ds/llms.txt`, `https://victor-ilioiu.vercel.app/systems/division-ds/docs/components/<slug>.md`, and so on. Add a component to a project with `npx shadcn@latest add https://raw.githubusercontent.com/Victor-Ilioiu/division-ds/main/public/r/<slug>.json`, or every component with `division-ds-all` as the slug. The setup steps, in plain text: `https://victor-ilioiu.vercel.app/systems/division-ds/install.md`.

## Check your work

- In a project that uses the components: `npx division-ds check <files or dirs>` (the checker is on npm; Node 22 or newer). It flags a raw colour, an invented token, touching buttons, an unknown prop and a value outside a prop's union.
- In the Division DS repository itself: `npm run verify` (type-check, every gate, the unit tests).

A finding says what to write instead. `commands/fix.md` explains each one.

## Topics: load when

- `topics/colour.md`: choosing an accent, the text on a fill, or a status colour.
- `topics/layout.md`: laying out a page: the shell, background, width, type sizes, cards, links.
- `topics/forms.md`: a screen has a field, a form or more than one button.
- `topics/overlays.md`: adding a Dialog, an AlertDialog or a Sheet.
- `topics/feedback.md`: a screen reports a result or a wait: a toast, an alert, progress, a spinner.
- `topics/motion.md`: animating anything yourself.
- `topics/ai.md`: wording a chat.

## Commands: load when

- `commands/build.md`: building a new screen or page. Plans the regions and their states before any code.
- `commands/add.md`: adding one component to a screen that already exists.
- `commands/fix.md`: a gate, `division-ds check` or a test has failed and named a rule. What each message means and the fix.
- `commands/review.md`: a screen is written and you are about to say it is done. The checklist to run over it.

## Core rules

Each of these is something an agent got wrong or had to guess when it first used the system.

**Imports.** Import a component from its own file, by relative path. There is no path alias: the
docs write `src/components/atoms/button/Button`, and from `src/pages/Screen.tsx` that is
`'../components/atoms/button/Button'`. Helpers work the same way: `src/lib/money` is
`'../lib/money'` from there. The tier barrels (`components/atoms`, `/molecules`,
`/organisms`) are for the system's own composition; the organisms barrel pulls the chart library
into whatever imports it. Icons come from `lucide-react`, with `aria-hidden="true"` unless the
icon is the only content. Installed with shadcn, paths start `src/division-ds/` instead of `src/`.

**Colour.** Every colour is a semantic token inside a Tailwind arbitrary value:
`text-[var(--color-text-primary)]`, `bg-[var(--color-surface-base)]`. Never a hex, never
`rgb()`, never a Tailwind palette class (`bg-red-500`, `text-white`), never a token name you
have not seen in `llms-tokens.txt`. An invented name fails silently in the browser and loudly in
`npm run verify`.

**Providers.** One `<Toaster>` and one `<TooltipProvider>` sit at the root of the app (`AppShell`,
`DemoLayout` in this repository). Assume both, including for a screen you are writing that is not
mounted anywhere yet: it will be mounted under one of the two shells. Call `useToast()` freely; do
not mount a second `Toaster`, and do not drop a toast or a tooltip because you cannot see the
provider. A project that uses the components mounts both itself (step 4 of `install.md`).

**Focus.** Anything focusable that you style yourself gets
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]`.

**Page title, empty, loading.** Plan these before writing a screen. A page title is `PageHeader`
(it renders the `h1`). An empty list or result is `EmptyState`; inside a `DataTable`, pass it as
`emptyMessage`. A loading region is `Skeleton` shapes inside a `SkeletonGroup`. The demo's
`src/demo/states/` files are not part of the system.

**What the system does not have.** No Popover, no Combobox (single value: use `Select`; several:
`MultiSelect`). Do not reach into `src/demo/` from a component.

**Vocabulary.** Inside this repository, `npm run check:vocabulary` bans a list of words in `src/`,
`scripts/` and `e2e/` (the list is `scripts/lib/vocabulary.mjs`; it is not published with the
docs). Run it on sample copy too: an ordinary phrase can match. Products in sample data are
"replicas". The gate does not apply to a project that only uses the components.
