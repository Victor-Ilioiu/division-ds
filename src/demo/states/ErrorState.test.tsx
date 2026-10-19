import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axeClean } from '../../test/axe'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('renders the title, description and a working retry button', async () => {
    const onRetry = vi.fn()
    render(
      <ErrorState title="Something broke" onRetry={onRetry}>
        Try again in a moment.
      </ErrorState>
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Something broke' })).toBeInTheDocument()
    expect(screen.getByText('Try again in a moment.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  // Mutation: default `announce` to `true` instead of `false` -> this block carries role="alert"
  // from its very first render, with no action behind it, and this query finds one.
  it('carries no role="alert" by default -- this is ordinary page content, not something that just happened', () => {
    render(<ErrorState title="Something broke" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // Mutation: ignore the `announce` prop entirely, always rendering `role={undefined}` -> this
  // query finds nothing even though the caller asked for it.
  it('carries role="alert" when announce is set', () => {
    render(<ErrorState title="Something broke" announce />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = render(<ErrorState title="Something broke" onRetry={() => {}} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: give the retry Button `disabled` unconditionally -> the click above resolves with
  // no call, and this test's own click also has nothing to catch. This test instead checks the
  // no-`onRetry` case directly, which is the state a caller with nothing to retry (an ownerless
  // error) is expected to render.
  it('renders no retry button when onRetry is omitted', () => {
    render(<ErrorState title="Something broke" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  // Mutation: drop the `retryLabel` prop entirely and hard-code "Try again" -> this custom label
  // never renders, and the query below finds nothing.
  it('accepts a custom retry label', () => {
    render(<ErrorState title="Something broke" onRetry={() => {}} retryLabel="Reload the page" />)
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument()
  })

  it('forwards headingRef to the title heading, for a caller that focuses it on mount', () => {
    const ref = createRef<HTMLHeadingElement>()
    render(<ErrorState title="Something broke" headingRef={ref} />)
    expect(ref.current).toBe(screen.getByRole('heading', { level: 2, name: 'Something broke' }))
  })

  // Mutation: hardcode the heading to always render as `<h2>`, ignoring `headingLevel` -> this
  // query (level 1) finds nothing.
  it('renders its heading as an h1 when headingLevel is 1, for a caller that replaces the whole page', () => {
    render(<ErrorState title="Something broke" headingLevel={1} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Something broke' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
