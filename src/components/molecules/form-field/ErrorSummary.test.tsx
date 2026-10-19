import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { ErrorSummary } from './ErrorSummary'

const ERRORS = [
  { fieldId: 'email', message: 'Enter an email address.' },
  { fieldId: 'postcode', message: 'Enter a postcode.' },
]

describe('ErrorSummary', () => {
  it('renders nothing when there are no errors', () => {
    const { container } = render(<ErrorSummary errors={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is a group named by its heading, which a form can focus', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ErrorSummary ref={ref} errors={ERRORS} />)
    const group = screen.getByRole('group', { name: 'There is a problem' })
    expect(ref.current).toBe(group)
    group.focus()
    expect(group).toHaveFocus()
  })

  it('links each error to its field, and focuses the field without changing the URL', () => {
    render(
      <>
        <ErrorSummary errors={ERRORS} />
        <label htmlFor="email">Email</label>
        <input id="email" />
      </>
    )
    const link = screen.getByRole('link', { name: 'Enter an email address.' })
    expect(link).toHaveAttribute('href', '#email')
    // false: the click's default (a jump to #email, a URL change) was prevented.
    expect(fireEvent.click(link)).toBe(false)
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus()
  })

  it('is axe clean', async () => {
    const { container } = render(<ErrorSummary errors={ERRORS} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
