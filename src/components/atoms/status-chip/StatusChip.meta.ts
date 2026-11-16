import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'StatusChip',
  title: 'Status chip',
  tier: 'atoms',
  slug: 'status-chip',
  summary:
    'A small filled tag with one short uppercase word in the data font, beside a row or a value: NEW, CAP, TREND. It is a solid Badge with a fixed size and type, so it adds no colour of its own.',
  anatomy: [
    { part: 'Badge', description: 'A solid Badge at size sm, 18px tall. Every fill and ink pair is the Badge’s gated one.' },
    { part: 'Word', description: 'JetBrains Mono, 11px, uppercase, semibold.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. One short word.' },
    { name: 'tone', type: "'neutral' | 'signal' | 'ok' | 'warning' | 'hostile' | 'info'", default: "'neutral'", description: 'A Badge status tone. neutral by default; signal only for the one thing to act on.' },
    { name: 'className', type: 'string', description: "Merged with the component's classes." },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Passed through to the Badge.' },
    { name: '...rest', type: 'HTMLAttributes<HTMLSpanElement>', description: 'Every native attribute, except the Badge props it fixes (size, emphasis, dot, icon, color, severity).' },
  ],
  keyboard: [],
  useWhen: 'Tagging a row or a value with one short state word in a dense panel, such as NEW beside a list row.',
  notFor: 'A status that needs a sentence or an icon: use Badge.',
  dos: ['Keep it to one word of up to about six letters.', 'Use the tone for meaning (ok, warning, hostile), not for decoration.'],
  donts: ['Don’t put more than one signal chip on a screen.', 'Don’t make it the only place a status lives in a column people sort or filter by.'],
}
