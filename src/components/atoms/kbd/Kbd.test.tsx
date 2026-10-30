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

  it('is 24px by default and 20px at size sm', () => {
    render(<><Kbd>A</Kbd><Kbd size="sm">B</Kbd></>)
    expect(screen.getByText('A')).toHaveClass('h-[24px]')
    expect(screen.getByText('B')).toHaveClass('h-[20px]')
    expect(screen.getByText('B')).not.toHaveClass('h-[24px]')
  })

  it('is square unless cut, and a cut follows its size', () => {
    render(<><Kbd>A</Kbd><Kbd size="sm" cut>B</Kbd><Kbd cut>C</Kbd></>)
    expect(screen.getByText('A').className).not.toMatch(/bevel/)
    expect(screen.getByText('B')).toHaveClass('bevel-xs', 'bevel-edge', 'relative')
    expect(screen.getByText('C')).toHaveClass('bevel-sm', 'bevel-edge')
  })

  it('is axe clean', async () => {
    const { container } = render(<Kbd>Esc</Kbd>)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
