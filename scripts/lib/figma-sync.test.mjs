import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { findDrift, findTemplateDrift, unionValues } from './figma-sync.mjs'

// vitest runs from the repository root; import.meta.url does not resolve to a file under its jsdom setup.
const read = path => JSON.parse(readFileSync(path, 'utf8'))
const components = read('public/manifest/components.json').components
const tokens = read('public/manifest/tokens.json').tokens
const snapshot = read('figma/snapshot.json')

const withButton = props => ({ components: { Button: { nodeId: '1:1', props } }, variables: {} })
const buttonOnly = [{ name: 'Button', props: [{ name: 'variant', type: "'primary' | 'ghost'" }, { name: 'loading', type: 'boolean' }, { name: 'onPress', type: '() => void' }] }]

describe('unionValues', () => {
  it('reads string unions, booleans and the mixed checkbox type', () => {
    expect(unionValues("'sm' | 'md'")).toEqual(['sm', 'md'])
    expect(unionValues('boolean')).toEqual(['false', 'true'])
    expect(unionValues("boolean | 'indeterminate'")).toEqual(['false', 'true', 'indeterminate'])
  })

  it('returns null for a type that is not a finite list', () => {
    expect(unionValues('string')).toBeNull()
    expect(unionValues('ReactNode')).toBeNull()
  })
})

describe('findDrift', () => {
  it('passes the committed snapshot against the current manifests', () => {
    expect(findDrift(snapshot, components, tokens)).toEqual([])
  })

  it('fails when the code gains a variant value Figma lacks', () => {
    const drift = findDrift(withButton({ variant: { type: 'VARIANT', values: ['primary'] } }), buttonOnly, [])
    expect(drift).toEqual(['Button.variant: Figma lacks ghost. Add the variant in Figma.'])
  })

  it('fails when Figma has a value or a property the code does not', () => {
    const drift = findDrift(withButton({ variant: { type: 'VARIANT', values: ['primary', 'ghost', 'outline'] }, tone: { type: 'VARIANT', values: ['a'] } }), buttonOnly, [])
    expect(drift[0]).toMatch(/^Button\.variant: Figma has outline/)
    expect(drift[1]).toMatch(/^Button\.tone: Figma property with no code prop/)
  })

  it('accepts a Figma boolean for a boolean or a callback, and rejects one for a union', () => {
    expect(findDrift(withButton({ loading: { type: 'BOOLEAN' }, onPress: { type: 'BOOLEAN' } }), buttonOnly, [])).toEqual([])
    expect(findDrift(withButton({ variant: { type: 'BOOLEAN' } }), buttonOnly, [])).toHaveLength(1)
  })

  it('fails on a component missing from the code, a stale variable and a missing one', () => {
    const drift = findDrift(
      { components: { Gauge: { nodeId: '2:2', props: {} } }, variables: { Color: ['color-old'] } },
      [],
      [{ name: '--color-new', layer: 'semantic' }, { name: '--duration-fast', layer: 'motion' }]
    )
    expect(drift).toHaveLength(3)
    expect(drift.join('\n')).not.toMatch(/duration-fast/)
  })
})

describe('findTemplateDrift', () => {
  const snap = withButton({ variant: { type: 'VARIANT', values: ['primary', 'ghost'] }, loading: { type: 'BOOLEAN' } })

  it('passes every committed template against the committed snapshot', () => {
    const templates = Object.fromEntries(
      Object.keys(snapshot.components).map(name => [name, readFileSync(`figma/code-connect/${name}.figma.ts`, 'utf8')])
    )
    expect(findTemplateDrift(snapshot, templates)).toEqual([])
  })

  it('fails on a missing template, a missing getEnum and an incomplete map', () => {
    expect(findTemplateDrift(snap, {})).toEqual(['Button: no figma/code-connect/Button.figma.ts template.'])
    expect(findTemplateDrift(snap, { Button: "instance.getString('label')" }).at(-1)).toMatch(/does not read it with getEnum/)
    expect(findTemplateDrift(snap, { Button: "instance.getEnum('variant', { primary: 'primary' })" })[0]).toMatch(/maps primary; Figma has primary, ghost/)
    const ghostProp = "instance.getEnum('variant', { primary: 'primary', ghost: 'ghost' }); instance.getString('label')"
    expect(findTemplateDrift(snap, { Button: ghostProp })).toEqual(['Button.label: the template reads a property Figma does not have.'])
  })
})
