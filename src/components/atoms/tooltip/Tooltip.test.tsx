import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Tooltip, TooltipProvider } from './Tooltip'

function Mounted({ content = 'Sends the manifest to the depot' } = {}) {
  return (
    <TooltipProvider>
      <Tooltip content={content}>
        <button type="button">Dispatch</button>
      </Tooltip>
    </TooltipProvider>
  )
}

describe('Tooltip', () => {
  it('does not add a wrapper around the trigger', () => {
    render(<Mounted />)
    const trigger = screen.getByRole('button', { name: /Dispatch/ })
    expect(trigger.tagName).toBe('BUTTON')
  })

  it('shows on focus, not only on hover', async () => {
    render(<Mounted />)
    await userEvent.tab()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Sends the manifest to the depot')
  })

  it('shows on hover', async () => {
    render(<Mounted />)
    await userEvent.hover(screen.getByRole('button', { name: /Dispatch/ }))
    expect(await screen.findByRole('tooltip')).toBeInTheDocument()
  })

  it('is dismissible with Escape without moving the pointer — WCAG 2.2 SC 1.4.13', async () => {
    render(<Mounted />)
    await userEvent.tab()
    await screen.findByRole('tooltip')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('describes its trigger rather than renaming it', async () => {
    render(<Mounted />)
    await userEvent.tab()
    await screen.findByRole('tooltip')
    const trigger = screen.getByRole('button', { name: 'Dispatch' })
    expect(trigger).toHaveAccessibleDescription('Sends the manifest to the depot')
  })

  it('is axe clean while open, checking the portal too', async () => {
    render(<Mounted />)
    await userEvent.tab()
    await screen.findByRole('tooltip')
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
