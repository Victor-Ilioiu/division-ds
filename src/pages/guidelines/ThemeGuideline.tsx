import { useEffect, useMemo, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, SectionHeading, docsLabel, docsProse } from '../../components/docs/PageChrome'
import { Alert } from '../../components/molecules/alert/Alert'
import { Badge } from '../../components/atoms/badge/Badge'
import { Button } from '../../components/atoms/button/Button'
import { Checkbox } from '../../components/atoms/checkbox/Checkbox'
import { Select } from '../../components/atoms/select/Select'
import { Switch } from '../../components/atoms/switch/Switch'
import { Input } from '../../components/atoms/input/Input'
import { SegmentedControl } from '../../components/molecules/segmented-control/SegmentedControl'
import { CssBlock } from './CssBlock'
import { contrastRatio } from '../../../scripts/lib/contrast.mjs'
import { DEFAULT_PRESET, WHITE_INK, buildTheme, decodePreset, encodePreset, themeCss, type Preset } from '../../../scripts/lib/preset.mjs'
import { RADII, readShape, shapeCss, shapeVars } from './theme-shape'
import primitives from '../../../tokens/primitive/color.json'
import dark from '../../../tokens/semantic/color.dark.json'
import light from '../../../tokens/semantic/color.light.json'
import control from '../../../tokens/component/control.json'
import { FONTS, fontCss, fontVars, fontsUrl, loadFonts, readFont, type Font } from './theme-fonts'

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

function ColorInput({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="color"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-10 w-14 cursor-pointer border border-[var(--color-border-control)] bg-[var(--color-surface-sunken)]"
      />
      <div>
        <label htmlFor={id} className="block font-display font-semibold text-[var(--color-text-primary)]">
          {label} <span className="font-mono text-sm text-[var(--color-text-secondary)]">{value}</span>
        </label>
        <p className="text-sm text-[var(--color-text-secondary)]">{hint}</p>
      </div>
    </div>
  )
}

const DEFAULT_FONT = 'default'

function FontInput({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value?: Font; onChange: (font?: Font) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block font-display font-semibold text-[var(--color-text-primary)]">{label}</label>
      <p className="mb-2 text-sm text-[var(--color-text-secondary)]">{hint}</p>
      <Select
        id={id}
        label={label}
        className="min-w-60"
        value={value ?? DEFAULT_FONT}
        onValueChange={font => onChange(readFont(font))}
        options={[{ value: DEFAULT_FONT, label: 'Division default' }, ...FONTS.map(font => ({ value: font, label: font }))]}
      />
    </div>
  )
}

/** A few real components, painted with one theme's tokens set inline. The component layer is
 *  declared on every [data-theme], so it resolves against the inline semantic values here. */
function Preview({ theme, tokens, radius }: { theme: 'dark' | 'light'; tokens: Record<string, string>; radius: number | null }) {
  return (
    <div
      data-theme={theme}
      style={{ ...tokens, ...shapeVars(radius) } as CSSProperties}
      className="flex flex-col gap-4 font-body border border-[var(--color-border-hairline)] bg-[var(--color-surface-base)] p-5 text-[var(--color-text-primary)]"
    >
      <p className={`${docsLabel} text-[var(--color-text-label)]`}>{theme} theme</p>
      <div className="flex flex-wrap gap-3">
        <Button>Deploy</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="link">Details</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="signal" emphasis="solid">Live</Badge>
        <Badge tone="signal">Queued</Badge>
        <Badge tone="ok">Healthy</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <Checkbox id={`${theme}-check`} defaultChecked />
          <label htmlFor={`${theme}-check`}>Notify me</label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id={`${theme}-switch`} defaultChecked />
          <label htmlFor={`${theme}-switch`}>Auto-scale</label>
        </div>
      </div>
      <Input aria-label={`Service name, ${theme} theme`} placeholder="Service name" />
      <Alert tone="info" title="Preview">Text, fills and borders all come from this preset.</Alert>
    </div>
  )
}

// Plain names for the tokens the solver can move (buildTheme's adjustments).
const TOKEN_LABELS: Record<string, string> = {
  'accent.signal.indicator': 'accent state colour',
  'accent.signal.text': 'accent text',
  'focus.ring': 'focus ring',
  'chart.series-1': 'first chart colour',
}

export function ThemeGuideline() {
  const [params, setParams] = useSearchParams()
  const { preset, error } = readPreset(params.get('preset'))
  const code = encodePreset(preset)
  const { themes, failures, adjustments } = useMemo(() => buildTheme(decodePreset(code), DOCS), [code])
  /** Merge into the current params, so preset, fonts and any other param coexist. Empty removes. */
  const setParam = (key: string, value?: string) =>
    setParams(current => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  const set = (next: Partial<Preset>) => setParam('preset', encodePreset({ ...preset, ...next }))
  const fonts = { heading: readFont(params.get('heading')), body: readFont(params.get('body')) }
  const url = fontsUrl([fonts.heading, fonts.body])
  useEffect(() => loadFonts(url), [url])
  const previewVars = (tokens: Record<string, string>) => ({ ...tokens, ...fontVars(fonts) })
  const radius = readShape(params.get('shape'))
  const installCss = installCssFor(fontCss(fonts), themeCss(preset, themes) + shapeCss(radius))
  const measured = themes.dark.results.length + themes.light.results.length

  return (
    // From xl up the contrast gate is a sticky right-hand column, so its result stays in view while
    // the inputs change. Below xl it falls back into the flow after the preview.
    <div className="grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-10 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:xl:col-start-1">
      <PageHeader
        eyebrow={
          <>
            Guidelines <span className="text-[var(--color-accent-signal-text)]">· Theme builder</span>
          </>
        }
        title="Your accent, the same gate"
        lede="Pick the two colours the system is built from. The page rebuilds both themes and runs every contrast check the build runs. It only gives you the code if all of them pass."
      />

      <section>
        <SectionHeading>Inputs</SectionHeading>
        <div className="flex flex-col gap-5">
          <ColorInput id="preset-signal" label="Accent" hint="Used exactly as chosen for buttons and badges, in both themes. Checked controls, selected items, the focus ring, links and charts use it too, moved to a nearby shade only where it would be too faint to see." value={preset.signal} onChange={signal => set({ signal })} />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Text on the accent: <strong className="text-[var(--color-text-primary)]">{themes.dark.tokens['--color-accent-signal-ink'] === WHITE_INK ? 'white' : 'dark'}</strong>,
            chosen automatically. White when it reaches 4.5:1 on the accent ({contrastRatio(WHITE_INK, themes.dark.tokens['--color-accent-signal-fill']).toFixed(2)}:1 here), dark when it does not.
          </p>
          <ColorInput id="preset-neutral" label="Neutral" hint="The light theme's page, panels and text. The dark theme's greys are fixed values." value={preset.neutral} onChange={neutral => set({ neutral })} />
          <FontInput id="font-heading" label="Heading font" hint="Titles and labels. Loaded from Google Fonts." value={fonts.heading} onChange={f => setParam('heading', f)} />
          <FontInput id="font-body" label="Body font" hint="Running text and controls. Mono stays as it is." value={fonts.body} onChange={f => setParam('body', f)} />
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="preset-cut"
                checked={radius === null}
                onCheckedChange={checked => setParam('shape', checked === true ? 'cut' : 'r0')}
              />
              <label htmlFor="preset-cut" className="font-display font-semibold text-[var(--color-text-primary)]">
                Keep the cut corner
              </label>
            </div>
            {radius !== null && (
              <SegmentedControl
                label="Corner radius"
                size="sm"
                value={String(radius)}
                onValueChange={value => setParam('shape', `r${value}`)}
                options={RADII.map(r => ({ value: String(r), label: `${r} px` }))}
              />
            )}
          </div>
          <div>
            <Button variant="secondary" size="sm" onClick={() => setParams({}, { replace: true })}>Reset to Division</Button>
          </div>
          {error && <Alert tone="warning" title="That preset code could not be read">{error} Showing the default instead.</Alert>}
        </div>
      </section>

      <section>
        <SectionHeading>Preview</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          <Preview theme="dark" tokens={previewVars(themes.dark.tokens)} radius={radius} />
          <Preview theme="light" tokens={previewVars(themes.light.tokens)} radius={radius} />
        </div>
      </section>

      <aside aria-label="Contrast gate" className="xl:col-start-2! xl:row-span-4 xl:row-start-1 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
        <SectionHeading>Contrast gate</SectionHeading>
        {(['dark', 'light'] as const).some(t => adjustments[t].length > 0) && (
          <div className={`${docsProse} mb-4 max-w-2xl`}>
            <p>Some shades were moved along your accent&apos;s ramp so they pass:</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {(['dark', 'light'] as const).flatMap(t =>
                adjustments[t].map(a => (
                  <li key={`${t}-${a.token}`}>
                    {t === 'dark' ? 'Dark' : 'Light'} theme: {TOKEN_LABELS[a.token] ?? a.token} {Number(a.to) > Number(a.from) ? 'darkened' : 'lightened'} from {a.from} to {a.to},
                    so {a.fixed.length === 1 ? 'one check passes' : `${a.fixed.length} checks pass`} ({a.fixed[0]}{a.fixed.length > 1 ? ', …' : ''}).
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
        {failures.length === 0 ? (
          <Alert tone="ok" title={`All ${measured} measurements pass in both themes.`}>
            Preset <code className="font-mono text-sm">{code}</code>. The full code is under Apply it.
          </Alert>
        ) : (
          <Alert tone="warning" title={`${failures.length} of ${measured} measurements fail, so there is no code to copy`}>
            <ul className="mt-2 flex flex-col gap-1">
              {failures.map(f => (
                <li key={`${f.theme}-${f.name}`} className="font-mono text-sm">
                  {f.theme}: {f.name}, {f.ratio.toFixed(2)}:1, needs {f.minRatio}:1{f.maxRatio === undefined ? '' : ` to ${f.maxRatio}:1`}
                </li>
              ))}
            </ul>
          </Alert>
        )}
      </aside>

      {failures.length === 0 && (
        <section>
          <SectionHeading>Apply it</SectionHeading>
          <p className={`${docsProse} mb-4 max-w-2xl`}>
            This is the top of your CSS entry file: the Division DS stylesheet, then the theme, which sets the same variables so the
            later one wins and no component changes.
            {url && ' The Google Fonts import has to stay first, above every other rule.'}
          </p>
          <CssBlock file="index.css" label="the theme CSS" code={installCss} />
        </section>
      )}
    </div>
  )
}
