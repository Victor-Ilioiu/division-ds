import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Input',
  title: 'Input',
  tier: 'atoms',
  slug: 'input',
  summary:
    "A single-line text field. It doesn't label itself. The label, help text, error text and the wiring between them are FormField's job. On its own, Input handles the box, its states and the focus ring (the outline that shows which element the keyboard is on). It also has three optional extras inside its right edge: a password reveal, a character counter and a clear button.",
  requires: [
    'A <FormField> around it. On its own the control has no label. FormField adds the label, the help text and the error, and connects their ids.',
  ],
  anatomy: [
    {
      part: 'Input',
      description: "40px (pixels) tall by default. The height comes from the control token, not a hand-picked number.",
    },
    {
      part: 'Border',
      description:
        "border.control at rest, text.muted on hover and hostile.text when invalid. A control's edge tells you something, it isn't decoration, so it doesn't use a hairline token.",
    },
    {
      part: 'Focus ring',
      description: "Drawn on the input itself. Form controls aren't bevelled (given a cut corner), so nothing clips it.",
    },
    {
      part: 'Adornments',
      description:
        "Optional extras inside the right edge, in this order: the AI mark or its revert button, the count in mono (a fixed-width typeface), the clear button and the reveal toggle. Turning on any of them wraps the input in a relative box (wrapperClassName styles it) and sizes the right padding to fit them, so text never runs underneath. With none on, the input is bare, with no wrapper.",
    },
    {
      part: 'Placeholder',
      description:
        "text.placeholder, with contrast measured against the control fill it sits on, not the page. It's never a stand-in for a label.",
    },
  ],
  props: [
    {
      name: 'inputSize',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: "Called inputSize because size is already a real HTML attribute on input.",
    },
    {
      name: 'invalid',
      type: 'boolean',
      default: 'false',
      description:
        "Sets aria-invalid (an ARIA attribute, from Accessible Rich Internet Applications, that tells screen readers the field has an error) and shows the invalid border. It doesn't show any error text.",
    },
    { name: 'size', type: 'number', description: "The browser's own attribute, still available." },
    {
      name: 'revealable',
      type: 'boolean',
      default: 'false',
      description:
        "On type=\"password\", adds a Show password toggle with aria-pressed. The name stays the same, and the pressed state says whether the password is showing. It goes back to hidden when the form submits. Other types ignore it.",
    },
    {
      name: 'showCount',
      type: 'boolean',
      default: 'false',
      description:
        "Works with maxLength. It shows 12/80 in mono inside the field and adds it to aria-describedby, the attribute that links extra description to a field. It's merged with any describedby you pass in, which is how FormField keeps its help and error text. It only announces the characters left near the limit (the last tenth, and at least the last three), through a polite live region, an area screen readers read out without interrupting.",
    },
    {
      name: 'clearable',
      type: 'boolean',
      default: 'false',
      description:
        "Shows a clear button while the field has a value (never when it's disabled or read-only). Clearing fires onChange with an empty value, so a controlled field clears through its own handler. Then it calls onClear, then puts focus back in the input.",
    },
    { name: 'onClear', type: '() => void', description: 'Called after the clear button empties the field.' },
    {
      name: 'clearLabel',
      type: 'string',
      default: "'Clear'",
      description: "The clear button’s name. If the page has more than one, say what it clears: ‘Clear call sign’.",
    },
    {
      name: 'aiValue',
      type: 'string',
      description:
        "The value an AI proposed. While the field holds exactly this value it shows the AI-filled state: an ai.border edge, a faint ai.wash tint and a sparkle mark that describes the field as Filled by AI. Once the person changes it, the field looks normal again and a Revert to suggestion button puts the value back through onChange (no button on a disabled or read-only field). An invalid field keeps its invalid border.",
    },
    {
      name: 'wrapperClassName',
      type: 'string',
      description:
        "Classes for the wrapper a field with extras renders. Put width classes here when an extra is on. It does nothing on a bare input.",
    },
    {
      name: 'className',
      type: 'string',
      description:
        'Merged with the input’s classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with).',
    },
    { name: 'ref', type: 'Ref<HTMLInputElement>', description: 'Passed through to the input element.' },
    {
      name: '...rest',
      type: "Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'size'>",
      description:
        "Every native input prop except aria-invalid, spread onto the element. aria-invalid is removed from the type, so you can't pass it, instead of being quietly overwritten while the page runs. invalid is the only thing that sets both the attribute and the border. If a caller could set one directly, what you see and what screen readers hear could drift apart. size is declared again above as the native number attribute, because inputSize controls the variant.",
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves focus to the input, then to its revert, clear and reveal buttons if they are there.' },
    {
      keys: ['Esc'],
      does: "Nothing by default, even with clearable. Clearing on Escape is a search behaviour, and it lives in the Search molecule.",
    },
    {
      keys: ['Space'],
      does: 'On the reveal toggle, shows or hides the password. On the clear button, empties the field and puts focus back in it.',
    },
  ],
  useWhen: 'Single-line text, inside a FormField.',
  notFor: 'Several lines of text: use Textarea. Searching the page: use Search.',
  dos: [
    'Label it: with a real <label> today, and with FormField once that ships.',
    "Set the right type and autocomplete. They do more for usability than any styling here.",
    'Pair invalid with visible error text that the input points to through aria-describedby.',
    "Size the field to the expected input. A four-digit code doesn't need a full-width box.",
    "Use showCount with maxLength instead of building a counter next to the field. You get the describedby wiring and the near-limit announcement for free.",
    "Label a field with extras through FormField or a label htmlFor, never a label wrapped around it. A wrapping label pulls the clear and reveal buttons into the field’s name.",
  ],
  donts: [
    "Don't use the placeholder as the label. It disappears the moment someone types.",
    "Don't bevel it. A cut corner on a 40px box looks like damage, and it would clip the focus ring.",
    "Don't set invalid without saying what's wrong.",
    "Don't disable a field to make it read-only. Use readOnly, which you can still focus and copy from.",
    "Don't add clearable to a search field. Search already has its own clear button and the Escape key.",
    "Don't build your own show-password button next to a revealable field. You'll end up with two.",
    "Don't set aiValue on a field the person filled in themselves. The AI look says the machine wrote it.",
  ],
}
