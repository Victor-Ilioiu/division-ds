import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Alert',
  title: 'Alert',
  tier: 'molecules',
  slug: 'alert',
  summary:
    "A message that sits in the page. It shows its tone three ways, as an icon, a word and a colour, so it still reads on a greyscale screen and through a screen reader.",
  anatomy: [
    {
      part: 'Container',
      description: "A raised surface with a 1px (one pixel) border in the tone's text colour on all four sides. There's no stripe down one side.",
    },
    { part: 'Icon', description: 'Shows the tone without relying on colour. Marked aria-hidden, so screen readers skip it.' },
    { part: 'Tone word', description: "'Warning:' before the title. It's hidden on screen and read out by screen readers." },
    { part: 'Title', description: 'Required.' },
    { part: 'Body', description: 'In secondary text, not in the tone colour.' },
    { part: 'Action', description: 'Optional, usually a small Button.' },
    { part: 'Dismiss', description: 'Optional. A ghost IconButton (an icon-only button with no fill).' },
    {
      part: 'Compact layout',
      description: "One line: a 16px icon, then the title and body as one sentence, then the action and dismiss button. Long text wraps onto a new line instead of being cut off.",
    },
  ],
  props: [
    { name: 'tone', type: "'info' | 'ok' | 'warning' | 'hostile'", default: "'info'", description: 'Which colour, icon and word the alert carries.' },
    { name: 'title', type: 'string', description: 'Required. Screen readers hear the tone word in front of it.' },
    { name: 'children', type: 'ReactNode', description: 'The body text.' },
    {
      name: 'live',
      type: 'boolean',
      default: 'false',
      description: "Only for an alert added after the page has loaded. It sets the role screen readers use to announce it: hostile and warning get role=alert (announced at once), info and ok get role=status (announced politely).",
    },
    { name: 'onDismiss', type: '() => void', description: "Adds the dismiss button. It runs once the alert has faded and its height has collapsed (M7), not on the click itself, so remove the alert from the page here. With reduced motion it runs straight away." },
    { name: 'dismissLabel', type: 'string', default: "'Dismiss'", description: 'The name screen readers give the dismiss button.' },
    { name: 'action', type: 'ReactNode', description: 'For example, a small Button.' },
    {
      name: 'compact',
      type: 'boolean',
      default: 'false',
      description: "One line, for a toolbar, table header or card. The body sits inside the title paragraph, so pass plain inline text, not blocks.",
    },
    { name: 'className', type: 'string', description: 'Merged onto the root.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root DOM element.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'role'>",
      description: "You can't set role yourself: live decides it.",
    },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Reaches the action, then the dismiss button. The alert itself isn't a stop." },
  ],
  useWhen: 'A message that sits in the page and stays there: a warning about this screen, or a failed load with a retry.',
  notFor: 'Something that will go away on its own: use Toast.',
  dos: [
    'Start the title with what happened, and the body with what to do.',
    'Use live only when the alert appears in response to something the person did.',
    "Name the dismiss button for what it closes when there's more than one alert on a page.",
    'Use compact where a full alert would push the content it describes out of view, and keep the body to a short phrase.',
    "After dismiss, move keyboard focus to the next sensible control. The alert's own dismiss button disappears with it, and focus would otherwise drop back to the top of the page.",
  ],
  donts: [
    "Don't use an alert for something that will go away on its own. That's a Toast.",
    "Don't colour the body text in the tone.",
    "Don't put paragraphs or lists inside a compact alert. It's one line of text.",
    "Don't stack more than two alerts. The second one is usually detail for the first.",
  ],
}
