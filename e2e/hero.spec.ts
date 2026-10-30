import type { Page } from '@playwright/test'
import { HOME } from '../src/demo/content'
import { applyTheme, expect, expectAxeClean, settleAnimations, test, THEMES, trackHeroBottom } from './fixtures'

// The `/store` hero, in a real browser. jsdom has no WebGL, so Home.test.tsx only ever sees the
// still; and e2e/fixtures.ts keeps the scene from starting everywhere else in this suite
// (`heroScene: 'still'`). This is the one file that lets it run, and the proof that it does: the
// canvas appears and has something drawn on it, the preloader shows for its four seconds and
// leaves, Assemble becomes Disassemble and back, nothing below the hero moves, and the console
// stays clean (the `consoleErrors` fixture fails any test here that logs an error, the scene's
// own included).

// The same flags the workbench tools launch with: a real GPU where the machine has one, software
// rendering where it does not. On a GPU the scene is ready in about eight seconds; without one
// it can take most of a minute, which is what the long timeouts below are for. File-level because
// launch options belong to the worker, so Playwright will not take them inside a describe; the
// still tests in this file run with them too, and do not care.
test.use({
  launchOptions: {
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  },
})

const HERO = '[data-hero]'
const STAGE = '[data-hero-stage]'
const LOADER = '[data-loader]'

/** Requests for the scene's entry module, so a test can say the scene was never even fetched. */
function sceneRequests(page: Page): string[] {
  const seen: string[] = []
  page.on('request', request => {
    if (/\/src\/demo\/scene\/hero\.js/.test(request.url())) seen.push(request.url())
  })
  return seen
}

async function footerTop(page: Page): Promise<number> {
  return page.getByRole('contentinfo').evaluate(el => Math.round(el.getBoundingClientRect().top + window.scrollY))
}

async function stageBox(page: Page) {
  return page.locator(STAGE).evaluate(el => {
    const { width, height } = el.getBoundingClientRect()
    return { width: Math.round(width), height: Math.round(height) }
  })
}

/** Share of the stage whose pixels differ from its top-left one: a drawn scene is most of the
 *  box, a blank or single-colour canvas is none of it. */
async function inkCoverage(page: Page): Promise<number> {
  const png = await page.locator(STAGE).screenshot()
  return page.evaluate(async (b64: string) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const [r0, g0, b0] = data
    let ink = 0
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) > 30) ink++
    }
    return ink / (data.length / 4)
  }, png.toString('base64'))
}

test.describe('the hero with the suite default: the scene switched off', () => {
  // The guard on the fixture itself. If the scene's entry module is ever renamed or moved, the
  // route in e2e/fixtures.ts stops matching, the real scene starts on every `/store` visit in the
  // suite, and nothing else would say so: the tests would just get slow and start to flake.
  // Mutation: change HERO_SCENE_ENTRY in fixtures.ts to a path that matches nothing -> the hero
  // reads data-hero="live" and this fails.
  test('lands on the still, with motion allowed and WebGL available', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/store')
    const hero = page.locator(HERO)
    await expect(hero).toHaveAttribute('data-hero', 'still')
    const still = page.locator(`${STAGE} img`)
    await expect(still).toBeVisible()
    await expect(still).toHaveAttribute('alt', '')
    // Loaded, not just present: a missing poster file would otherwise leave an empty box.
    await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
    await expect(page.locator(`${STAGE} canvas`)).toHaveCount(0)
    await expect(page.locator(LOADER)).toHaveCount(0)
    await expect(page.getByRole('button', { name: HOME.hero.assemble, exact: true })).toHaveCount(0)
    await expect(hero.getByRole('link', { name: HOME.hero.seeKit })).toHaveAttribute('href', '/store/shop/kestrel-c-kit')
  })

  test('the still picks the stacked framing below lg and the wide one from lg', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/store')
    const still = page.locator(`${STAGE} img`)
    await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('/media/hero-poster-960.webp')
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/media\/hero-poster\.webp$/)
  })

  // Mutation: change `quickAddToCart(add, toast, KIT.id)` in HomeHero.tsx to a no-op -> no toast,
  // and the cart button still reads 0 items.
  test('Buy kit adds the kit to the cart, and the kit link opens its product page', async ({ page }) => {
    await page.goto('/store')
    const hero = page.locator(HERO)
    await hero.getByRole('button', { name: HOME.hero.buy }).click()
    await expect(page.getByText('Added Kestrel C operator kit, carbine replica').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cart, 1 item' })).toBeVisible()
    await hero.getByRole('link', { name: HOME.hero.seeKit }).click()
    await expect(page).toHaveURL(/\/store\/shop\/kestrel-c-kit$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Kestrel C operator kit, carbine replica' })).toBeVisible()
    // The product page shows the kit's cutout on the stage, rendered from its own model, and it has loaded.
    const photo = page.locator('main img[src="/media/products/cutout/kestrel-c-kit.webp"]').first()
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
  })
})

test.describe('the hero with the scene allowed to start', () => {
  test.use({ heroScene: 'live' })
  // One scene at a time: these run in order in one worker, whatever the config's parallelism.
  test.describe.configure({ mode: 'default', timeout: 180_000 })

  // Under reduced motion the gate says no before anything is fetched: the still is there from the
  // first render and the scene's module is never requested, let alone three.js.
  // Mutation: drop `allowed &&` from `const live = ...` in HomeHero.tsx -> the canvas mounts, the
  // module is requested, and both assertions fail.
  test('reduced motion gets the still and never fetches the scene', async ({ page }) => {
    const requests = sceneRequests(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/store')
    await expect(page.locator(HERO)).toHaveAttribute('data-hero', 'still')
    await expect(page.locator(`${STAGE} img`)).toBeVisible()
    await expect(page.locator(LOADER)).toHaveCount(0)
    await page.waitForTimeout(1500)
    await expect(page.locator(`${STAGE} canvas`)).toHaveCount(0)
    expect(requests).toEqual([])
  })

  test('the scene loads behind the preloader, Assemble toggles both ways, and nothing below the hero moves', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.addInitScript(() => {
      ;(window as any).__cls = 0
      const po = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const e = entry as unknown as { hadRecentInput: boolean; value: number }
          if (!e.hadRecentInput) (window as any).__cls += e.value
        }
      })
      po.observe({ type: 'layout-shift', buffered: true })
    })
    const heroBottoms = await trackHeroBottom(page)
    await page.goto('/store')

    const hero = page.locator(HERO)
    await expect(hero).toHaveAttribute('data-hero', 'live')

    // The preloader: up, announcing itself as a status, with the main action held back.
    const loader = page.locator(LOADER)
    await expect(loader).toHaveAttribute('data-loader', 'on')
    const shownAt = Date.now()
    await expect(loader.getByRole('status')).toHaveText(HOME.hero.loading)
    const assemble = page.getByRole('button', { name: HOME.hero.assemble, exact: true })
    await expect(assemble).toBeDisabled()

    // Measured while the preloader is still up, to compare with the same two numbers once the
    // scene has landed. Fonts first: a late font swap moves text, which is not what this is about.
    await page.evaluate(() => document.fonts.ready)
    const boxBefore = await stageBox(page)
    const footerBefore = await footerTop(page)

    // The canvas is decoration: inside a node hidden from assistive technology.
    const canvas = page.locator(`${STAGE} canvas`)
    await expect(canvas).toHaveCount(1, { timeout: 60_000 })
    expect(await canvas.evaluate(el => el.closest('[aria-hidden="true"]') !== null)).toBe(true)

    // It leaves. Waited for as "no longer on", because the slide out lasts a third of a second
    // and a poll can miss the `leaving` state entirely.
    await expect(page.locator('[data-loader="on"]')).toHaveCount(0, { timeout: 150_000 })
    // At least its four seconds on screen. Timed from this test's first sight of it, which is
    // later than its real start, so the true figure is a little higher than the one compared.
    expect(Date.now() - shownAt).toBeGreaterThanOrEqual(3500)
    // The status stops announcing, then the panel is out of the DOM.
    await expect(page.getByRole('status', { name: HOME.hero.loading })).toHaveCount(0)
    await expect(loader).toHaveCount(0)

    // Something is actually drawn.
    expect(await inkCoverage(page)).toBeGreaterThan(0.3)

    // Nothing moved: the stage is the size it was, the Footer is where it was, the hero's bottom
    // edge sat in one place on every frame of the load, and the browser's own layout-shift total
    // is under the "good" threshold.
    // Mutation run on 2026-10-02: add `mt-24` to the section in HomeHero.tsx once the preloader
    // has gone (`loaderGone ? 'mt-24' : ''`) -> the Footer assertion failed by 96px (1110, then
    // 1206). The test stops there, so what the two assertions after it would have said for this
    // mutation was not observed; pages.spec.ts records the same shift passing the layout-shift
    // total on the still path.
    expect(await stageBox(page)).toEqual(boxBefore)
    expect(await footerTop(page)).toBe(footerBefore)
    expect(await heroBottoms(), 'the hero changed where the rest of the page starts').toHaveLength(1)
    expect(await page.evaluate(() => (window as any).__cls)).toBeLessThan(0.1)

    // Assemble, by pointer. The label carries the state, so the name changing is the assertion.
    await expect(assemble).toBeEnabled()
    await assemble.click()
    const disassemble = page.getByRole('button', { name: HOME.hero.disassemble, exact: true })
    await expect(disassemble).toBeVisible({ timeout: 20_000 })
    await expect(disassemble).toBeEnabled()
    // Focus stayed on the control through the whole sequence: it is aria-disabled while busy,
    // never removed.
    await expect(disassemble).toBeFocused()

    // And back, by keyboard.
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: HOME.hero.assemble, exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: HOME.hero.assemble, exact: true })).toBeFocused()

    // Focus is not trapped in the hero: Tab moves on to Buy kit and then out of the section.
    await page.keyboard.press('Tab')
    await expect(hero.getByRole('button', { name: HOME.hero.buy })).toBeFocused()
    await page.keyboard.press('Tab')
    expect(await hero.evaluate(el => el.contains(document.activeElement))).toBe(false)

    // A drag across the stage turns the replica and throws nothing (the console fixture would
    // fail this test if it did).
    const box = (await page.locator(STAGE).boundingBox())!
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.42, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(300)
  })

  // `?fx=force` is the reviewer's switch (src/fx/core/gate.ts): effects on although the OS asks
  // for reduced motion. It is also the cheapest way to hold everything else on the page still
  // for axe while the scene runs.
  test('the live hero is axe clean in both themes, under ?fx=force with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/store?fx=force')
    await expect(page.locator(HERO)).toHaveAttribute('data-hero', 'live')
    await expect(page.locator(`${STAGE} canvas`)).toHaveCount(1, { timeout: 60_000 })
    await expect(page.locator(LOADER)).toHaveCount(0, { timeout: 150_000 })
    for (const theme of THEMES) {
      await applyTheme(page, theme)
      await settleAnimations(page)
      await expectAxeClean(page)
      // The hero pins its own dark theme over the dark set, whatever the page is in.
      await expect(page.locator(HERO)).toHaveAttribute('data-theme', 'dark')
    }
  })

  // Leaving the page gives the context back (browsers cap them) and takes the canvas with it.
  test('navigating away removes the scene canvas', async ({ page }) => {
    await page.goto('/store')
    await expect(page.locator(`${STAGE} canvas`)).toHaveCount(1, { timeout: 60_000 })
    await expect(page.locator(LOADER)).toHaveCount(0, { timeout: 150_000 })
    await page.getByRole('navigation', { name: 'Hexline', exact: true }).getByRole('link', { name: 'Care' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hexline Care' })).toBeVisible()
    // `main canvas`: the Footer's terrain keeps a canvas of its own on every demo page.
    await expect(page.locator('main canvas')).toHaveCount(0)
  })
})
