import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'PageHeader',
  title: 'Page header',
  tier: 'molecules',
  slug: 'page-header',
  summary:
    'The top of a screen. It holds the page’s one h1 (the main, level-1 heading), and can add an eyebrow, a description, a breadcrumb trail and the page’s own actions at the far edge.',
  pitfalls: [
    {
      wrong: '<PageHeader level={2} title="Orders" />',
      right: '<PageHeader title="Orders" />',
      why: 'The examples on this page pass level={2} only because they sit inside this docs page, which has its own h1. A screen’s own header is its h1, so leave level out.',
    },
    {
      wrong: '<PageHeader title="Inventory" />\n<PageHeader title="Low stock" />',
      right: '<PageHeader title="Inventory" />\n<SectionHeading level={2} title="Low stock" />',
      why: 'A page has one h1. Every heading under it is a SectionHeading, at the level the page’s outline of headings needs.',
    },
    {
      wrong: '<PageHeader title="Inventory" breadcrumbs={[{ label: "Operations" }]} />',
      right:
        '<PageHeader title="Inventory" breadcrumbs={<Breadcrumbs items={[{ label: "Operations", href: "/ops" }, { label: "Inventory" }]} />} />',
      why: 'breadcrumbs is a slot, not an array. Pass a Breadcrumbs element, which keeps its own renderLink and maxItems.',
    },
  ],
  anatomy: [
    {
      part: 'Breadcrumbs',
      description: 'Optional. A Breadcrumbs trail above everything else, first in reading order.',
    },
    {
      part: 'Eyebrow',
      description:
        'Optional. A small label: JetBrains Mono, 12px (pixels), semibold, uppercase, in text.muted. It\'s a paragraph above the h1 and isn\'t part of the heading\'s name.',
    },
    {
      part: 'Title',
      description:
        'The page’s h1. Oxanium, semibold, 24px, growing to 30px when the header gets 48rem or more of width (a rem is the base text size, usually 16px).',
    },
    { part: 'Description', description: 'Optional. 16px body text in text.secondary, with lines no longer than 64 characters.' },
    {
      part: 'Actions',
      description:
        'Optional. The page’s own controls at the far edge, in a row with a 12px gap. The row drops under the title when it runs out of room.',
    },
  ],
  props: [
    { name: 'title', type: 'string', description: 'Required. The page’s name, shown as its h1.' },
    {
      name: 'eyebrow',
      type: 'ReactNode',
      description: 'A short label above the title: the area the page belongs to.',
    },
    { name: 'description', type: 'ReactNode', description: 'One or two sentences under the title.' },
    {
      name: 'actions',
      type: 'ReactNode',
      description: 'The page’s own actions, usually one or two Buttons. The component lays out the row and its gap.',
    },
    { name: 'breadcrumbs', type: 'ReactNode', description: 'A Breadcrumbs element, drawn above the eyebrow.' },
    {
      name: 'id',
      type: 'string',
      description: 'Goes on the h1, not the wrapper, so main can point aria-labelledby at it. That ARIA (Accessible Rich Internet Applications) attribute lets the main area take its name from the heading.',
    },
    {
      name: 'level',
      type: '1 | 2',
      default: '1',
      description: 'Use 2 only for a page-style header inside a page that already has its h1 (a pane, a tab panel). It looks the same either way.',
    },
    { name: 'className', type: 'string', description: 'Extra CSS classes, merged onto the outer element. When two Tailwind classes clash, the later one wins.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the outer element.' },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: 'Moves through the breadcrumb links, then the actions. The header itself never takes keyboard focus.',
    },
  ],
  useWhen: 'The top of every screen: its one h1, with eyebrow, description, breadcrumbs and page actions.',
  notFor: 'A section inside a page: use SectionHeading.',
  dos: [
    'Use one per screen, at the top, inside main.',
    'Keep the eyebrow to the area’s name (“Operations”), and the title to the page’s.',
    'Put the page’s primary action last in the actions row, so it lands at the far edge.',
    'When the page has more than one landmark (a named region screen readers can jump to), give the h1 an id and use it to name main.',
  ],
  donts: [
    'Don’t use it for a section inside a page. That’s a SectionHeading.',
    'Don’t put the page’s filters or tabs in the actions slot. They belong to the content under it.',
    'Don’t repeat the title in the eyebrow. The eyebrow names where the page sits, and the title names the page.',
    'Don’t add a second h1 inside the description or the actions.',
  ],
}
