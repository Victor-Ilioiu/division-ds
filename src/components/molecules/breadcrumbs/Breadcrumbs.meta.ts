import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Breadcrumbs',
  title: 'Breadcrumbs',
  tier: 'molecules',
  slug: 'breadcrumbs',
  summary:
    "Shows where this page sits among the pages above it. The last level is the current page, shown as text. Every level above it is a link.",
  anatomy: [
    { part: 'nav', description: "A navigation landmark (a region screen readers can jump to) named 'Breadcrumb'." },
    { part: 'ol', description: 'An ordered list, because the order is the information.' },
    { part: 'Level', description: 'A quiet Link.' },
    {
      part: 'Current page',
      description: "Text with aria-current=page, which tells screen readers it's the page you're on. Never a link to itself.",
    },
    { part: 'Separator', description: 'A slash in monospaced type, marked aria-hidden so screen readers skip it.' },
    {
      part: 'Gap',
      description:
        "An ellipsis (…) when the middle levels are collapsed, read out as 'more levels' by screen readers. It isn't a button.",
    },
  ],
  props: [
    {
      name: 'items',
      type: 'Crumb[]',
      description: '{ label, href? }. A level with no href shows as plain text.',
    },
    { name: 'maxItems', type: 'number', description: 'Collapse the trail when it has more levels than this. It never goes below 3.' },
    { name: 'label', type: 'string', default: "'Breadcrumb'", description: 'The name of the nav landmark.' },
    { name: 'className', type: 'string', description: 'Merged onto the nav.' },
    {
      name: 'renderLink',
      type: '(props: LinkRenderProps) => ReactNode',
      default: 'a plain anchor',
      description: "How each linked level is drawn. Pass your router's link component to move between pages inside the app.",
    },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Passed through to the nav DOM element.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Moves through the linked levels in order. The current page isn't a stop." },
  ],
  useWhen: 'Showing where a page sits in a hierarchy more than one level deep.',
  notFor: 'Steps in a sequence: use Stepper.',
  dos: [
    "Start from the top of the hierarchy, not from the home page, when the site has one obvious root.",
    "Use the page's own heading text as its crumb.",
    'Collapse long trails on narrow layouts with maxItems.',
  ],
  donts: [
    "Don't use breadcrumbs for a sequence of steps. That's Stepper.",
    "Don't make the current page a link.",
    "Don't put a breadcrumb trail on a page that's only one level deep.",
  ],
}
