import { beforeAll, describe, expect, it } from 'vitest'
import {
  checkPropsTable,
  componentFolders,
  createProgram,
  exportsOfFolder,
  publicExports,
  REPO_ROOT,
  TIERS,
} from '../../../scripts/lib/component-props.mjs'
import { DOCS_PAGES } from '../../docsPages'
import { NAV } from '../shell/Sidebar'
import type { ComponentMeta } from './meta'

/**
 * Holds every component's metadata against the repository, so the description an agent reads
 * cannot drift from the code it describes:
 *
 * - the props table against the component's real TypeScript props, both ways: a row for a prop
 *   that does not exist fails, and a prop declared in this repository with no row fails;
 * - name, tier and slug against the folder the file is in;
 * - the page against the sidebar and the route list.
 *
 * The first run of this test, on tables that had been hand-kept for three weeks, found fifteen
 * disagreements in five components (QuantityStepper's four FormField props, ErrorSummary's
 * whole table, Toast's options listed as if they were Toaster props, two trigger refs).
 */

// No node:fs or node:path here: tsconfig.app does not pull in the Node types (see Overview.test).
const root = REPO_ROOT
const basename = (file: string) => file.split(/[\\/]/).pop()!
const folders = componentFolders(root)
const metas = import.meta.glob<{ meta: ComponentMeta }>('../{atoms,molecules,organisms}/*/*.meta.ts', { eager: true })
const metaOf = (file: string) =>
  Object.entries(metas).find(([key]) => key.endsWith(`/${basename(file)}`))![1].meta

describe('component metadata', () => {
  it('exists once in every component folder', () => {
    expect(folders.filter(folder => !folder.metaFile).map(folder => folder.slug)).toEqual([])
    expect(Object.keys(metas)).toHaveLength(folders.length)
  })

  it.each(folders.map(folder => [folder.slug, folder] as const))('%s names the folder it is in', (_slug, folder) => {
    const meta = metaOf(folder.metaFile!)
    expect({ tier: meta.tier, slug: meta.slug }).toEqual({ tier: folder.tier, slug: folder.slug })
    expect(basename(folder.metaFile!)).toBe(`${meta.name}.meta.ts`)
  })

  it.each(folders.map(folder => [folder.slug, folder] as const))('%s is in the sidebar and routed', (_slug, folder) => {
    const group = NAV.find(candidate => candidate.title.toLowerCase() === folder.tier)
    expect(group?.items.map(item => item.to)).toContain(`/components/${folder.slug}`)
    expect(DOCS_PAGES.map(page => page.path)).toContain(`/components/${folder.slug}`)
  })

  // Best for / not for head the markdown page and the component's line in llms.txt: an empty one
  // there is an index line that cannot help an agent choose. One sentence each, so a full stop.
  it.each(folders.map(folder => [folder.slug, folder] as const))('%s says what it is for and not for', (_slug, folder) => {
    const meta = metaOf(folder.metaFile!)
    for (const field of ['useWhen', 'notFor'] as const) {
      expect(meta[field]?.trim(), `${meta.name}.${field}`).toMatch(/\S.*\.$/)
    }
  })
})

describe('props tables against the real props', () => {
  let program: ReturnType<typeof createProgram>
  const barrels = Object.fromEntries(TIERS.map(tier => [tier, publicExports(root, tier)]))

  beforeAll(() => {
    program = createProgram(root)
  }, 120_000)

  it.each(folders.map(folder => [folder.slug, folder] as const))('%s', (_slug, folder) => {
    const publicNames = barrels[folder.tier][folder.slug]?.values ?? []
    expect(publicNames.length).toBeGreaterThan(0)
    const problems = checkPropsTable(metaOf(folder.metaFile!), exportsOfFolder(program, root, folder.sourceFiles), publicNames)
    expect(problems).toEqual([])
  })
})
