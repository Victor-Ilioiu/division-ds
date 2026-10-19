import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Tabs',
  title: 'Tabs',
  tier: 'molecules',
  slug: 'tabs',
  summary:
    'Sections of one view, with only one visible at a time. The active tab is filled with the signal colour, the same way every other selection in the system is.',
  anatomy: [
    { part: 'Tabs', description: 'The root. Holds which tab is active, whether the page controls that or the component does.' },
    {
      part: 'TabsList',
      description:
        'The tablist, the row of tabs. It needs an aria-label (a name read out by screen readers). On a narrow screen it scrolls sideways inside itself.',
    },
    {
      part: 'TabsTrigger',
      description:
        'A single tab. Fill variant: the active tab is the signal fill with ink-coloured text, and hovering adds a 12% signal tint. Line variant: the active tab is primary text over a 2px (pixel) signal bar, which moves to the inline end (the side text runs towards) when the tabs are vertical.',
    },
    { part: 'Icon', description: 'Optional, before the label. aria-hidden, so screen readers skip it.' },
    { part: 'Count', description: 'Optional, after the label. You see it as a number, and screen readers read it as part of the name: Open (12).' },
    {
      part: 'TabsContent',
      description:
        'A tabpanel, the area a tab shows. It\'s labelled by its tab and can take focus, so a keyboard user can reach panels that hold only text.',
    },
  ],
  props: [
    { name: 'value (Root)', type: 'string', description: 'The active tab, when the page controls it.' },
    {
      name: 'variant',
      type: "'fill' | 'line'",
      default: "'fill'",
      description: "How the active tab is shown (Root). 'line' underlines it, for a row inside a panel that already has lots of fills.",
    },
    { name: 'defaultValue', type: 'string', description: 'The tab that starts active, when the component manages it (Root).' },
    {
      name: 'onValueChange',
      type: '(value: string) => void',
      description: 'Called when the active tab changes (Root).',
    },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      default: "'horizontal'",
      description: 'Which arrow keys move between tabs (Root). Vertical also puts the list beside the panels.',
    },
    {
      name: 'activationMode',
      type: "'automatic' | 'manual'",
      default: "'automatic'",
      description:
        "'manual' waits for Enter or Space before switching, for panels that are slow to draw (Root).",
    },
    { name: 'value (Trigger)', type: 'string', description: "This tab's own value." },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Turns off one tab (Trigger).' },
    { name: 'icon (Trigger)', type: 'ReactNode', description: 'A small symbol before the label, hidden from screen readers (aria-hidden).' },
    { name: 'count (Trigger)', type: 'number', description: 'A number after the label, included in the name screen readers announce.' },
    {
      name: 'className',
      type: 'string',
      description: 'Merged with the root classes. If two Tailwind utilities clash, the later one wins. Available on every part.',
    },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Passed through to the underlying page element. Available on every part.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves into the tab row, onto the active tab. Pressing Tab again moves into the panel.' },
    { keys: ['ArrowLeft', 'ArrowRight'], does: 'Previous or next tab. It wraps round at the ends and skips turned-off tabs.' },
    { keys: ['ArrowUp', 'ArrowDown'], does: 'The same, when orientation is vertical.' },
    { keys: ['Home', 'End'], does: 'First or last tab.' },
  ],
  useWhen: 'Switching between equally important sections of one view.',
  notFor: 'Steps in a sequence: use Stepper. Moving between pages: use links (Navbar, Sidebar).',
  dos: [
    'Keep tab labels to one or two words.',
    'Use tabs for equals: sections a person would move between freely.',
    'Give the tab row an aria-label that names the whole set.',
    'Use the line variant inside a card or settings panel, and the fill variant at the top of a view.',
    'Use a count for something a person would act on, like open orders or unread reports.',
  ],
  donts: [
    "Don't use tabs for steps in a sequence. That's what Stepper is for.",
    "Don't put a second row of tabs inside a panel.",
    "Don't mix fill and line tabs on one page.",
    "Don't give every tab an icon just because one has one. Icons go on all of them or none.",
    "Don't use tabs to move between pages. A tab changes what's shown, not where you are.",
  ],
}
