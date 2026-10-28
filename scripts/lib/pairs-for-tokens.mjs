import { resolveComponentTokens } from './resolve-component-tokens.mjs'
import { composite, contrastRatio } from './contrast.mjs'

/** Every gated colour pair, per theme, from tokens already resolved: no file access, so the
 *  browser can run the same gate. `contrast-pairs.mjs` is the Node wrapper that reads the token
 *  files; the configurator page (src/pages/guidelines/ThemeGuideline.tsx) calls this one with a
 *  preset's tokens. One pair list, two callers, so the page cannot drift from the CLI gate.
 *
 *  @param t resolved semantic tokens for one theme (`resolveTokens` output)
 *  @param control the parsed tokens/component/control.json */
export function pairsForTokens(t, control) {
  // The component layer emits `var(--color-x)` references, not values (see
  // resolve-component-tokens.mjs). Following that indirection here — instead of hardcoding which
  // semantic token each control role happens to use — means repointing
  // `component.control.border.rest` back at a decorative hairline fails this gate immediately,
  // rather than passing because the gate was still measuring the token it used to point at.
  const componentVars = resolveComponentTokens(control)
  function componentColor(themeTokens, key) {
    const ref = componentVars[key]
    if (ref === undefined) throw new Error(`No component token ${key} — the gate is out of date with tokens/component/control.json`)
    const match = ref.match(/^var\((--[a-z0-9-]+)\)$/)
    if (!match) throw new Error(`Component token ${key} is a literal (${ref}), not a semantic reference — nothing to measure`)
    const value = themeTokens[match[1]]
    if (value === undefined) throw new Error(`Component token ${key} points at ${match[1]}, which no semantic theme file defines`)
    return value
  }

  const page = t['--color-surface-base']
  // The ceiling on the decorative numeral pad, expressed as a share of the ink contrast in the
  // SAME theme rather than as an absolute ratio, because "dimmed" is a relationship and the two
  // themes do not have the same ink. Dark's pad sits at 31% of ink and is the reference for what
  // the motif is supposed to feel like; 40% is the loosest that still reads as padding.
  const inkRatio = contrastRatio(t['--color-text-primary'], page)
  const PAD_MAX_SHARE_OF_INK = 0.4
  // Stat's own banded pad, measured against surface.raised instead of the page.
  // Stat has no surface of its own -- it inherits whatever it is dropped onto -- so the pair
  // above (against `page`) covers a Stat loose on surface.base, and this one covers a Stat
  // inside a Panel or a Card, both surface.raised (Stat's own docs Examples render inside a
  // Panel, which is how this surfaced). "Dimmed" is relative to the ink on the surface a
  // reader actually sees it on, not to a surface it happens not to be painted on -- so this
  // reuses PAD_MAX_SHARE_OF_INK against surface.raised's own ink contrast rather than the
  // page's.
  const inkRatioRaised = contrastRatio(t['--color-text-primary'], t['--color-surface-raised'], page)
  const controlFill = componentColor(t, '--component-control-fill-rest')
  // A CSS border is painted over the element's own background, so the pixel a reader sees at a
  // control's edge is the border colour composited over the control's fill. Resolving it once
  // here keeps both the "against the page" and "against the fill" pairs measuring the same real
  // pixel, and keeps working if a border token is ever given an alpha again.
  const borderRest = composite(componentColor(t, '--component-control-border-rest'), controlFill)
  const borderInvalid = composite(componentColor(t, '--component-control-border-invalid'), controlFill)

  return [
    { name: 'text.primary on surface.base', fg: t['--color-text-primary'], bg: page, minRatio: 4.5 },
    { name: 'text.secondary on surface.base', fg: t['--color-text-secondary'], bg: page, minRatio: 4.5 },
    { name: 'text.muted on surface.base', fg: t['--color-text-muted'], bg: page, minRatio: 4.5 },
    { name: 'text.label on surface.base', fg: t['--color-text-label'], bg: page, minRatio: 4.5 },
    { name: 'accent.signal.text on surface.base', fg: t['--color-accent-signal-text'], bg: page, minRatio: 4.5 },
    { name: 'accent.hostile.text on surface.base', fg: t['--color-accent-hostile-text'], bg: page, minRatio: 4.5 },
    { name: 'accent.ok.text on surface.base', fg: t['--color-accent-ok-text'], bg: page, minRatio: 4.5 },
    { name: 'accent.info.text on surface.base', fg: t['--color-accent-info-text'], bg: page, minRatio: 4.5 },
    { name: 'accent.warning.text on surface.base', fg: t['--color-accent-warning-text'], bg: page, minRatio: 4.5 },
    // DropdownMenuItem's shortcut hint, when its row is highlighted,
    // inherits the row's own ink colour (`group-data-[highlighted]:text-inherit`) instead of a
    // separately-painted colour, so the two rows this generates for `signal` and `hostile` --
    // "accent.signal.ink on accent.signal.fill" and "accent.hostile.ink on accent.hostile.fill"
    // -- already cover it too. Reused rather than duplicated, the same shape as the two rows
    // above it in this file.
    ...['signal', 'hostile', 'ok', 'info', 'warning'].map(state => ({
      name: `accent.${state}.ink on accent.${state}.fill`,
      fg: t[`--color-accent-${state}-ink`],
      bg: t[`--color-accent-${state}-fill`],
      minRatio: 4.5,
    })),
    { name: 'focus.ring on surface.base', fg: t['--color-focus-ring'], bg: page, minRatio: 3 },
    // The one BANDED pair in the gate, and the only one with a ceiling. `numeral.pad` is the
    // dimmed leading zero on a hero numeral: the Overview's hero and gate ledger, Progress's
    // readout, and the docs section index. It is `aria-hidden` in all four, a column width rather
    // than a value, so SC 1.4.3 does not reach it and a floor alone would say nothing useful.
    // The floor is here anyway because a pad nobody can see is not padding, it is a gap; the
    // ceiling is the rule that matters and the one that was broken. Light theme pointed this at
    // text.muted (neutral.500), which measures 11.44:1 on the light page -- 65% of ink, against
    // dark's 31% -- so the "dimmed" zero rendered as a second numeral competing with the
    // signal.fill digits it was padding (3.14:1 on that surface). Repointing text.muted itself
    // was the wrong fix and is refused by the same reasoning design.md records for border.control:
    // text.muted is real secondary text with an AA floor, and lightening it to suit one
    // decorative numeral drags body-adjacent copy toward 4.5:1. A dedicated token instead, gated
    // on both sides.
    {
      name: 'numeral.pad on surface.base (dimmed, banded)',
      fg: t['--color-numeral-pad'],
      bg: page,
      minRatio: 3,
      maxRatio: Number((inkRatio * PAD_MAX_SHARE_OF_INK).toFixed(2)),
    },

    // --- SC 1.4.11, form controls. Every control boundary pair is measured here, and the
    // contrast lib composites an rgba() token rather than failing to parse it -- omitting a pair
    // from this list is the one way a boundary failure could ship unnoticed.
    { name: 'control border (over control fill) on surface.base', fg: borderRest, bg: page, minRatio: 3 },
    { name: 'control border on control fill', fg: borderRest, bg: controlFill, minRatio: 3 },
    { name: 'control border, hover, on control fill', fg: componentColor(t, '--component-control-border-hover'), bg: controlFill, minRatio: 3 },
    { name: 'control border, invalid, on control fill', fg: borderInvalid, bg: controlFill, minRatio: 3 },
    { name: 'control border, invalid (over control fill), on surface.base', fg: borderInvalid, bg: page, minRatio: 3 },
    // Checkbox, Radio and the Switch track take their own, brighter boundary: a 20px box carries
    // a fraction of an input's edge length, and at border.control's 3.53:1 an unchecked checkbox
    // all but vanished on the dark page. Hover must stay distinguishable from rest, so it is
    // measured too. Disabled carries no SC 1.4.11 obligation and is not gated.
    { name: 'selection control border on control fill', fg: composite(componentColor(t, '--component-control-border-selection'), controlFill), bg: controlFill, minRatio: 3 },
    { name: 'selection control border, hover, on control fill', fg: componentColor(t, '--component-control-border-selection-hover'), bg: controlFill, minRatio: 3 },
    // Placeholder text is painted on the control's fill, not on the page — which is how
    // text.muted passed its own gated pair at 4.59:1 while rendering at 4.37:1 in dark theme.
    { name: 'control placeholder text on control fill', fg: componentColor(t, '--component-control-text-placeholder'), bg: controlFill, minRatio: 4.5 },
    // Checkbox's checked box, Radio's checked border and Switch's on border are all this fill.
    { name: 'checked/on fill (accent.signal.fill) on surface.base', fg: t['--color-accent-signal-fill'], bg: page, minRatio: 3 },
    // Radio's inner square is the only thing that says "selected", and it sits on the control's
    // own fill, so that — not the page — is the colour adjacent to it. Since 2026-09-23 it paints
    // `accent.signal.fill` (Victor's call, to match the border and Checkbox's checked fill) rather
    // than the theme-adaptive `component.control.indicator.checked`: 5.51:1 in dark, 2.15:1 in
    // light — below SC 1.4.11's 3:1. Accepted knowingly, same shape as Progress's signal-tone
    // exception below: measured against the colour actually rendered, with a 2:1 floor, so the
    // pair is still re-measured whenever a token moves. `component.control.indicator.checked`
    // itself is now unread by any component — left in the token layer, not deleted.
    // Since 2026-10-14 the Switch's on thumb is the same pair (Victor's call again: the accent on
    // a track that stays dark). It replaced an ink thumb on an accent track, so in the light
    // theme the on state now rests on this accepted exception where it used not to.
    {
      name: 'checked indicator (accent.signal.fill) on control fill -- ACCEPTED BELOW SC 1.4.11 in light theme',
      fg: t['--color-accent-signal-fill'],
      bg: controlFill,
      minRatio: 2,
    },
    // The sidebar's active nav item is the system's fill-selection grammar applied to the
    // chrome (it used to be a 2px left stripe, which this system's own rules ban and which used
    // fill nowhere). Named as its own pairs rather than leaned on the generic ink-on-fill and
    // fill-on-page rows above, for the same reason text.muted got its own surface.raised pair:
    // the obligation is per-USE, not per-token, and a use that nothing names is a use nothing
    // re-measures when a token moves. The label is text on the fill; the fill is the only thing
    // that marks the current page to a sighted reader, so it is measured against the page too.
    { name: 'sidebar active item ink on signal fill', fg: t['--color-accent-signal-ink'], bg: t['--color-accent-signal-fill'], minRatio: 4.5 },
    { name: 'sidebar active item fill on surface.base', fg: t['--color-accent-signal-fill'], bg: page, minRatio: 3 },
    // The docs section index ("01 EXAMPLES" and its four siblings on every component page) is
    // the numerals motif applied to the chrome: the significant digit is `accent.signal.fill`,
    // the theme-INVARIANT step, not the theme-adaptive `.text` one every other piece of orange
    // type on the surface uses. That is only legitimate because the digit renders at 28px and
    // WCAG's large-text threshold (24px, or 18.66px bold) lowers the requirement from 4.5:1 to
    // 3:1 — the fill reaches 5.80:1 on the dark page and 3.14:1 on the light one. minRatio 3
    // here is therefore a deliberate statement about the SIZE the token is used at, and moving
    // this heading below 24px silently invalidates the pair rather than failing it, so the size
    // is pinned by an e2e assertion as well (e2e/docs-visual-language.spec.ts).
    { name: 'docs section index (accent.signal.fill, 28px) on surface.base', fg: t['--color-accent-signal-fill'], bg: page, minRatio: 3 },
    // The Overview's numerals are the same motif at the size the brand register permits: the
    // hero at clamp(4.5rem, 15vw, 13rem) and the gate ledger at 52px, both `accent.signal.fill`
    // straight on the page. Same token and same backdrop as the docs section index above, so the
    // measured ratio is identical and this row adds no new colour -- it adds a NAME. The
    // obligation is per-use, exactly as it is for the sidebar's two fill pairs: the front door is
    // the one surface a cold reader is guaranteed to see, and a use nothing names is a use
    // nothing re-measures when a token moves. Both sizes clear WCAG's 24px large-text threshold
    // by a wide margin, which is what licenses minRatio 3 rather than 4.5, and both are pinned by
    // e2e/docs-visual-language.spec.ts so a future shrink fails a test instead of silently
    // invalidating this row.
    { name: 'overview hero and ledger numerals (accent.signal.fill, 52px and up) on surface.base', fg: t['--color-accent-signal-fill'], bg: page, minRatio: 3 },
    // A secondary Button is bg-transparent, so its boundary sits straight on whatever it's
    // painted over. On the page (a Button loose in a page or a guideline sample) that backdrop
    // is surface.base; on a raised surface (a Card footer's secondary action, Alert's own
    // secondary action slot) it's surface.raised instead -- see the surface.raised row below.
    { name: 'button secondary border on surface.base', fg: componentColor(t, '--component-button-secondary-border'), bg: page, minRatio: 3 },
    // The one alpha pair in the gate, and the reason the lib now composites: surface.raised is
    // rgba over the page, so text on a Panel has no ratio at all until the backdrop is named.
    { name: 'text.primary on surface.raised (over surface.base)', fg: t['--color-text-primary'], bg: t['--color-surface-raised'], backdrop: page, minRatio: 4.5 },
    // text.muted's only current gated pair is against surface.base, where it passes with barely
    // any headroom (4.59:1 dark). The one live path onto surface.raised today is
    // `component.control.text.disabled` on a disabled control, which SC 1.4.11/1.4.3 exempt —
    // but that exemption is per-USE, not per-token, so a future non-disabled use of text.muted
    // inside a Panel would ship unchecked without this pair. Added rather than excluded: dark
    // measured 4.00:1 (a real, if narrow, failure), so `text.muted`'s dark value was raised
    // (see tokens/semantic/color.dark.json) rather than exempting the pair, which would have
    // left the exact hole this fix exists to close.
    { name: 'text.muted on surface.raised (over surface.base)', fg: t['--color-text-muted'], bg: t['--color-surface-raised'], backdrop: page, minRatio: 4.5 },
    // Stat's leading-zero pad, on surface.raised -- the surface a Stat sits on
    // inside a Panel or a Card (Stat's own docs Examples render inside a Panel, which is how
    // this surfaced). The row above already covers a Stat loose on surface.base; Stat has no
    // surface of its own, so both need naming. Same banded shape as the page's own numeral.pad
    // row -- a floor so a pad nobody can see is not padding, a ceiling so the dimmed zero stays
    // visibly quieter than the value it pads -- but measured against surface.raised's own ink
    // contrast (inkRatioRaised) rather than the page's, since "dimmed" is a relationship to the
    // surface a reader actually sees it on.
    {
      name: 'numeral.pad on surface.raised (over surface.base) (dimmed, banded)',
      fg: t['--color-numeral-pad'],
      bg: t['--color-surface-raised'],
      backdrop: page,
      minRatio: 3,
      maxRatio: Number((inkRatioRaised * PAD_MAX_SHARE_OF_INK).toFixed(2)),
    },
    // Two more indicator colours land on surface.raised with no gated row for it: a CardFooter
    // exists to hold actions, so a bevel-focus-wrap ring or a secondary Button's border can both
    // sit on the Card's own .panel fill instead of the page. Neither is text, so axe's
    // colour-contrast rule (which both unit and e2e axe runs use) never reaches either one. The
    // same two uses exist on
    // Alert already (its dismiss IconButton's bevel-focus-wrap ring, and a secondary Button
    // passed as its `action`, per AlertDocs's own "With body and action" example) -- Alert
    // paints surface.raised too, so both rows cover it as well, not only Card.
    { name: 'focus ring (focus.ring) on surface.raised (over surface.base)', fg: t['--color-focus-ring'], bg: t['--color-surface-raised'], backdrop: page, minRatio: 3 },
    { name: 'button secondary border (border.control) on surface.raised (over surface.base)', fg: componentColor(t, '--component-button-secondary-border'), bg: t['--color-surface-raised'], backdrop: page, minRatio: 3 },
    // Hexline Care's feature-list check icon (Pricing.tsx): aria-hidden, always paired with its
    // own text, so this is a non-text indicator (SC 1.4.11, 3:1) rather than the 4.5:1 body-text
    // floor `accent.ok.text on surface.base` above already gates. It sits inside a Card, i.e. on
    // surface.raised, which that row does not cover.
    { name: 'check icon (accent.ok.text) on surface.raised (over surface.base)', fg: t['--color-accent-ok-text'], bg: t['--color-surface-raised'], backdrop: page, minRatio: 3 },
    // DropdownMenu's portalled content surface -- surface.sunken, the same value `controlFill`
    // above resolves to -- entirely ungated: axe
    // never reaches portalled content, and every other row measures text.label / accent.*
    // against surface.base, never against this sunken panel. Two of the three pairs it exposed
    // are plain, passing rows, named here so a future token move cannot silently regress them
    // without the gate catching it; the third (the highlighted row's fill) is its own exception
    // below, alongside Progress's and Radio's.
    //
    // The group label failed outright at its old token: text.label #6f7a88 on surface.sunken
    // #0d1016 measured 4.37:1 in dark theme -- below the 4.5:1 body-text floor. (Light theme's
    // 4.506:1 narrowly cleared it; a single shared token still needed to move, since both themes
    // have to pass, not just one.) Fixed by switching DropdownMenuLabel to text.secondary, not by
    // loosening the floor. This pair also covers a DropdownMenuItem's shortcut hint at rest for a
    // default-tone item -- same fg/bg, reused rather than duplicated.
    { name: 'dropdown menu label (text.secondary) on surface.sunken', fg: t['--color-text-secondary'], bg: controlFill, minRatio: 4.5 },
    // The hostile item's text at rest (accent.hostile.text on surface.sunken) already passes --
    // 5.92:1 dark, 4.59:1 light. Also covers a hostile-tone item's shortcut hint at rest, reused
    // rather than duplicated -- the shortcut keeps the hostile tint instead of falling back to
    // text.secondary, so it still reads as hostile.
    { name: 'dropdown hostile item text on surface.sunken', fg: t['--color-accent-hostile-text'], bg: controlFill, minRatio: 4.5 },
    // Progress's filled bar is the ONLY conveyance of value when showValue is false (its
    // default) — a graphical object required to understand the content — so SC 1.4.11 measures
    // it against the track it sits on (surface.sunken, same value Progress's own component
    // reads directly, and the same value `component.control.fill.rest` resolves to here as
    // `controlFill`), not the page. `accent.<tone>.fill` (theme-invariant) failed this in light
    // theme on all four tones; `component.control.progress.fill.<tone>` (theme-adaptive `.text`
    // step) is what Progress now renders.
    //
    // Signal is the exception. Since 2026-09-22 Progress paints `accent.signal.fill` for its
    // signal tone (Victor's call, to match Slider's range): 5.51:1 in dark, 2.15:1 in light.
    // Measured against the colour actually rendered, with a 2:1 floor, so the pair is still
    // re-measured whenever a token moves and a further drop still fails. The name says it is
    // accepted below 1.4.11 so the printed PASS cannot be read as compliance. Radio's checked
    // indicator above took the same exception for the same reason, as do the two
    // DropdownMenu/Select rows just below, the focus-ring row near Toast's own rows below, and
    // the nested-raised button border row further down -- all held below the WCAG floor they cite.
    {
      name: 'progress fill (signal, accent.signal.fill) on progress track (surface.sunken) -- ACCEPTED BELOW SC 1.4.11 in light theme',
      fg: t['--color-accent-signal-fill'],
      bg: controlFill,
      minRatio: 2,
    },
    // The highlighted menu/listbox row's FILL, in light theme: signal.fill on surface.sunken
    // measures 2.15:1, hostile.fill on surface.sunken 2.42:1 -- both below SC 1.4.11's 3:1.
    // DropdownMenu inherits this from Select's own listbox (styled identically by design),
    // which has had the identical shortfall since it shipped, unnamed. Accepted knowingly
    // rather than fixed by changing either component's visuals, the same shape as Progress's and
    // Radio's exceptions above: the ink/fill text swap on the highlighted row
    // (accent.<tone>.ink on accent.<tone>.fill, gated at 4.5:1 above) is the second, passing cue
    // SC 1.4.11 permits in place of the boundary contrast. Measured against the colour actually
    // rendered, with a 2:1 floor, so a further drop still fails and a token move is still
    // re-measured. Accepted by Victor, 2026-09-24: both rows stay below SC 1.4.11 in light
    // theme, exactly as they shipped.
    {
      name: 'highlighted menu/listbox row (signal.fill) on surface.sunken, Select and DropdownMenu -- ACCEPTED BELOW SC 1.4.11 in light theme',
      fg: t['--color-accent-signal-fill'],
      bg: controlFill,
      minRatio: 2,
    },
    {
      name: 'highlighted hostile menu row (hostile.fill) on surface.sunken -- ACCEPTED BELOW SC 1.4.11 in light theme',
      fg: t['--color-accent-hostile-fill'],
      bg: controlFill,
      minRatio: 2,
    },
    ...['ok', 'warning', 'hostile'].map(tone => ({
      name: `progress fill (${tone}) on progress track (surface.sunken)`,
      fg: componentColor(t, `--component-control-progress-fill-${tone}`),
      bg: controlFill,
      minRatio: 3,
    })),
    // Alert paints tone through TONES[tone].text on surface.raised in two places that share the
    // same colour: the icon (a graphic, SC 1.4.11) and the 1px border on all four sides (a UI
    // component boundary, also SC 1.4.11) -- never the body text, which stays
    // text.primary/text.secondary. Neither use was gated before: axe (unit, jsdom, and e2e, real
    // browser) checks colour-contrast for TEXT nodes, and an aria-hidden icon plus a decorative
    // border are both outside that rule's reach regardless. One row per tone covers both uses,
    // since both render the identical fg/bg pair at the identical 3:1 floor. Toast sits
    // on surface.sunken, not surface.raised, so it needs its own rows against that surface --
    // these do not cover it.
    ...['info', 'ok', 'warning', 'hostile'].map(tone => ({
      name: `alert icon and border (accent.${tone}.text) on surface.raised (over surface.base)`,
      fg: t[`--color-accent-${tone}-text`],
      bg: t['--color-surface-raised'],
      backdrop: page,
      minRatio: 3,
    })),
    // ApprovalRequest's pending outline and its shield icon: the signal tone, which the alert
    // rows above do not include. A boundary and an aria-hidden icon beside its own label, so 3:1.
    {
      name: 'approval outline and icon (accent.signal.text) on surface.raised (over surface.base)',
      fg: t['--color-accent-signal-text'],
      bg: t['--color-surface-raised'],
      backdrop: page,
      minRatio: 3,
    },
    // Badge's subtle emphasis paints its tone's `.text` colour as 11px text, and a 1px border, on
    // whatever it sits on -- and every docs Example is surface.raised. Text owes 4.5:1, which the
    // alert rows above (3:1, an icon and a border) do not cover. Hostile is the one that failed
    // here (4.48:1 in dark at hostile.500), which is why dark accent.hostile.text is hostile.400;
    // the hostile row is also the gated measurement for a field error on a raised panel.
    ...['signal', 'ok', 'info', 'warning', 'hostile'].map(tone => ({
      name: `badge subtle text (accent.${tone}.text) on surface.raised (over surface.base)`,
      fg: t[`--color-accent-${tone}-text`],
      bg: t['--color-surface-raised'],
      backdrop: page,
      minRatio: 4.5,
    })),
    // Alert's body text and its ghost dismiss button's X glyph (the icon has no colour class of
    // its own, so it inherits the ghost IconButton's text colour, component.button.ghost.text,
    // which resolves to text.secondary -- the same chain every other ghost control's icon
    // follows) are both painted on surface.raised, not the page. Both pass today (dark 7.68:1,
    // light 15.65:1) but neither was named, so a future token move would go uncaught -- axe
    // passes at whatever value is in place today and cannot flag a
    // regression that still happens to clear its own threshold.
    {
      name: 'alert body and ghost dismiss (text.secondary) on surface.raised (over surface.base)',
      fg: t['--color-text-secondary'],
      bg: t['--color-surface-raised'],
      backdrop: page,
      minRatio: 4.5,
    },
    // Toast reuses Alert's anatomy and tone map but sits on surface.sunken, not
    // surface.raised -- the comment on Alert's own tone map above says so explicitly. The icon
    // and the 1px border are a graphic and a UI component boundary respectively (both SC 1.4.11,
    // both the identical fg/bg pair, same as Alert's rows), so one row per tone at the same 3:1
    // floor, against `controlFill`, the same resolved value DropdownMenu's sunken rows above use.
    ...['info', 'ok', 'warning', 'hostile'].map(tone => ({
      name: `toast icon and border (accent.${tone}.text) on surface.sunken`,
      fg: t[`--color-accent-${tone}-text`],
      bg: controlFill,
      minRatio: 3,
    })),
    // Toast's title paints text.primary, which nothing above measures against surface.sunken --
    // a genuinely new pair. Its description and its ghost dismiss glyph both paint text.secondary
    // at the same 4.5:1 floor, which the DropdownMenu row above ("dropdown menu label
    // (text.secondary) on surface.sunken") already covers -- reused rather than duplicated.
    {
      name: 'toast title (text.primary) on surface.sunken',
      fg: t['--color-text-primary'],
      bg: controlFill,
      minRatio: 4.5,
    },
    // Toast's action link paints accent.signal.text (the same colour the docs kit's own links
    // use), on surface.sunken rather than the page -- another pair nothing above measures.
    // Passes with real headroom in both themes (4.59:1 light, 5.51:1 dark).
    {
      name: 'toast action (accent.signal.text) on surface.sunken',
      fg: t['--color-accent-signal-text'],
      bg: controlFill,
      minRatio: 4.5,
    },
    // The focus ring is the one thing on this surface that isn't text or a decorative boundary --
    // it's the keyboard-visibility signal itself (SC 1.4.11, a "user interface component"), and
    // it was never measured against surface.sunken at all: the dismiss IconButton's
    // bevel-focus-wrap ring and the toast action's own focus ring both land on the toast's sunken
    // fill, and nothing else on a sunken surface (DropdownMenu's items, Select's listbox) draws a
    // ring there either -- they're all reached by fill/highlight instead, never a ring.
    // `focus.ring` on `surface.sunken` measures 2.15:1 in light (#f2550f on #c2cddc) -- below SC
    // 1.4.11's 3:1 -- and 5.51:1 in dark. Accepted knowingly, the same shape
    // as Progress's, Radio's and the highlighted popup rows' exceptions above -- changing the
    // system focus-ring colour is Victor's call, and the ring's visuals are unchanged. Named for
    // both consumers today (toasts; nothing currently focus-rings a popup on this surface, but
    // the token and the surface are shared, so the name says so rather than claiming an
    // exclusivity the token doesn't have). Accepted by Victor, 2026-09-24: the focus ring stays
    // on surface.sunken as-is, below SC 1.4.11 in light theme.
    {
      name: 'focus ring (focus.ring) on surface.sunken: toasts and popups -- ACCEPTED BELOW SC 1.4.11 in light theme',
      fg: t['--color-focus-ring'],
      bg: controlFill,
      minRatio: 2,
    },
    // The stars are graphical objects that carry the value (SC 1.4.11), not
    // text, so axe's colour-contrast rule (unit jsdom and e2e alike) never reaches either colour.
    // Both `Rating` and `RatingInput` can sit loose on the page or inside a Panel -- the docs
    // Example wraps every live component in one, so surface.raised is not a hypothetical, it is
    // where the shipped docs page actually renders the star colours -- so both surfaces are named
    // per the per-use rule the rest of this file follows (a use nothing names is a use nothing
    // re-measures when a token moves). Half stars reuse the identical filled colour clipped to
    // 50%, so they need no row of their own. Both pairs clear 3:1 in both themes, but headroom is
    // not even: the empty star (border.selection) clears with real margin everywhere -- 5.10:1
    // light / 6.44:1 dark on the page, 5.42:1 light / 5.60:1 dark on surface.raised -- while the
    // filled star (accent.signal.fill) is comfortable in dark (5.80:1 page, 5.05:1 raised) but
    // MARGINAL in light theme: 3.14:1 on the page and 3.33:1 on surface.raised, both only barely
    // over the 3:1 floor. Not an ACCEPTED-BELOW exception (both stay >= 3:1), but a token move in
    // light theme has far less room before this pair actually fails than the dark-theme numbers
    // suggest. Hover only relights stars up to the hovered value with the same filled colour, so
    // it introduces no third colour to gate; the focus ring is per star and reuses the
    // already-gated `focus.ring` rows above (on surface.base and on surface.raised).
    { name: 'rating filled star (accent.signal.fill) on surface.base', fg: t['--color-accent-signal-fill'], bg: page, minRatio: 3 },
    { name: 'rating filled star (accent.signal.fill) on surface.raised (over surface.base)', fg: t['--color-accent-signal-fill'], bg: t['--color-surface-raised'], backdrop: page, minRatio: 3 },
    { name: 'rating empty star (border.selection) on surface.base', fg: t['--color-border-selection'], bg: page, minRatio: 3 },
    { name: 'rating empty star (border.selection) on surface.raised (over surface.base)', fg: t['--color-border-selection'], bg: t['--color-surface-raised'], backdrop: page, minRatio: 3 },

    // surface.raised is translucent, so a secondary Button's border composites twice when it is
    // nested two raised surfaces deep -- e.g. AlertDocs' own "With
    // body and action" example renders its secondary Button inside an Alert inside the docs
    // Panel, and Card's footer actions can sit inside a Card inside a Panel the same way. The row
    // above ("button secondary border (border.control) on surface.raised (over surface.base)")
    // composites surface.raised ONCE over surface.base -- 3.23:1 dark, 5.42:1 light, both real
    // and both still correct for a Button one raised layer deep. This row instead composites
    // surface.raised over itself over surface.base (bg: surface.raised, backdrop: surface.raised
    // already composited over the page), the pixel a reader actually sees in the nested case:
    // 2.86:1 in dark theme, below SC 1.4.11's 3:1 floor; light theme still clears it comfortably
    // (5.52:1), since surface.raised whitens rather than darkens a light backdrop.
    //
    // Held at a 2:1 floor; accepted by Victor, 2026-09-24, over bumping `border.control`, opaque
    // fills or a no-nesting rule.
    {
      name: 'button secondary border (border.control) on surface.raised nested in surface.raised (over surface.base) -- ACCEPTED BELOW SC 1.4.11 in dark theme',
      fg: componentColor(t, '--component-button-secondary-border'),
      bg: t['--color-surface-raised'],
      backdrop: composite(t['--color-surface-raised'], page),
      minRatio: 2,
    },

    // The hover wash (accent.signal.wash) under a nav item or an inactive tab. Text turns
    // text.primary on hover, so that is the pair, measured on both surfaces a wash lands on: the page,
    // and a raised panel (every docs Example). The wash itself is decoration. Nothing that owes 3:1
    // may be drawn on it: focus.ring and a checked control's accent.signal.fill measure 2.73:1 over
    // surface.base and 2.88:1 over surface.raised in light theme (pinned in contrast-pairs.test.mjs).
    // So nav items draw their ring outside themselves, a focused inactive tab drops the wash, and a
    // data table never tints a row.
    {
      name: 'hover wash text (text.primary) on accent.signal.wash over surface.base',
      fg: t['--color-text-primary'],
      bg: t['--color-accent-signal-wash'],
      backdrop: page,
      minRatio: 4.5,
    },
    {
      name: 'hover wash text (text.primary) on accent.signal.wash over surface.raised (over surface.base)',
      fg: t['--color-text-primary'],
      bg: t['--color-accent-signal-wash'],
      backdrop: composite(t['--color-surface-raised'], page),
      minRatio: 4.5,
    },

    // A Card (surface.raised) inside another raised surface, such as a docs Example: the card's
    // text, stars and focus ring sit on raised composited over raised over the page. ProductCard
    // is the first organism that puts all of these there. text.muted is not here because it fails
    // on this pixel in dark theme (4.12:1) and is never used inside a card.
    {
      name: 'text.primary on surface.raised nested in surface.raised (over surface.base)',
      fg: t['--color-text-primary'],
      bg: t['--color-surface-raised'],
      backdrop: composite(t['--color-surface-raised'], page),
      minRatio: 4.5,
    },
    {
      name: 'text.secondary on surface.raised nested in surface.raised (over surface.base)',
      fg: t['--color-text-secondary'],
      bg: t['--color-surface-raised'],
      backdrop: composite(t['--color-surface-raised'], page),
      minRatio: 4.5,
    },
    {
      name: 'focus ring (focus.ring) on surface.raised nested in surface.raised (over surface.base)',
      fg: t['--color-focus-ring'],
      bg: t['--color-surface-raised'],
      backdrop: composite(t['--color-surface-raised'], page),
      minRatio: 3,
    },
    {
      name: 'rating filled star (accent.signal.fill) on surface.raised nested in surface.raised (over surface.base)',
      fg: t['--color-accent-signal-fill'],
      bg: t['--color-surface-raised'],
      backdrop: composite(t['--color-surface-raised'], page),
      minRatio: 3,
    },
    {
      name: 'rating empty star (border.selection) on surface.raised nested in surface.raised (over surface.base)',
      fg: t['--color-border-selection'],
      bg: t['--color-surface-raised'],
      backdrop: composite(t['--color-surface-raised'], page),
      minRatio: 3,
    },

    // The command palette's search field has no control fill: its placeholder sits straight on the
    // palette's surface.base, while text.placeholder is otherwise only ever on the control fill
    // ("control placeholder text on control fill"). 4.92:1 dark, 11.44:1 light. On surface.raised it
    // would be 4.29:1 in dark, which is why a placeholder never sits on a raised panel.
    {
      name: 'command palette placeholder (text.placeholder) on surface.base',
      fg: t['--color-text-placeholder'],
      bg: page,
      minRatio: 4.5,
    },

    // Chart series are graphics (SC 1.4.11, 3:1): a line, a bar, a legend swatch. A ChartPanel is a
    // Card, so it lands on the page's own raised surface and, in the docs, raised on raised; the
    // base row covers a chart drawn straight on the page. Two series at most: the system's other
    // hues are status colours, reserved for state.
    ...['1', '2'].flatMap(n => [
      { name: `chart series ${n} (chart.series-${n}) on surface.base`, fg: t[`--color-chart-series-${n}`], bg: page, minRatio: 3 },
      {
        name: `chart series ${n} (chart.series-${n}) on surface.raised (over surface.base)`,
        fg: t[`--color-chart-series-${n}`],
        bg: t['--color-surface-raised'],
        backdrop: page,
        minRatio: 3,
      },
      {
        name: `chart series ${n} (chart.series-${n}) on surface.raised nested in surface.raised (over surface.base)`,
        fg: t[`--color-chart-series-${n}`],
        bg: t['--color-surface-raised'],
        backdrop: composite(t['--color-surface-raised'], page),
        minRatio: 3,
      },
    ]),

    // AI presence. AiLabel's mark and explanation sit on any surface; a field an AI filled paints
    // ai.wash over its own control fill, so the field's pixel is that composite, and its text, its
    // AI glyph and its border are measured against it rather than against the bare fill.
    ...(() => {
      const aiField = composite(t['--color-ai-wash'], controlFill)
      return [
        { name: 'ai.text on surface.base', fg: t['--color-ai-text'], bg: page, minRatio: 4.5 },
        { name: 'ai.text on surface.sunken', fg: t['--color-ai-text'], bg: controlFill, minRatio: 4.5 },
        { name: 'ai.text on surface.raised (over surface.base)', fg: t['--color-ai-text'], bg: t['--color-surface-raised'], backdrop: page, minRatio: 4.5 },
        { name: 'ai.text on an AI-filled field (ai.wash over control fill)', fg: t['--color-ai-text'], bg: aiField, minRatio: 4.5 },
        { name: 'control text (text.primary) on an AI-filled field (ai.wash over control fill)', fg: componentColor(t, '--component-control-text-rest'), bg: aiField, minRatio: 4.5 },
        { name: 'ai.border on an AI-filled field (ai.wash over control fill)', fg: t['--color-ai-border'], bg: aiField, minRatio: 3 },
        { name: 'ai.border on surface.base', fg: t['--color-ai-border'], bg: page, minRatio: 3 },
      ]
    })(),
  ]
}

