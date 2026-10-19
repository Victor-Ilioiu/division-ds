import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Badge',
  title: 'Badge',
  tier: 'atoms',
  slug: 'badge',
  summary:
    "A small chip that shows a status. It comes in six tones and two emphases, and it always carries a word. A colour on its own isn't a status anyone can read.",
  anatomy: [
    {
      part: 'Chip',
      description:
        "Set in mono (a fixed-width typeface), uppercase. That's the tertiary type role. By default it's 22px tall with 11px text (px means pixels); at size md it's 32px tall with 14px text.",
    },
    {
      part: 'Icon',
      description:
        "Optional, and placed before the text. It's aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications, that hides it from screen readers) and uses the current text colour. It's 12px, or 14px at size md.",
    },
    {
      part: 'Dot',
      description: "An optional square, also aria-hidden, in the current text colour. It's 6px, or 8px at size md.",
    },
    { part: 'Label', description: "Required. The word is what makes the badge accessible." },
  ],
  props: [
    {
      name: 'tone',
      type: "'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'",
      default: "'neutral'",
      description: 'The status the badge shows.',
    },
    {
      name: 'emphasis',
      type: "'solid' | 'subtle'",
      default: "'subtle'",
      description:
        "Solid uses the invariant fill (the same in light and dark themes) with its matching ink. Subtle is the outline badge: a 1px border and text in the tone’s theme-adaptive text token, with no fill. There's no separate outline emphasis, because it would be this same look under a second name.",
    },
    {
      name: 'size',
      type: "'sm' | 'md'",
      default: "'sm'",
      description:
        "sm (small) is the chip for everyday interface: rows, cards, tables. md (medium) takes the small control height (32px) and the 14px text step. Use it for a badge next to display-size type, like a price.",
    },
    { name: 'dot', type: 'boolean', default: 'false', description: 'Adds a marker next to the text.' },
    {
      name: 'icon',
      type: 'ReactNode',
      description:
        "An icon before the text, hidden from screen readers with aria-hidden and sized to the badge. It takes the badge’s colour, so the same contrast pair that covers the text covers it too. It adds to the word. It never replaces it.",
    },
    {
      name: 'className',
      type: 'string',
      description:
        'Merged with the component classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with).',
    },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Passed through to the span element.' },
    {
      name: '...rest',
      type: 'HTMLAttributes<HTMLSpanElement>',
      description:
        'Any other span attribute. For example, aria-hidden on a count that a label next to it already reads out.',
    },
  ],
  keyboard: [],
  useWhen: 'You need to label a status with a word and a tone, like an order state or a sync result.',
  notFor: 'A filter or selection someone can remove. Use Tag for that.',
  dos: [
    'Give every badge a word.',
    'Go easy on solid. One solid badge in a row reads as the exception. Six read as noise.',
    "Keep the tone mapping the same across the product. ok is never ‘in progress’ on one screen and ‘done’ on another.",
    'Use size md when the badge sits next to a headline figure, so the two read as one statement.',
  ],
  donts: [
    "Don't build a badge that's colour only, even with a tooltip.",
    "Don't put a badge inside a button. It muddies what the clickable target is.",
    "Don't use hostile for something that's only pending.",
    "Don't bevel it (give it a cut corner). At 22px a badge is chrome, the frame around content, not an object with its own footprint. Kbd follows the same rule for the same reason.",
    "Don't resize a badge with height or text classes. The two sizes are the prop. A third size is a change to the system.",
    "Don't use size md in a table row or on a card. It's as tall as a small button, so it starts to look like one.",
    "Don't give one badge both an icon and a dot. Pick one marker. Two say the same thing twice.",
    "Don't colour the icon yourself. It inherits the badge’s tone, and that's the pair the contrast gate (the automated colour-contrast check) measures.",
  ],
}
