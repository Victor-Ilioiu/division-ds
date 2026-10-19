import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Radio',
  title: 'Radio',
  tier: 'atoms',
  slug: 'radio',
  summary:
    'Pick one choice from a set. The whole group is a single tab stop, and the arrow keys move inside it. That’s how native radio buttons behave, and it’s most of the reason this is built on a Radix primitive (Radix is a library of accessible building blocks) instead of three styled inputs.',
  anatomy: [
    { part: 'RadioGroup', description: 'Has role=radiogroup, which tells assistive tech (screen readers and similar tools) this is a set of radios. It handles roving focus, where only one option is reachable by Tab and the arrows move between the rest, and it owns the value.' },
    { part: 'Radio', description: 'Has role=radio. A 20px (pixel) square inside a 24px hit area, the region that responds to a click or tap.' },
    {
      part: 'Indicator',
      description: 'A filled 10px square, not a dot. The system’s shape language has no circles.',
    },
  ],
  props: [
    { name: 'value (RadioGroup)', type: 'string', description: 'The selected value, when you control it from outside.' },
    { name: 'defaultValue (RadioGroup)', type: 'string', description: 'The starting value, when the group manages it itself (uncontrolled).' },
    {
      name: 'onValueChange (RadioGroup)',
      type: '(value: string) => void',
      description: 'Fires when the selection changes.',
    },
    { name: 'name (RadioGroup)', type: 'string', description: 'The native form field name.' },
    { name: 'required (RadioGroup)', type: 'boolean', description: 'Uses the browser’s native form validation.' },
    { name: 'disabled (RadioGroup)', type: 'boolean', description: 'Disables every option in the group.' },
    {
      name: 'orientation (RadioGroup)',
      type: "'horizontal' | 'vertical'",
      description: 'Sets which arrow keys move between options. The visual layout is still up to className.',
    },
    {
      name: 'aria-label / aria-labelledby (RadioGroup)',
      type: 'string',
      description: 'One of these is required. They’re ARIA attributes (from Accessible Rich Internet Applications) that give the group a name screen readers announce. A radiogroup with no name is a bug.',
    },
    { name: 'value (Radio)', type: 'string', description: 'Required. This option’s value.' },
    { name: 'disabled (Radio)', type: 'boolean', description: 'Takes just this option out of selection.' },
    { name: 'id (Radio)', type: 'string', description: 'Pair it with a real label using htmlFor.' },
    { name: 'invalid (Radio)', type: 'boolean', default: 'false', description: 'Sets aria-invalid, which tells assistive tech the field has an error, and shows the invalid border.' },
    { name: 'className', type: 'string', description: "Merged with the control's classes. Later Tailwind utilities (Tailwind is the CSS framework the system uses) win." },
    { name: 'ref', type: 'Ref<HTMLDivElement> (RadioGroup) / Ref<HTMLButtonElement> (Radio)', description: 'Passed through to the Radix root element.' },
    {
      name: '...rest',
      type: "(Radio) Omit<RadioGroup.Item props, 'aria-invalid'>",
      description:
        'Every Radix RadioGroup.Item prop except aria-invalid, spread onto the item. aria-invalid is typed away instead of being quietly overridden at runtime, because invalid is the only source of both the attribute and the border. RadioGroup itself excludes nothing. It computes no value of its own that a rest prop could defeat.',
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Enters the group at the selected option, or at the first one if nothing’s selected.' },
    { keys: ['↓', '→'], does: 'Selects the next option.' },
    { keys: ['↑', '←'], does: 'Selects the previous option.' },
    { keys: ['Space'], does: 'Selects the focused option.' },
  ],
  useWhen: 'One choice from a short set, up to about seven, all shown at once.',
  notFor: 'A yes/no question: use Checkbox or Switch. A longer list: use Select.',
  dos: [
    'Name the group with aria-label or a FormField legend.',
    'Offer a default when one option really is the norm.',
    'Keep the set short. Past about seven options, use a Select.',
  ],
  donts: [
    "Don't use radios for a yes/no. That's a Checkbox or a Switch.",
    "Don't put a radio outside a RadioGroup. Both the roving focus and the value come from the group.",
    "Don't make choosing an option perform the action. Put a button after the group.",
  ],
}
