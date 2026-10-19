import { useEffect, useState } from 'react'
import { PageHeader, SectionHeading, docsProse } from '../../components/docs/PageChrome'
import { readCssVar } from '../../lib/tokens-runtime'
import { composite, contrastRatio } from '../../../scripts/lib/contrast.mjs'

/** How a swatch is drawn and what it is measured against.
 *  - `fill`: a block of the colour.
 *  - `text`: sample type in the colour, on the surface it is measured against.
 *  - `border`: a hairline box in the colour, on the surface it is measured against. */
type Kind = 'fill' | 'text' | 'border'

type Swatch = {
  token: string
  kind: Kind
  role: string
  /** The surface this colour is actually painted on, as a token name. Omitted where no contrast
   *  obligation applies (surfaces themselves, decorative hairlines). */
  on?: string
  /** WCAG floor for that pairing: 4.5 for text, 3 for UI boundaries and large type. */
  min?: number
}

type Group = { title: string; intro: string; swatches: Swatch[] }

/** Every semantic colour, grouped by the job it does. The CSS variable is the token name with
 *  dots turned into dashes, so the page reads the live value from the same custom property the
 *  components paint with, in whichever theme is showing. */
const GROUPS: Group[] = [
  {
    title: 'Signal, the brand colour',
    intro:
      `The one colour that means "act here". Everything else on the page is a grey, so wherever you see orange, it's an action, a selection or the focus ring (the outline that shows where the keyboard is). Orange gets three roles because it's used three ways: as a fill, as text, and as the ink (text and icons) that sits on top of that fill.`,
    swatches: [
      { token: 'accent.signal.fill', kind: 'fill', role: 'Primary buttons, checked controls, the selected navigation item, progress fills.', on: 'surface.base', min: 3 },
      { token: 'accent.signal.text', kind: 'text', role: 'Orange text on the page: eyebrows (the small label above a heading), links, highlighted words.', on: 'surface.base', min: 4.5 },
      { token: 'accent.signal.ink', kind: 'text', role: 'Text and icons placed on a signal fill, like a primary button label.', on: 'accent.signal.fill', min: 4.5 },
      { token: 'accent.signal.wash', kind: 'fill', role: 'The faint tint that appears when you hover over a navigation item or an inactive tab. Text on it switches to text.primary. The focus ring and checked controls never sit on it.' },
      { token: 'focus.ring', kind: 'border', role: 'The keyboard focus outline on every control.', on: 'surface.base', min: 3 },
    ],
  },
  {
    title: 'Surfaces',
    intro:
      `The background layers everything sits on. Depth comes from stepping between these and from hairlines (thin 1-pixel lines). Shadows aren't used for it.`,
    swatches: [
      { token: 'surface.base', kind: 'fill', role: 'The page itself.' },
      { token: 'surface.sunken', kind: 'fill', role: 'Recessed areas: form control fills, tag and tooltip backgrounds.' },
      { token: 'surface.raised', kind: 'fill', role: `Panels and cards that sit above the page. It's see-through, so it tints whatever is under it.` },
      { token: 'surface.scrim', kind: 'fill', role: `Dims the page behind a dialog, a sheet (a panel that slides in from the edge) or the command palette. Nothing under it can be clicked or focused while it's showing.` },
    ],
  },
  {
    title: 'Text',
    intro:
      `Five greys, from the loudest to the quietest. Every one reaches a contrast ratio of at least 4.5:1 against the surface it's used on. That's the minimum WCAG (the Web Content Accessibility Guidelines) sets for normal-size text. So you pick a grey for how much it should stand out, and readability never suffers.`,
    swatches: [
      { token: 'text.primary', kind: 'text', role: 'Headings, body copy, control values.', on: 'surface.base', min: 4.5 },
      { token: 'text.secondary', kind: 'text', role: 'Supporting copy, ledes (the intro paragraph under a page title), navigation items when nothing is happening to them.', on: 'surface.base', min: 4.5 },
      { token: 'text.muted', kind: 'text', role: 'Metadata (details like dates and counts), captions, eyebrows.', on: 'surface.base', min: 4.5 },
      { token: 'text.label', kind: 'text', role: 'Group labels over a list, like GUIDELINES and ATOMS in the sidebar.', on: 'surface.base', min: 4.5 },
      { token: 'text.placeholder', kind: 'text', role: 'Placeholder text inside an empty field.', on: 'surface.sunken', min: 4.5 },
    ],
  },
  {
    title: 'Borders',
    intro:
      `Hairlines are decoration, so they have no contrast requirement. The two control borders carry information: they're the only visible edge of an input or a checkbox. So each one has to reach 3:1 against the fill it surrounds.`,
    swatches: [
      { token: 'border.hairline', kind: 'border', role: 'Dividers and quiet panel edges.' },
      { token: 'border.hairline-strong', kind: 'border', role: 'Section rules, panel frames, tag and tooltip edges.' },
      { token: 'border.control', kind: 'border', role: 'The boundary of inputs, selects, textareas and secondary buttons.', on: 'surface.sunken', min: 3 },
      { token: 'border.selection', kind: 'border', role: `The boundary of checkboxes, radio buttons and switches. It's a step brighter because the box is small.`, on: 'surface.sunken', min: 3 },
    ],
  },
  {
    title: 'Status',
    intro:
      'Four colours that report the state of something. Each has the same three roles as signal (fill, text and ink). Colour is never the only clue: every status also comes with a word or an icon.',
    swatches: (['hostile', 'ok', 'info', 'warning'] as const).flatMap(state => {
      const meaning = { hostile: 'Errors, destructive actions, invalid fields.', ok: 'Success and healthy states.', info: 'Neutral notices.', warning: 'Caution: something needs attention soon.' }[state]
      return [
        // No page pair: a status fill always sits behind its ink text (a badge, a danger button),
        // so the ink-on-fill pair is the obligation. Holding the fill itself to 3:1 on the page
        // would print a red failure for a requirement that does not apply (warning is 1.76:1 on
        // the light page, and is correct). Signal is different: a checked box's fill IS the
        // information, so signal.fill keeps its page pair above, as the contrast gate does.
        { token: `accent.${state}.fill`, kind: 'fill' as const, role: `${meaning} Always behind ${state} ink text, which is the pair that is measured.` },
        { token: `accent.${state}.text`, kind: 'text' as const, role: `${state[0].toUpperCase()}${state.slice(1)} type on the page.`, on: 'surface.base', min: 4.5 },
        { token: `accent.${state}.ink`, kind: 'text' as const, role: `Text on a ${state} fill.`, on: `accent.${state}.fill`, min: 4.5 },
      ]
    }),
  },
]

const RAMPS = ['signal', 'neutral', 'hostile', 'ok', 'info', 'warning'] as const
const STOPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

const cssVar = (token: string) => `--color-${token.replace(/^color\./, '').replace(/\./g, '-')}`

type Resolved = { value: string; onValue?: string; ratio?: number }

function resolve(swatch: Swatch): Resolved {
  const value = readCssVar(cssVar(swatch.token))
  if (!swatch.on) return { value }
  // Translucent surfaces are composited over the page first, which is the pixel a reader sees.
  const onValue = composite(readCssVar(cssVar(swatch.on)), readCssVar('--color-surface-base'))
  return { value, onValue, ratio: contrastRatio(composite(value, onValue), onValue) }
}

/** Re-renders when the theme flips, so every value and ratio on the page is the live one. */
function useThemeVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion(v => v + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return version
}

function SwatchCard({ swatch }: { swatch: Swatch }) {
  const { value, onValue, ratio } = resolve(swatch)
  const color = `var(${cssVar(swatch.token)})`
  const bg = swatch.on ? `var(${cssVar(swatch.on)})` : undefined

  return (
    <div className="border border-[var(--color-border-hairline)] flex flex-col">
      {swatch.kind === 'fill' ? (
        <div className="h-20 border-b border-[var(--color-border-hairline)]" style={{ background: color }} />
      ) : swatch.kind === 'text' ? (
        <div className="h-20 flex items-center px-4 border-b border-[var(--color-border-hairline)]" style={{ background: bg ?? 'var(--color-surface-base)' }}>
          <span className="font-display font-semibold text-3xl leading-none" style={{ color }}>
            Aa
          </span>
          <span className="font-body text-sm ml-3" style={{ color }}>
            Sample text
          </span>
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center border-b border-[var(--color-border-hairline)]" style={{ background: bg ?? 'var(--color-surface-base)' }}>
          <div className="w-3/5 h-10" style={{ border: `${swatch.token === 'focus.ring' ? 2 : 1}px solid ${color}` }} />
        </div>
      )}
      <div className="p-3 font-mono text-xs flex flex-col gap-1 grow">
        <div className="text-[var(--color-text-primary)] font-semibold">{swatch.token}</div>
        <div className="text-[var(--color-text-muted)] break-all">{value}</div>
        <p className="font-body text-[0.8125rem] leading-snug text-[var(--color-text-secondary)] mt-1">{swatch.role}</p>
        {ratio !== undefined && swatch.min !== undefined ? (
          <div
            className={`mt-auto pt-2 ${ratio >= swatch.min ? 'text-[var(--color-accent-ok-text)]' : 'text-[var(--color-accent-hostile-text)]'}`}
          >
            {ratio.toFixed(2)}:1 on {swatch.on} <span className="text-[var(--color-text-muted)]">({onValue}, needs {swatch.min}:1)</span>
          </div>
        ) : (
          <div className="mt-auto pt-2 text-[var(--color-text-muted)]">{swatch.on ? '' : 'No contrast requirement'}</div>
        )}
      </div>
    </div>
  )
}

export function ColorGuideline() {
  // Read only to re-render: every value below is read from the live custom properties.
  useThemeVersion()

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Color</span>
          </>
        }
        title="Every colour, and what it is for"
        lede={
          <>
            The full palette, grouped by the job each colour does. A token is a named design value,
            like accent.signal.fill. Pick a colour here by its role, then use its token name in
            your work, never the raw colour value. Each card also shows its contrast ratio, a
            measure of how much the colour stands out from what it sits on. Every value and ratio
            is read live from the theme you&apos;re viewing, so switching the theme updates the
            whole page.
          </>
        }
      />

      {GROUPS.map(group => (
        <section key={group.title}>
          <SectionHeading>{group.title}</SectionHeading>
          <p className={`${docsProse} mb-5 max-w-[68ch]`}>{group.intro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.swatches.map(s => (
              <SwatchCard key={s.token} swatch={s} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <SectionHeading>Ramps</SectionHeading>
        <p className={`${docsProse} mb-5 max-w-[68ch]`}>
          Ramps are the raw colour scales, in steps from 50 to 950, that every token
          above is picked from. Components never use these directly. They use the role tokens, so
          a theme can point a role at a different colour without anyone touching a component.
          They&apos;re shown here so you can see where each role sits on its scale.
        </p>
        <div className="flex flex-col gap-4">
          {RAMPS.map(ramp => (
            <div key={ramp}>
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)] mb-1.5">{ramp}</div>
              <div className="grid grid-cols-11 border border-[var(--color-border-hairline)]">
                {STOPS.map(stop => (
                  <div key={stop} className="min-w-0">
                    <div className="h-10" style={{ background: `var(--color-${ramp}-${stop})` }} />
                    <div className="px-1 py-1 font-mono text-[10px] leading-tight text-[var(--color-text-muted)] truncate">
                      {stop}
                      <span className="hidden md:block truncate">{readCssVar(`--color-${ramp}-${stop}`)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
