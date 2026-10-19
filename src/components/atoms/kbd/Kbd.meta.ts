import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Kbd',
  title: 'Kbd',
  tier: 'atoms',
  slug: 'kbd',
  summary:
    "A small keycap that shows a key's name. Making shortcuts easy to find was one of the motifs from the G1 mood board (the project's first approval step) worth keeping: if a surface has a shortcut, the surface says so.",
  anatomy: [
    { part: 'kbd element', description: 'The HTML element made for keys. Screen readers announce it as keyboard input.' },
    { part: 'Hairline border', description: 'A one-pixel border in border.hairline-strong, with no bevel (cut corners).' },
    { part: 'Mono legend', description: 'JetBrains Mono, uppercase, 11px (pixels): the tertiary type role.' },
  ],
  props: [
    { name: 'children', type: 'ReactNode', description: 'The key\'s name, for example "Esc" or "⌘".' },
    { name: 'className', type: 'string', description: "Merged with the component's classes. When Tailwind utility classes clash, the later one wins." },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Passed through to the kbd element.' },
    { name: '...rest', type: 'HTMLAttributes<HTMLElement>', description: 'Every native attribute, passed onto the kbd element, such as a title, or an aria-label for a symbol key (aria-label is the name screen readers read out).' },
  ],
  keyboard: [],
  useWhen: 'Showing a keyboard shortcut next to the action it triggers, with one Kbd per key.',
  notFor: "Anything that isn't a key, such as a status: use Badge.",
  dos: [
    'Use one Kbd per physical key, and put them side by side for a chord (keys pressed together).',
    'Put it next to the action it triggers, in the same row or the same tooltip.',
    'Write the key name the way the keyboard prints it.',
  ],
  donts: [
    'Don’t bevel it. Cut corners are for surfaces and controls, not 24px chrome.',
    'Don’t put a whole chord inside one Kbd ("Ctrl+K" in a single cap).',
    'Don’t use it for anything that isn’t a key. It’s not a badge.',
  ],
}
