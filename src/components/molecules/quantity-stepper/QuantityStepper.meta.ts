import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'QuantityStepper',
  title: 'Quantity stepper',
  tier: 'molecules',
  slug: 'quantity-stepper',
  summary:
    "A whole number between a lowest and a highest value, with a button on each side. It follows the spinbutton pattern (the standard recipe for a number you nudge up and down), so the keyboard can do everything from inside the field.",
  anatomy: [
    {
      part: 'Field',
      description:
        "Has role=spinbutton, plus its value and limits, so screen readers know what it is. It's a text field that brings up a number keypad on phones, not the browser's own number input.",
    },
    {
      part: 'Decrease / Increase',
      description:
        "Secondary IconButtons named after the field. As the pattern says, Tab skips them. They're disabled at the lowest and highest value.",
    },
  ],
  props: [
    {
      name: 'label',
      type: 'string',
      description: 'Required. Names the field and both buttons ("Decrease Speed loader quantity").',
    },
    { name: 'value', type: 'number', description: 'Controlled value (your page holds it).' },
    { name: 'defaultValue', type: 'number', default: 'min', description: 'Starting value when the component holds the value itself (uncontrolled).' },
    {
      name: 'onValueChange',
      type: '(value: number) => void',
      description: 'Fires with the final value, pulled inside the limits: after a button click, an arrow key, Home/End, or when typing is finished by leaving the field or pressing Enter.',
    },
    { name: 'min', type: 'number', default: '0', description: 'Lowest allowed value.' },
    { name: 'max', type: 'number', default: '99', description: 'Highest allowed value.' },
    { name: 'step', type: 'number', default: '1', description: 'The size of each step the value snaps to, counted from min.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the field and both buttons.' },
    { name: 'inputSize', type: "'sm' | 'md'", default: "'md'", description: 'Size of the field and buttons.' },
    {
      name: 'className',
      type: 'string',
      description: 'Combined with the root classes. Where Tailwind utility classes clash, the later one wins.',
    },
    { name: 'ref', type: 'Ref<HTMLInputElement>', description: 'Passed through to the field.' },
    {
      name: 'id',
      type: 'string',
      description: "The field's id, so a FormField's label and error text can point at it. FormField sets it.",
    },
    { name: 'aria-describedby', type: 'string', description: 'The ids of the help and error text, set on the field so screen readers read them out. FormField sets it.' },
    {
      name: 'invalid',
      type: 'boolean',
      description: 'Marks the field as invalid: aria-invalid and the invalid border. FormField sets it when there is an error.',
    },
    { name: 'required', type: 'boolean', description: 'Marks the field as required. FormField sets it.' },
  ],
  keyboard: [
    { keys: ['↑', '↓'], does: 'One step.' },
    { keys: ['Page Up', 'Page Down'], does: 'Ten steps.' },
    { keys: ['Home', 'End'], does: 'Jumps to the minimum or maximum.' },
    { keys: ['Enter'], does: 'Confirms what you typed.' },
    {
      keys: ['Tab'],
      does: "Leaves the field and confirms what you typed. Tab doesn't stop on the buttons.",
    },
  ],
  useWhen: 'A whole number between real limits, such as a quantity in a cart.',
  notFor: "A value that isn't a whole number: use Input. A range of hundreds: use Slider or Input.",
  dos: [
    'Set a real maximum, like the stock level or an order limit, not an arbitrary 99.',
    "Name the field after the item: 'Speed loader quantity'.",
    'Show the line total beside it, updating as the value changes.',
  ],
  donts: [
    "Don't use it for values that aren't whole numbers; that's an Input.",
    "Don't use it for a range of hundreds; that's a Slider or an Input.",
    "Don't pull the value back inside the limits while someone's still typing.",
  ],
}
