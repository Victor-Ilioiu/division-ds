import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { axeClean } from '../../../test/axe'
import { TooltipProvider } from '../../atoms'
import { ResponseFeedback } from './ResponseFeedback'

const mount = (ui: ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>)

describe('ResponseFeedback', () => {
  it('names both buttons and merges className', () => {
    const { container } = mount(<ResponseFeedback onSubmit={() => {}} className="extra" />)
    expect(screen.getByRole('button', { name: 'Helpful' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Not helpful' })).toBeInTheDocument()
    expect(container.querySelector('[role="group"]')).toHaveClass('extra')
  })

  it('says Submitting, then Submitted, and takes one vote only', async () => {
    let finish!: () => void
    const onSubmit = vi.fn(() => new Promise<void>(resolve => (finish = resolve)))
    mount(<ResponseFeedback onSubmit={onSubmit} />)
    const up = screen.getByRole('button', { name: 'Helpful' })
    const down = screen.getByRole('button', { name: 'Not helpful' })
    await userEvent.click(up)
    expect(screen.getByRole('status')).toHaveTextContent('Submitting feedback')
    expect(down).toHaveAttribute('aria-disabled', 'true')
    finish()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Feedback submitted'))
    expect(up).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(down)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('helpful')
  })

  it('puts the buttons back when sending fails', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    mount(<ResponseFeedback onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Feedback not sent'))
    expect(screen.getByRole('button', { name: 'Helpful' })).not.toHaveAttribute('aria-disabled')
    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }))
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('opens an optional detail step after Not helpful, only with onDetail', async () => {
    const onDetail = vi.fn()
    mount(<ResponseFeedback onSubmit={() => {}} onDetail={onDetail} />)
    await userEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    const box = await screen.findByRole('textbox', { name: /What was wrong/ })
    await waitFor(() => expect(box).toHaveFocus())
    await userEvent.type(box, 'Wrong depot')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onDetail).toHaveBeenCalledWith('Wrong depot')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Thank you for the detail')
  })

  it('lets the detail step be dismissed without sending', async () => {
    const onDetail = vi.fn()
    mount(<ResponseFeedback onSubmit={() => {}} onDetail={onDetail} />)
    await userEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }))
    expect(onDetail).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('has no detail step without onDetail, or after Helpful', async () => {
    const { unmount } = mount(<ResponseFeedback onSubmit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Feedback submitted'))
    expect(screen.queryByRole('textbox')).toBeNull()
    unmount()
    mount(<ResponseFeedback onSubmit={() => {}} onDetail={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Feedback submitted'))
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('passes axe', async () => {
    const { container } = mount(<ResponseFeedback onSubmit={() => {}} onDetail={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Not helpful' }))
    await screen.findByRole('textbox')
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
