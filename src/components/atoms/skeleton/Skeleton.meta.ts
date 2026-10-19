import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Skeleton',
  title: 'Skeleton',
  tier: 'atoms',
  slug: 'skeleton',
  summary:
    'A loading placeholder shaped like the content it stands in for: lines of text, a cut-corner block, or an Avatar’s footprint. The shapes themselves are silent. SkeletonGroup is what tells people the region is loading.',
  pitfalls: [
    {
      wrong: '<div><Skeleton lines={3} /></div>',
      right: '<SkeletonGroup label="Loading orders"><Skeleton lines={3} /></SkeletonGroup>',
      why: 'Every shape is aria-hidden, an ARIA (Accessible Rich Internet Applications) attribute that hides it from assistive tech. So without the group, a screen reader, the software that reads the page aloud, hears nothing at all while the region loads.',
    },
  ],
  anatomy: [
    {
      part: 'Shape',
      description:
        'A border.hairline fill with a border.hairline-strong band sweeping across it every 1.6s. It’s see-through, so it reads on the page, a Card or an overlay. aria-hidden.',
    },
    { part: 'Text lines', description: '12px (pixel) bars, 8px apart, full width. When there are several, the last one is three fifths wide.' },
    { part: 'Block', description: 'Any rectangle, sized with className, with the 8px cut corner.' },
    { part: 'Avatar', description: 'An Avatar’s exact footprint: 24, 36 or 48px, with the corner cut at md and lg only.' },
    {
      part: 'SkeletonGroup',
      description: 'The container. It has aria-busy="true", which tells assistive tech the region is busy, and a visually hidden label that reads Loading… unless you name what’s loading.',
    },
  ],
  props: [
    { name: 'shape', type: "'text' | 'block' | 'avatar'", default: "'text'", description: 'What the placeholder stands in for.' },
    { name: 'lines', type: 'number', default: '1', description: 'Text only. The number of lines. Anything below 1 counts as 1.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Avatar only. Matches Avatar’s size prop.' },
    { name: 'className', type: 'string', description: 'Merged with the component classes. A block takes its width and height from here.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root element.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLDivElement>, 'children'>",
      description: 'Every native div prop except children, because a skeleton draws its own shapes.',
    },
    {
      name: 'label (SkeletonGroup)',
      type: 'string',
      default: "'Loading…'",
      description: 'The hidden words a screen reader hears instead of the shapes.',
    },
    { name: 'className (SkeletonGroup)', type: 'string', description: 'Lay the placeholders out here, the way the real content will be laid out.' },
    { name: 'ref (SkeletonGroup)', type: 'Ref<HTMLDivElement>', description: 'Passed through to the container.' },
    {
      name: '...rest (SkeletonGroup)',
      type: 'HTMLAttributes<HTMLDivElement>',
      description: 'Every native div prop.',
    },
  ],
  keyboard: [],
  useWhen: 'A region whose content is loading, shown as placeholders in its shape inside one SkeletonGroup.',
  notFor: 'A busy button: use Button loading. A wait under a few hundred milliseconds: show nothing.',
  dos: [
    'Wrap one region’s placeholders in one SkeletonGroup, and remove it when the content arrives.',
    'Name what’s loading in the group label: Loading orders, not just Loading.',
    'Match the layout of the real content, so nothing jumps when it replaces the placeholder.',
    'Use shape="avatar" with the size the real Avatar will have.',
  ],
  donts: [
    "Don't round a skeleton or draw a circle. The system has square corners, and Avatar is a square too.",
    "Don't put a skeleton on a busy button or control. A busy Button takes loading.",
    "Don't nest one SkeletonGroup inside another. One busy region gets one announcement.",
    "Don't show a skeleton for a wait under a few hundred milliseconds. The flash is worse than the wait.",
  ],
}
