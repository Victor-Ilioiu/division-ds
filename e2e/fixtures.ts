import { test as base, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

export { expect }

/** The web fonts load from Google. On a machine without network each font request logs one
 *  console error that says nothing about this app, so those, and only those, are not counted. */
const EXTERNAL_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//

/**
 * The homepage hero's scene entry, as the dev server serves it. The `*` takes the query string
 * Vite may add.
 */
const HERO_SCENE_ENTRY = '**/src/demo/scene/hero.js*'

/**
 * What `HERO_SCENE_ENTRY` returns while `heroScene` is 'still': a module with the real export
 * that refuses to start. `HomeHero.tsx` treats a scene that will not start the way it treats a
 * browser with no WebGL2 and shows its still, which is the same code a real failure runs.
 */
const HERO_SCENE_OFF = `export async function startScene() {
  throw new Error('The hero scene is switched off for this test (e2e/fixtures.ts, heroScene).')
}
`

/**
 * The footer's terrain (src/demo/terrain), the demo's other WebGL scene: its scene module, as
 * the dev server serves it, and what that module is answered with while `footerTerrain` is
 * 'still'. `Terrain.tsx` treats a scene that will not start the way it treats a chunk that failed
 * to load and keeps the 2D still it has already drawn, which is its own production fallback path.
 */
const TERRAIN_SCENE_ENTRY = '**/src/demo/terrain/scene.ts*'
const TERRAIN_SCENE_OFF = `export function mountTerrain() {
  throw new Error('The footer terrain is switched off for this test (e2e/fixtures.ts, footerTerrain).')
}
`

/**
 * Every e2e file imports `test` from here, never from '@playwright/test'. Three fixtures are
 * automatic.
 *
 * `consoleErrors` collects console errors and uncaught page errors for the whole test and fails
 * the test in teardown if any fired. A React key warning, a misused Radix part or an exception
 * thrown in an event handler reaches the console and nowhere else; axe and every other assertion
 * here would pass straight over it.
 *
 * `heroSceneGate` keeps the three.js scene on `/demo` from starting, unless a test asks for it.
 * Most of this suite passes through `/demo` on its way somewhere else, and with motion allowed
 * (this suite's default) every one of those visits would build the scene: seconds of shader
 * compilation, a four-second preloader and a render loop on a software GPU, on each of three
 * workers. So by default the scene's entry module is answered with a stub that refuses to start,
 * and the hero falls back to its still, through its own production fallback path and with no
 * test-only switch in the app. `test.use({ heroScene: 'live' })` lets the real module through;
 * e2e/hero.spec.ts is the file that does, and the one that proves the scene itself. The same
 * file checks this default really lands on the still, so a renamed or moved entry module cannot
 * silently turn the whole suite into a WebGL benchmark.
 *
 * `footerTerrainGate` does the same for the terrain in the demo Footer, for a sharper reason:
 * the Footer is on every demo page, and the terrain starts as soon as the Footer is within 300px
 * of the viewport, which on a short page (sign-in, an empty cart) is the moment it loads. Without
 * the gate nearly every demo test would open a WebGL context and download three.js for a
 * decoration it is not about. With it the terrain stays on its still, a 2D canvas that costs
 * nothing. `test.use({ footerTerrain: 'live' })` lets the real module through;
 * e2e/footer-terrain.spec.ts is the file that does, and it also checks that this default lands
 * on the still.
 *
 * What this costs, stated plainly: outside hero.spec.ts no test sees the live hero canvas,
 * outside footer-terrain.spec.ts none sees the live terrain, and Playwright switches the HTTP cache off
 * for a page with a route installed, so a reload inside a test refetches its modules.
 */
export const test = base.extend<{
  consoleErrors: string[]
  allowedConsoleErrors: string[]
  heroScene: 'still' | 'live'
  heroSceneGate: void
  footerTerrain: 'still' | 'live'
  footerTerrainGate: void
}>({
  footerTerrain: ['still', { option: true }],
  footerTerrainGate: [
    async ({ page, footerTerrain }, use) => {
      if (footerTerrain === 'still') {
        await page.route(TERRAIN_SCENE_ENTRY, route =>
          route.fulfill({ status: 200, contentType: 'text/javascript', body: TERRAIN_SCENE_OFF })
        )
      }
      await use()
    },
    { auto: true },
  ],
  heroScene: ['still', { option: true }],
  heroSceneGate: [
    async ({ page, heroScene }, use) => {
      if (heroScene === 'still') {
        await page.route(HERO_SCENE_ENTRY, route =>
          route.fulfill({ status: 200, contentType: 'text/javascript', body: HERO_SCENE_OFF })
        )
      }
      await use()
    },
    { auto: true },
  ],
  // A narrowly scoped, per-test opt-out -- empty by default, so every ordinary test still fails
  // on any console.error at all. `EXTERNAL_HOSTS` above is different: an unconditional allowlist
  // for one specific, always-harmless host. This is for the rare test that deliberately provokes
  // a real console error on purpose (a route intercepted to fail, proving a real recovery path)
  // and needs exactly that error, and nothing else, let through. Set only via
  // `test.use({ allowedConsoleErrors: [...] })` in the smallest `test.describe` that needs it,
  // never at the top of a file. Plain substrings, not `RegExp`s: an "option" fixture crosses into
  // Playwright's worker process, and a `RegExp` does not survive that -- confirmed directly, it
  // arrives on the other side as `{}`, and `.some` then throws on the very first console message
  // any test in the block produces. A substring match is all either pattern here needs anyway.
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = []
      const record = (text: string) => {
        if (allowedConsoleErrors.some(pattern => text.includes(pattern))) return
        errors.push(text)
      }
      page.on('console', message => {
        if (message.type() !== 'error') return
        const location = message.location().url
        if (EXTERNAL_HOSTS.test(location)) return
        // The resource URL, not just the message text: a bare "Failed to load resource:" says
        // nothing about which request failed, which is exactly what a connection-refused error
        // needs to be diagnosable from the test output alone.
        record(location ? `${message.text()} (${location})` : message.text())
      })
      page.on('pageerror', error => record(`Uncaught: ${error.message}`))
      await use(errors)
      expect(errors, 'console.error or an uncaught exception fired during this test').toEqual([])
    },
    { auto: true },
  ],
})

/**
 * Records where the `/demo` hero's bottom edge sits in the document, on every animation frame
 * from the first one the hero exists in. Call it before `goto`; the function it returns reads
 * the distinct values seen so far. One value means the hero never changed where the rest of the
 * page starts.
 *
 * Why this and not only the browser's layout-shift total: that total counts what moves inside
 * the viewport, and the hero fills the viewport. A hero pushed down 96px on a 1280x800 screen
 * moves every section and the Footer with it and still scores under the 0.1 the stability tests
 * hold (run as a mutation, see pages.spec.ts). The bottom edge moving is the thing itself.
 */
export async function trackHeroBottom(page: Page): Promise<() => Promise<number[]>> {
  await page.addInitScript(() => {
    const seen = new Set<number>()
    ;(window as any).__heroBottoms = seen
    const sample = () => {
      const hero = document.querySelector('[data-hero]')
      if (hero) seen.add(Math.round(hero.getBoundingClientRect().bottom + window.scrollY))
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  return () => page.evaluate(() => [...((window as any).__heroBottoms as Set<number>)])
}

/** Opens a docs page and waits for it. The docs pages are lazy chunks (src/docsPages.ts), so `goto`
 *  resolving on `load` no longer means the page is on screen: a test that reads `#main` straight
 *  after it would race the chunk. Every docs page has an h1; the Suspense fallback has none. */
export async function gotoDocs(page: Page, url: string) {
  await page.goto(url)
  await page.locator('#main h1').first().waitFor()
}

export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

/**
 * Flips the theme and waits for the colour transitions that flip triggers to finish.
 *
 * Without the wait this suite was intermittently red on a different light-theme page each run,
 * with `color-contrast` reporting a foreground that exists in neither theme: `#9fa3a9` on
 * `#f2f4f8`, where dark `text.secondary` is `#a3adba` and light is `#19212c`. That is the first
 * few percent of the dark-to-light interpolation. Every colour transition in the system (
 * `.transition-control`, `.transition-stepped`) fires on a `data-theme` swap exactly as it would
 * on hover, because CSS cannot tell the two apart, so axe was measuring a colour that is real for
 * about a tenth of a second and never at rest. The race got easier to lose when M5 took Button
 * from 120ms to 180ms, but it was always there.
 *
 * Waiting on `document.getAnimations()` rather than on a timeout, so this scales with whatever the
 * durations become. Filtered to `CSSTransition`: the Spinner's rotation is an infinite
 * `CSSAnimation` whose `finished` promise never settles.
 */
export async function applyTheme(page: Page, theme: Theme) {
  await page.evaluate(async t => {
    document.documentElement.setAttribute('data-theme', t)
    const settling = document
      .getAnimations()
      .filter(animation => animation instanceof CSSTransition)
      .map(animation => animation.finished.catch(() => undefined))
    await Promise.all(settling)
  }, theme)
}

/** Waits for every finite animation to finish (M1's snap-in on an overlay, a colour transition), so
 *  axe measures colours at rest rather than mid-fade. Infinite ones (the Spinner) are skipped: their
 *  `finished` promise never settles. */
export async function settleAnimations(page: Page) {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
    await Promise.all(finite.map(animation => animation.finished.catch(() => undefined)))
  })
}

/** axe over the whole page, with the same tags as every other run in the repo. */
export async function expectAxeClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}
