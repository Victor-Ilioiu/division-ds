import { Component, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axeClean } from '../../test/axe'
import { StatusError } from './StatusError'

/** A minimal probe boundary, standing in for the real `DemoErrorBoundary` this page is always
 *  mounted under in the app -- proving what StatusError itself throws (a real `Error`, named
 *  `DemonstrationError`, from a render pass rather than from the click handler that set the state
 *  triggering it), not how the boundary that catches it behaves (DemoErrorBoundary.test.tsx
 *  covers that). */
class ProbeBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) return <p>Caught: {this.state.error.name}</p>
    return this.props.children
  }
}

function renderPage() {
  return render(
    <ProbeBoundary>
      <StatusError />
    </ProbeBoundary>,
    { onCaughtError: () => {} }
  )
}

describe('StatusError', () => {
  // Mutation: render the page title as a `<p>` instead of an `<h1>` -> the first query below
  // finds nothing.
  it('renders the page heading and all three demos', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Error states' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: "Couldn't load this section" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'No results' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Full-page crash' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show the full-page error' })).toBeInTheDocument()
  })

  // Mutation: drop the `setRetryCount(count => count + 1)` call from the inline ErrorState's
  // `onRetry`, leaving the button with nothing to do -> the count never advances past 0 and the
  // text below never appears.
  it("the inline ErrorState's retry actually runs, not just renders", async () => {
    renderPage()
    expect(screen.getByText('The request behind this block failed.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Retried 1 time. Still no luck in this demo.')).toBeInTheDocument()
  })

  // Mutation: pass `announce` to the inline ErrorState -> this query finds a role="alert" on a
  // page that has just loaded, with nothing having happened yet for a screen reader to announce.
  it('does not carry role="alert" on the inline ErrorState demo -- it is ordinary page content on load, not something that just happened', () => {
    renderPage()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // Mutation: drop the "Show the full-page error" text from that Button, leaving it with no
  // accessible name -> a real axe `button-name` violation.
  it('is axe clean before the crash demo is triggered', async () => {
    const { container } = renderPage()
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Mutation: throw a plain string ('Demonstration') instead of `Object.assign(new
  // Error('Demonstration'), { name: 'DemonstrationError' })` -> `getDerivedStateFromError` never
  // sees an Error with that `name`, and main.tsx's own `onCaughtError` (which switches on exactly
  // this name) could no longer tell this crash apart from a real bug.
  it('throws a real Error named DemonstrationError, from render, when the crash button is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Show the full-page error' }))
    expect(await screen.findByText('Caught: DemonstrationError')).toBeInTheDocument()
  })
})
