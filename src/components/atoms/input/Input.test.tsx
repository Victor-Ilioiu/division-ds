import { describe, it, expect, vi } from 'vitest'
import { createRef, useId, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Input } from './Input'
import { FormField } from '../../molecules/form-field/FormField'

// `htmlFor`, not a wrapping <label>: once the field carries a reveal or clear button, a wrapping
// label would read those buttons' names into the field's own. FormField uses htmlFor too.
function Labelled(props: React.ComponentProps<typeof Input>) {
  const id = useId()
  return (
    <>
      <label htmlFor={props.id ?? id}>Call sign</label>
      <Input id={id} {...props} />
    </>
  )
}

describe('Input', () => {
  it('is reachable by its label', () => {
    render(<Labelled />)
    expect(screen.getByLabelText('Call sign')).toBeInTheDocument()
  })

  it('accepts typing', async () => {
    render(<Labelled />)
    const input = screen.getByLabelText('Call sign')
    await userEvent.type(input, 'Anvil-3')
    expect(input).toHaveValue('Anvil-3')
  })

  it('sets aria-invalid and the invalid border when invalid', () => {
    render(<Labelled invalid />)
    const input = screen.getByLabelText('Call sign')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.className).toContain('--component-control-border-invalid')
  })

  it('has no aria-invalid when valid', () => {
    render(<Labelled />)
    expect(screen.getByLabelText('Call sign')).not.toHaveAttribute('aria-invalid')
  })

  it('does not accept typing when disabled', async () => {
    render(<Labelled disabled />)
    const input = screen.getByLabelText('Call sign')
    await userEvent.type(input, 'Anvil-3')
    expect(input).toHaveValue('')
  })

  it('uses inputSize rather than shadowing the native size attribute', () => {
    render(<Labelled inputSize="lg" size={5} />)
    const input = screen.getByLabelText('Call sign')
    expect(input).toHaveAttribute('size', '5')
    expect(input.className).toContain('--component-control-height-lg')
  })

  it('forwards a ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Labelled ref={ref} />)
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('renders a bare input with no wrapper when no adornment is asked for (the default is unchanged)', () => {
    const { container } = render(<Input aria-label="Call sign" className="w-24" />)
    expect(container.firstElementChild?.tagName).toBe('INPUT')
    expect(container.firstElementChild).toHaveClass('w-24')
  })

  describe('revealable password', () => {
    it('adds a pressed-state toggle that switches the type', async () => {
      render(<Labelled type="password" revealable defaultValue="hunter-2" />)
      const input = screen.getByLabelText('Call sign')
      const toggle = screen.getByRole('button', { name: 'Show password' })
      expect(input).toHaveAttribute('type', 'password')
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
      expect(toggle).toHaveAttribute('aria-controls', input.id)
      await userEvent.click(toggle)
      expect(input).toHaveAttribute('type', 'text')
      expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(toggle)
      expect(input).toHaveAttribute('type', 'password')
    })

    it('hides the password again when its form submits, so a password manager sees type=password', async () => {
      render(
        <form onSubmit={e => e.preventDefault()}>
          <Labelled type="password" revealable defaultValue="hunter-2" />
          <button type="submit">Sign in</button>
        </form>
      )
      await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(screen.getByLabelText('Call sign')).toHaveAttribute('type', 'text')
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      expect(screen.getByLabelText('Call sign')).toHaveAttribute('type', 'password')
    })

    it('does nothing on a field that is not a password', () => {
      render(<Labelled type="text" revealable />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('showCount', () => {
    it('shows length over maxLength in mono, and describes the field with it', async () => {
      render(<Labelled maxLength={80} showCount />)
      const input = screen.getByLabelText('Call sign')
      await userEvent.type(input, 'Anvil-3')
      const visible = screen.getByText('7/80')
      expect(visible.closest('[id]')!.className).toContain('font-mono')
      expect(input).toHaveAccessibleDescription('7 of 80 characters')
    })

    it('merges with a describedby it was given, rather than overwriting it (FormField passes one)', () => {
      render(
        <>
          <p id="help">Letters and numbers.</p>
          <Labelled maxLength={80} showCount aria-describedby="help" />
        </>
      )
      expect(screen.getByLabelText('Call sign')).toHaveAccessibleDescription(
        'Letters and numbers. 0 of 80 characters'
      )
    })

    it('counts a controlled value', () => {
      render(<Labelled maxLength={10} showCount value="Anvil" onChange={() => {}} />)
      expect(screen.getByText('5/10')).toBeInTheDocument()
    })

    it('announces politely only near the limit', async () => {
      render(<Labelled maxLength={20} showCount />)
      const input = screen.getByLabelText('Call sign')
      const live = document.querySelector('[aria-live="polite"]')!
      await userEvent.type(input, 'Anvil')
      expect(live).toHaveTextContent('')
      await userEvent.type(input, '-3 relay north')
      // 19 of 20: within the last 10%, and at least the last few characters.
      expect(live).toHaveTextContent('1 character left')
      await userEvent.type(input, 'x')
      expect(live).toHaveTextContent('No characters left')
    })

    it('does nothing without maxLength', () => {
      render(<Labelled showCount />)
      expect(screen.getByLabelText('Call sign')).not.toHaveAttribute('aria-describedby')
    })
  })

  describe('clearable', () => {
    it('shows a clear button only while there is a value', async () => {
      render(<Labelled clearable />)
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
      await userEvent.type(screen.getByLabelText('Call sign'), 'Anvil')
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    })

    it('empties the field, fires onChange and onClear, and returns focus to the input', async () => {
      const onClear = vi.fn()
      const onChange = vi.fn()
      render(<Labelled clearable onClear={onClear} onChange={onChange} defaultValue="Anvil" />)
      await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
      const input = screen.getByLabelText('Call sign')
      expect(input).toHaveValue('')
      expect(input).toHaveFocus()
      expect(onClear).toHaveBeenCalledOnce()
      expect(onChange).toHaveBeenCalled()
      expect(onChange.mock.lastCall![0].target.value).toBe('')
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
    })

    it('clears a controlled field through its own onChange', async () => {
      function Controlled() {
        const [value, setValue] = useState('Anvil')
        return (
          <>
            <label htmlFor="controlled">Call sign</label>
            <Input id="controlled" clearable value={value} onChange={e => setValue(e.target.value)} />
          </>
        )
      }
      render(<Controlled />)
      await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
      expect(screen.getByLabelText('Call sign')).toHaveValue('')
    })

    it('offers no clear button on a disabled or read-only field', () => {
      render(
        <>
          <Input aria-label="One" clearable disabled defaultValue="Anvil" />
          <Input aria-label="Two" clearable readOnly defaultValue="Anvil" />
        </>
      )
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('takes a clearLabel', () => {
      render(<Labelled clearable clearLabel="Clear call sign" defaultValue="Anvil" />)
      expect(screen.getByRole('button', { name: 'Clear call sign' })).toBeInTheDocument()
    })
  })

  it('keeps working inside FormField: its id, help and error all survive every adornment', async () => {
    render(
      <FormField label="Passphrase" help="Twelve characters or more." error="Too short.">
        <Input type="password" revealable clearable maxLength={40} showCount defaultValue="relay" />
      </FormField>
    )
    const input = screen.getByLabelText('Passphrase')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Twelve characters or more. Too short. 5 of 40 characters')
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-controls', input.id)
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('keeps className on the input and wrapperClassName on the wrapper when adorned', () => {
    render(<Labelled clearable defaultValue="Anvil" className="w-40" wrapperClassName="max-w-xs" />)
    const input = screen.getByLabelText('Call sign')
    expect(input).toHaveClass('w-40')
    expect(input.parentElement).toHaveClass('max-w-xs')
  })

  it('forwards a ref when adorned', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Labelled ref={ref} clearable />)
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('is axe clean with every adornment', async () => {
    const { container } = render(
      <div>
        <Labelled type="password" revealable defaultValue="hunter-2" />
        <Labelled maxLength={80} showCount defaultValue="Anvil" />
        <Labelled clearable defaultValue="Anvil" />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('is axe clean', async () => {
    const { container } = render(
      <div>
        <Labelled />
        <Labelled invalid />
        <Labelled disabled />
      </div>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // Input computes aria-invalid from `invalid` and spreads `{...rest}` after it, so a caller-
  // supplied `aria-invalid` in rest would silently win at runtime (JSX later attributes override
  // earlier ones) and defeat the one thing this prop promises. `aria-invalid` is hyphenated, so
  // `Omit<>` alone is a no-op — TypeScript's JSX checker never flags an aria-/data-prefixed
  // attribute as excess — so InputProps redeclares `'aria-invalid'` with type `never`, which
  // TypeScript does enforce. `@ts-expect-error` fails the build if that field is ever removed.
  it.skip('rejects a caller-supplied aria-invalid at the type level', () => {
    // @ts-expect-error invalid is the sole source of aria-invalid — aria-invalid itself is excluded
    ;<Input aria-invalid="true" />
  })
})
