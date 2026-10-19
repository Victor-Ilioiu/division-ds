import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'LoadingAnimation',
  title: 'Loading animation',
  tier: 'atoms',
  slug: 'loading-animation',
  summary:
    "A loading state that fills a whole panel, drawn as an animated instrument dial in WebGL (the browser's graphics engine for drawing with the graphics card). The three dials follow the same rules. They draw themselves from the outside in, and their structure drifts. One mechanism clicks to its next detent using the system's snap easing (the motion where things arrive a little large and settle), and the signal accent colour only appears on the part that shows progress.",
  anatomy: [
    {
      part: 'div',
      description:
        "The root: a square box at the size you pick. It gets role=\"status\", which makes screen readers announce it, only when it has a label.",
    },
    {
      part: 'Stage',
      description:
        "A layer that holds the WebGL canvas, hidden from screen readers with aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications). It fades in once the first frame is drawn.",
    },
    {
      part: 'Dial',
      description:
        'Rings, tick crowns and arcs in text.primary, text.secondary, border.control and border.hairline.strong. One moving part is in accent.signal.fill.',
    },
    {
      part: 'Fallback',
      description:
        "If WebGL isn't available, the Conveyor spinner shows in the same box. It's aria-hidden, so the label is still read only once.",
    },
    {
      part: 'sr-only label',
      description: "The text screen readers announce (sr-only means it's for screen readers only). It's only there when you pass label.",
    },
  ],
  props: [
    {
      name: 'variant',
      type: "'aperture' | 'gyro' | 'reticle'",
      default: "'aperture'",
      description:
        'Aperture: shaded blades stepping round a spinning core. Gyro: nested rings turning against each other. Reticle: a progress ring filling up from a marker at 12 o’clock.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      description: "A 96px, 160px or 240px square (px means pixels). It shrinks with its container below that size, but never grows.",
    },
    {
      name: 'label',
      type: 'string',
      description:
        'Status text that is hidden on screen. Passing it turns the loader into a live region, an area screen readers announce when it changes.',
    },
    {
      name: 'className',
      type: 'string',
      description:
        'Merged with the component classes. If two clash, the later Tailwind utility wins (Tailwind is the CSS framework this system styles with).',
    },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the root div.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLDivElement>, 'role'>",
      description:
        'Every native div prop except role, for the same reason as Spinner: label is the only thing that sets role="status".',
    },
  ],
  keyboard: [],
  useWhen: 'A wait that takes over a whole panel or page, like a route loading, a report building or a first sync.',
  notFor: "A wait inside a button or a line of text: use Spinner. A wait with a known end: use Progress.",
  dos: [
    'Use it for a wait that takes over a panel or a page, like a route loading, a report building or a first sync.',
    'Pass label, and say what is loading: ‘Loading field kits’, not ‘Loading’.',
    "Pick one dial for each product surface and stick with it. The three are a family. They aren't meant to rotate.",
  ],
  donts: [
    "Don't put it in a button or a line of text. That's Spinner, which doesn't use up a WebGL context.",
    "Don't show more than a handful at once. Each one uses a WebGL context (one slot of the browser's graphics engine), and browsers cap how many you get.",
    "Don't rely on the motion. When someone has reduced motion turned on, it shows one still frame, so the label has to carry the meaning.",
    "Don't use it for a wait with a known end. That's Progress.",
  ],
}
