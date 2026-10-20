# Division DS: instructions for coding agents

A React 19 + Tailwind 4 + Radix design system: 67 components, tokens in three layers, light and
dark themes, WCAG 2.2 AA. This file is the entry point. It is short on purpose; everything it
points to is generated from the code, so it is current.

## Find what you need

| You want | Read |
|---|---|
| The list of components, one line each | `public/llms.txt` |
| One component: props, examples as code, keyboard, do and don't | `public/docs/components/<slug>.md` |
| Every component's props in one compact file | `public/llms-components.txt` |
| Which token to use for what | `public/llms-tokens.txt` |
| Shared helpers: form errors, money, links, theme, streamed text | `public/docs/helpers.md` |
| The same as data | `public/manifest/components.json`, `public/manifest/tokens.json` |
| Why a rule exists | `design.md` (long: search it by heading, do not read it whole) |
| Every command, and what fails silently | `commands.md` |
| The installable skill: a short core, topic files, and build / add / fix / review procedures | `skills/division-ds/SKILL.md` |

Read the component's page before its source. The page has the prop contract and working
examples; the source has the reasons, at ten times the length.

## Check your work

```
npm run verify
```

Type-check, every gate and the unit tests, in one command. It only compares: it changes no file in
the repository and writes no build output, so running it never breaks a "create only one file" rule.
A gate's message says what to change. To check a single file anywhere:
`node scripts/check-token-discipline.mjs path/to/File.tsx`.

## Working in a project that uses the components

`npm run verify` exists only in this repository. In another project, check every screen you
write before you finish:

```
npx division-ds check <files or dirs>          (from npm; Node 22 or newer)
node <path-to-division-ds>/scripts/division-ds.mjs check <files or dirs>   (the same, from a clone)
```

It runs the colour and button-spacing gates and checks every Division DS element's props against
`public/manifest/components.json`: an unknown prop, or a value that is not in the prop's union.
Exit 1 means a finding; each one says what to write instead. `division-ds rules --target <dir>`
installs these rules into that project's `AGENTS.md`, `GEMINI.md` and Cursor rules.

<!-- rules:start -->
## Rules

Each of these is something an agent got wrong or had to guess when it first used the system.

<!-- topic: core -->

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
`MultiSelect`), no date picker. Do not reach into `src/demo/` from a component.

**Vocabulary.** Inside this repository, `npm run check:vocabulary` bans a list of words in `src/`,
`scripts/` and `e2e/` (the list is `scripts/lib/vocabulary.mjs`; it is not published with the
docs). Run it on sample copy too: an ordinary phrase can match. Products in sample data are
"replicas". The gate does not apply to a project that only uses the components.

<!-- topic: colour -->

**Fill, text, ink.** Each accent has three roles. `accent.<state>.fill` is a solid block;
`accent.<state>.ink` is the text on that block; `accent.<state>.text` is coloured text on a
normal surface. Never put `text.primary` on a fill.

**Status tones.** `ok` done or healthy; `warning` degraded or needs attention; `hostile` failed
or destructive; `info` in progress or neutral news; `signal` brand emphasis (a sale, the
selected thing); `neutral` inactive. Always with a word: colour alone is not a status.

<!-- topic: layout -->

**Themes.** The theme is `data-theme="light"` or `"dark"` on `<html>` (`src/lib/theme.ts`); dark
is the default. Tokens switch on their own, so a screen built from tokens needs no theme logic.
The shell paints the page background (`surface.base`) and supplies the gutter; a screen sets its
own `max-w-*` and vertical spacing, and no page background. A form or an overlay is the
exception: it paints `surface.base` on itself, so its field colours never depend on what is
behind it. In a project that uses the components, your own root does this
(step 4 of `install.md`).

**Type.** Three families, as utilities: `font-display` (headings, figures), `font-body` (the
default, set by the shell), `font-mono` (labels, code, tabular numbers). A page title is
`<h1 className="font-display font-semibold text-2xl">`; body is `text-base` or `text-sm`; a label
is `font-mono text-xs font-semibold uppercase tracking-[0.18em]`. Tailwind's own size, weight
and spacing utilities are fine; only colour is restricted to tokens.

**Text size.** Secondary text is 14px or larger. 11 to 12px is for uppercase mono labels only.

**Cards.** To highlight or select a `Card`, set the border inline with a token:
`style={{ border: '2px solid var(--color-accent-signal-fill)' }}`. A border utility class does
not win against the panel's own border. `interactive` is only for a card that holds one link or
button; give that link `className={cardLinkClass}` (from `Card`) to stretch it over the card.

**Links.** Components that render links take `renderLink`, defaulting to a plain `<a>`. Under a
router, pass an adapter: `({ href, ...rest }) => <Link to={href} {...rest} />`. No component
imports a router.

**Charts and bundle size.** `ChartPanel` and `Sparkline` bring in recharts, a few hundred kB.
Load the route or screen that uses them with `React.lazy` and a `<Suspense>` fallback, so recharts
lands in its own chunk and screens without a chart never download it. Without that, Vite warns
about a chunk over 500 kB; the warning is about load time only, and the build is fine. On a
live page, data may change as often as you like: a chart animates its first draw only.

<!-- topic: forms -->

**Forms.** In a form, `Input`, `Textarea`, `Select`, `MultiSelect` and `QuantityStepper` go inside a `FormField`,
which supplies the label, help and error and keeps an `id` you pass to the control. The one
exception is a control repeated per row of a list (a role `Select` on each member): leave it
bare and name it through its own `label` prop ("Role for Ilse Varga"). `Switch`, `Checkbox` and
`Radio` are not `FormField` children: give them an `id` and a `<label htmlFor>`. A failed submit
renders `ErrorSummary` at the top and focuses it; `useFieldErrors` holds the state (signature in
`public/docs/helpers.md`).

**Buttons.** Two or more buttons side by side need a parent with a gap
(`flex flex-wrap gap-3`); `DialogFooter` and `CardFooter` already are one. A `Button` is
`type="button"` unless you say `type="submit"`. A busy button takes `loading`, not `disabled`.
`disabled` is for an action that is not available; say why in text nearby.

**Icon-only buttons** are `IconButton` with a required `label`. A `Tooltip` adds detail; it does
not replace the label.

<!-- topic: overlays -->

**Overlays.** A task on top of the page is a `Dialog`; a destructive confirm is `AlertDialog`,
not `Dialog`; filters, navigation on a narrow screen or one item's detail beside a list is a
`Sheet`. Never open a dialog from a dialog or a sheet from a sheet. Never open one from a
`DropdownMenu` item: the item is gone by the time the overlay closes, so focus has nowhere to go.
Put a dialog's actions in `DialogFooter`.

<!-- topic: feedback -->

**Feedback.** A `Toast` confirms something the person just did and then leaves, so it never holds
the only copy of anything; a message that must stay is an `Alert` in the page. A failed load is
an `Alert` in the `hostile` tone with a retry, not an `EmptyState`. Measurable work is
`Progress`; a short wait inside a control or a line of text is `Spinner`; a busy `Button` takes
`loading`.

<!-- topic: motion -->

**Motion.** The components animate themselves, and the shell animates a route change. A screen
adds no keyframes of its own: use the classes in `src/styles/motion.css` (`anim-snap-in` for an
element arriving, `anim-draw-on` for a hairline) and the motion tokens (`--duration-fast` for
hover, `--duration-base` by default, `--duration-slow` for a larger change, `--ease-snap`).
Anything you animate yourself stops under `prefers-reduced-motion` (`motion-reduce:` in
Tailwind), and nothing moves on its own: no autoplay.
<!-- rules:end -->

## Changing the system itself

- A component is a folder: `<Name>.tsx`, `<Name>.test.tsx`, `<Name>.meta.ts`, `<Name>Docs.tsx`.
  `<Name>.meta.ts` is the one description; the docs page and every file under `public/docs`,
  `public/llms*.txt` and `public/manifest` are generated from it.
- After changing a component's props, a meta file, a docs example or a token:
  `npm run agent-docs`, then `npm run verify`. A stale generated file fails a test.
- `src/components/docs/meta.test.ts` holds each props table against the real TypeScript props,
  and requires a one-sentence `useWhen` and `notFor` in every meta.
- Each rule above sits under a `<!-- topic: ... -->` marker that decides which skill file
  carries it; `core` is for the rules every screen needs. A rule before the first marker fails
  the generator.
- A new token needs a sentence in `tokens/usage.json` and, if it is a colour pair, an entry in
  `scripts/lib/contrast-pairs.mjs`.
- The full procedure for adding a component is in `commands.md`, "Add a component".
