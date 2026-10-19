import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Kbd } from './Kbd'

describe('Kbd', () => {
  it('renders a semantic kbd element', () => {
    render(<Kbd>Esc</Kbd>)
    const el = screen.getByText('Esc')
    expect(el.tagName).toBe('KBD')
  })

  it('merges a caller className without losing its own', () => {
    render(<Kbd className="mt-4">Esc</Kbd>)
    const el = screen.getByText('Esc')
    expect(el).toHaveClass('mt-4')
    expect(el).toHaveClass('font-mono')
  })

  it('forwards a ref to the kbd element', () => {
    const ref = createRef<HTMLElement>()
    render(<Kbd ref={ref}>Esc</Kbd>)
    expect(ref.current?.tagName).toBe('KBD')
  })

  it('is axe clean', async () => {
    const { container } = render(<Kbd>Esc</Kbd>)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
