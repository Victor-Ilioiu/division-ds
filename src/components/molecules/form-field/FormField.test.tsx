import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axeClean } from '../../../test/axe'
import { Input, Select, Textarea } from '../../atoms'
import { QuantityStepper } from '../quantity-stepper/QuantityStepper'
import { FormField } from './FormField'

const COUNTRIES = [
  { value: 'ro', label: 'Romania' },
  { value: 'ie', label: 'Ireland' },
]

describe('FormField', () => {
  it('labels the control it wraps', () => {
    render(
      <FormField label="Callsign">
        <Input />
      </FormField>
    )
    expect(screen.getByRole('textbox', { name: 'Callsign' })).toBeInTheDocument()
  })

  it('describes the control with help text', () => {
    render(
      <FormField label="Callsign" help="Four to eight letters.">
        <Input />
      </FormField>
    )
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Four to eight letters.')
  })

  it('describes with help first, then error, and marks the control invalid', () => {
    render(
      <FormField label="Callsign" help="Four to eight letters." error="Too short.">
        <Input />
      </FormField>
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAccessibleDescription('Four to eight letters. Too short.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not announce the error as a live region', () => {
    render(
      <FormField label="Callsign" error="Too short.">
        <Input />
      </FormField>
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('passes required natively and hides the asterisk from assistive tech', () => {
    render(
      <FormField label="Callsign" required>
        <Input />
      </FormField>
    )
    expect(screen.getByRole('textbox')).toBeRequired()
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps a caller-supplied id rather than replacing it', () => {
    render(
      <FormField label="Notes">
        <Textarea id="dispatch-notes" />
      </FormField>
    )
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAttribute('id', 'dispatch-notes')
  })

  it('gives two fields on one page distinct ids', () => {
    render(
      <>
        <FormField label="First"><Input /></FormField>
        <FormField label="Second"><Input /></FormField>
      </>
    )
    const [a, b] = screen.getAllByRole('textbox')
    expect(a.id).not.toBe(b.id)
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <FormField ref={ref} label="Callsign">
        <Input />
      </FormField>
    )
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('DIV')
  })

  it('is axe clean with help and error', async () => {
    const { container } = render(
      <FormField label="Callsign" help="Four to eight letters." error="Too short." required>
        <Input />
      </FormField>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('FormField around a self-labelling control', () => {
  it('wires a Select: the label names its trigger, and help and error describe it', () => {
    render(
      <FormField label="Country" help="Where the order ships." error="Choose a country.">
        <Select label="Country" options={COUNTRIES} />
      </FormField>
    )
    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toHaveAccessibleDescription('Where the order ships. Choose a country.')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Country', { selector: 'label' })).toHaveAttribute('for', trigger.id)
  })

  it("wires a QuantityStepper through its field", () => {
    render(
      <FormField label="Spare magazines" error="Order at least 4.">
        <QuantityStepper label="Spare magazines" max={40} />
      </FormField>
    )
    const field = screen.getByRole('spinbutton', { name: 'Spare magazines' })
    expect(field).toHaveAccessibleDescription('Order at least 4.')
    expect(field).toHaveAttribute('aria-invalid', 'true')
  })

  it("replaces a self-labelling child's own label with the field's", () => {
    render(
      <FormField label="Country">
        <Select label="Pick one" options={COUNTRIES} />
      </FormField>
    )
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument()
  })

  it('passes no label to a control that does not take one', () => {
    render(
      <FormField label="Callsign">
        <Input />
      </FormField>
    )
    expect(screen.getByRole('textbox')).not.toHaveAttribute('label')
  })

  it('is axe clean around a Select and a QuantityStepper in error', async () => {
    const { container } = render(
      <>
        <FormField label="Country" error="Choose a country." required>
          <Select label="Country" options={COUNTRIES} />
        </FormField>
        <FormField label="Spare magazines" error="Order at least 4.">
          <QuantityStepper label="Spare magazines" max={40} />
        </FormField>
      </>
    )
    expect(await axeClean(container)).toHaveNoViolations()
  })
})
