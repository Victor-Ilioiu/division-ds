import '@testing-library/jest-dom/vitest'
import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { AxeResults } from 'axe-core'

// React Testing Library's own auto-cleanup checks the bare global `afterEach`, which this
// project never registers (vitest.config doesn't set `test.globals: true` — imports are
// explicit everywhere). Without this, DOM from an earlier `it` in the same file leaks into
// the next one, and a second render of the same text throws a multiple-match error that has
// nothing to do with the component under test.
afterEach(cleanup)

// jsdom has no ResizeObserver. Slider is the first component to need one — Radix's own
// `@radix-ui/react-use-size` (used by `RadixSlider.Thumb` to keep the thumb inside the track at
// its ends) constructs a real `ResizeObserver` in a layout effect on every render, which throws
// `ResizeObserver is not defined` under jsdom before any Slider test assertion even runs. This is
// an environment gap, not a component bug — a no-op stub is the standard fix (jest-environment-
// jsdom and Testing Library's own docs recommend the same shape) since no test here asserts on
// observed size changes.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// jsdom ships an HTMLCanvasElement whose getContext() always reports "Not implemented ... without
// installing the canvas npm package" to the virtual console. axe-core calls it while setting up
// its colour-contrast checks, so every component test that runs `axeClean` printed that line —
// 18+ of them per full run, drowning real output. Unlike ResizeObserver this cannot use `??=`:
// jsdom DOES define the method, it just refuses to do anything, so the assignment has to be
// unconditional. Returning null is the documented "no 2D context available" answer, and axe
// handles it by skipping the canvas-dependent path — no check is silently weakened, because
// none of these tests renders a canvas in the first place.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as unknown as HTMLCanvasElement['getContext']

// Radix's pointer-driven primitives read `hasPointerCapture` on pointerdown (Select, DropdownMenu,
// Toast's buttons, Dialog and everything built on it), and Select, DropdownMenu and the command
// palette scroll their highlighted item into view. jsdom implements neither. Stubbed once here
// rather than per test file, so a new component's test cannot fail on the environment before it
// reaches its own assertions. `??=` keeps a real implementation if jsdom ever ships one; the
// `Partial<Element>` alias is there because an `in` check narrows the prototype to `never`.
const elementPrototype: Partial<Element> = Element.prototype
elementPrototype.hasPointerCapture ??= () => false
elementPrototype.scrollIntoView ??= () => {}

// jsdom cannot compute a pseudo-element's style. Asked for one, it reports "Not implemented ...
// with pseudo-elements" and then returns the element's own style anyway. axe asks for ::before and
// ::after on its contrast checks, so every axe run printed that line once per node. Dropping the
// argument returns exactly what jsdom was already returning, without the line.
const computeStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = ((element: Element) => computeStyle(element)) as typeof window.getComputedStyle

expect.extend({
  toHaveNoViolations(received: AxeResults) {
    const violations = received.violations ?? []
    return {
      pass: violations.length === 0,
      message: () =>
        violations
          .map(v => `[${v.id}] ${v.help}\n  ${v.nodes.map(n => n.html).join('\n  ')}`)
          .join('\n\n') || 'expected axe violations, found none',
    }
  },
})
