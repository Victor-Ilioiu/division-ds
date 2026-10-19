import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Tooltip',
  title: 'Tooltip',
  tier: 'atoms',
  slug: 'tooltip',
  summary:
    "Extra text that shows on hover or focus. It never holds information people can only get there. It doesn't appear on touch screens, it goes away, and someone may never trigger it.",
  requires: [
    "One <TooltipProvider> near the root of the app. AppShell and the demo layout each mount one, so a screen doesn't add its own.",
  ],
  anatomy: [
    {
      part: 'Provider',
      description:
        "Mounted once in AppShell. It sets the 300ms (millisecond) delay, and the 150ms skip window for moving between triggers.",
    },
    {
      part: 'Trigger',
      description: "Uses asChild, so no wrapper element is added and the focus order stays as it was.",
    },
    {
      part: 'Content',
      description:
        "Portalled, meaning it's rendered in a separate layer of the page, outside its trigger. It enters with motion token M1, is capped at 260px (pixels) wide and has the cut bottom-right corner. It's a single object with its own fill and holds nothing that takes focus, so the cut doesn't need an unclipped wrapper. The trigger, not the panel, is what takes focus.",
    },
  ],
  props: [
    { name: 'content', type: 'string', description: 'Required. The extra text.' },
    { name: 'children', type: 'ReactElement', description: 'A single element that can take focus.' },
    {
      name: 'side',
      type: "'top' | 'right' | 'bottom' | 'left'",
      default: "'top'",
      description: 'Which side of the trigger the content opens on.',
    },
    { name: 'className', type: 'string', description: 'Merged with the content’s classes. Later Tailwind utilities (the small styling classes this system uses) win.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves focus to the trigger and shows the tooltip. Tabbing on to the next element hides it again." },
    { keys: ['Esc'], does: "Dismisses it without moving the pointer. That's required by SC 1.4.13, a success criterion (one numbered rule) in WCAG, the Web Content Accessibility Guidelines." },
  ],
  useWhen: 'Extra detail on hover or focus for an element that can take focus, such as an IconButton.',
  notFor: "The only label, or the only explanation of an error. Use the label prop or visible text.",
  dos: [
    'Use it for the extra detail, never the essential one.',
    "Put it on an element that can take focus. A tooltip on a <div> doesn't reach anyone using a keyboard.",
    'Keep it to one sentence.',
    "Pair it with an IconButton whose label already names the action. Then the tooltip adds detail instead of repeating the name.",
  ],
  donts: [
    "Don't put a tooltip on a disabled control. It can't take focus, so nobody can reach the tooltip.",
    "Don't put interactive content inside one. A tooltip is text only and never takes focus.",
    "Don't use it as the only label for an icon button. label does that job.",
    "Don't make it the only place an error is explained.",
  ],
}
