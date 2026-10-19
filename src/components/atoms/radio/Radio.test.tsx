import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Radio, RadioGroup } from './Radio'

function Group(props: React.ComponentProps<typeof RadioGroup>) {
  return (
    <RadioGroup aria-label="Dispatch speed" {...props}>
      {['standard', 'priority', 'overnight'].map(v => (
        <div key={v} className="flex items-center gap-2">
          <Radio value={v} id={`speed-${v}`} />
          <label htmlFor={`speed-${v}`}>{v}</label>
        </div>
      ))}
    </RadioGroup>
  )
}

describe('Radio', () => {
  it('exposes a named radiogroup with one radio per option', () => {
    render(<Group />)
    expect(screen.getByRole('radiogroup', { name: 'Dispatch speed' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('selects on click', async () => {
    const onValueChange = vi.fn()
    render(<Group onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'priority' }))
    expect(onValueChange).toHaveBeenCalledWith('priority')
  })

  it('moves the selection with arrow keys, not Tab', async () => {
    const onValueChange = vi.fn()
    render(<Group defaultValue="standard" onValueChange={onValueChange} />)
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'standard' })).toHaveFocus()
    // Radix's roving-focus defers the actual focus move to a macrotask (`setTimeout`), and the
    // radio group only auto-selects the newly-focused item while an internal "arrow key is still
    // down" flag is true (set on keydown, cleared on keyup, both via native document listeners —
    // see node_modules/@radix-ui/react-radio-group, RadioGroupItemTrigger). userEvent's default
    // keyboard() dispatches keydown+keyup for a single keypress back-to-back with no macrotask
    // boundary between them, which clears that flag before the deferred focus move ever runs — a
    // simulation artifact, not real user timing (a real key press always has a macrotask tick
    // between down and up). Splitting the press so a real `setTimeout` elapses in between
    // reproduces genuine timing instead of masking it.
    await userEvent.keyboard('{ArrowDown>}')
    await new Promise(resolve => setTimeout(resolve, 0))
    await userEvent.keyboard('{/ArrowDown}')
    expect(onValueChange).toHaveBeenCalledWith('priority')
  })

  it('keeps the group to a single tab stop', async () => {
    render(
      <div>
        <Group defaultValue="standard" />
        <button type="button">After</button>
      </div>
    )
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'standard' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('marks an invalid option aria-invalid', () => {
    render(
      <RadioGroup aria-label="Dispatch speed">
        <Radio value="standard" invalid aria-label="standard" />
      </RadioGroup>
    )
    expect(screen.getByRole('radio')).toHaveAttribute('aria-invalid', 'true')
  })

  it('forwards a ref to the group root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Group ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('radiogroup'))
  })

  it('forwards a ref to the radio root element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <RadioGroup aria-label="Dispatch speed">
        <Radio value="standard" ref={ref} aria-label="standard" />
      </RadioGroup>
    )
    expect(ref.current).toBe(screen.getByRole('radio'))
  })

  it('is axe clean', async () => {
    const { container } = render(<Group defaultValue="standard" />)
    expect(await axeClean(container)).toHaveNoViolations()
  })

  it('paints the checked indicator in accent.signal.fill, not indicator.checked', () => {
    render(
      <RadioGroup aria-label="Dispatch speed" defaultValue="standard">
        <Radio value="standard" aria-label="standard" />
      </RadioGroup>
    )
    const indicator = screen.getByRole('radio').querySelector('span')
    expect(indicator).toHaveClass('bg-[var(--color-accent-signal-fill)]')
  })

  // Type-only assertion, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — this test is skipped so nothing actually renders, but its body still type-checks.
  // Radio computes aria-invalid from `invalid` and spreads `{...rest}` after it, so a caller-
  // supplied `aria-invalid` in rest would silently win at runtime (JSX later attributes override
  // earlier ones) and defeat the one thing this prop promises. `aria-invalid` is hyphenated, so
  // `Omit<>` alone is a no-op — TypeScript's JSX checker never flags an aria-/data-prefixed
  // attribute as excess — so RadioProps redeclares `'aria-invalid'` with type `never`, which
  // TypeScript does enforce. Same precedent as Input's, Textarea's and Checkbox's `aria-invalid`
  // exclusion. `@ts-expect-error` fails the build if that field is ever removed.
  it.skip('rejects a caller-supplied aria-invalid at the type level', () => {
    // @ts-expect-error invalid is the sole source of aria-invalid — aria-invalid itself is excluded
    ;<Radio value="x" aria-invalid="true" />
  })
})
