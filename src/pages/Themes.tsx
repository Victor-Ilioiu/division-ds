import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2, RotateCcw } from 'lucide-react'
import { docsLabel } from '../components/docs/PageChrome'
import { Alert } from '../components/molecules/alert/Alert'
import { Link, linkVariants } from '../components/atoms/link/Link'
import { Checkbox } from '../components/atoms/checkbox/Checkbox'
import { Select } from '../components/atoms/select/Select'
import { SegmentedControl } from '../components/molecules/segmented-control/SegmentedControl'
import { CodeBlock } from '../components/molecules/code-block/CodeBlock'
import { useToast } from '../components/molecules/toast/Toast'
import {
  ACCENT_PRESETS,
  DEFAULT_PRESET,
  buildTheme,
  decodePreset,
  encodePreset,
  themeCss,
  type Preset,
} from '../../scripts/lib/preset.mjs'
import { RADII, RADIUS_LABELS, readShape, shapeCss, shapeVars } from './themes/theme-shape'
import { FONTS, fontCss, fontVars, fontsUrl, loadFonts, readFont, type Font } from './themes/theme-fonts'
import { ThemePreview } from './themes/ThemePreview'
import { REGISTRY } from '../links'
import { getStoredTheme } from '../lib/theme'
import primitives from '../../tokens/primitive/color.json'
import dark from '../../tokens/semantic/color.dark.json'
import light from '../../tokens/semantic/color.light.json'
import control from '../../tokens/component/control.json'

const DOCS = { primitives, dark, light, control }

/** Font imports first (CSS requires @import before any rule), then the stylesheet, then the theme. */
function installCssFor(fontBlock: string, theme: string): string {
  const [imports = '', rest = ''] = fontBlock ? fontBlock.split(/\n\n(?=:root)/) : []
  return `${imports ? `${imports}\n` : ''}@import "./division-ds/styles/division-ds.css";\n\n${rest}${theme}`
}

function readPreset(code: string | null): { preset: Preset; error?: string } {
  if (!code) return { preset: DEFAULT_PRESET }
  try {
    return { preset: decodePreset(code) }
  } catch (error) {
    return { preset: DEFAULT_PRESET, error: (error as Error).message }
  }
}

type Mode = 'dark' | 'light'
const readMode = (value: string | null): Mode | null => (value === 'dark' || value === 'light' ? value : null)
const siteMode = (): Mode =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : getStoredTheme()

/** One shadcn-style control row: the label on the left, the value and its trigger on the right. */
const rowClass = 'flex min-h-10 items-center justify-between gap-3 border-b border-[var(--color-border-hairline)] py-2'
const rowLabel = 'text-sm font-medium text-[var(--color-text-primary)]'
const sectionLabel = `${docsLabel} pt-4 pb-1`

/** A compact colour row: label, hex value, and a small swatch that opens the browser's picker. */
function ColorRow({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <div className={rowClass}>
      <label htmlFor={id} className={rowLabel}>
        {label}
      </label>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">{value}</span>
        <input
          id={id}
          type="color"
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer border border-[var(--color-border-control)] bg-[var(--color-surface-sunken)] p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        />
      </span>
    </div>
  )
}

const DEFAULT_FONT = 'default'

function FontRow({ label, value, onChange }: { label: string; value?: Font; onChange: (font?: Font) => void }) {
  return (
    <div className={rowClass}>
      <span className={rowLabel} aria-hidden="true">
        {label}
      </span>
      <Select
        label={label}
        inputSize="sm"
        className="w-40"
        value={value ?? DEFAULT_FONT}
        onValueChange={font => onChange(readFont(font))}
        options={[{ value: DEFAULT_FONT, label: 'Division default' }, ...FONTS.map(font => ({ value: font, label: font }))]}
      />
    </div>
  )
}

const CUSTOM = 'custom'
const dot = (color: string) => <span className="block h-3.5 w-3.5 border border-[var(--color-border-hairline-strong)]" style={{ backgroundColor: color }} />

// Plain names for the tokens the solver can move (buildTheme's adjustments).
const TOKEN_LABELS: Record<string, string> = {
  'accent.signal.indicator': 'accent state colour',
  'accent.signal.text': 'accent text',
  'focus.ring': 'focus ring',
  'chart.series-1': 'first chart colour',
}

/**
 * The Theme Builder at /themes: a full-width theme customizer under the site header, with no docs
 * sidebar. Compact controls on the left, the live preview in the centre, contrast results and the
 * CSS in a right sidebar (below the preview under xl, all stacked on phones). Everything the controls set
 * lives in the URL (`preset`, `heading`, `body`, `shape`, `mode`), so a theme is a link. The CSS is
 * withheld while any contrast check fails, the same gate `npm run tokens` runs.
 */
export function Themes() {
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
  const { preset, error } = readPreset(params.get('preset'))
  const code = encodePreset(preset)
  const { themes, failures, adjustments } = useMemo(() => buildTheme(decodePreset(code), DOCS), [code])
  /** Merge into the current params, so preset, fonts and any other param coexist. Empty removes. */
  const setParam = (key: string, value?: string) =>
    setParams(
      current => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true }
    )
  const set = (next: Partial<Preset>) => {
    const merged = { ...preset, ...next }
    setParam('preset', encodePreset(merged) === encodePreset(DEFAULT_PRESET) ? undefined : encodePreset(merged))
  }
  const fonts = { heading: readFont(params.get('heading')), body: readFont(params.get('body')) }
  const url = fontsUrl([fonts.heading, fonts.body])
  useEffect(() => loadFonts(url), [url])
  const radius = readShape(params.get('shape'))
  // The preview starts in the site's own theme and is switched independently of it.
  const [defaultMode] = useState(siteMode)
  const mode = readMode(params.get('mode')) ?? defaultMode
  const installCss = installCssFor(fontCss(fonts), themeCss(preset, themes) + shapeCss(radius))
  const measured = themes.dark.results.length + themes.light.results.length
  const moved = (['dark', 'light'] as const).flatMap(t => adjustments[t].map(a => ({ ...a, theme: t })))
  const presetMatch = ACCENT_PRESETS.find(p => p.signal === preset.signal.toLowerCase())
  // "Custom color" stays chosen once picked, even if the picker lands on a preset's exact hex.
  const [customPicked, setCustomPicked] = useState(false)
  const accentChoice = customPicked || !presetMatch ? CUSTOM : presetMatch.signal

  const copyLink = () => {
    const link = window.location.href
    navigator.clipboard.writeText(link).then(
      () => toast({ title: 'Link copied', description: 'Anyone who opens it sees this theme.', tone: 'ok' }),
      () => toast({ title: 'Could not copy the link', description: 'Your browser blocked the clipboard. Copy the address bar instead.', tone: 'warning' })
    )
  }

  const reset = () => {
    setCustomPicked(false)
    setParams({}, { replace: true })
  }

  const jumpToApply = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('apply')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  // The sidebars scroll on their own from lg; reticle-room keeps focus rings and reticles off the clip edge.
  const scrollPane = 'lg:sticky lg:top-[4.5rem] lg:self-start lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto'

  return (
    <div className="w-full px-gutter pt-6 pb-16 lg:px-6">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)] lg:text-3xl">Theme Builder</h1>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_22rem] xl:gap-8">
        <aside aria-label="Theme controls" className={`${scrollPane} reticle-room flex flex-col`}>
          <h2 className={sectionLabel}>Colour</h2>
          <div className={rowClass}>
            <span className={rowLabel} aria-hidden="true">
              Accent
            </span>
            <span className="flex items-center gap-2">
              {dot(preset.signal)}
              <Select
                label="Accent colour"
                inputSize="sm"
                className="w-36"
                value={accentChoice}
                onValueChange={value => {
                  if (value === CUSTOM) return setCustomPicked(true)
                  setCustomPicked(false)
                  set({ signal: value })
                }}
                options={[
                  ...ACCENT_PRESETS.map(p => ({ value: p.signal, label: p.name, icon: dot(p.signal) })),
                  { value: CUSTOM, label: 'Custom color', icon: dot(accentChoice === CUSTOM ? preset.signal : 'transparent') },
                ]}
              />
            </span>
          </div>
          {accentChoice === CUSTOM && <ColorRow id="preset-signal" label="Custom accent" value={preset.signal} onChange={signal => set({ signal })} />}
          <ColorRow id="preset-neutral" label="Neutral" value={preset.neutral} onChange={neutral => set({ neutral })} />

          <h2 className={sectionLabel}>Type</h2>
          <FontRow label="Heading font" value={fonts.heading} onChange={f => setParam('heading', f)} />
          <FontRow label="Body font" value={fonts.body} onChange={f => setParam('body', f)} />

          <h2 className={sectionLabel}>Corners</h2>
          <div className={rowClass}>
            <label htmlFor="preset-cut" className={rowLabel}>
              Keep the cut corner
            </label>
            <Checkbox id="preset-cut" checked={radius === null} onCheckedChange={checked => setParam('shape', checked === true ? undefined : 'r0')} />
          </div>
          {radius !== null && (
            <div className={rowClass}>
              <span className={rowLabel} aria-hidden="true">
                Radius
              </span>
              <Select
                label="Corner radius"
                inputSize="sm"
                className="w-36"
                value={String(radius)}
                onValueChange={value => setParam('shape', `r${value}`)}
                options={RADII.map(r => ({ value: String(r), label: RADIUS_LABELS[r] }))}
              />
            </div>
          )}

          <div className="mt-5 flex items-center gap-5 text-sm">
            <button type="button" className={`${linkVariants({ tone: 'signal' })} inline-flex items-center gap-1.5`} onClick={copyLink}>
              <Link2 aria-hidden="true" className="size-3.5" />
              Copy link
            </button>
            <button type="button" className={`${linkVariants({ tone: 'quiet' })} inline-flex items-center gap-1.5`} onClick={reset}>
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Reset
            </button>
          </div>
        </aside>

        <section aria-labelledby="preview-heading" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="preview-heading" className={docsLabel}>
              Preview
            </h2>
            <div className="flex items-center gap-4">
              <Link href="#apply" tone="quiet" className="text-sm" onClick={jumpToApply}>
                Apply it
              </Link>
              <SegmentedControl
                label="Preview theme"
                size="sm"
                value={mode}
                onValueChange={value => setParam('mode', value)}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />
            </div>
          </div>
          {/* The component layer is declared on every [data-theme], so it resolves against the
              inline semantic values set here. */}
          <div
            data-theme={mode}
            data-testid="theme-preview"
            style={{ ...themes[mode].tokens, ...fontVars(fonts), ...shapeVars(radius) } as CSSProperties}
            className="border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] p-4 font-body text-[var(--color-text-primary)] sm:p-6"
          >
            <ThemePreview />
          </div>
          <section id="apply" aria-labelledby="apply-heading" className="mt-5 flex min-w-0 scroll-mt-20 flex-col gap-3">
            <h2 id="apply-heading" className={docsLabel}>
              Apply it
            </h2>
            {failures.length === 0 ? (
              <>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  The top of your CSS entry file: the stylesheet, then the theme, both modes.
                  {url && ' Keep the Google Fonts import first.'}
                </p>
                <CodeBlock title="index.css" language="css" label="the theme CSS" code={installCss} />
                <p className="text-sm text-[var(--color-text-secondary)]">No components yet? Add them with the shadcn CLI first.</p>
                <CodeBlock title="bash" label="the add everything command" code={`npx shadcn@latest add ${REGISTRY}/division-ds-all.json`} />
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">The CSS appears here once every contrast check passes.</p>
            )}
          </section>
        </section>

        <aside aria-label="Contrast checks and CSS" className={`${scrollPane} reticle-room flex min-w-0 flex-col gap-5 lg:col-start-2 xl:col-start-3`}>
          <section aria-label="Contrast check" className="flex flex-col gap-3">
            {failures.length === 0 ? (
              <Alert tone="ok" title={`All ${measured} contrast checks pass`}>
                Both themes meet WCAG AA. Preset <code className="font-mono text-sm">{code}</code>.
              </Alert>
            ) : (
              <Alert tone="warning" title={`${failures.length} of ${measured} checks fail AA, so there is no CSS yet`}>
                <ul className="mt-2 flex flex-col gap-1">
                  {failures.map(f => (
                    <li key={`${f.theme}-${f.name}`} className="font-mono text-xs">
                      {f.theme}: {f.name}, {f.ratio.toFixed(2)}:1, needs {f.minRatio}:1{f.maxRatio === undefined ? '' : ` to ${f.maxRatio}:1`}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
            {moved.length > 0 && (
              <div className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
                <p>Shades moved along your accent&apos;s ramp so they pass:</p>
                <ul className="flex flex-col gap-1">
                  {moved.map(a => (
                    <li key={`${a.theme}-${a.token}`}>
                      {a.theme === 'dark' ? 'Dark' : 'Light'} theme: {TOKEN_LABELS[a.token] ?? a.token} {Number(a.to) > Number(a.from) ? 'darkened' : 'lightened'} from{' '}
                      {a.from} to {a.to}, so {a.fixed.length === 1 ? 'one check passes' : `${a.fixed.length} checks pass`}.
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && (
              <Alert tone="warning" title="That preset code could not be read">
                {error} Showing the default instead.
              </Alert>
            )}
          </section>

        </aside>
      </div>
    </div>
  )
}
