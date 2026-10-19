import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Alert } from './Alert'

describe('Alert', () => {
  it('prefixes the title with the tone as words for screen readers', () => {
    render(<Alert tone="warning" title="Depot closes early" />)
    expect(screen.getByText('Warning:')).toHaveClass('sr-only')
  })

  it('has no live role unless asked, because static content is read in order', () => {
    render(<Alert tone="hostile" title="Sync failed" />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('maps live to alert for hostile and warning, status for info and ok', () => {
    render(
      <>
        <Alert live tone="hostile" title="Sync failed" />
        <Alert live tone="ok" title="Manifest saved" />
      </>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Sync failed')
    expect(screen.getByRole('status')).toHaveTextContent('Manifest saved')
  })

  it('renders body text and an action', () => {
    render(
      <Alert title="Offline" action={<button type="button">Retry</button>}>
        Changes are kept on this device.
      </Alert>
    )
    expect(screen.getByText('Changes are kept on this device.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('dismisses through a named button', async () => {
    const onDismiss = vi.fn()
    render(<Alert title="Offline" onDismiss={onDismiss} dismissLabel="Dismiss offline notice" />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss offline notice' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('keeps the full layout by default', () => {
    const { container } = render(<Alert title="Offline">Changes are kept on this device.</Alert>)
    const root = container.firstElementChild!
    expect(root).not.toHaveAttribute('data-compact')
    expect(root).toHaveClass('px-2', 'py-4', 'items-start')
  })

  it('puts title and body on one line when compact, keeping the tone word', () => {
    const { container } = render(
      <Alert compact tone="warning" title="Depot closes early">
        Closes at 4pm today.
      </Alert>
    )
    const root = container.firstElementChild!
    expect(root).toHaveAttribute('data-compact')
    expect(root).toHaveClass('items-center')
    expect(screen.getByText('Warning:')).toHaveClass('sr-only')
    // Title and body share one paragraph, so they read as one sentence and wrap as one line.
    const line = screen.getByText('Depot closes early').closest('p')!
    expect(line).toHaveTextContent('Warning: Depot closes early Closes at 4pm today.')
  })

  it('keeps the action and the dismiss button when compact', async () => {
    const onDismiss = vi.fn()
    render(
      <Alert compact title="Offline" action={<button type="button">Retry</button>} onDismiss={onDismiss}>
        Changes are kept here.
      </Alert>
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('is axe clean when compact', async () => {
    const { container } = render(
      <Alert compact live tone="hostile" title="Sync failed" onDismiss={() => {}}>
        Retrying in a minute.
      </Alert>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('forwards a ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Alert ref={ref} title="Offline" />)
    expect(ref.current?.tagName).toBe('DIV')
  })

  it('is axe clean in every tone', async () => {
    const { container } = render(
      <>
        {(['info', 'ok', 'warning', 'hostile'] as const).map(tone => (
          <Alert key={tone} tone={tone} title={`${tone} title`} onDismiss={() => {}}>
            Body text.
          </Alert>
        ))}
      </>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('is cut at the bottom-right, with the border drawn along the cut, in full and compact', () => {
    const { container, rerender } = render(<Alert tone="warning" title="Depot closes early" />)
    expect(container.firstElementChild).toHaveClass('bevel-alert', 'bevel-edge', 'relative')
    rerender(<Alert compact tone="warning" title="Depot closes early" />)
    expect(container.firstElementChild).toHaveClass('bevel-alert', 'bevel-edge')
  })
})
