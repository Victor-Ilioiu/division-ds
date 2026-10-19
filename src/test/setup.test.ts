import { describe, expect, it } from 'vitest'

describe('the jsdom environment every component test runs in', () => {
  it('answers hasPointerCapture, which Radix reads on every pointerdown', () => {
    expect(document.createElement('button').hasPointerCapture(1)).toBe(false)
  })

  it('accepts scrollIntoView, which listboxes call on their highlighted item', () => {
    expect(() => document.createElement('div').scrollIntoView({ block: 'nearest' })).not.toThrow()
  })

  // jsdom's "Not implemented" message for getComputedStyle(el, pseudo) goes to its own virtual
  // console, not the global `console` object a `vi.spyOn(console, 'error')` wraps, so a case
  // asserting that spy here would pass whether or not the fix in setup.ts is in place. The full
  // suite's output is the only place this is provable: `npm test 2>&1 | grep -c "with
  // pseudo-elements"` goes from 20 to 0.
})
