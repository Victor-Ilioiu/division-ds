import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { axeClean } from '../../test/axe'
import { Terrain } from './Terrain'

// jsdom has no canvas context and no IntersectionObserver, so this is the path a browser takes
// when it can draw nothing at all: the component mounts, asks for nothing and throws nothing.
// The still's pixels and the live scene are proved in a browser, by e2e/footer-terrain.spec.ts.
describe('Terrain', () => {
  it('is hidden from assistive technology, closed to the pointer, and holds nothing focusable', () => {
    const { container } = render(<Terrain />)
    const stage = container.firstElementChild!
    expect(stage).toHaveAttribute('aria-hidden', 'true')
    expect(stage).toHaveAttribute('data-terrain', 'still')
    expect(stage).toHaveClass('pointer-events-none')
    expect(container.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0)
    expect(container.querySelectorAll('canvas')).toHaveLength(1)
  })

  it('stays on its still while held', () => {
    const { container } = render(<Terrain hold />)
    expect(container.firstElementChild).toHaveAttribute('data-terrain', 'still')
    expect(container.querySelectorAll('canvas[data-terrain-canvas="live"]')).toHaveLength(0)
  })

  it('is axe clean, and unmounts without a trace', async () => {
    const { container, unmount } = render(<Terrain />)
    expect(await axeClean(container)).toHaveNoViolations()
    unmount()
    expect(container).toBeEmptyDOMElement()
  })
})
