import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axeClean } from '../../../test/axe'
import { Select, type SelectGroup } from './Select'

const OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'priority', label: 'Priority' },
  { value: 'overnight', label: 'Overnight', disabled: true },
]

describe('Select', () => {
  it('renders a labelled combobox showing the placeholder', () => {
    render(<Select label="Dispatch speed" options={OPTIONS} placeholder="Choose a speed" />)
    const trigger = screen.getByRole('combobox', { name: 'Dispatch speed' })
    expect(trigger).toHaveTextContent('Choose a speed')
  })

  it('shows the selected option instead of the placeholder', () => {
    render(<Select label="Dispatch speed" options={OPTIONS} defaultValue="priority" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Priority')
  })

  it('opens on click and lists every option', async () => {
    render(<Select label="Dispatch speed" options={OPTIONS} />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('selects an option and reports it', async () => {
    const onValueChange = vi.fn()
    render(<Select label="Dispatch speed" options={OPTIONS} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Priority' }))
    expect(onValueChange).toHaveBeenCalledWith('priority')
  })

  it('marks a disabled option as disabled rather than hiding it', async () => {
    render(<Select label="Dispatch speed" options={OPTIONS} />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('option', { name: 'Overnight' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Select label="Dispatch speed" options={OPTIONS} />)
    const trigger = screen.getByRole('combobox')
    await userEvent.click(trigger)
    await screen.findByRole('listbox')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('sets aria-invalid when invalid', () => {
    render(<Select label="Dispatch speed" options={OPTIONS} invalid />)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('forwards a ref to the trigger element', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Select label="Dispatch speed" options={OPTIONS} ref={ref} />)
    expect(ref.current).toBe(screen.getByRole('combobox'))
  })

  it('spreads triggerProps onto the trigger element', () => {
    render(
      <Select
        label="Dispatch speed"
        options={OPTIONS}
        triggerProps={{ 'data-testid': 'speed-trigger' }}
      />
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('data-testid', 'speed-trigger')
  })

  it('puts id and aria-describedby on the trigger, where a FormField points', () => {
    render(
      <>
        <Select id="country" aria-describedby="country-help" label="Country" options={OPTIONS} />
        <p id="country-help">Where the order ships.</p>
      </>
    )
    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toHaveAttribute('id', 'country')
    expect(trigger).toHaveAccessibleDescription('Where the order ships.')
  })

  // Type-only assertions, enforced by `tsc -b` (run as part of `npm run build`), not by vitest at
  // runtime — these tests are skipped so nothing actually renders, but their bodies still
  // type-check. `@ts-expect-error` fails the build if the error is *absent*.
  //
  // Deliberately NOT a fresh object literal inline (`triggerProps={{ 'aria-label': 'x' }}`) —
  // TypeScript's excess-property checking already rejects that shape from the `Omit<...,
  // 'aria-label'>` alone, with or without the redeclared `'aria-label'?: never` below, so a test
  // written that way would still pass after deleting the `never` guard and wouldn't actually pin
  // it. Excess-property checking only fires on a FRESH literal; assigning to an unannotated
  // `const` first and passing that widens the value to a plain structural type, which bypasses
  // it — confirmed by temporarily deleting the `never` guard and finding this exact shape
  // compiles with zero errors when it's gone, then errors again once it's restored. This is the
  // shape that genuinely needs the `never` guard, not the one `Omit` already handles on its own.
  it.skip('rejects a caller-supplied aria-label on triggerProps at the type level', () => {
    const evilTriggerProps = { 'aria-label': 'Override' }
    // @ts-expect-error label is the sole source of the accessible name — triggerProps forbids aria-label even through a non-literal value
    ;<Select label="Dispatch speed" options={OPTIONS} triggerProps={evilTriggerProps} />
  })

  it.skip('rejects a caller-supplied aria-invalid on triggerProps at the type level', () => {
    const evilTriggerProps = { 'aria-invalid': true }
    // @ts-expect-error invalid is the sole source of aria-invalid — triggerProps forbids aria-invalid even through a non-literal value
    ;<Select label="Dispatch speed" options={OPTIONS} triggerProps={evilTriggerProps} />
  })

  // id and aria-describedby are FormField's route to the trigger (its own top-level `id`/
  // `aria-describedby` props on `Select`, spread after `triggerProps` — see `SelectProps`).
  // Without this guard, a `triggerProps.id` compiles, loses silently to FormField's `id` when
  // both are given, and wins silently — reaching a real element — when FormField gives neither.
  // A second, genuinely valid prop (onClick, real on RadixSelect.Trigger) rides along with the
  // banned key. Not a guard against TypeScript's "no properties in common" weak-type check
  // (TS2559) — SelectTriggerRestProps's own data-* index signature already makes the type
  // non-weak, so that check never fires here today. It's insurance: if the index signature is
  // ever removed, a single-key object would put TS2559 back in play, and onClick keeps the
  // directive below discriminating on the never guard instead of passing for the wrong reason.
  it.skip('rejects a caller-supplied id on triggerProps at the type level', () => {
    const evilTriggerProps = { id: 'override', onClick: () => {} }
    // @ts-expect-error id is FormField's route to the trigger — triggerProps forbids id even through a non-literal value
    ;<Select label="Dispatch speed" options={OPTIONS} triggerProps={evilTriggerProps} />
  })

  it.skip('rejects a caller-supplied aria-describedby on triggerProps at the type level', () => {
    const evilTriggerProps = { 'aria-describedby': 'override', onClick: () => {} }
    // @ts-expect-error aria-describedby is FormField's route to the trigger — triggerProps forbids it even through a non-literal value
    ;<Select label="Dispatch speed" options={OPTIONS} triggerProps={evilTriggerProps} />
  })

  // The top-level route, which `triggerProps` never closed. `RadixSelect.Root` renders no DOM
  // node, so a hyphenated key landing in `rest` vanished entirely: no type error (the JSX
  // checker exempts `aria-*`/`data-*` from excess-property checking, so `Omit` is inert), no
  // runtime error, no element anywhere carrying it.
  //
  // Both guards are DECLARED properties, so the mutation that proves them load-bearing is
  // removing the declaration. A pattern index signature — `` { [key: `aria-${string}`]: never } ``
  // — reads like it would do the same job and does not: it is not a property, so the JSX
  // checker's lookup misses it and the hyphenated exemption waves the attribute straight
  // through. Verified by running exactly that form first and finding both directives unused.
  // The aria half maps over `keyof AriaAttributes` for that reason; the data half can only
  // declare `data-testid` by hand, and an arbitrary `data-*` key is a stated residual gap
  // (see SelectProps).
  it.skip('rejects a top-level aria-* prop other than aria-describedby at the type level', () => {
    // @ts-expect-error label is the accessible name; a top-level aria-label would reach no element
    ;<Select label="Dispatch speed" options={OPTIONS} aria-label="Speed" />
  })

  it.skip('rejects a top-level data-* prop at the type level', () => {
    // @ts-expect-error rest goes to RadixSelect.Root, which renders no DOM node — route it through triggerProps
    ;<Select label="Dispatch speed" options={OPTIONS} data-testid="speed" />
  })

  // Ordinary key, so the `Omit<..., 'children'>` does the rejecting here; removing the WHOLE
  // exclusion is what proves this one.
  it.skip('rejects caller-supplied children at the type level', () => {
    // @ts-expect-error Select renders its own Trigger/Portal children; a children prop is silently discarded
    ;<Select label="Dispatch speed" options={OPTIONS} children={<span>ignored</span>} />
  })

  const GROUPS: SelectGroup[] = [
    {
      label: 'Rifles',
      options: [
        { value: 'carbine', label: 'Carbine', icon: <svg data-testid="carbine-icon" /> },
        { value: 'marksman', label: 'Marksman' },
      ],
    },
    { label: 'Sidearms', options: [{ value: 'pistol', label: 'Pistol', disabled: true }] },
  ]

  it('renders option groups, each named by its heading', async () => {
    render(<Select label="Replica class" groups={GROUPS} />)
    await userEvent.click(screen.getByRole('combobox'))
    await screen.findByRole('listbox')
    expect(screen.getByRole('group', { name: 'Rifles' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Sidearms' })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Pistol' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('selects an option from a group', async () => {
    const onValueChange = vi.fn()
    render(<Select label="Replica class" groups={GROUPS} onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Marksman' }))
    expect(onValueChange).toHaveBeenCalledWith('marksman')
    expect(screen.getByRole('combobox')).toHaveTextContent('Marksman')
  })

  it('renders an option icon hidden, so the option is named by its label alone', async () => {
    render(<Select label="Replica class" groups={GROUPS} />)
    await userEvent.click(screen.getByRole('combobox'))
    const option = await screen.findByRole('option', { name: 'Carbine' })
    const icon = screen.getByTestId('carbine-icon')
    expect(option).toContainElement(icon)
    expect(icon.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  // Type-only, like the other it.skip blocks above: tsc -b checks the directive.
  it.skip('takes options or groups, never both, at the type level', () => {
    // @ts-expect-error groups and options are two shapes of the same list; pass one
    ;<Select label="Replica class" options={OPTIONS} groups={GROUPS} />
  })

  it('is axe clean with groups and icons, open', async () => {
    render(<Select label="Replica class" groups={GROUPS} />)
    await userEvent.click(screen.getByRole('combobox'))
    await screen.findByRole('listbox')
    expect(await axeClean(document.body)).toHaveNoViolations()
  })

  it('is axe clean, closed and open', async () => {
    const { container } = render(<Select label="Dispatch speed" options={OPTIONS} />)
    expect(await axeClean(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('combobox'))
    await screen.findByRole('listbox')
    // The listbox is portalled to document.body, so check the whole document, not the container.
    expect(await axeClean(document.body)).toHaveNoViolations()
  })
})
