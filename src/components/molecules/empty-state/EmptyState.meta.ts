import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'EmptyState',
  title: 'Empty state',
  tier: 'molecules',
  slug: 'empty-state',
  summary:
    'What a list, a table or a page region shows when it has nothing in it: an icon, a title that names what is empty, a sentence on why, and the action that fills it.',
  pitfalls: [
    {
      wrong: '<EmptyState title="No orders yet" />',
      right: '<EmptyState level={2} title="No orders yet" />',
      why: 'The level is required, because only the page knows what the empty region is: a whole page (an h2, a level-2 heading, under the h1), a section (h3) or a card (h4).',
    },
    {
      wrong: '<Card><EmptyState level={3} title="No notes" /></Card>',
      right: '<Card><EmptyState level={3} size="sm" framed={false} title="No notes" /></Card>',
      why: 'The card already draws an edge, so a dashed frame inside it makes a second one. And the md (medium) padding is sized for a page region.',
    },
  ],
  anatomy: [
    {
      part: 'Frame',
      description:
        'A dashed edge in border.hairline-strong. It\'s the one border in the system that reads as an empty slot instead of a surface. Optional, through framed.',
    },
    {
      part: 'Icon tile',
      description:
        'Optional. A square on surface.sunken with a thin edge, holding a lucide icon in text.secondary. Screen readers skip it (aria-hidden), because the title already says what the icon would.',
    },
    {
      part: 'Title',
      description: 'A heading element, h2 to h4. Oxanium, semibold, 18px (pixels) at md size and 16px at sm (small), in text.primary.',
    },
    { part: 'Description', description: 'Optional. 14px body text in text.secondary, with lines no longer than 48 characters.' },
    {
      part: 'Actions',
      description: 'Optional. One or two Buttons, centred, in a row that wraps onto a new line with a 12px gap.',
    },
  ],
  props: [
    { name: 'title', type: 'string', description: 'Required. What is empty, said plainly: “No orders yet”.' },
    {
      name: 'level',
      type: '2 | 3 | 4',
      description: 'Required, with no default. The heading level the page\'s outline of headings needs at this point.',
    },
    { name: 'description', type: 'ReactNode', description: 'One or two sentences: why it\'s empty, or what fills it.' },
    {
      name: 'icon',
      type: 'ReactNode',
      description: 'A lucide icon element. The component sizes it and wraps it in a tile that screen readers skip (aria-hidden).',
    },
    { name: 'actions', type: 'ReactNode', description: 'One or two Buttons. The component lays out the row and its gap.' },
    {
      name: 'size',
      type: "'sm' | 'md'",
      default: "'md'",
      description: 'md for a page region. sm inside a table, a card or a panel.',
    },
    {
      name: 'framed',
      type: 'boolean',
      default: 'true',
      description: 'The dashed frame. Turn it off where the container already draws an edge.',
    },
    { name: 'className', type: 'string', description: 'Extra CSS classes, merged onto the outer element. When two Tailwind classes clash, the later one wins.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the outer element.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
      description:
        'Any other div attribute, put on the outer element. role="status" goes here when nothing else on the page tells screen readers that the list has emptied.',
    },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: 'Moves through the actions, if there are any. The empty state itself never takes keyboard focus.',
    },
  ],
  useWhen: 'A list, table or region with nothing in it, along with the action that fills it.',
  notFor: 'A list that\'s still loading: use Skeleton or Spinner. A failed load: use Alert in the hostile tone.',
  dos: [
    'Name what is empty in the title (“No orders yet”), not the state (“Empty”).',
    'Say in the description what fills it, or why a filter emptied it.',
    'Offer the action that fixes it: “Clear filters” after a filter, “Browse replicas” on an empty wishlist.',
    'Use size="sm" and framed={false} inside a table, a card or a panel.',
  ],
  donts: [
    'Don’t use it for a list that’s still loading. Nothing has been found yet, so show a spinner or a skeleton.',
    'Don’t use it for an error. A failed load is an Alert in the hostile tone, with a retry.',
    'Don’t put more than two actions in it. A third belongs on the page, not in the empty region.',
    'Don’t add role="status" when a count on the page already announces the change. A screen reader user would hear it twice.',
  ],
}
