import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ScoreRing',
  title: 'Score ring',
  tier: 'atoms',
  slug: 'score-ring',
  summary:
    'One 0 to 100 score shown as a ring with the number in its centre, split into bands the way Lighthouse (Google’s website audit tool) bands its scores. It’s a meter, so a screen reader, the software that reads the page aloud, hears both the score and its band.',
  anatomy: [
    { part: 'Ring', description: 'A hairline track plus an arc as long as the score, with square (butt) ends.' },
    { part: 'Arc colour', description: 'Set by band: hostile below 50, warning from 50 to 89, ok from 90. Colour is never the only signal, because the number is always printed.' },
    { part: 'Ticks', description: 'Three marks outside the ring at 0, 50 and 90. They mark the start and the two band boundaries.' },
    { part: 'Number', description: 'The score in display figures, centred in the ring.' },
    { part: 'Label', description: 'Mono (a monospaced font), uppercase, under the ring. It’s also the meter’s accessible name, the name assistive tech announces for it.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'Required. What’s being scored. It’s both the accessible name and the caption.' },
    { name: 'value', type: 'number', description: 'Required. 0 to 100, clamped and rounded to a whole number.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'The ring is 56, 96 or 128px (pixels) wide.' },
    { name: 'className', type: 'string', description: 'Merged with the meter’s classes. Later Tailwind utilities (Tailwind is the CSS framework the system uses) win.' },
    { name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Points to the meter.' },
    {
      name: '...rest',
      type: "Omit<HTMLAttributes<HTMLDivElement>, 'children'>",
      description: 'Every native div prop except children, spread onto the meter. The ring draws its own content.',
    },
    { name: 'scoreBand()', type: "(value: number) => 'hostile' | 'warning' | 'ok'", description: 'The banding the ring uses. It’s exported so a table or a sentence beside the ring agrees with it.' },
  ],
  keyboard: [],
  useWhen: 'A 0 to 100 score with good and bad bands, like an audit, a health check or a quality score. Several side by side read as one report.',
  notFor: 'Progress through a task: use Progress. A number with a change over time: use Stat. Parts of a whole: use a donut ChartPanel.',
  dos: [
    'Put several rings in a row for one report, like Lighthouse’s four scores.',
    'Name what’s being scored in a word or two.',
    'State the weakest score in the sentence beside the rings.',
  ],
  donts: [
    "Don't use it for a value that isn't out of 100. Rescale it first, or use Stat.",
    "Don't colour the number. The arc carries the band, and the number stays text.primary.",
  ],
}
