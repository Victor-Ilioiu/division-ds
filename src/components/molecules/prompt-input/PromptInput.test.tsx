import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { PromptInput, type PromptInputProps } from './PromptInput'

function Controlled(props: Partial<PromptInputProps>) {
  const [value, setValue] = useState(props.value ?? '')
  return (
    <PromptInput
      label="Message the assistant"
      value={value}
      onValueChange={setValue}
      {...props}
      onSubmit={text => {
        props.onSubmit?.(text)
        setValue('')
      }}
    />
  )
}

const box = () => screen.getByRole('textbox', { name: 'Message the assistant' })

describe('PromptInput', () => {
  it('names the box by label, describes it by the hint, and merges className', () => {
    const { container } = render(<Controlled className="extra" />)
    expect(box()).toHaveAccessibleDescription('Enter to send, Shift+Enter for a new line')
    expect(container.querySelector('form')).toHaveClass('extra')
  })

  it('submits on Enter and the parent clears the draft', async () => {
    const onSubmit = vi.fn()
    render(<Controlled onSubmit={onSubmit} />)
    await userEvent.type(box(), 'Stock at Depot 4{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('Stock at Depot 4')
    expect(box()).toHaveValue('')
  })

  it('adds a new line on Shift+Enter and does not submit', async () => {
    const onSubmit = vi.fn()
    render(<Controlled onSubmit={onSubmit} />)
    await userEvent.type(box(), 'One{Shift>}{Enter}{/Shift}Two')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(box()).toHaveValue('One\nTwo')
  })

  it('never submits an empty or blank draft, by Enter or by Send', async () => {
    const onSubmit = vi.fn()
    render(<Controlled onSubmit={onSubmit} />)
    await userEvent.type(box(), '{Enter}')
    await userEvent.type(box(), '   {Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits from Send and puts focus back in the box', async () => {
    const onSubmit = vi.fn()
    render(<Controlled onSubmit={onSubmit} />)
    await userEvent.type(box(), 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).toHaveBeenCalledWith('Hello')
    expect(box()).toHaveFocus()
  })

  it('shows Stop instead of Send while busy; Stop calls onStop and Enter sends nothing', async () => {
    const onStop = vi.fn()
    const onSubmit = vi.fn()
    render(<Controlled busy onStop={onStop} onSubmit={onSubmit} value="Next question" />)
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).toHaveBeenCalledTimes(1)
    await userEvent.type(box(), '{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('stops on Escape in the box while busy', async () => {
    const onStop = vi.fn()
    render(<Controlled busy onStop={onStop} />)
    await userEvent.type(box(), '{Escape}')
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('keeps the same button element between Send and Stop, so focus on it survives', () => {
    const props = { label: 'Message the assistant', value: '', onValueChange: () => {}, onSubmit: () => {} }
    const { rerender } = render(<PromptInput {...props} />)
    const send = screen.getByRole('button', { name: 'Send' })
    send.focus()
    rerender(<PromptInput {...props} busy />)
    const stop = screen.getByRole('button', { name: 'Stop' })
    expect(stop).toBe(send)
    expect(stop).toHaveFocus()
  })

  it('submits a suggestion on click, and disables suggestions while busy', async () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<Controlled onSubmit={onSubmit} suggestions={['Summarise stock', 'What is low?']} />)
    const group = screen.getByRole('group', { name: 'Suggestions' })
    expect(group).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Summarise stock' }))
    expect(onSubmit).toHaveBeenCalledWith('Summarise stock')
    expect(box()).toHaveFocus()
    rerender(<Controlled onSubmit={onSubmit} suggestions={['Summarise stock']} busy />)
    expect(screen.getByRole('button', { name: 'Summarise stock' })).toBeDisabled()
  })

  it('disables the box and the button when disabled', () => {
    render(<Controlled disabled />)
    expect(box()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('is axe clean, idle and busy', async () => {
    const { container, rerender } = render(<Controlled suggestions={['Summarise stock']} />)
    expect(await axeClean(container)).toHaveNoViolations()
    rerender(<Controlled suggestions={['Summarise stock']} busy onStop={() => {}} />)
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
