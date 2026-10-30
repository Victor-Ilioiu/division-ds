import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Panel',
  title: 'Panel',
  tier: 'atoms',
  slug: 'panel',
  summary:
    "The system's framed surface: a thin border around a fill, with the crosshair corner marks and the cut corner as options. Card is a Panel with a title, body and footer; Panel is the frame alone, for a feature tile, a demo frame or a tile that is one link.",
  pitfalls: [
    {
      wrong: `<Panel className="bg-[var(--color-surface-base)] border-[var(--color-border-selection)]">`,
      right: `<Panel tone="base">`,
      why: "The panel's fill and border come from its tone, through CSS that sits outside Tailwind's layers, so a bg- or border- class never wins. Pick the tone.",
    },
    {
      wrong: `<Panel interactive onClick={open}>Replicas</Panel>`,
      right: `<Panel interactive asChild><Link to="/replicas">Replicas</Link></Panel>`,
      why: 'A div with a click handler cannot be reached by keyboard and is not announced as a link. interactive styles a panel that already is a link or a button; asChild makes it one.',
    },
  ],
  anatomy: [
    { part: 'Frame', description: 'A div (or, with asChild, your element) with the .panel class: a one-pixel border and a fill, both set by the tone.' },
    { part: 'Tone', description: 'base: surface.base fill, border.hairline border. raised: surface.raised fill, border.hairline border. signal: accent.signal.wash fill, border.selection border. All tokens, so each one is right in both themes.' },
    { part: 'Crosshair', description: 'Optional. Short marks drawn 5px outside each corner, in text.muted. The parent must not clip its overflow.' },
    { part: 'Cut corner', description: 'Optional. The bottom-right corner cut at 45 degrees (14px), with the border drawn along the cut, so the outline does not break at that corner. With the crosshair on, the bottom-right marks fall inside the cut and are not drawn.' },
    { part: 'Interactive state', description: 'Optional. On hover and on keyboard focus the border, diagonal included, turns accent.signal.indicator; keyboard focus also draws the focus ring 2px outside. Nothing moves.' },
  ],
  props: [
    { name: 'padding', type: "'none' | 'sm' | 'md' | 'lg'", default: "'md'", description: 'Inner spacing: 0, 12px, 20px or 32px.' },
    { name: 'tone', type: "'base' | 'raised' | 'signal'", default: "'raised'", description: 'base sits flush with the page, raised is one step up, signal is the brand wash for the one panel in a group that leads.' },
    { name: 'crosshair', type: 'boolean', default: 'false', description: 'Draws the crosshair marks at the corners.' },
    { name: 'cut', type: 'boolean', default: 'false', description: 'Cuts the bottom-right corner, with the border following the cut.' },
    { name: 'interactive', type: 'boolean', default: 'false', description: 'Hover and focus states for a panel that is one link or button. Use it with asChild; it adds no behaviour of its own.' },
    { name: 'asChild', type: 'boolean', default: 'false', description: 'Renders the single child element (an a, a router Link, a button) with the panel classes merged onto it, instead of a div.' },
    { name: 'className', type: 'string', description: "Merged with the component's classes. Use it for layout (a grid span, flex, gap), not for the fill or the border." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the div, or to the child with asChild.' },
    { name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'Every native attribute, passed onto the element.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'With interactive and asChild on a link or button: moves focus to the panel and shows the focus ring.' },
    { keys: ['Enter'], does: 'Follows the link, or presses the button, that the panel was rendered as.' },
  ],
  useWhen: 'Framing content that has no title, body and footer structure: a feature tile, a demo area, or a tile that is one link.',
  notFor: 'Content with a title, a body and actions: use Card. A page-width layout wrapper: use a plain div with max-w-*.',
  dos: [
    'Use signal on at most one panel in a group: the one that leads.',
    'Give a clickable panel interactive and asChild, with a real link or button as the child.',
    'Leave 8px around a panel with the crosshair, so a parent that clips does not cut the marks off.',
  ],
  donts: [
    'Don’t put a button near the bottom-right corner of a cut panel; the cut can clip it.',
    'Don’t set a fill or border colour with a class. Choose a tone.',
    'Don’t put a second link or button inside an interactive panel.',
  ],
}
