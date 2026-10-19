import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axeClean } from '../test/axe'
import { pairsForTheme } from '../../scripts/lib/contrast-pairs.mjs'
import { sourceFiles } from '../../scripts/lib/read-source-files.mjs'
import { DOCS_SECTIONS } from '../components/shell/Sidebar'
import { DEMO_PAGES } from '../demo/routes'
import { CRM_PAGES } from '../crm/routes'
import { CONSOLE_PAGES } from '../console/routes'
import { Overview, OVERVIEW_COUNTS } from './Overview'

/**
 * The Overview prints four numbers, one of them at roughly 200px, and PRODUCT.md's second
 * principle is "evidence over assertion: every count is counted from the repository". A literal in
 * a JSX file is not counted from anything, and the front door is the loudest possible place for a
 * figure to go stale, so each one is recomputed here from the thing it claims to describe.
 *
 * What this cannot check is the copy around the numbers. The "N token pairs" phrase is asserted
 * below against the live per-theme count (`contrastChecks / 2`), not a literal, so it never goes
 * stale the way a hand-typed number would; "every one of them checked with axe in both themes" is
 * asserted by e2e/guidelines.spec.ts existing and passing, not by anything here.
 */
function renderPage() {
  return render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>
  )
}

describe('every number the Overview prints', () => {
  it('counts the atoms from the atom folders', () => {
    // import.meta.glob rather than node:fs: tsconfig.app does not pull in the node types, and
    // Vite resolves this at transform time, so a deleted folder changes the count here with no
    // filesystem access at all.
    const folders = new Set(
      Object.keys(import.meta.glob('../components/atoms/*/*.tsx')).map(path => path.split('/')[3])
    )
    expect(OVERVIEW_COUNTS.atoms).toBe(folders.size)
  })

  it('counts the pages from the sidebar, which is what the docs e2e suites iterate', () => {
    expect(OVERVIEW_COUNTS.pages).toBe(DOCS_SECTIONS.length)
  })

  it('counts the molecules from the molecule folders', () => {
    const folders = new Set(
      Object.keys(import.meta.glob('../components/molecules/*/*.tsx')).map(path => path.split('/')[3])
    )
    expect(OVERVIEW_COUNTS.molecules).toBe(folders.size)
  })

  it('counts the organisms from the organism folders', () => {
    const folders = new Set(
      Object.keys(import.meta.glob('../components/organisms/*/*.tsx')).map(path => path.split('/')[3])
    )
    expect(OVERVIEW_COUNTS.organisms).toBe(folders.size)
  })

  it('counts the themes from the semantic token files', () => {
    const themes = Object.keys(import.meta.glob('../../tokens/semantic/color.*.json'))
    expect(OVERVIEW_COUNTS.themes).toBe(themes.length)
  })

  it('counts the demo pages from DEMO_PAGES, the one place a Hexline route is registered', () => {
    expect(OVERVIEW_COUNTS.demoPages).toBe(DEMO_PAGES.length)
  })

  it('counts the CRM pages from CRM_PAGES, the one place a Corvane route is registered', () => {
    expect(OVERVIEW_COUNTS.crmPages).toBe(CRM_PAGES.length)
    expect(OVERVIEW_COUNTS.consolePages).toBe(CONSOLE_PAGES.length)
  })

  it('counts the contrast checks from the gate pair list, not from a literal', () => {
    // The same function scripts/check-contrast.mjs runs. If a pair is added or removed, this
    // fails and the page is corrected, rather than the page quietly describing an older gate.
    const perTheme = pairsForTheme('tokens/semantic/color.dark.json').length
    const light = pairsForTheme('tokens/semantic/color.light.json').length
    expect(light, 'both themes must measure the same pair list').toBe(perTheme)
    expect(OVERVIEW_COUNTS.contrastChecks).toBe(perTheme * OVERVIEW_COUNTS.themes)
  })

  it('states the per-theme pair count as half the total', () => {
    renderPage()
    const perTheme = OVERVIEW_COUNTS.contrastChecks / OVERVIEW_COUNTS.themes
    expect(screen.getByText(new RegExp(`${perTheme} token pairs`))).toBeInTheDocument()
  })
})

describe('the Overview', () => {
  it('renders each count as a numeral whose dimmed pad is hidden from assistive tech', () => {
    const { container } = renderPage()
    const numerals = [...container.querySelectorAll('[data-numeral]')]
    expect(numerals.length, 'the hero plus one per gate row').toBe(1 + 6)
    for (const numeral of numerals) {
      // The pad is a column width, not a value: a screen reader must hear "18", never "zero one
      // eight", which is the same contract Progress's readout keeps for its own pad.
      const pad = numeral.querySelector('[aria-hidden="true"]')
      expect(pad?.textContent, 'the pad is zeros only').toMatch(/^0+$/)
      expect(numeral.textContent?.replace(/^0+/, '')).not.toBe('')
    }
  })

  it('gives the reader somewhere to go', () => {
    renderPage()
    // The page shipped for months with not one link on it. This is the assertion that says so.
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs.length).toBeGreaterThanOrEqual(10)
    expect(new Set(hrefs).size, 'the destinations are distinct pages, not one page ten times')
      .toBeGreaterThanOrEqual(7)
    expect(hrefs).toContain('/components/button')
    expect(hrefs).toContain('/guidelines/accessibility')
  })

  it('links to the Hexline demo store', () => {
    renderPage()
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/demo')
  })

  it('links to the Corvane CRM demo', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Open the Corvane CRM demo' })).toHaveAttribute('href', '/crm')
  })

  it('links to the Halden Console demo', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Open the Halden Console demo' })).toHaveAttribute('href', '/console')
  })

  it('uses the system it documents rather than hand-rolled boxes', () => {
    const { container } = renderPage()
    expect(container.querySelector('.panel.crosshair'), 'the real Panel, with its crosshair')
      .not.toBeNull()
    expect(container.querySelector('.bevel-focus-wrap'), 'real Buttons, which own their focus ring')
      .not.toBeNull()
    expect(screen.getByRole('switch')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('is axe clean', async () => {
    const { container } = renderPage()
    expect(await axeClean(container)).toHaveNoViolations()
  })
})

describe('source comments state rules, not their history', () => {
  // Extracted over the WHOLE file, not line by line: a per-line "starts with `//`, `*` or `/*`"
  // check misses a star-less continuation line inside a multi-line block comment (every CSS
  // comment is exactly this shape -- CSS has no `//` form) and misses a JSX comment
  // (`{/* ... */}`), whose `/*` sits after a brace the old check never recognised. A block comment
  // is `/\*[\s\S]*?\*\//` non-greedy to its first `*/`, which also covers a JSX comment's body
  // (the surrounding `{`/`}` are not part of the match and don't need to be). A line comment is
  // `//` to end of line, but ONLY at the start of a line or after whitespace -- `\bcontroller\b`
  // and `PENDING` are both plausible code identifiers (e.g. `const controller = new
  // AbortController()`), and a bare `//` also appears mid-token inside a URL (`https://…`, always
  // preceded by `:`) and inside an escaped regex literal (`\/\/`, always preceded by `\`); neither
  // is preceded by whitespace or a line start, so this pattern skips both without needing to name
  // them specifically.
  const commentPattern = /\/\*[\s\S]*?\*\/|(?:^|(?<=\s))\/\/.*/gm

  it('cite no task, ruling, fix round or review finding', () => {
    // A real filesystem read (scripts/lib/read-source-files.mjs), not import.meta.glob: Vitest's
    // default `test.css` handling hands back an empty string for every `.css` file regardless of a
    // `?raw` query, so a glob-based scan would see zero bytes of every CSS file's comments -- a
    // silent hole a passing test could never reveal.
    const files = sourceFiles(['src', 'scripts', 'e2e'], /\.(tsx?|css|m?js)$/).filter(
      ({ path }) => !path.endsWith('.test.tsx')
    )
    // A scan that silently starts matching nothing (a typo'd root, a moved directory) would make
    // this test vacuously pass -- it must actually be scanning a real, substantial slice of the
    // tree. That guard is structural (file count) and would not catch the CSS-specific hole above
    // on its own, so every .css entry is also asserted non-empty.
    expect(files.length, 'the scan must actually find files').toBeGreaterThan(50)
    const cssFiles = files.filter(({ path }) => path.endsWith('.css'))
    // Same shape of vacuous-pass risk as the file-count guard above, scoped to CSS specifically:
    // an empty cssFiles array would make the loop below assert nothing at all and still pass.
    expect(cssFiles.length, 'the scan must actually find .css files').toBeGreaterThan(0)
    for (const file of cssFiles) {
      expect(file.text.length, `${file.path} must be read as real content, not an empty stub`).toBeGreaterThan(0)
    }

    const history =
      /fix round|[Ff]inal review|finding [0-9]|\bR[0-9]{1,2}[a-z]\b|Task [0-9]+|\bcontroller\b|CONTROLLER|review caught|[Rr]eview found|PENDING|Milestone [ABC]\b|\bbrief\b|\bruling\b|\bI[0-9]\b/
    const hits = files.flatMap(({ path, text }) => {
      const found: string[] = []
      for (const match of text.matchAll(commentPattern)) {
        const index = match.index ?? 0
        const startLine = text.slice(0, index).split('\n').length
        match[0].split('\n').forEach((commentLine, offset) => {
          if (history.test(commentLine)) found.push(`${path}:${startLine + offset} ${commentLine.trim()}`)
        })
      }
      return found
    })
    expect(hits).toEqual([])
  })
})
