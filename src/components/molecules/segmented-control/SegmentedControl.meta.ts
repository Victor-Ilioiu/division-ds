import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'SegmentedControl',
  title: 'Segmented control',
  tier: 'molecules',
  slug: 'segmented-control',
  summary:
    "Two to five options in one framed row, with one selected. It changes what's on screen in place. Under the hood it's a radio group: Tab stops on it once, the arrow keys move and select, and the selected option has a signal fill with ink text.",
  useWhen: 'Switching the view of the same content in place: Board or Table, 24 h or 7 d.',
  notFor: 'Panels of different content: use Tabs. A choice in a form: use Radio.',
  anatomy: [
    { part: 'Group', description: "A radiogroup named by label, framed with the control hairline. It scrolls sideways if it's too wide." },
    { part: 'Option', description: 'A radio with a monospace label and an optional icon, the same height as a Button at sm or md.' },
    { part: 'Selected option', description: 'Signal fill, ink text, semibold. Its focus ring is drawn in ink.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. Names the group: "View", "Range".' },
    { name: 'options', type: 'readonly SegmentedControlOption[]', description: 'Required. Two to five.' },
    { name: 'value', type: 'string', description: 'Required. The selected option.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Required. Called with the new value.' },
    { name: 'size', type: "'sm' | 'md'", default: "'md'", description: "The same height as Button's sm or md." },
    { name: 'className', type: 'string', description: 'Added to the group.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the group.' },
    { name: 'value (SegmentedControlOption)', type: 'string', description: 'Required. What onValueChange receives.' },
    { name: 'label (SegmentedControlOption)', type: 'string', description: 'Required. Always shown.' },
    { name: 'icon (SegmentedControlOption)', type: 'ReactNode', description: 'A lucide icon before the label, aria-hidden so screen readers skip it.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves into the group, onto the selected option, and out again.' },
    { keys: ['ArrowLeft', 'ArrowRight'], does: 'Moves to the previous or next option and selects it. Wraps round at the ends.' },
    { keys: ['ArrowUp', 'ArrowDown'], does: 'The same as Left and Right.' },
    { keys: ['Space'], does: "Selects the focused option, if it isn't selected already." },
  ],
  dos: [
    'Use it where the change happens straight away and can be undone: the view, a time range, a unit.',
    "Keep labels to a word or two; they're set in uppercase monospace.",
    'Match the size to the buttons beside it: sm in a busy toolbar, md otherwise.',
  ],
  donts: [
    "Don't use it for panels of different content; that's Tabs, which links each tab to its panel.",
    "Don't use it for a choice that's sent with a form; that's a RadioGroup inside the form.",
    "Don't drop the label. Every option keeps its words, even with an icon.",
  ],
}
