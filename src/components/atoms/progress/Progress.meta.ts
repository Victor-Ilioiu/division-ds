import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Progress',
  title: 'Progress',
  tier: 'atoms',
  slug: 'progress',
  summary:
    "A progress bar that's either determinate (it knows how far along the task is) or indeterminate (it doesn't). The readout is real text in the DOM (the Document Object Model, the live page structure the browser builds) from the very first render. That's motion token M3's rule, and it means a screen reader, the software that reads the page aloud for blind and low-vision people, never hears a number roll.",
  anatomy: [
    { part: 'Label', description: 'Required. Set in mono (a monospaced font, where every character is the same width) and uppercase. It’s also the bar’s accessible name, the name assistive tech such as a screen reader announces for it.' },
    { part: 'Readout', description: 'Optional, and the star of the row: 24px (pixels) Oxanium against an 11px label. It uses tabular figures, digits that all take the same width, so the number doesn’t jitter as it changes.' },
    { part: 'Leading zeros', description: 'These are padding, not part of the value. They’re dimmed to numeral.pad and marked aria-hidden (an ARIA attribute, from Accessible Rich Internet Applications, that hides an element from assistive tech). So the readout keeps a fixed three-digit width, while a screen reader still hears 40%, not zero four zero percent.' },
    { part: 'Track', description: '6px tall, a sunken surface, no border. It’s the same track as Slider.' },
    { part: 'Indicator', description: 'It’s moved rather than resized. That way the browser animates a transform, which is cheap, instead of recalculating the layout.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. The bar’s accessible name.' },
    { name: 'value', type: 'number | null', description: 'null means indeterminate. The value is clamped to [0, max], so an out-of-range value shows as complete instead of overflowing the track.' },
    { name: 'max', type: 'number', default: '100', description: 'The value at which the bar is complete.' },
    { name: 'showValue', type: 'boolean', default: 'false', description: 'Shows the percentage (or "In progress") as a readout.' },
    { name: 'tone', type: "'signal' | 'ok' | 'warning' | 'hostile'", default: "'signal'", description: 'The fill colour. signal paints accent.signal.indicator to match Slider. On the track in light theme that’s a 2.80:1 contrast ratio, below the 3:1 a bar needs when it’s the only sign of progress. So set showValue there.' },
    { name: 'className', type: 'string', description: 'Merged with the outer wrapper’s classes. Later Tailwind utilities (Tailwind is the CSS framework the system is styled with) win.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the Radix Progress root, which is the bar itself. Radix is the library of accessible building blocks this component sits on.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLDivElement>, 'children'>",
      description:
        'Every native div prop except children, spread onto the outer wrapper, so a molecule can attach a data-testid there. children is typed away because this component draws its own label row and track, and a children prop would be thrown away without any warning.',
    },
  ],
  keyboard: [],
  useWhen: 'Showing how far a measurable task has got. Switch to indeterminate once you no longer know how much is left.',
  notFor: 'A wait with no measurable work. Use Spinner.',
  dos: [
    'Name what’s progressing, not the act of progressing.',
    'Use showValue whenever the number itself is useful to the reader.',
    'Switch to null the moment you stop knowing how much is left. Don’t freeze at 90%.',
  ],
  donts: [
    "Don't animate the number up from zero and call that animated value the readout. The real value belongs in the DOM straight away.",
    "Don't use Progress for a wait with no measurable work. That's a Spinner.",
    "Don't put the padded readout into the accessible name. That's exactly why the pad is a separate aria-hidden span, and label is what Radix announces.",
    "Don't rely on the tone alone to say something failed. Say it in text.",
  ],
}
