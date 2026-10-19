import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { axeClean } from '../test/axe'
import { DemoLayout } from './DemoLayout'

// The other half of DemoLayout.test.tsx's "no backdrop where there is no WebGL2": a browser that
// has it. Only the probe is replaced; jsdom still has no canvas context, so the terrain mounts
// its stage, draws nothing and starts nothing, which is enough to see where it is put.
vi.mock('../fx/core/webgl', () => ({ hasWebGL2: () => true }))

afterEach(() => {
  sessionStorage.clear()
})

describe('DemoLayout, where WebGL2 exists', () => {
  // Mutation: change `backdrop={hasWebGL2() ? <Terrain ... /> : undefined}` in DemoLayout.tsx to
  // `backdrop={undefined}` -> the layer is null and the first assertion fails.
  it('puts the terrain in the footer`s backdrop layer, behind the wordmark, hidden from assistive technology, and stays axe clean', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/demo']}>
        <Routes>
          <Route element={<DemoLayout />}>
            <Route path="/demo/*" element={<h1>Home</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    await screen.findByRole('heading', { level: 1, name: 'Home' })
    const layer = container.querySelector('footer [data-footer-backdrop]')
    expect(layer).not.toBeNull()
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer!.querySelector('[data-terrain="still"] canvas')).not.toBeNull()
    expect(layer!.querySelectorAll('a, button, [tabindex]')).toHaveLength(0)
    // The layer and the wordmark share the footer's closing block, the layer first.
    const closing = container.querySelector('footer [data-footer-closing]')!
    expect(layer!.parentElement).toBe(closing)
    expect(closing.lastElementChild).toBe(screen.getByRole('img', { name: 'Hexline' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
