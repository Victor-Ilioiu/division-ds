import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Spinner',
  title: 'Spinner',
  tier: 'atoms',
  slug: 'spinner',
  summary:
    "A busy indicator for an indeterminate wait, meaning one with no known end or percentage. It comes in two forms. The ring has a lit arc that grows and slides as it turns. The conveyor is a row of shaded blocks, for a wait that sits inside a line of text.",
  anatomy: [
    { part: 'span', description: "The root. It gets role=\"status\" only when it's labelled." },
    { part: 'Ring (ring)', description: "An SVG (Scalable Vector Graphics) track at 20% of currentColor, which is the surrounding text colour, plus an arc in currentColor. That's accent.signal.indicator by default." },
    { part: 'Blocks (conveyor)', description: "Three block glyphs, from full to half shade, running over a ten-cell track in border.control." },
    { part: 'sr-only label', description: "The text a screen reader announces. sr-only means it's hidden on screen but still read aloud. It's only there when label is passed." },
  ],
  props: [
    { name: 'variant', type: "'ring' | 'conveyor'", default: "'ring'", description: 'The rotating ring, or the block conveyor.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Ring: a 14px, 20px or 24px (pixel) box. Conveyor: 12px, 14px or 16px glyphs.' },
    {
      name: 'label',
      type: 'string',
      description: "Status text that's hidden on screen. Passing it makes the spinner a live region, an area whose changes screen readers announce on their own.",
    },
    { name: 'className', type: 'string', description: "Merged with the component's classes. Later Tailwind utilities (the small styling classes this system uses) win." },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Forwarded to the span element.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLSpanElement>, 'role'>",
      description:
        "Every native span prop except role, spread onto the span. role is removed from the type instead of being quietly overridden at runtime. Here's why: label is the only source of role=\"status\", and a role in rest would silence the live region a caller asked for when they passed label.",
    },
  ],
  keyboard: [],
  useWhen: 'A short wait with no known end, inside a control or a line of text.',
  notFor: "Progress with a known amount (use Progress), or a wait for a whole page (use Skeleton or LoadingAnimation).",
  dos: [
    "Pass label whenever the spinner is the only sign that something's happening.",
    "Leave it decorative inside a control that already announces aria-busy, like Button. aria-busy is an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers a part of the page is still loading.",
    "Name what's loading, not the fact of loading: ‘Loading field kits’, not ‘Loading’.",
  ],
  donts: [
    "Don't use it for progress with a known amount. That's Progress.",
    "Don't rely on the rotation alone. It stops when someone has turned on reduced motion in their system settings, so the label carries the meaning.",
    "Don't scale it past lg. A page-level wait needs a skeleton, not a bigger spinner.",
    "Don't bevel it. It's the one round shape in the system. A cut corner on something that rotates would travel around the edge instead of marking one spot.",
  ],
}
