import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'SegmentedMeter',
  title: 'Segmented meter',
  tier: 'atoms',
  slug: 'segmented-meter',
  summary:
    'A row of small squares for a count out of a small total: filled, empty, or struck through for a step that does not apply. It reads at a glance where a bar would need a number beside it.',
  anatomy: [
    { part: 'Meter', description: 'A div with role="meter", named by label, with its value spoken as valueText.' },
    { part: 'Filled squares', description: 'Painted in the tone: accent.signal.fill, or a category fill.' },
    { part: 'Empty squares', description: 'A one-pixel text.muted outline, which passes the 3:1 graphic floor on every surface.' },
    { part: 'Struck squares', description: 'An empty square with a diagonal line: a step that does not apply.' },
  ],
  props: [
    { name: 'value', type: 'number', description: 'Required. How many squares are filled. Clamped to 0 to max.' },
    { name: 'max', type: 'number', description: 'Required. How many squares there are. Keep it to about 12; past that, use Progress.' },
    { name: 'none', type: 'number', default: '0', description: 'Squares after the filled ones that are struck through, for steps that do not apply.' },
    { name: 'tone', type: "'signal' | CategoryColor", default: "'signal'", description: 'The fill. signal is the accent; the rest are the category fills.' },
    { name: 'label', type: 'string', description: 'Required. The accessible name, for example "Checks passed".' },
    { name: 'valueText', type: 'string', description: 'What a screen reader says for the value. Defaults to "{value} of {max}".' },
    { name: 'className', type: 'string', description: "Merged with the component's classes." },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Passed through to the meter div.' },
    { name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'Every native attribute, passed onto the meter div.' },
  ],
  keyboard: [],
  useWhen: 'Showing a small count out of a small total, such as 3 of 5 checks passed, where each unit matters.',
  notFor: 'A percentage or a large total: use Progress.',
  dos: [
    'Put the number in words nearby, or in valueText, so the meter is never the only place the value lives.',
    'Use signal for the one meter on a screen that asks for action; a category fill otherwise.',
  ],
  donts: [
    'Don’t use more than about 12 squares: they stop being countable.',
    'Don’t use struck squares for failed steps. They mean "does not apply"; a failure is a status with a word.',
  ],
}
