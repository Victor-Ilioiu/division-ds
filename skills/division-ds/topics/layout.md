# Division DS: layout and type

> Load when laying out a page: the shell, background, width, type sizes, cards, links. Generated from AGENTS.md by `npm run agent-docs`. Edit the rules there, not here.

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
