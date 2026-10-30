import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Toaster } from '../toast/Toast'
import { CodeBlock } from './CodeBlock'

const renderIn = (ui: React.ReactNode) => render(<Toaster>{ui}</Toaster>)

describe('CodeBlock', () => {
  it('shows the code in a named, focusable region, with the title in the bar', () => {
    renderIn(<CodeBlock code={'a {\n  --x: 1;\n}\n'} label="the theme CSS" title="index.css" language="css" />)
    const region = screen.getByRole('region', { name: 'index.css, the theme CSS' })
    expect(region.tagName).toBe('PRE')
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveTextContent('--x: 1;')
    expect(screen.getByText('index.css')).toBeInTheDocument()
  })

  it('numbers lines only when there is more than one, unless told otherwise', () => {
    const { unmount } = renderIn(<CodeBlock code="npm run verify" label="the check" />)
    expect(screen.getByRole('region', { name: 'the check' })).not.toHaveTextContent(/^1/)
    unmount()
    renderIn(<CodeBlock code={'one\ntwo'} label="two lines" />)
    expect(screen.getByRole('region', { name: 'two lines' })).toHaveTextContent('1one2two')
  })

  it('copies the code exactly and turns the icon into a tick', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderIn(<CodeBlock code="npm run verify" label="the check command" />)
    await user.click(screen.getByRole('button', { name: 'Copy the check command' }))
    expect(writeText).toHaveBeenCalledWith('npm run verify')
    expect(await screen.findByText('Copied: the check command')).toBeInTheDocument()
  })

  it('says so when the clipboard is blocked', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('blocked'))
    renderIn(<CodeBlock code="x" label="x" />)
    await user.click(screen.getByRole('button', { name: 'Copy x' }))
    expect(await screen.findByText(/Copying is blocked here/)).toBeInTheDocument()
  })

  it('has no copy button when copyable is false', () => {
    renderIn(<CodeBlock code="x" label="wrong code" copyable={false} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('merges a className and forwards a ref to the frame', () => {
    const ref = createRef<HTMLDivElement>()
    renderIn(<CodeBlock ref={ref} code="x" label="x" className="max-w-3xl" />)
    expect(ref.current).toHaveClass('max-w-3xl', 'min-w-0')
  })

  it('is axe clean', async () => {
    const { container } = renderIn(<CodeBlock code={'a {}\nb {}'} label="css" title="index.css" language="css" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
