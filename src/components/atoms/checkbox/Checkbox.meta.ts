import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Checkbox',
  title: 'Checkbox',
  tier: 'atoms',
  slug: 'checkbox',
  summary:
    "A checkbox with three states: off, on and mixed. Radix (the open-source library of accessible building blocks underneath it) handles the semantics and the keyboard behaviour. The look comes from the system's shape language: a square with no rounding and a tick in ink.",
  anatomy: [
    {
      part: 'Root',
      description:
        "A button with role=checkbox, which tells screen readers it's a checkbox. A native input can't be styled this way. The box is 20px (pixels) and the hit area, the part you can click or tap, is 24px.",
    },
    {
      part: 'Indicator',
      description: "A tick when checked, a dash when mixed. The shape changes, so the state never depends on colour alone.",
    },
    {
      part: 'Hit area',
      description:
        "A ::before inset of -2px, which clears the 24×24 minimum in WCAG 2.2 (the Web Content Accessibility Guidelines, the public rulebook for making websites usable by people with disabilities).",
    },
  ],
  props: [
    { name: 'checked', type: "boolean | 'indeterminate'", description: 'The checked state, when your code controls it.' },
    {
      name: 'defaultChecked',
      type: 'boolean',
      description:
        "The starting state when the checkbox manages itself (uncontrolled). It's narrower than Radix's own boolean | 'indeterminate'. The tick or dash can only follow a checked value the caller passed in. Radix would track an uncontrolled mixed state internally but never hand it back, so that state is excluded instead of being drawn with the wrong mark.",
    },
    {
      name: 'onCheckedChange',
      type: "(checked: boolean | 'indeterminate') => void",
      description: 'Runs every time it toggles.',
    },
    { name: 'disabled', type: 'boolean', description: "Takes it out of the tab order and stops it toggling." },
    { name: 'required', type: 'boolean', description: "Uses the browser's built-in form validation." },
    { name: 'name', type: 'string', description: 'The field name sent with a native form.' },
    { name: 'value', type: 'string | number | readonly string[]', description: 'The field value sent with a native form.' },
    {
      name: 'invalid',
      type: 'boolean',
      default: 'false',
      description:
        "Sets aria-invalid (an ARIA attribute, from Accessible Rich Internet Applications, that tells screen readers the field has an error) and shows the invalid border.",
    },
    { name: 'id', type: 'string', description: 'Pair it with a real label through htmlFor.' },
    {
      name: 'className',
      type: 'string',
      description:
        "Merged with the control's classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with).",
    },
    { name: 'ref', type: 'Ref<HTMLButtonElement>', description: 'Passed through to the Radix root button.' },
    {
      name: '...rest',
      type: "Omit<CheckboxProps, 'aria-invalid' | 'defaultChecked'>",
      description:
        "Every Radix Checkbox.Root prop except aria-invalid, spread onto the root. aria-invalid is removed from the type, so you can't pass it, instead of being quietly overwritten while the page runs. invalid is the only thing that sets both the attribute and the border. defaultChecked is declared again above, narrowed to boolean.",
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves focus to it.' },
    { keys: ['Space'], does: 'Toggles it.' },
    { keys: ['Enter'], does: "Nothing. That's how a native checkbox behaves, so it isn't a bug to fix." },
  ],
  useWhen: 'An on/off choice that applies when the form is saved, or a parent whose children are partly selected.',
  notFor: 'A setting that takes effect the moment you flip it. Use Switch for that.',
  dos: [
    'Give it a real <label htmlFor>, or let FormField do it.',
    'Use the mixed state for a parent whose children are partly selected.',
    'Put the label on the right and make it part of the clickable target.',
  ],
  donts: [
    "Don't use a checkbox for something that takes effect right away. That's a Switch.",
    "Don't rely on the fill colour alone. The tick and the dash are what show the state.",
    "Don't nest checkbox groups more than one level deep.",
  ],
}
