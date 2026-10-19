import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { ToolCall } from './ToolCall'

describe('ToolCall', () => {
  it('shows the title, the tool name and the duration, merging className', () => {
    const { container } = render(
      <ToolCall name="query_stock_levels" title="Read stock levels at Depot 4" status="done" duration="1.2 s" className="extra" />
    )
    expect(screen.getByText('Read stock levels at Depot 4')).toBeInTheDocument()
    expect(screen.getByText('query_stock_levels')).toHaveClass('font-mono')
    expect(screen.getByText('1.2 s')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('extra')
  })

  it.each([
    ['running', 'Running'],
    ['done', 'Done'],
    ['failed', 'Failed'],
  ] as const)('says %s in a word, not in colour alone', (status, word) => {
    const { container } = render(<ToolCall name="query_stock_levels" status={status} />)
    expect(screen.getByText(word)).toBeVisible()
    expect(container.firstElementChild).toHaveAttribute('data-status', status)
  })

  it('shows a decorative spinner while running, which is no second status region', () => {
    render(<ToolCall name="query_stock_levels" status="running" />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps input and output behind a disclosure that says its state', async () => {
    render(<ToolCall name="query_stock_levels" status="done" input='{ "depot": 4 }' output="1,240 replicas" />)
    const button = screen.getByRole('button', { name: 'Show details' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(button.getAttribute('aria-controls')!)!
    expect(panel).not.toBeVisible()
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAccessibleName('Hide details')
    expect(panel).toBeVisible()
    expect(panel).toHaveTextContent('Input{ "depot": 4 }')
    expect(panel).toHaveTextContent('Output1,240 replicas')
  })

  it('opens at the start with defaultOpen, and has no disclosure without a payload', () => {
    const { rerender } = render(<ToolCall name="a" status="done" output="ok" defaultOpen />)
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true')
    rerender(<ToolCall name="b" status="done" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('marks itself as a block the message announcement skips', () => {
    const { container } = render(<ToolCall name="a" status="done" />)
    expect(container.firstElementChild).toHaveAttribute('data-chat-block')
  })

  it('is axe clean, closed and open', async () => {
    const { container } = render(<ToolCall name="query_stock_levels" title="Read stock" status="failed" input="x" output="y" />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'Show details' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
