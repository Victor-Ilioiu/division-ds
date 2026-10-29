import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildIndex, closest, findPropViolations, isDivisionSource, literalUnion, parseRest } from './props-validator.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** A small manifest in the real format: one strict component, one with a native rest, one with a
 *  Radix rest, and one compound entry. */
const MANIFEST = {
  components: [
    {
      name: 'Badge',
      docs: '/docs/components/badge.md',
      imports: [{ names: ['Badge', 'badgeVariants'], from: 'src/components/atoms/badge/Badge' }],
      props: [
        { name: 'tone', type: "'neutral' | 'signal' | 'hostile' | 'ok'" },
        { name: 'size', type: "'sm' | 'md'" },
        { name: 'className', type: 'string' },
        { name: 'ref', type: 'Ref<HTMLSpanElement>' },
        { name: '...rest', type: 'HTMLAttributes<HTMLSpanElement>' },
      ],
    },
    {
      name: 'Button',
      docs: '/docs/components/button.md',
      imports: [{ names: ['Button', 'buttonVariants'], from: 'src/components/atoms/button/Button' }],
      props: [
        { name: 'variant', type: "'primary' | 'secondary' | 'danger' | 'ghost'" },
        { name: 'size', type: "'sm' | 'md' | 'lg'" },
        { name: 'loading', type: 'boolean' },
        { name: '...rest', type: "Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-busy' | 'children'>" },
      ],
    },
    {
      name: 'Stepper',
      docs: '/docs/components/stepper.md',
      imports: [{ names: ['Stepper'], from: 'src/components/molecules/stepper/Stepper' }],
      props: [
        { name: 'steps', type: 'string[]' },
        { name: 'current', type: 'number' },
        { name: 'label', type: 'string' },
      ],
    },
    {
      name: 'Checkbox',
      docs: '/docs/components/checkbox.md',
      imports: [{ names: ['Checkbox'], from: 'src/components/atoms/checkbox/Checkbox' }],
      props: [
        { name: 'checked', type: "boolean | 'indeterminate'" },
        { name: '...rest', type: "Omit<CheckboxProps, 'aria-invalid' | 'defaultChecked'>" },
      ],
    },
    {
      name: 'Tabs',
      docs: '/docs/components/tabs.md',
      imports: [{ names: ['Tabs', 'TabsList', 'TabsTrigger'], from: 'src/components/molecules/tabs/Tabs' }],
      props: [
        { name: 'value (Root)', type: 'string' },
        { name: 'orientation', type: "'horizontal' | 'vertical'" },
        { name: 'value (Trigger)', type: 'string' },
      ],
    },
  ],
}
const INDEX = buildIndex(MANIFEST)
const IMPORTS = [
  "import { Badge } from '../components/atoms/badge/Badge'",
  "import { Button } from '../components/atoms/button/Button'",
  "import { Stepper } from '../components/molecules/stepper/Stepper'",
  "import { Checkbox } from '../components/atoms/checkbox/Checkbox'",
  "import { Tabs, TabsList, TabsTrigger } from '../components/molecules/tabs/Tabs'",
].join('\n')
const scan = (jsx, imports = IMPORTS) =>
  findPropViolations(`${imports}\nexport const Screen = () => (\n${jsx}\n)\n`, 'src/Screen.tsx', INDEX)

describe('valid usage', () => {
  it('passes declared props, enum values, React props, aria-*, data-* and native rest attributes', () => {
    const jsx = `<div>
      <Badge tone="ok" size="sm" className="x" key="a" aria-hidden data-state="on" title="Ready" onClick={() => {}}>Ready</Badge>
      <Button variant="danger" size={'lg'} loading type="submit" disabled onClick={() => {}}>Delete</Button>
      <Stepper steps={['a', 'b']} current={1} label="Setup" id="s" style={{}} />
      <Tabs value="a" orientation="vertical"><TabsList><TabsTrigger value="a" asChild>A</TabsTrigger></TabsList></Tabs>
    </div>`
    expect(scan(jsx)).toEqual([])
  })

  it('does not judge a value it cannot read: a variable, a call, a template with substitutions', () => {
    expect(scan('<Button variant={kind} size={pick()} className={`a ${b}`}>Go</Button>')).toEqual([])
  })
})

describe('unknown props', () => {
  it('flags a prop the component does not take, and names the nearest real one', () => {
    const [violation, ...rest] = scan('<Badge tones="ok">New</Badge>')
    expect(rest).toEqual([])
    expect(violation).toMatchObject({ rule: 'unknown-prop', component: 'Badge', prop: 'tones', line: 7 })
    expect(violation.fix).toMatch(/Did you mean "tone"\?/)
    expect(violation.fix).toMatch(/\/docs\/components\/badge\.md/)
  })

  it('lists the real props when nothing is close', () => {
    const [violation] = scan('<Badge variant="secondary">New</Badge>')
    expect(violation.rule).toBe('unknown-prop')
    expect(violation.fix).toMatch(/Badge takes: tone, size, className, ref, and native attributes/)
  })

  it('rejects event handlers and native attributes on a component with no ...rest row', () => {
    expect(scan('<Stepper steps={[]} current={0} label="x" onClick={f} />').map(v => v.prop)).toEqual(['onClick'])
    expect(scan('<Stepper steps={[]} current={0} label="x" title="t" />').map(v => v.prop)).toEqual(['title'])
  })

  it('rejects a prop the rest type omits on purpose', () => {
    const [violation] = scan('<Button aria-busy>Save</Button>')
    expect(violation).toMatchObject({ rule: 'unknown-prop', prop: 'aria-busy' })
    expect(violation.fix).toMatch(/types "aria-busy" away on purpose/)
  })
})

describe('enum values', () => {
  it('flags a value outside the union, with the system’s word for it on that prop', () => {
    const [violation] = scan('<Button variant="hostile">Delete</Button>')
    expect(violation).toMatchObject({ rule: 'invalid-value', prop: 'variant', found: 'variant="hostile"' })
    expect(violation.fix).toBe(`Button's variant is one of "primary", "secondary", "danger", "ghost". Write variant="danger".`)
    // The same word the other way round: tones say hostile, Button's variant says danger.
    expect(scan('<Badge tone="danger">x</Badge>')[0].fix).toMatch(/Write tone="hostile"\./)
  })

  it('suggests the nearest value for a typo, and checks both sides of a conditional', () => {
    const violations = scan('<Badge tone={open ? "signl" : "neutral"} size={big ? "lg" : "sm"}>x</Badge>')
    expect(violations.map(v => v.found)).toEqual(['tone="signl"', 'size="lg"'])
    expect(violations[0].fix).toMatch(/Write tone="signal"\./)
  })

  it('judges the main component of a compound page when its props are closed, never its parts', () => {
    const manifest = {
      components: [
        {
          name: 'DatePicker',
          docs: '/docs/components/date-picker.md',
          closed: true,
          imports: [{ names: ['DatePicker', 'Calendar'], from: 'src/components/molecules/date-picker/DatePicker' }],
          props: [{ name: 'label', type: 'string' }, { name: 'onSelect (Calendar)', type: '(date: string) => void' }],
        },
      ],
    }
    const imports = "import { DatePicker, Calendar } from '../components/molecules/date-picker/DatePicker'"
    const found = findPropViolations(
      `${imports}
export const S = () => <><DatePicker label="Due" lable="x" /><Calendar anything /></>
`,
      'src/S.tsx',
      buildIndex(manifest)
    )
    expect(found.map(v => `${v.component} ${v.prop}`)).toEqual(['DatePicker lable'])
    expect(found[0].fix).toMatch(/Did you mean "label"\?/)
  })

  it('checks enum values on compound parts too, where unknown props are not judged', () => {
    const violations = scan('<Tabs orientation="sideways" loop dir="rtl"><TabsList>x</TabsList></Tabs>')
    expect(violations.map(v => v.found)).toEqual(['orientation="sideways"'])
  })
})

describe('missing labels', () => {
  const manifest = {
    components: [
      { name: 'Select', docs: '/docs/components/select.md', closed: true, namedByFormField: ['Select'], imports: [{ names: ['Select'], from: 'src/components/atoms/select/Select' }], props: [{ name: 'label', type: 'string' }, { name: 'options', type: 'SelectOption[]' }] },
      { name: 'FormField', docs: '/docs/components/form-field.md', imports: [{ names: ['FormField'], from: 'src/components/molecules/form-field/FormField' }], props: [{ name: 'label', type: 'string' }] },
    ],
  }
  const imports = "import { Select } from '../components/atoms/select/Select'\nimport { FormField } from '../components/molecules/form-field/FormField'"
  const find = jsx => findPropViolations(`${imports}\nexport const S = () => (\n${jsx}\n)\n`, 'src/S.tsx', buildIndex(manifest)).map(v => v.rule)

  it('flags a control FormField names when it has neither a label nor a FormField', () => {
    expect(find('<Select options={[]} />')).toEqual(['missing-label'])
  })

  it('accepts one with a label, inside a FormField, or with props spread in', () => {
    expect(find('<Select options={[]} label="Kit" />')).toEqual([])
    expect(find('<FormField label="Kit"><div><Select options={[]} /></div></FormField>')).toEqual([])
    expect(find('<Select {...props} />')).toEqual([])
  })
})

describe('only Division DS elements are judged', () => {
  it('ignores a consumer’s own component with the same name', () => {
    const imports = "import { Button } from './ui/Button'\nimport { Badge } from '@acme/badges'"
    expect(scan('<div><Button variant="hostile" tone="x" /><Badge variant="pill" /></div>', imports)).toEqual([])
  })

  it('follows an alias and a namespace import, and accepts the package name as a source', () => {
    const imports = "import { Button as DsButton } from 'division-ds'\nimport * as DS from '@/components/atoms'"
    const violations = scan('<div><DsButton variant="hostile" /><DS.Badge tone="pink" /></div>', imports)
    expect(violations.map(v => `${v.component} ${v.found}`)).toEqual(['DsButton variant="hostile"', 'DS.Badge tone="pink"'])
  })

  it('classifies import sources', () => {
    expect(isDivisionSource('../components/atoms/button/Button')).toBe(true)
    expect(isDivisionSource('src/components/organisms')).toBe(true)
    expect(isDivisionSource('division-ds')).toBe(true)
    expect(isDivisionSource('division-ds/atoms')).toBe(true)
    expect(isDivisionSource('./ui/Button')).toBe(false)
    expect(isDivisionSource('@acme/components/buttons')).toBe(false)
  })
})

describe('rest-spread components', () => {
  it('accepts native attributes and handlers through a native ...rest, but not an invented prop', () => {
    expect(scan('<Button form="f" name="go" autoFocus tabIndex={0} onKeyDown={f}>Go</Button>')).toEqual([])
    expect(scan('<Button tone="ok">Go</Button>').map(v => v.prop)).toEqual(['tone'])
  })

  it('accepts anything but the omitted names through a Radix ...rest, which the manifest cannot list', () => {
    expect(scan('<Checkbox asChild forceMount onBlur={f} />')).toEqual([])
    expect(scan('<Checkbox defaultChecked />').map(v => v.prop)).toEqual(['defaultChecked'])
  })

  it('reads the rest row’s Omit<> list and the part it belongs to', () => {
    expect(parseRest("Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label' | 'children'>")).toEqual({
      open: 'native',
      excluded: new Set(['aria-label']),
      minusAria: false,
    })
    const select = parseRest("Omit<Select.Root props, 'children'>, minus every aria-* key and data-testid")
    expect(select).toEqual({ open: 'any', excluded: new Set(['data-testid']), minusAria: true })
    const radio = buildIndex({
      components: [
        {
          name: 'Radio',
          imports: [{ names: ['Radio', 'RadioGroup'], from: 'x' }],
          props: [{ name: '...rest', type: "(Radio) Omit<RadioGroup.Item props, 'aria-invalid'>" }],
        },
      ],
    })
    expect(radio.get('Radio').rest.excluded).toEqual(new Set(['aria-invalid']))
    expect(radio.get('RadioGroup').rest).toBeNull()
  })
})

describe('helpers', () => {
  it('reads a union of string literals, and nothing else', () => {
    expect(literalUnion("'sm' | 'md' | 'lg'")).toEqual(['sm', 'md', 'lg'])
    expect(literalUnion("'a' | undefined")).toEqual(['a'])
    expect(literalUnion("number | 'auto'")).toBeNull()
    expect(literalUnion('string')).toBeNull()
    expect(literalUnion("boolean | 'indeterminate'")).toBeNull()
  })

  it('suggests only a close match', () => {
    expect(closest('varient', ['variant', 'size'])).toBe('variant')
    expect(closest('emphasis', ['tone', 'size'])).toBeUndefined()
  })
})

describe('the real manifest', () => {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'public/manifest/components.json'), 'utf8'))
  const index = buildIndex(manifest)

  it('indexes every component the manifest lists', () => {
    for (const entry of manifest.components) {
      const names = entry.imports.flatMap(item => item.names).filter(name => /^[A-Z][a-z]/.test(name))
      expect(names.some(name => index.has(name)), entry.name).toBe(true)
    }
  })

  // docs/agent-eval stays in the private repository; the public export has no screens to read.
  it.skipIf(!existsSync(join(REPO_ROOT, 'docs/agent-eval')))('finds nothing in the agent-eval screens, which all type-check', () => {
    const found = []
    for (const folder of ['after', 'docs-only', 'before']) {
      const dir = join(REPO_ROOT, 'docs/agent-eval', folder)
      for (const file of readdirSync(dir).filter(name => name.endsWith('.tsx'))) {
        found.push(...findPropViolations(readFileSync(join(dir, file), 'utf8'), `${folder}/${file}`, index))
      }
    }
    expect(found).toEqual([])
  })
})
