import { describe, expect, it } from 'vitest'
import { findInlineViolations } from './host-inline.mjs'

const card = inner => `const X = () => (\n  <Card data-host-mode="inline">\n${inner}\n  </Card>\n)`

describe('findInlineViolations', () => {
  it('passes a card with two actions', () => {
    expect(findInlineViolations(card('<CardFooter><Button>No</Button><Button>Yes</Button></CardFooter>'))).toEqual([])
  })

  it('flags a third action anywhere inside, an asChild-wrapped one included', () => {
    const v = findInlineViolations(card('<Button>A</Button><CardFooter><Button>B</Button><DialogClose asChild><Button>C</Button></DialogClose></CardFooter>'))
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ rule: 'inline-max-actions', line: 2, found: '3 actions in an inline card' })
  })

  it('flags a nested scroll container and a menu', () => {
    const v = findInlineViolations(card('<div className="max-h-40 overflow-y-auto">rows</div><Select options={[]} />'))
    expect(v.map(x => x.rule)).toEqual(['inline-no-nested-scroll', 'inline-no-popover'])
  })

  it('ignores an unmarked card, and overflow-hidden', () => {
    expect(findInlineViolations('<Card><Button/><Button/><Button/><Select/></Card>')).toEqual([])
    expect(findInlineViolations(card('<div className="overflow-hidden" />'))).toEqual([])
  })
})
