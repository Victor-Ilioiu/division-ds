import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { MemoryRouter, Link } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Panel } from './Panel'

describe('Panel', () => {
  it('renders a raised, md-padded div by default, with no crosshair, cut or interaction', () => {
    render(<Panel>Body</Panel>)
    const el = screen.getByText('Body')
    expect(el.tagName).toBe('DIV')
    expect(el).toHaveClass('panel', 'p-5', '[--panel-bg:var(--color-surface-raised)]')
    expect(el).not.toHaveClass('crosshair')
    expect(el).not.toHaveClass('panel-cut')
    expect(el).not.toHaveClass('bevel-edge')
    expect(el).not.toHaveClass('panel-interactive')
  })

  it.each([
    ['none', 'p-0'],
    ['sm', 'p-3'],
    ['md', 'p-5'],
    ['lg', 'p-8'],
  ] as const)('padding %s is %s', (padding, cls) => {
    render(<Panel padding={padding}>Body</Panel>)
    expect(screen.getByText('Body')).toHaveClass(cls)
  })

  it('sets each tone through the panel variables, never a utility', () => {
    render(
      <>
        <Panel tone="base">A</Panel>
        <Panel tone="signal">B</Panel>
      </>
    )
    expect(screen.getByText('A')).toHaveClass('[--panel-bg:var(--color-surface-base)]')
    expect(screen.getByText('B')).toHaveClass('[--panel-bg:var(--color-accent-signal-wash)]', '[--panel-border:var(--color-border-selection)]')
  })

  it('draws the crosshair and the cut, with the border along the cut', () => {
    render(<Panel crosshair cut>Body</Panel>)
    expect(screen.getByText('Body')).toHaveClass('crosshair', 'panel-cut', 'bevel-edge')
  })

  it('renders a router link with asChild, focusable, with a ring', async () => {
    render(
      <MemoryRouter>
        <Panel interactive asChild>
          <Link to="/card">Card</Link>
        </Panel>
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: 'Card' })
    expect(link).toHaveAttribute('href', '/card')
    expect(link).toHaveClass('panel', 'panel-interactive', 'focus-visible:outline-2')
    await userEvent.tab()
    expect(link).toHaveFocus()
  })

  it('merges a caller className and forwards a ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Panel ref={ref} className="flex gap-2">
        Body
      </Panel>
    )
    expect(ref.current).toBe(screen.getByText('Body'))
    expect(ref.current).toHaveClass('flex', 'gap-2')
    expect(ref.current).not.toHaveClass('block')
  })

  it('is axe clean', async () => {
    const { container } = render(
      <MemoryRouter>
        <Panel tone="signal" crosshair cut>
          Body
        </Panel>
        <Panel interactive asChild>
          <Link to="/x">Go</Link>
        </Panel>
      </MemoryRouter>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
