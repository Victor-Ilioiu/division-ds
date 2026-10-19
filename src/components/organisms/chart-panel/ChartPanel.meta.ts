import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ChartPanel',
  title: 'Chart panel',
  tier: 'organisms',
  slug: 'chart-panel',
  summary:
    'One chart in a card. A sentence says what it shows, and the same numbers sit in a table. The data below is sample data.',
  anatomy: [
    { part: 'Title', description: "The panel's heading. It's also the accessible name, the name a screen reader announces for the panel." },
    { part: 'Summary', description: "One sentence that works as the chart's caption: what a reader should take away." },
    { part: 'Legend', description: "Names both series when there are two. With one series, the title names it. A donut lists every slice with its value and share." },
    { part: 'Headline', description: 'Optional. The figure the chart is about, printed large under the title.' },
    { part: 'Chart', description: "A line, bar, donut or radar chart, with a tooltip that follows the pointer. It's hidden from assistive tech (screen readers and similar tools), which get the table instead." },
    { part: 'Centre total', description: 'Donut only. The sum of the slices, with centerLabel under it.' },
    { part: 'Shaded ranges', description: 'Optional, line and bar only. A quiet wash behind the chart for each band, listed under it with its label and range.' },
    { part: 'Show as table', description: "A button that opens and closes a DataTable with the same rows. It uses aria-expanded, an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers whether it's open." },
  ],
  props: [
    { name: 'title', type: 'string', description: "Required. The panel's heading and its name." },
    { name: 'summary', type: 'string', description: "Required. One sentence, the chart's caption." },
    {
      name: 'kind',
      type: "'line' | 'bar' | 'donut' | 'radar'",
      description:
        'Required. Line for change over time. Bar to compare categories. Donut for parts of one whole (one series, a slice per row). Radar for several measures of one or two things (an axis per row).',
    },
    { name: 'data', type: 'Row[]', description: 'Required. One object per category.' },
    { name: 'xKey', type: 'keyof Row', description: "Required. The category. Its values must be unique." },
    { name: 'xLabel', type: 'string', description: "Required. The header of the table's first column." },
    {
      name: 'series',
      type: '[ChartSeries] | [ChartSeries, ChartSeries]',
      description:
        "Required. One or two series, coloured chart.series-1 then chart.series-2. Passing a third is a type error, and so is a ChartSeries.key that isn't one of Row's own numeric columns.",
    },
    { name: 'area', type: 'boolean', default: 'false', description: 'Line only. Fills under each line with a gradient of its colour that fades to nothing.' },
    { name: 'curve', type: "'linear' | 'smooth'", default: "'linear'", description: "Line only. smooth draws a monotone curve, so it never overshoots a data point." },
    { name: 'grid', type: 'boolean', default: 'true', description: "The dashed horizontal grid (on a radar, its web). false also drops the axis lines but keeps the tick labels." },
    { name: 'size', type: "'md' | 'sm'", default: "'md'", description: "sm is the stat-card size: a short sparkline with no axes or grid, and the caption under it. Pair it with headline." },
    { name: 'headline', type: 'string', description: 'A formatted figure printed large under the title.' },
    { name: 'centerLabel', type: 'string', description: 'Donut only. The caption under the total in the centre of the ring.' },
    { name: 'formatValue', type: '(value: number) => string', default: "Intl.NumberFormat('en-IE')", description: "Formats numbers in the tooltip and the table. It formats the y-axis too, unless you give formatAxisValue." },
    {
      name: 'formatAxisValue',
      type: '(value: number) => string',
      default: 'formatValue',
      description: "Formats only the y-axis tick labels. Use a shorter, compact formatter when formatValue's output is too wide for the axis. SpendChart's compact euro formatter is one example.",
    },
    {
      name: 'axisWidth',
      type: 'number',
      default: '48',
      description: "The width the y-axis reserves, in px (pixels). 48 is Recharts' own YAxis default. Make it bigger if formatAxisValue's labels still get cut off.",
    },
    {
      name: 'bands',
      type: '{ from: string | number; to: string | number; label?: string }[]',
      default: '[]',
      description:
        "Line and bar only. Shades stretches of the x-axis, such as night hours on a 24-hour chart. from and to are x-axis values (values of xKey), both included. When from comes after to in the data, the band wraps past the end: 22:00 to 06:00 shades 22:00 to the last point and the first point to 06:00. A band naming a value that isn't in the data is skipped. Every band is listed under the chart with its label, so screen readers hear it too.",
    },
    { name: 'headingLevel', type: '2 | 3 | 4', default: '3', description: "Pick the level that fits the page's heading outline." },
    { name: 'className', type: 'string', description: "Merged with the Card classes. Later Tailwind utilities win." },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Points at the section element.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: "Skips the chart, which isn't a tab stop (a place the Tab key lands), and goes to Show as table." },
    { keys: ['Enter', 'Space'], does: 'On Show as table, shows or hides the table.' },
  ],
  useWhen: 'One chart (a line over time, bars by category, a donut of one whole, or a radar of several measures) with a summary sentence and the numbers as a table.',
  notFor: 'One number and its change: use Stat. One score from 0 to 100: use ScoreRing. Two measures on two scales: use two panels.',
  dos: [
    "Write the summary as the finding. Don't just describe the axes.",
    'Use a line for change over time and bars to compare categories.',
    'Keep to two series. Give a third its own panel.',
    "In print or greyscale, you can rely on the second line series being dashed. It doesn't depend on colour alone.",
    'Use size sm with a headline for a stat card. The caption and the table stay.',
    'Use bands for context such as night hours or a sale, and give each one a label.',
    "Past six slices, fold a donut's smallest slices into one Other row.",
  ],
  donts: [
    "Don't give a chart two y-axes. Two measures means two panels.",
    "Don't colour a series with a status colour. Those colours mean state.",
    "Don't put a number on every point. The table has them all.",
    "Don't use a donut to compare categories over time. That's a job for a line or bars.",
  ],
}
