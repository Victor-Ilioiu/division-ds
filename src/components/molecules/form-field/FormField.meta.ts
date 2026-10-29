import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'FormField',
  title: 'FormField',
  tier: 'molecules',
  slug: 'form-field',
  summary:
    'The label, help text and error text for one form control. They\'re connected so a screen reader reads all three, in that order, when the control gets focus. The atoms (the smallest components) never label themselves. This is where it happens.',
  anatomy: [
    {
      part: 'Label',
      description: "A real label element that points at the control's id. Monospaced, 11px (pixels), uppercase.",
    },
    {
      part: 'Required mark',
      description:
        'A signal-orange asterisk that screen readers skip (aria-hidden). Assistive technology, such as screen readers, announces the built-in HTML required attribute instead.',
    },
    {
      part: 'Control',
      description: 'The single child, copied with id, aria-describedby, invalid and required added. aria-describedby is an ARIA (Accessible Rich Internet Applications) attribute that links the control to its help and error text.',
    },
    { part: 'Help', description: 'Optional. Read out first.' },
    {
      part: 'Error',
      description:
        'Optional. Read out after the help, with an icon so the error isn\'t shown by colour alone. It isn\'t a live region, so it isn\'t announced the moment it appears.',
    },
  ],
  props: [
    { name: 'label', type: 'string', description: 'The field label. Required.' },
    { name: 'help', type: 'string', description: 'Instruction text, read out before any error.' },
    {
      name: 'error',
      type: 'string',
      description: 'Sets invalid on the control and adds the error line.',
    },
    {
      name: 'required',
      type: 'boolean',
      default: 'false',
      description: 'Adds the asterisk (hidden from screen readers) and the built-in required attribute on the control. That attribute is what assistive technology actually announces.',
    },
    {
      name: 'children',
      type: 'ReactElement',
      description:
        'Exactly one control: Input, Textarea, Select or QuantityStepper. A label set on a Select or QuantityStepper child is replaced by the FormField label. An id you give the control is kept (point an ErrorSummary entry at it); without one, FormField makes one up.',
    },
    { name: 'className', type: 'string', description: 'Extra CSS classes, merged with the outer element\'s own. When two Tailwind classes clash, the later one wins.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the outer element.' },
    {
      name: 'errors (ErrorSummary)',
      type: '{ fieldId: string; message: string }[]',
      description: 'What stopped the form from submitting, in the order of the fields. Each entry links to its field and moves focus there. An empty list shows nothing.',
    },
    {
      name: 'title (ErrorSummary)',
      type: 'string',
      default: "'There is a problem'",
      description: 'The heading. It\'s what a screen reader reads first when the form moves focus to the summary.',
    },
    {
      name: 'headingLevel (ErrorSummary)',
      type: '2 | 3 | 4',
      default: '2',
      description: 'The heading level, so the summary fits the outline of headings on its page.',
    },
    { name: 'className (ErrorSummary)', type: 'string', description: 'Extra CSS classes, merged with the outer element\'s own. When two Tailwind classes clash, the later one wins.' },
    {
      name: 'ref (ErrorSummary)',
      type: 'Ref<HTMLDivElement>',
      description: 'The summary itself. A form moves focus to it after a submit that failed.',
    },
  ],
  keyboard: [{ keys: ['Tab'], does: 'Moves to the control. FormField adds no keyboard stops of its own.' }],
  useWhen: 'The label, help and error for an Input, Textarea, Select, MultiSelect or QuantityStepper.',
  notFor: 'Search or RatingInput, which name themselves. Switch, Checkbox and Radio take an id and a label with htmlFor instead.',
  dos: [
    'Pass an id to the control when something else has to point at it (an ErrorSummary entry, a link). FormField keeps an id you give it and only makes one up when you don\'t.',
    'Keep help text to the one thing people get wrong.',
    "Write the error as what to do next: 'Use four to eight letters', not 'Invalid'.",
    'Check the value when someone leaves the field (on blur) or submits, not on every keystroke.',
    'Wrap a Select or a QuantityStepper: FormField hands it the id, the description, the invalid state and its own label.',
  ],
  donts: [
    "Don't wrap Search or RatingInput. Each is named by its own label and takes no help or error text.",
    "Don't hide the help text when an error appears. That's when people need the instruction most.",
    "Don't use placeholder text as the label. It disappears the moment someone types.",
    "Don't show a field error on a raised panel. Field errors sit on surface.base.",
  ],
}
