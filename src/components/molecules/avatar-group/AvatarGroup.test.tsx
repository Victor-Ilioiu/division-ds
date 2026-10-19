import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { TooltipProvider } from '../../atoms/tooltip/Tooltip'
import { AvatarGroup } from './AvatarGroup'

const SQUAD = [
  { name: 'Ilse Varga' },
  { name: 'Ravi Okonkwo' },
  { name: 'Mei Tanaka' },
  { name: 'Sana Idrissi' },
  { name: 'Dana Iverson' },
  { name: 'Lin Moreau' },
]

describe('AvatarGroup', () => {
  it('is a list named with the full count', () => {
    render(<AvatarGroup people={SQUAD} />)
    expect(screen.getByRole('list', { name: '6 members' })).toBeInTheDocument()
  })

  it('takes a specific label, and still says the count', () => {
    render(<AvatarGroup people={SQUAD} label="Alpha squad" />)
    expect(screen.getByRole('list', { name: 'Alpha squad, 6 members' })).toBeInTheDocument()
  })

  it('says "member" for one person', () => {
    render(<AvatarGroup people={SQUAD.slice(0, 1)} />)
    expect(screen.getByRole('list', { name: '1 member' })).toBeInTheDocument()
  })

  it('shows max avatars and a +N chip for the rest', () => {
    render(<AvatarGroup people={SQUAD} max={4} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(screen.getByText('+2')).toHaveAttribute('aria-hidden', 'true')
  })

  it('names the hidden people in words, not only as a number', () => {
    render(<AvatarGroup people={SQUAD} max={4} />)
    expect(screen.getByText('and 2 more: Dana Iverson, Lin Moreau')).toHaveClass('sr-only')
  })

  it('draws no chip when everyone fits', () => {
    render(<AvatarGroup people={SQUAD.slice(0, 3)} max={4} />)
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText(/^\+/)).toBeNull()
  })

  it('defaults max to four', () => {
    render(<AvatarGroup people={SQUAD} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('passes size through to every avatar and the chip', () => {
    const { container } = render(<AvatarGroup people={SQUAD} size="lg" />)
    const sized = container.querySelectorAll('.w-12.h-12')
    // four avatars and the chip
    expect(sized).toHaveLength(5)
  })

  it('passes status through, so it reaches the announced name', () => {
    render(<AvatarGroup people={[{ name: 'Ilse Varga', status: 'online' }]} />)
    expect(screen.getByText('Ilse Varga, online')).toBeInTheDocument()
  })

  it('is not focusable without the tooltip', () => {
    const { container } = render(<AvatarGroup people={SQUAD} />)
    expect(container.querySelector('[tabindex]')).toBeNull()
  })

  it('opens a tooltip with the hidden names from the keyboard when asked to', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <AvatarGroup people={SQUAD} overflowTooltip />
      </TooltipProvider>
    )
    await user.tab()
    const chip = screen.getByText('+2').parentElement!
    expect(chip).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Dana Iverson, Lin Moreau')
  })

  it('merges className and forwards a ref to the list', () => {
    const ref = createRef<HTMLUListElement>()
    render(<AvatarGroup ref={ref} people={SQUAD} className="mt-4" />)
    expect(ref.current).not.toBeNull()
    expect(ref.current).toBe(screen.getByRole('list'))
    expect(ref.current).toHaveClass('mt-4', 'flex')
  })

  it('is axe clean, with and without the tooltip', async () => {
    const { container } = render(
      <TooltipProvider>
        <AvatarGroup people={SQUAD} size="sm" />
        <AvatarGroup people={SQUAD} label="Alpha squad" overflowTooltip />
        <AvatarGroup people={SQUAD.slice(0, 2)} size="lg" />
      </TooltipProvider>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
