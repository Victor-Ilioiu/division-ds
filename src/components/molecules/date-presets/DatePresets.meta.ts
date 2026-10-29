import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'DatePresets',
  title: 'Date presets',
  tier: 'molecules',
  slug: 'date-presets',
  summary:
    "Named periods such as Last 7 days, one click each. The defaults: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, This year, or your own. An add-on: put it in a DateRangePicker's aside and it reads and sets the picker's range by itself, then closes it. On its own it is a list you give a value and an onSelect. Installs DateRangePicker and DatePicker with it.",
  anatomy: [
    { part: 'List', description: 'A group named "Presets". Each period is a button; the one matching the current range is pressed (aria-pressed) and filled.' },
  ],
  props: [
    { name: 'presets', type: 'DatePreset[]', default: 'defaultPresets()', description: "Each { label, range }. Make your own, or start from defaultPresets(today)." },
    { name: 'value', type: '{ start: string; end: string }', description: 'The current range. Inside a DateRangePicker it comes from the picker.' },
    { name: 'onSelect', type: '(range: DateRange) => void', description: 'A preset was chosen. Inside a DateRangePicker the picker also takes it and closes.' },
    { name: 'label', type: 'string', default: "'Presets'", description: "The list's accessible name." },
    { name: 'className', type: 'string', description: "Combined with the list's classes." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'The list element.' },
    { name: 'defaultPresets()', type: '(today?: string) => DatePreset[]', description: "The seven usual periods counted back from today ('YYYY-MM-DD'; defaults to the reader's today). Every one includes today." },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves through the presets.' },
    { keys: ['Enter', 'Space'], does: 'Chooses the focused preset.' },
  ],
  useWhen: 'Reports and logs, where people want the usual periods.',
  notFor: 'Exact dates: DateRangePicker alone.',
  dos: ['Keep the list short, seven or fewer.', 'Name periods the way your users say them: "This quarter" if they plan in quarters.'],
  donts: ["Don't offer a preset nobody can pick, such as a future period when max is today."],
}
