import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'AvatarGroup',
  title: 'Avatar group',
  tier: 'molecules',
  slug: 'avatar-group',
  summary:
    'Overlapping avatars (small profile pictures) with a “+N” for the rest. It’s a list named by its count, so a screen reader hears “6 members” and then each person. The people behind the “+N” are named in words, never only counted.',
  pitfalls: [
    {
      wrong: '<div className="flex -space-x-2">{people.map(p => <Avatar name={p.name} />)}</div>',
      right: '<AvatarGroup people={people} label="Alpha squad" />',
      why: 'A hand-built stack has no count, no thin outline between the faces, and no words for the people a +N leaves out.',
    },
  ],
  requires: [
    'With overflowTooltip, the root <TooltipProvider>. AppShell and the demo layout each include one.',
  ],
  anatomy: [
    { part: 'List', description: 'A ul (a bulleted list element) named “<label>, N members”, or just “N members” when there’s no label.' },
    {
      part: 'Item',
      description:
        'One Avatar in a 2px (two pixel) frame in surface.base, cut to the same corner. Each one slides a quarter of its width under the one before.',
    },
    {
      part: '+N chip',
      description:
        'Shaped like an avatar, in monospaced text in text.secondary. The “+2” is aria-hidden (screen readers skip it), and hidden text reading “and 2 more: …” names the people it stands for.',
    },
    {
      part: 'Tooltip',
      description: 'Optional. Shows the hidden names on hover and on keyboard focus. The chip then becomes a Tab stop, with its focus ring drawn on an outer box that isn’t clipped.',
    },
  ],
  props: [
    { name: 'people', type: 'AvatarGroupPerson[]', description: 'Required. Everyone in the group, in the order shown.' },
    { name: 'max', type: 'number', default: '4', description: 'The most avatars drawn. The rest go into the +N chip.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Passed to every Avatar and to the chip.' },
    {
      name: 'label',
      type: 'string',
      description: 'What the group is. The count is added on the end: “Alpha squad, 6 members”.',
    },
    {
      name: 'overflowTooltip',
      type: 'boolean',
      default: 'false',
      description: 'Shows the hidden names in a Tooltip on the chip and lets the chip take keyboard focus.',
    },
    { name: 'className', type: 'string', description: 'Merged with the list classes. Later Tailwind utility classes win.' },
    { name: 'ref', type: 'Ref<HTMLUListElement>', description: 'Passed through to the list.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLUListElement>, 'children' | 'aria-label'>",
      description: 'Every standard ul prop except children (the people are the content) and aria-label (label builds it, with the count).',
    },
    { name: 'name (AvatarGroupPerson)', type: 'string', description: 'Required. Passed to Avatar.' },
    { name: 'src (AvatarGroupPerson)', type: 'string', description: 'Optional image, passed to Avatar.' },
    {
      name: 'status (AvatarGroupPerson)',
      type: "'online' | 'away' | 'busy' | 'offline'",
      description: 'Optional presence (whether they’re online), passed to Avatar, which includes it in the name screen readers hear.',
    },
  ],
  keyboard: [
    {
      keys: ['Tab'],
      does: 'With overflowTooltip, focuses the +N chip and opens the tooltip. Otherwise nothing in the group can take focus.',
    },
  ],
  useWhen: 'Several people in one place, with a count: a squad, the people on an order, who’s viewing.',
  notFor: 'Picking people: use MultiSelect.',
  dos: [
    'Give it a label that says who the people are: a squad, the people on an order, who’s viewing.',
    'Keep max at four or fewer in dense rows. The chip covers the rest.',
    'Put the full list somewhere people can reach (a dialog, a roster page) when they need to act on it.',
  ],
  donts: [
    "Don't use it as a control. To pick people, use MultiSelect. To open the list, put a Button next to it.",
    "Don't set overflowTooltip on every row of a long table, because each chip becomes a Tab stop.",
    "Don't pass aria-label. The label plus the count is the name.",
  ],
}
