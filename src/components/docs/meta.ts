/** The one description of a component. Its docs page renders it, and `scripts/build-agent-docs.mjs`
 *  generates the markdown page, the bundles behind `llms.txt` and the JSON manifest from it, so a
 *  person and an agent read the same contract. `meta.test.ts` holds `props` against the
 *  component's real TypeScript props, which is what keeps a hand-written table from going stale.
 *
 *  Types only, and no imports: the generator loads `*.meta.ts` files in plain Node. */

export type PropRow = { name: string; type: string; default?: string; description: string }
export type KeyRow = { keys: string[]; does: string }
export type AnatomyRow = { part: string; description: string }

/** A mistake as code: what gets written, what should be, and the reason in one sentence. */
export type Pitfall = { wrong: string; right: string; why: string }

export type Tier = 'atoms' | 'molecules' | 'organisms'

export type ComponentMeta = {
  /** The component's export name, and the stem of its files: `IconButton`. */
  name: string
  /** The docs page's heading: `Icon button`. */
  title: string
  tier: Tier
  /** The folder name, and the last segment of the docs URL: `icon-button`. */
  slug: string
  summary: string
  /** Best for: one sentence naming the job this component is the answer to. The generator puts it
   *  at the top of the markdown page and on the component's line in `llms.txt`, so an agent can
   *  choose between components from the index, before it opens a page. */
  useWhen: string
  /** Not for: one sentence naming the nearest wrong use, and the component to use instead where
   *  there is one ("Several values: use MultiSelect."). */
  notFor: string
  /** What the page around it must supply: a provider at the root, a wrapper, a landmark. */
  requires?: string[]
  pitfalls?: Pitfall[]
  anatomy: AnatomyRow[]
  props: PropRow[]
  keyboard: KeyRow[]
  dos: string[]
  donts: string[]
}
