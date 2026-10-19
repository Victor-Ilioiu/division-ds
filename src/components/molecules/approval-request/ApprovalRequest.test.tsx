import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { ApprovalRequest, type ApprovalState } from './ApprovalRequest'

function Controlled({ onApprove = () => {}, onReject = () => {} }: { onApprove?: () => void; onReject?: () => void }) {
  const [state, setState] = useState<ApprovalState>('pending')
  return (
    <ApprovalRequest
      title="Send this order to Arad depot?"
      state={state}
      onApprove={() => {
        onApprove()
        setState('approved')
      }}
      onReject={() => {
        onReject()
        setState('rejected')
      }}
    >
      Twelve replicas, collected Thursday.
    </ApprovalRequest>
  )
}

describe('ApprovalRequest', () => {
  it('is a section named by its title, with the preview, merging className', () => {
    render(
      <ApprovalRequest title="Send it?" state="pending" onApprove={() => {}} onReject={() => {}} className="extra">
        The preview
      </ApprovalRequest>
    )
    const region = screen.getByRole('region', { name: 'Send it?' })
    expect(region).toHaveClass('extra')
    expect(region).toHaveTextContent('The preview')
    expect(region).toHaveAttribute('data-chat-block')
  })

  it('calls onApprove from Approve and onReject from Reject', async () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    render(<ApprovalRequest title="Send it?" state="pending" onApprove={onApprove} onReject={onReject}>x</ApprovalRequest>)
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onApprove).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it('takes its own button labels', () => {
    render(
      <ApprovalRequest title="t" state="pending" onApprove={() => {}} onReject={() => {}} approveLabel="Send" rejectLabel="Don't send">
        x
      </ApprovalRequest>
    )
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Don't send" })).toBeInTheDocument()
  })

  it('replaces the buttons with a status line on approve, and moves focus to it', async () => {
    const onApprove = vi.fn()
    render(<Controlled onApprove={onApprove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onApprove).toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBeNull()
    const status = screen.getByText('Approved by you')
    expect(status).toHaveAttribute('tabindex', '-1')
    expect(status).toHaveFocus()
  })

  it('moves focus to "Rejected" when rejected from the keyboard', async () => {
    render(<Controlled />)
    screen.getByRole('button', { name: 'Reject' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText('Rejected')).toHaveFocus()
  })

  it('never takes focus when resolved from elsewhere', () => {
    const { rerender } = render(
      <>
        <input aria-label="Elsewhere" />
        <ApprovalRequest title="t" state="pending" onApprove={() => {}} onReject={() => {}}>x</ApprovalRequest>
      </>
    )
    const elsewhere = screen.getByRole('textbox', { name: 'Elsewhere' })
    elsewhere.focus()
    rerender(
      <>
        <input aria-label="Elsewhere" />
        <ApprovalRequest title="t" state="approved" onApprove={() => {}} onReject={() => {}}>x</ApprovalRequest>
      </>
    )
    expect(elsewhere).toHaveFocus()
  })

  it('is axe clean, pending and resolved', async () => {
    const { container } = render(<Controlled />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
