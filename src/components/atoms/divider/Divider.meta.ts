import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Divider',
  title: 'Divider',
  tier: 'atoms',
  slug: 'divider',
  summary:
    "A thin line, with an optional legend (a short text label). When it's only decoration, screen readers skip it. When it marks where a section starts, it's a real separator they announce.",
  anatomy: [
    { part: 'Rule', description: '1px (one pixel) in border.hairline.' },
    { part: 'Legend', description: 'JetBrains Mono, 10px, muted. Optional.' },
    { part: 'role', description: 'none when decorative, separator when labelled. role tells screen readers what an element is.' },
  ],
  props: [
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Which way the line runs.' },
    { name: 'label', type: 'string', description: "Adds a legend and makes the divider more than decoration." },
    { name: 'className', type: 'string', description: "Merged with the component's classes. When Tailwind utility classes clash, the later one wins." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root element.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'>",
      description:
        "Every native div prop except role and children. role is removed from the types rather than quietly overwritten when the page runs, because label already decides whether the divider is decorative or structural. children is removed because it behaved two different ways: with no label it rendered inside a decorative separator, and with one it disappeared.",
    },
  ],
  keyboard: [],
  useWhen: 'A thin line between groups of content, labelled when it starts a new section.',
  notFor: 'Making space (use the spacing scale), or going between items that already have their own borders.',
  dos: [
    "Leave it decorative when it's only there for visual rhythm.",
    'Label it when it really starts a new section, so screen readers announce the structure.',
    'Add anim-draw-on when a section animates in. The line drawing itself is motion token M2.',
  ],
  donts: [
    "Don't stack dividers to make space. That's what the spacing scale is for.",
    "Don't label every divider. If everything is a landmark, nothing is.",
    "Don't use a vertical divider between items that already have their own borders.",
    "Don't pass role. It's removed from the types so nothing can override it, and label already decides none vs separator.",
  ],
}
