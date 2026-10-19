import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Stepper',
  title: 'Stepper',
  tier: 'molecules',
  slug: 'stepper',
  summary:
    'Shows where someone is in a flow of several steps. Finished steps get a check mark, the current one is filled with the signal colour, and the rest wait as outlines.',
  anatomy: [
    { part: 'List', description: 'An ol (numbered list element) named by label.' },
    {
      part: 'Marker',
      description:
        'A 28px (pixel) square. Done: signal fill with a check. Current: signal fill with its number, without leading zeros, because dimmed zeros can\'t keep enough contrast against the fill. Upcoming: an outline with the two-digit number, leading zero included.',
    },
    {
      part: 'Connector',
      description:
        'A 2px line that turns the signal colour once the step before it is done. Horizontal: hidden when the steps stack, below the sm breakpoint (the small-screen width). Vertical: always shown, running down between the markers.',
    },
    { part: 'Label', description: 'In a monospaced font, with its status spelled out in words for screen readers.' },
    { part: 'Description', description: 'Optional, under the label. The vertical layout gives it the most room.' },
  ],
  props: [
    { name: 'steps', type: 'Step[]', description: 'Required. { label: string; description?: string }.' },
    {
      name: 'current',
      type: 'number',
      description: 'Counts from 0. steps.length means every step is complete.',
    },
    { name: 'label', type: 'string', default: "'Progress'", description: "The list's accessible name, the name screen readers announce." },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      default: "'horizontal'",
      description: 'Horizontal runs in a row from sm up and stacks below it. Vertical is a column at every width, with connectors.',
    },
    {
      name: 'className',
      type: 'string',
      description: 'Merged with the root classes. If two Tailwind utilities clash, the later one wins.',
    },
    { name: 'ref', type: 'Ref<HTMLOListElement>', description: 'Passed through to the root ol.' },
  ],
  keyboard: [
    {
      keys: [],
      does: 'Not interactive. Put Back and Continue buttons in the flow itself.',
    },
  ],
  useWhen: 'Showing where someone is in a flow of two to five steps.',
  notFor: 'Sections that are equally important: use Tabs. Also not for a single step.',
  dos: [
    'Keep it to five steps or fewer.',
    "Name steps for what happens in them: 'Shipping', not 'Step 1'.",
    "Label the list after the flow: 'Checkout progress'.",
    'Use vertical beside other content, or when steps have descriptions, like a shipment on an order page.',
  ],
  donts: [
    "Don't make steps clickable so people can skip ahead.",
    "Don't use a Stepper for equally important sections. That's what Tabs is for.",
    "Don't show a Stepper for a single step.",
  ],
}
