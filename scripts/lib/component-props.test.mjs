import { describe, expect, it } from 'vitest'
import { checkPropsTable, NOT_OFFERED, parseRowName, resolvePart } from './component-props.mjs'

const exportsOf = {
  components: {
    Dialog: { all: ['children', 'open'], own: ['children', 'open'] },
    DialogContent: { all: ['className', 'side', 'title'], own: ['side', 'title'] },
    ProductGrid: { all: ['products'], own: ['products'] },
    Internal: { all: ['secret'], own: ['secret'] },
  },
  types: { ToastOptions: ['title', 'tone'] },
}
const meta = rows => ({ name: 'Dialog', props: rows.map(name => (typeof name === 'string' ? { name, type: 'x' } : name)) })
const PUBLIC = ['Dialog', 'DialogContent', 'ProductGrid']
const COVERED = ['open', 'side (Content)', 'title (Content)', 'products (Grid)']

describe('parseRowName', () => {
  it('reads each form a table uses', () => {
    expect(parseRowName('...rest')).toEqual({ rest: true })
    expect(parseRowName('useToast()')).toEqual({ call: 'useToast' })
    expect(parseRowName('side')).toEqual({ props: ['side'] })
    expect(parseRowName('side (Content)')).toEqual({ props: ['side'], part: 'Content' })
    expect(parseRowName('aria-label / aria-labelledby (RadioGroup)')).toEqual({
      props: ['aria-label', 'aria-labelledby'],
      part: 'RadioGroup',
    })
  })
})

describe('resolvePart', () => {
  it('finds a part by its own name, by the component prefix, as Root, and by its ending', () => {
    expect(resolvePart('DialogContent', 'Dialog', exportsOf)).toEqual({ kind: 'component', name: 'DialogContent' })
    expect(resolvePart('Content', 'Dialog', exportsOf)).toEqual({ kind: 'component', name: 'DialogContent' })
    expect(resolvePart('Root', 'Dialog', exportsOf)).toEqual({ kind: 'component', name: 'Dialog' })
    expect(resolvePart('Grid', 'ProductCard', exportsOf)).toEqual({ kind: 'component', name: 'ProductGrid' })
  })

  it('finds an exported type, and reads a part written as words', () => {
    expect(resolvePart('ToastOptions', 'Toast', exportsOf)).toEqual({ kind: 'type', name: 'ToastOptions' })
    expect(resolvePart('toast options', 'Toast', exportsOf)).toEqual({ kind: 'type', name: 'ToastOptions' })
  })

  it('returns nothing for a part no export matches', () => {
    expect(resolvePart('child', 'Dialog', exportsOf)).toBeUndefined()
  })
})

describe('checkPropsTable', () => {
  it('passes a table that covers every own prop of every public component', () => {
    expect(checkPropsTable(meta(COVERED), exportsOf, PUBLIC)).toEqual([])
  })

  it('does not ask for children, or for the props of an export the barrel leaves out', () => {
    const problems = checkPropsTable(meta(COVERED), exportsOf, PUBLIC)
    expect(problems.join()).not.toMatch(/children|secret/)
  })

  it('names a row whose prop does not exist', () => {
    expect(checkPropsTable(meta([...COVERED, 'modal']), exportsOf, PUBLIC)).toEqual([
      '"modal": no such prop on Dialog, DialogContent, ProductGrid. Remove the row or fix the name.',
    ])
    expect(checkPropsTable(meta([...COVERED, 'open (Content)']), exportsOf, PUBLIC)).toEqual([
      '"open (Content)": no such prop on DialogContent. Remove the row or fix the name.',
    ])
  })

  it('names an own prop with no row', () => {
    expect(checkPropsTable(meta(COVERED.filter(row => row !== 'side (Content)')), exportsOf, PUBLIC)).toEqual([
      'DialogContent takes "side", which the props table does not list. Add a row.',
    ])
  })

  it('checks a row against an exported type, and a hook against the barrel', () => {
    expect(checkPropsTable(meta([...COVERED, 'tone (ToastOptions)']), exportsOf, PUBLIC)).toEqual([])
    expect(checkPropsTable(meta([...COVERED, 'duration (ToastOptions)']), exportsOf, PUBLIC)).toHaveLength(1)
    expect(checkPropsTable(meta([...COVERED, 'useToast()']), exportsOf, [...PUBLIC, 'useToast'])).toEqual([])
    expect(checkPropsTable(meta([...COVERED, 'useToast()']), exportsOf, PUBLIC)).toHaveLength(1)
  })

  it('holds a "not offered" row the other way round', () => {
    const notOffered = name => ({ name, type: NOT_OFFERED })
    expect(checkPropsTable(meta([...COVERED, notOffered('fullWidth')]), exportsOf, PUBLIC)).toEqual([])
    expect(checkPropsTable(meta([...COVERED.slice(1), notOffered('open')]), exportsOf, PUBLIC)).toEqual([
      '"open" is documented as not offered, but the type accepts it.',
    ])
  })

  it('names a part that matches no export', () => {
    expect(checkPropsTable(meta([...COVERED, 'label (child)']), exportsOf, PUBLIC)).toHaveLength(1)
  })
})
