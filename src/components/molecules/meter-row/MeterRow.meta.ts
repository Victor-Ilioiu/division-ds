import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'MeterRow',
  title: 'Meter row',
  tier: 'molecules',
  slug: 'meter-row',
  summary:
    'A ranked-list row: a label at the left, its value at the right in the data font, and a 2px bar under both showing the value against the list’s max. MeterBar is the bar on its own; MeterAxis puts tick labels under a list of rows.',
  anatomy: [
    { part: 'Label', description: 'Saira, 14px. Becomes a link or a button stretched over the row with href or onActivate.' },
    { part: 'Value', description: 'The formatted value in the data font (mono, tabular figures).' },
    { part: 'Bar', description: 'A 2px bar on the border.hairline track, in a category text colour (every one passes 3:1 in both themes). Hidden from screen readers: the value says it.' },
    { part: 'State', description: 'Brightness, never size: text.active, text.rest or text.pending.' },
  ],
  props: [
    { name: 'label', type: 'ReactNode', description: 'Required. The row’s name.' },
    { name: 'value', type: 'number', description: 'Required. The raw value the bar is drawn from.' },
    { name: 'max', type: 'number', description: 'Required. The value of a full bar: the largest in the list, or a fixed cap.' },
    { name: 'display', type: 'ReactNode', default: 'String(value)', description: 'The value as shown: "12.4K", "€1,200".' },
    { name: 'color', type: 'CategoryColor', default: "'gray'", description: 'The bar colour. Use about five categories at most in one view; never as an accent.' },
    { name: 'scale', type: "'linear' | 'log'", default: "'linear'", description: 'log for values that span orders of magnitude; pair it with a MeterAxis.' },
    { name: 'state', type: "'active' | 'rest' | 'pending'", default: "'rest'", description: 'Text brightness: active for the live row, pending for one not started.' },
    { name: 'href', type: 'string', description: 'Makes the row one link, named by the label.' },
    { name: 'renderLink', type: '(props: LinkRenderProps) => ReactNode', description: 'Renders the link, for a router. Defaults to a plain a element.' },
    { name: 'onActivate', type: '() => void', description: 'Makes the row one button, named by the label. Ignored when href is set.' },
    { name: 'className', type: 'string', description: "Merged with the component's classes (on MeterRow, MeterBar or MeterAxis)." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the row div.' },
    { name: 'ticks (MeterAxis)', type: 'number[]', default: 'powers of ten from 1K to max', description: 'The tick values under the rows.' },
  ],
  keyboard: [{ keys: ['Enter'], does: 'Follows the link or presses the button when the row has href or onActivate.' }],
  useWhen: 'A ranked list of values against one max, such as the busiest warehouses or spend per project.',
  notFor: 'A trend over time: use ChartPanel or Sparkline. Progress toward a goal: use Progress.',
  dos: ['Sort the rows by value.', 'Use one colour for one list unless the colours mean groups.', 'Use the log scale with a MeterAxis when the top value dwarfs the rest.'],
  donts: ['Don’t use signal orange for the bars: categories say "same group", the accent says "act here".', 'Don’t change the row size to show state; change its brightness.'],
}
