import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Avatar',
  title: 'Avatar',
  tier: 'atoms',
  slug: 'avatar',
  summary:
    "A small square that shows who someone is. The name is required, because it's both the alt text (the description screen readers read for an image) and the source of the initials. Without one, an avatar is just an image nobody can identify.",
  anatomy: [
    { part: 'Root', description: 'A border.hairline-strong edge on the sunken surface, with overflow clipped and a cut bottom-right corner at md and lg.' },
    { part: 'Image', description: "alt is empty on purpose, because the hidden name already does the announcing." },
    {
      part: 'Fallback',
      description: "Initials worked out from the name, aria-hidden, shown when there's no image or it fails to load. aria-hidden is an ARIA attribute (Accessible Rich Internet Applications, the labels that tell screen readers what things are) that hides something from screen readers.",
    },
    {
      part: 'Hidden name',
      description: 'sr-only (visible to screen readers only) and always there, so the announcement is the same either way. With a status it reads "Ilse Varga, online".',
    },
    {
      part: 'Status dot',
      description:
        "Optional. A square in the top-right corner (the bottom-right is the cut), in accent.ok.text, accent.warning.text, accent.hostile.text or text.muted, with a 2px (pixel) surface.base keyline around it. It's aria-hidden because the status is announced in the name.",
    },
  ],
  props: [
    { name: 'name', type: 'string', description: 'Required. The source of the fallback initials and the announced name.' },
    { name: 'src', type: 'string', description: "Optional image. If it can't load, the fallback takes its place without the layout jumping." },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: '24 / 36 / 48px.' },
    {
      name: 'status',
      type: "'online' | 'away' | 'busy' | 'offline'",
      description: "Whether the person is around. It adds the dot and adds the word to the announced name. Leave it out when you don't know.",
    },
    { name: 'className', type: 'string', description: "Merged with the component's classes. When Tailwind utility classes clash, the later one wins." },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Passed through to the root element.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label' | 'children'>",
      description:
        "Every native span prop except aria-label and children. aria-label is removed from the types rather than quietly overwritten when the page runs. The announced name comes from the sr-only span, and an aria-label on the root would override it. children is removed because the component renders its own image/fallback/sr-only children, so anything passed as children would silently disappear.",
    },
  ],
  keyboard: [],
  useWhen: 'Showing who a person is, next to their name, as in a roster row, a comment or an account menu.',
  notFor: 'Several people in one spot: use AvatarGroup.',
  dos: [
    'Pass the full name, not the initials. The component works those out itself.',
    "Let it fall back. The fallback is part of the design, not an error state.",
    'Use sm inside dense rows and tables.',
    "Set status only where presence is live and matters (a roster, a chat). A dot that's out of date is worse than no dot.",
  ],
  donts: [
    "Don't round it. The system has no round corners, and an avatar isn't the place to start.",
    "Don't add the cut corner to the sm avatar. It's 24px, the same size Kbd leaves out by name. An 8px cut takes a third of that edge, and it looks like a broken square instead of a shaped one.",
    "Don't build an overlapping stack by hand. AvatarGroup does it, with a '+N' that's real text.",
    "Don't explain the dot colours only in a legend. The status word is already in the name, so show it as text where sighted users need it too.",
    "Don't use an avatar as the only label for a person. Put the name next to it in dense UI (user interface).",
    "Don't pass aria-label. It's removed from the types so nothing can override it, and name already decides the one label that gets announced.",
  ],
}
