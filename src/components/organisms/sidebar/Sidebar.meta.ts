import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Sidebar',
  title: 'Sidebar',
  tier: 'organisms',
  slug: 'sidebar',
  summary:
    'The navigation down the side of an app. It holds groups of pages, each page with an icon and an optional count. Groups can fold away, and there is room for a header and an account line.',
  anatomy: [
    {
      part: 'nav',
      description: 'The navigation region. Screen readers call it by the label prop.',
    },
    {
      part: 'Group title',
      description:
        "A disclosure button (one that shows and hides the list) when the group can fold, plain text when it can't. It's text.secondary, so it still reads on a raised panel. Its list opens and closes by animating its height. Opening also fades and slides each item in, each one a little later than the one before (capped, so a long group never feels slow). Closing fades everything out together, all at once. If someone has asked their system for less motion (prefers-reduced-motion: reduce), both happen instantly.",
    },
    {
      part: 'Item',
      description:
        'An icon, a label and an optional count. The current page gets the fill, plus aria-current, an ARIA attribute (Accessible Rich Internet Applications, the labels screen readers rely on) that tells screen readers this is the page you are on.',
    },
    { part: 'Header', description: 'Sits above the groups: a product name, a workspace switcher.' },
    { part: 'Footer', description: 'Pinned below the groups: the signed-in account, a help link.' },
  ],
  props: [
    {
      name: 'label',
      type: 'string',
      description: 'Required. The name screen readers give the navigation region.',
    },
    {
      name: 'groups',
      type: 'SidebarGroup[]',
      description: 'Required. Each group has title, icon, items, collapsible and defaultOpen.',
    },
    { name: 'header', type: 'ReactNode', description: 'Sits above the groups: a product name, a workspace switcher.' },
    {
      name: 'footer',
      type: 'ReactNode',
      description:
        'Pinned below the groups when the Sidebar has a height (h-full in a column layout): the signed-in account, a help link.',
    },
    {
      name: 'renderLink',
      type: '(props: LinkRenderProps) => ReactNode',
      default: 'a plain anchor',
      description:
        "Pass your router's link component here. Map href to its own prop, and pass className, aria-current and onClick through.",
    },
    {
      name: 'className',
      type: 'string',
      description: 'Added to the root classes. Where two Tailwind utility classes clash, the later one wins.',
    },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'The nav element.' },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: 'Moves through each group title that can fold, then each visible item.',
    },
    { keys: ['Enter'], does: 'Follows an item, or folds and unfolds a group.' },
    { keys: ['Space'], does: 'Folds and unfolds a group.' },
  ],
  useWhen: 'App navigation down the side: grouped pages with icons and counts.',
  notFor: 'A site header with a few links: use Navbar.',
  dos: [
    'Only show counts for things that need attention: open orders, not total products.',
    'Keep the group that holds the current page open.',
    'On a narrow screen, put the whole sidebar in a Sheet behind a button.',
  ],
  donts: [
    "Don't nest groups inside groups.",
    "Don't show a count of zero. Leave it off.",
    "Don't rely on icons alone. Every item keeps its label.",
  ],
}
