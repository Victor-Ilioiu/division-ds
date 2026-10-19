import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Sparkline',
  title: 'Sparkline',
  tier: 'atoms',
  slug: 'sparkline',
  summary:
    "A small trend line with no axes. It sits beside a Stat or in a table cell. It's plain SVG (Scalable Vector Graphics, the web's format for drawn shapes): one image named by a sentence, with an optional safe band behind it and a square on the last value.",
  useWhen: "You want the shape of a recent series, not its values. Think of a reading over the last hour.",
  notFor: "Values people need to read, compare or hover over. Use ChartPanel for those.",
  anatomy: [
    { part: 'Frame', description: "An inline box. It's 96 x 24 by default, or the container's width with className=\"w-full\"." },
    { part: 'Image', description: "An svg with role=\"img\", named by label. Screen readers (software that reads the page aloud) don't get the points one by one." },
    { part: 'Band', description: "Optional. A hairline-filled range behind the line, such as a safe range." },
    { part: 'Line', description: "1.5px (pixels) in the tone colour. The stroke doesn't get thicker when the frame stretches." },
    { part: 'Last value', description: "An optional 6px square on the newest point. It's aria-hidden, a setting that hides it from screen readers." },
  ],
  props: [
    { name: 'values', type: 'readonly number[]', description: "Required. Oldest first. Non-finite values (such as NaN or Infinity) are dropped." },
    {
      name: 'label',
      type: 'string',
      description: 'Required. The chart as one sentence: "Temperature, last hour: 3.1 to 4.2 °C, rising".',
    },
    {
      name: 'tone',
      type: "'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'",
      default: "'neutral'",
      description: "The line's colour. Each tone means what it means on Badge.",
    },
    { name: 'min', type: 'number', description: "A fixed bottom for the scale. Without it, the scale follows the data (and the band)." },
    { name: 'max', type: 'number', description: "A fixed top for the scale. Without it, the scale follows the data (and the band)." },
    { name: 'band', type: '{ from: number; to: number }', description: 'A range drawn behind the line.' },
    { name: 'showLast', type: 'boolean', default: 'false', description: 'Puts a square on the last value.' },
    { name: 'width', type: 'number', default: '96', description: 'In CSS px, the pixel unit of Cascading Style Sheets. className="w-full" overrides it.' },
    { name: 'height', type: 'number', default: '24', description: 'In CSS px.' },
    { name: 'className', type: 'string', description: 'Goes on the frame.' },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Forwarded to the frame.' },
  ],
  keyboard: [],
  dos: [
    "Write the label as the reading a person takes from the shape: the range and the direction.",
    "Fix min and max when several sparklines sit side by side and have to share a scale.",
    "Put the current value beside it in text. The line shows the trend, not the number.",
    "Use a tone for what the trend means (hostile for out of range), and say it in text too.",
  ],
  donts: [
    "Don't use a sparkline where someone has to read values off it. That's a job for ChartPanel.",
    "Don't leave the label as a title like \"Temperature\". It's the only thing a screen reader hears.",
    "Don't colour every sparkline on a page. Neutral is the default for a reason.",
  ],
}
