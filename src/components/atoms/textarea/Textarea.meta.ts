import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Textarea',
  title: 'Textarea',
  tier: 'atoms',
  slug: 'textarea',
  summary:
    "A text box for several lines. It has the same chrome (border, fill and states) as Input, resizes vertically and shows four rows by default. Like Input, it doesn't label itself.",
  requires: [
    "A <FormField> around it. On its own the control has no label. FormField supplies the label, the help text and the error, and links up their ids.",
  ],
  anatomy: [
    { part: 'Textarea', description: "Four rows, never shorter than 88px (pixels), vertical resize only." },
    { part: 'Border', description: 'The same three states as Input.' },
    { part: 'Focus ring', description: "The outline that shows keyboard focus. It sits on the control itself." },
  ],
  props: [
    { name: 'invalid', type: 'boolean', default: 'false', description: "Sets aria-invalid and the invalid border. aria-invalid is an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers the value has a problem. It doesn't render error text." },
    { name: 'rows', type: 'number', default: '4', description: "The browser's own rows attribute. Size it to the answer you expect." },
    { name: 'className', type: 'string', description: "Merged with the control's classes. Later Tailwind utilities (the small styling classes this system uses) win." },
    { name: 'ref', type: 'Ref<HTMLTextAreaElement>', description: 'Forwarded to the textarea element.' },
    {
      name: '...rest',
      type: "Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-invalid'>",
      description:
        "Every native textarea prop except aria-invalid, spread onto the element. aria-invalid is removed from the type instead of being quietly overridden at runtime. invalid is the only source of both the attribute and the border, so letting a caller set one directly would let what people see and what screen readers hear drift apart.",
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves focus to it.' },
    { keys: ['Enter'], does: "Starts a new line. It doesn't submit the form." },
  ],
  useWhen: 'Free text over several lines, inside a FormField.',
  notFor: 'A single line. Use Input.',
  dos: [
    'Size rows to the answer you expect.',
    "Leave vertical resize on. Taking it away doesn't help anyone.",
    "Show a character counter as text the field points to with aria-describedby, not as a colour change.",
  ],
  donts: [
    "Don't allow horizontal resize. It breaks the layout around it.",
    "Don't bevel it. The cut would land exactly where the resize grip is, and clip-path (the CSS, or Cascading Style Sheets, property that cuts the corner) would take the focus ring with it. Input's page states the general rule.",
    "Don't reach for inputVariants here. The shared heights are wrong for a box with several lines, and the small duplication is on purpose.",
    "Don't trap Enter to submit unless there's another way to add a line.",
  ],
}
