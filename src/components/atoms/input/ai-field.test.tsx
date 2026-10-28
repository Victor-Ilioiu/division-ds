import { describe, it, expect } from 'vitest'
import { useState, type ComponentType } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Input } from './Input'
import { Textarea } from '../textarea/Textarea'

// The AI-filled state, once for each field that has it: Input and Textarea share ai-field.tsx.
type Field = ComponentType<{ id: string; value?: string; defaultValue?: string; onChange?: (e: { target: { value: string } }) => void; aiValue?: string; readOnly?: boolean; invalid?: boolean }>
const FIELDS: [string, Field][] = [
  ['Input', Input as unknown as Field],
  ['Textarea', Textarea as unknown as Field],
]

const AI = 'Anvil-3'

describe.each(FIELDS)('%s with aiValue', (_name, Field) => {
  function Controlled({ initial = AI }: { initial?: string }) {
    const [value, setValue] = useState(initial)
    return (
      <>
        <label htmlFor="f">Call sign</label>
        <Field id="f" value={value} onChange={e => setValue(e.target.value)} aiValue={AI} />
      </>
    )
  }

  it('looks AI-filled and is described as such while the value is the AI’s', () => {
    render(<Controlled />)
    const field = screen.getByLabelText('Call sign')
    expect(field).toHaveAccessibleDescription('Filled by AI')
    expect(field.className).toContain('--color-ai-border')
    expect(screen.queryByRole('button', { name: 'Revert to suggestion' })).toBeNull()
  })

  it('returns to normal once edited, and the revert button puts the AI’s value back and refocuses', async () => {
    render(<Controlled />)
    const field = screen.getByLabelText('Call sign')
    await userEvent.type(field, 'x')
    expect(field).not.toHaveAccessibleDescription('Filled by AI')
    expect(field.className).not.toContain('--color-ai-border')

    await userEvent.click(screen.getByRole('button', { name: 'Revert to suggestion' }))
    expect(field).toHaveValue(AI)
    expect(field).toHaveFocus()
    expect(field).toHaveAccessibleDescription('Filled by AI')
    expect(screen.queryByRole('button', { name: 'Revert to suggestion' })).toBeNull()
  })

  it('works uncontrolled too', async () => {
    render(
      <>
        <label htmlFor="u">Call sign</label>
        <Field id="u" defaultValue={AI} aiValue={AI} />
      </>
    )
    const field = screen.getByLabelText('Call sign')
    await userEvent.clear(field)
    await userEvent.click(screen.getByRole('button', { name: 'Revert to suggestion' }))
    expect(field).toHaveValue(AI)
  })

  it('keeps focus in the field while the mark swaps for the revert button', async () => {
    render(<Controlled />)
    const field = screen.getByLabelText('Call sign')
    await userEvent.type(field, 'x')
    expect(field).toHaveFocus()
  })

  it('offers no revert on a read-only field, and an invalid field keeps its invalid border', () => {
    render(
      <>
        <label htmlFor="r">Read only</label>
        <Field id="r" value="mine" onChange={() => {}} aiValue={AI} readOnly />
        <label htmlFor="i">Invalid</label>
        <Field id="i" value={AI} onChange={() => {}} aiValue={AI} invalid />
      </>
    )
    expect(screen.queryByRole('button', { name: 'Revert to suggestion' })).toBeNull()
    expect(screen.getByLabelText('Invalid').className).not.toContain('--color-ai-border')
  })

  it('is axe clean in both states', async () => {
    const { container } = render(<Controlled />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.type(screen.getByLabelText('Call sign'), 'x')
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
