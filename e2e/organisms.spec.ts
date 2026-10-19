import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { applyTheme, expect, expectAxeClean, gotoDocs, settleAnimations, test, THEMES } from './fixtures'

// Real-browser checks jsdom cannot make: overlays measured by axe while OPEN (the page-wide suite
// only ever sees them closed), focus coming back after they close, and keyboard paths through the
// organisms. axe treats the page hidden behind an open modal as needing review, not as a
// violation, so an open overlay's run is clean when the overlay itself is.

for (const theme of THEMES) {
  test(`Dialog: axe clean with the dialog open in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/dialog')
    await applyTheme(page, theme)
    await page.getByRole('button', { name: 'Edit depot' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit depot' })).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('Dialog: Escape closes it and focus returns to the trigger', async ({ page }) => {
  await page.goto('/components/dialog')
  const trigger = page.getByRole('button', { name: 'Edit depot' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Edit depot' })
  await expect(dialog).toBeVisible()
  // Radix moves focus onto the first focusable element inside the dialog (its own
  // `onOpenAutoFocus`) in a microtask after the open state commits, not synchronously with the
  // click above -- pressing Escape before that lands raced the key against Radix's own
  // focus-scope activation under full-suite load. Waiting for focus to actually be somewhere
  // inside the dialog first (rather than just visibility) closes that window. `:focus` inside the
  // dialog rather than a specific field, since which control gets Radix's own initial autofocus
  // is Radix's choice, not this test's to pin.
  await expect(dialog.locator(':focus')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('Dialog: opened without a trigger, it returns focus to whatever opened it', async ({ page }) => {
  await page.goto('/components/dialog')
  const opener = page.getByRole('button', { name: 'Archive manifest' })
  await opener.click()
  await page.getByRole('dialog', { name: 'Archive manifest?' }).getByRole('button', { name: 'Keep it' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(opener).toBeFocused()
})

test('Dialog: Tab and Shift+Tab wrap inside the open dialog', async ({ page }) => {
  await page.goto('/components/dialog')
  await page.getByRole('button', { name: 'Edit depot' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit depot' })
  await expect(dialog).toBeVisible()
  const nameField = page.getByRole('textbox', { name: 'Depot name' })
  await expect(nameField).toBeFocused()
  // Shift+Tab from the first control wraps to the last -- the close button.
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  // Tab from the last control wraps back to the first.
  await page.keyboard.press('Tab')
  await expect(nameField).toBeFocused()
})

test.describe('at 320 by 400', () => {
  test.use({ viewport: { width: 320, height: 400 } })

  test('Dialog: one taller than the viewport opens with its title on screen', async ({ page }) => {
    await page.goto('/components/dialog')
    await page.getByRole('button', { name: 'Read shipping terms' }).click()
    const title = page.getByRole('dialog').getByRole('heading', { name: 'Shipping terms' })
    await expect(title).toBeVisible()
    await settleAnimations(page)
    const box = await title.boundingBox()
    expect(box?.y ?? -1, 'the title is above the top of the viewport').toBeGreaterThanOrEqual(0)
  })

  test('Sheet: stays narrower than the viewport, and a click on the scrim closes it', async ({ page }) => {
    await page.goto('/components/sheet')
    await page.getByRole('button', { name: 'Filter depots' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await expect(sheet).toBeVisible()
    await settleAnimations(page)
    const box = await sheet.boundingBox()
    expect(box?.width ?? Infinity, 'the sheet is min(24rem, 100vw - 2rem) wide').toBeLessThanOrEqual(288)
    await page.mouse.click(10, 200)
    await expect(sheet).toBeHidden()
  })
})

for (const theme of THEMES) {
  test(`Sheet: axe clean with the sheet open in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/sheet')
    await applyTheme(page, theme)
    await page.getByRole('button', { name: 'Filter depots' }).click()
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

for (const theme of THEMES) {
  test(`Sheet: axe clean with a toast showing inside the open sheet in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/sheet')
    await applyTheme(page, theme)
    await page.getByRole('button', { name: 'Filter depots' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await sheet.getByRole('button', { name: 'Save as default' }).click()
    await expect(sheet.locator('li', { hasText: 'Filters saved' })).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('Sheet: a toast inside it is topmost, and one Escape closes the sheet and nothing else', async ({ page }) => {
  await page.goto('/components/sheet')
  const trigger = page.getByRole('button', { name: 'Filter depots' })
  await trigger.click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await sheet.getByRole('button', { name: 'Save as default' }).click()
  const toast = sheet.locator('li', { hasText: 'Filters saved' })
  await expect(toast).toBeVisible()
  await settleAnimations(page)
  // Topmost: the point at the toast's centre hits the toast, not the sheet or the scrim.
  const hitsToast = await toast.evaluate(element => {
    const box = element.getBoundingClientRect()
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
  })
  expect(hitsToast).toBe(true)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(trigger).toBeFocused()
  // The one effect is the sheet closing. The toast was not dismissed; it moved to the page.
  await expect(page.locator('li', { hasText: 'Filters saved' })).toBeVisible()
})

test('Sheet: its close button returns focus to the trigger', async ({ page }) => {
  await page.goto('/components/sheet')
  const trigger = page.getByRole('button', { name: 'Filter depots' })
  await trigger.click()
  await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test.describe('at 320px', () => {
  test.use({ viewport: { width: 320, height: 800 } })

  test('Navbar: the links move into a menu sheet, and Escape returns focus to the menu button', async ({ page }) => {
    await page.goto('/components/navbar')
    const header = page.getByRole('main').locator('header').first()
    await expect(header.getByRole('navigation', { name: 'Store navigation' })).toBeHidden()
    const menu = header.getByRole('button', { name: 'Menu' })
    await menu.click()
    const sheet = page.getByRole('dialog', { name: 'Menu' })
    await expect(sheet).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
    await expect(sheet.getByRole('link', { name: 'Optics' })).toHaveAttribute('aria-current', 'page')
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(menu).toBeFocused()
  })

  test('Sidebar: opens in a sheet, axe clean, and Escape returns focus to the trigger', async ({ page }) => {
    await page.goto('/components/sidebar')
    const trigger = page.getByRole('button', { name: 'Open navigation' })
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: 'Navigation' })
    await expect(sheet).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
    const nav = sheet.getByRole('navigation', { name: 'Dashboard navigation, in a sheet' })
    await expect(nav.getByRole('link', { name: 'Orders 12' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Orders 12' })).not.toHaveAttribute('type')
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})

test.describe('Sidebar: category expand/collapse animation', () => {
  test('a collapsed group is unreachable by Tab, no earlier and no later than an expanded one', async ({ page }) => {
    await page.goto('/components/sidebar')
    const nav = page.getByRole('navigation', { name: 'Dashboard navigation', exact: true })
    const toggle = nav.getByRole('button', { name: 'Catalogue' })
    const products = nav.getByRole('link', { name: 'Products' })
    const settings = nav.getByRole('link', { name: 'Settings' })

    // Collapsed (the docs page's default for Catalogue): Tab from the toggle jumps straight to
    // Settings, the next control in source order -- Products and Inventory are never in the path,
    // exactly as `hidden` kept them out before this animation existed.
    await toggle.focus()
    await page.keyboard.press('Tab')
    await expect(settings).toBeFocused()

    // Opening: `inert` clears in the same instant as the click, not after the 180ms grid reveal or
    // the items' own fade -- proven by never waiting for either transition before this check.
    await toggle.click()
    await products.focus()
    await expect(products).toBeFocused()

    // Closing: `inert` is back the instant the group collapses, same proof in reverse. Calling
    // .focus() on an inert element is a no-op in Chromium, not an error, so this reads as "focus
    // never moved" rather than a thrown exception.
    await toggle.click()
    await products.focus()
    await expect(products).not.toBeFocused()
  })

  test('opening actually slides each item -- computed translate is mid-transition one frame in, not still at the start or already at rest', async ({
    page,
  }) => {
    await page.goto('/components/sidebar')
    const nav = page.getByRole('navigation', { name: 'Dashboard navigation', exact: true })
    const toggle = nav.getByRole('button', { name: 'Catalogue' })
    // Index 0 carries no stagger delay (Math.min(0, STAGGER_CAP) * STAGGER_STEP_MS === 0), so its
    // transition starts on the very first frame after the click, same as the height's own.
    const firstItem = nav.getByRole('list', { name: 'Catalogue' }).locator('li').first()

    await toggle.click()
    // One frame in: the transition has started but nothing has settled yet. This is the assertion
    // that would have stayed green through the bug this fixes -- `transform` computed `none` the
    // whole time because Tailwind's translate-y-* utilities set the separate `translate` property,
    // never `transform`, so a `transition-[opacity,transform]` list never touched it and the item
    // just snapped straight to its rest position instead of sliding.
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    const y = await firstItem.evaluate(el => {
      const [, yPart] = getComputedStyle(el).translate.split(' ')
      return yPart ? Number(yPart.replace('px', '')) : 0
    })
    expect(y, `computed translate is "${y}px" one frame after opening -- not between the 4px start and the 0px settled value`).toBeGreaterThan(0)
    expect(y).toBeLessThan(4)
  })

  test('axe is clean with Catalogue collapsed (the page default) and again once it is opened', async ({ page }) => {
    await page.goto('/components/sidebar')
    await settleAnimations(page)
    await expectAxeClean(page)

    await page
      .getByRole('navigation', { name: 'Dashboard navigation', exact: true })
      .getByRole('button', { name: 'Catalogue' })
      .click()
    await settleAnimations(page)
    await expectAxeClean(page)
  })

  test('prefers-reduced-motion: reduce collapses the height and per-item transitions to none', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/components/sidebar')
    const nav = page.getByRole('navigation', { name: 'Dashboard navigation', exact: true })
    const list = nav.getByRole('list', { name: 'Catalogue' })

    // The grid wrapper sits two levels above the ul (see Sidebar.tsx's own comment: wrapper >
    // overflow-clip div > ul), the same traversal the unit test uses.
    const wrapperTransition = await list.evaluate(
      el => getComputedStyle(el.parentElement!.parentElement!).transitionProperty
    )
    expect(wrapperTransition).toBe('none')

    const itemTransition = await list.locator('li').first().evaluate(el => getComputedStyle(el).transitionProperty)
    expect(itemTransition).toBe('none')
  })
})

test('DataTable: a sort button works from the keyboard and keeps focus', async ({ page }) => {
  await page.goto('/components/data-table')
  const table = page.getByRole('table', { name: 'Shipments, sortable' })
  const sort = table.getByRole('button', { name: 'Weight (kg)' })
  const header = table.getByRole('columnheader', { name: 'Weight (kg)' })
  await sort.focus()
  await page.keyboard.press('Enter')
  await expect(header).toHaveAttribute('aria-sort', 'ascending')
  await page.keyboard.press('Space')
  await expect(header).toHaveAttribute('aria-sort', 'descending')
  await expect(sort).toBeFocused()
})

for (const theme of THEMES) {
  test(`CommandPalette: axe clean with the palette open in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/command-palette')
    await applyTheme(page, theme)
    await page.getByRole('button', { name: 'Open command palette' }).click()
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('CommandPalette: Ctrl+K opens it, arrows and Enter run a command, focus comes back', async ({ page }) => {
  await page.goto('/components/command-palette')
  const opener = page.getByRole('button', { name: 'Open command palette' })
  await opener.focus()
  await page.keyboard.press('Control+k')
  const search = page.getByRole('combobox', { name: 'Search commands' })
  await expect(search).toBeFocused()
  await search.fill('ship')
  // "Go to shipments" is active first; one step down is "New shipment".
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText('Last command: New shipment')).toBeVisible()
  await expect(opener).toBeFocused()
})

test('ProductCard: the whole card opens the product, and Add to cart stays its own control', async ({ page }) => {
  await page.goto('/components/product-card')
  const card = page.getByRole('article', { name: 'Kestrel K compact replica' })
  await card.getByRole('button', { name: 'Add to cart: Kestrel K compact replica' }).click()
  await expect(page.locator('li', { hasText: 'Added to cart' })).toBeVisible()
  await expect(page).not.toHaveURL(/#/)
  // A click on the image area, well away from the name, still opens the product. `click`'s own
  // `position` is relative to the element it scrolls into view itself, so it stays correct
  // however the page just scrolled to reach Add to cart above -- unlike a `boundingBox()` read
  // followed by a separate `mouse.click`, which uses whatever scroll position was current when
  // the box was measured and can go stale between the two calls.
  await card.click({ position: { x: 16, y: 16 } })
  await expect(page).toHaveURL(/#kestrel-k$/)
})

test('ProductCard: Add to cart is its own tab stop after the name link', async ({ page }) => {
  await page.goto('/components/product-card')
  const card = page.getByRole('article', { name: 'Kestrel K compact replica' })
  await card.getByRole('link', { name: 'Kestrel K compact replica' }).focus()
  await page.keyboard.press('Tab')
  await expect(card.getByRole('button', { name: 'Add to cart: Kestrel K compact replica' })).toBeFocused()
})

test('ProductGrid: the grid lays out in more than one column at the default viewport', async ({ page }) => {
  await gotoDocs(page, '/components/product-card')
  // exact: true, since "Hexline range" is otherwise also a prefix match for the "Nothing
  // matches" example's "Hexline range, filtered" list.
  const grid = page.getByRole('list', { name: 'Hexline range', exact: true })
  const xPositions = await grid.locator('> li').evaluateAll(items => items.map(item => item.getBoundingClientRect().x))
  expect(new Set(xPositions).size, 'more than one distinct x position among the cards').toBeGreaterThan(1)
})

// The interactive card (Card's `interactive`, design.md "Interactive cards"): the one treatment
// every card that is a single click target gets. jsdom applies no stylesheet and lays nothing
// out, so the border, the transform and "nothing around it moves" are all here. Measured on the
// Card docs page's own example, three interactive cards in a row.
test.describe('Interactive card', () => {
  const SIGNAL = 'rgb(242, 85, 15)' // accent.signal.fill, the same value in both themes

  const style = (card: import('@playwright/test').Locator) =>
    card.evaluate(node => {
      const computed = getComputedStyle(node)
      return { border: computed.borderTopColor, transform: computed.transform, shadow: computed.boxShadow }
    })

  // The lift: translateY(-4px) computes to matrix(1, 0, 0, 1, 0, -4).
  const LIFTED = 'matrix(1, 0, 0, 1, 0, -4)'

  // Mutation: remove the `.card-interactive:hover` rule from src/styles/elevation.css -> the
  // border stays the hairline. Remove its `transform` -> the card never lifts.
  test('hover: the border takes the accent, the card slides up 4px, and it settles back on leave', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/components/card')
    // The boxes below are compared before and after the hover. Until the web fonts have swapped
    // in, the whole page is still settling: measured first, the neighbour "moved" 0.125px.
    await page.evaluate(() => document.fonts.ready)
    const card = page.getByRole('article', { name: 'Ridge depot' })
    const neighbour = page.getByRole('article', { name: 'Quarry depot' })
    await card.scrollIntoViewIfNeeded()
    const rest = await style(card)
    expect(rest.transform).toBe('none')
    expect(rest.border).not.toBe(SIGNAL)
    expect(rest.shadow).toBe('none')
    const neighbourBefore = await neighbour.boundingBox()
    const layoutBefore = await card.evaluate(node => [node.offsetLeft, node.offsetTop, node.offsetWidth, node.offsetHeight])
    const topBefore = (await card.boundingBox())!.y

    const box = (await card.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    await expect.poll(async () => (await style(card)).border).toBe(SIGNAL)
    await expect.poll(async () => (await style(card)).transform).toBe(LIFTED)
    // No glow any more: the hover is the border and the lift.
    expect((await style(card)).shadow).toBe('none')
    expect((await card.boundingBox())!.y).toBeCloseTo(topBefore - 4, 1)
    // A transform, never layout: the card's own layout box and its neighbour's box are where
    // they were.
    expect(await card.evaluate(node => [node.offsetLeft, node.offsetTop, node.offsetWidth, node.offsetHeight])).toEqual(layoutBefore)
    expect(await neighbour.boundingBox()).toEqual(neighbourBefore)

    await page.mouse.move(2, 2)
    await expect.poll(async () => (await style(card)).transform).toBe('none')
    await expect.poll(async () => (await style(card)).border).toBe(rest.border)
  })

  // The border and the lift are for every input. Mutation: change
  // `.card-interactive:has(:focus-visible)` to `:hover` only -> the border stays the hairline.
  test('keyboard focus inside lights the border and lifts the card', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/components/card')
    const card = page.getByRole('article', { name: 'Ridge depot' })
    await card.scrollIntoViewIfNeeded()
    // Park the pointer away from the card, so a hover left over from scrolling cannot pass this.
    await page.mouse.move(2, 2)
    const link = card.getByRole('link', { name: 'Ridge depot' })
    await link.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    await expect.poll(async () => (await style(card)).border).toBe(SIGNAL)
    await expect.poll(async () => (await style(card)).transform).toBe(LIFTED)
    // The link's own ring is still drawn, around the card: the border does not replace it.
    expect(await link.evaluate(node => getComputedStyle(node, '::after').outlineStyle)).toBe('solid')
  })

  // Mutation: delete the reduced-motion block for `.card-interactive` -> the transform is the lift.
  test('under reduced motion a hover changes the border and nothing moves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/components/card')
    const card = page.getByRole('article', { name: 'Ridge depot' })
    await card.scrollIntoViewIfNeeded()
    const box = (await card.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    await expect.poll(async () => (await style(card)).border).toBe(SIGNAL)
    expect((await style(card)).transform).toBe('none')
  })

  // A card that is not a click target does none of it. The first example on the page is one.
  test('a card that is not interactive does not change under the pointer', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/components/card')
    const card = page.getByRole('article', { name: 'North field depot' })
    await card.scrollIntoViewIfNeeded()
    const rest = await style(card)
    const box = (await card.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 20)
    await page.mouse.move(box.x + box.width * 0.8, box.y + 30, { steps: 4 })
    await page.waitForTimeout(250)
    expect(await style(card)).toEqual(rest)
  })

  // In a Carousel the track is a scroll container and clips. The lifted card and its crosshair
  // arms have to land inside the track's padding box, and the lift must not scroll it.
  // Mutation: set the track back to `py-2` -> the top clearance is 8, under the 20 asked for.
  test('in a carousel, a hovered card is not clipped by the track and does not move it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/demo')
    const track = page.getByRole('region', { name: 'Offers' }).getByRole('list')
    await track.scrollIntoViewIfNeeded()
    const card = track.getByRole('article').first()
    const box = (await card.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.move(box.x + box.width * 0.5, box.y + 6, { steps: 6 })
    await expect.poll(async () => (await style(card)).transform).toBe(LIFTED)
    const room = await track.evaluate(list => {
      const clip = list.getBoundingClientRect()
      const projected = list.querySelector('article')!.getBoundingClientRect()
      return { top: projected.top - clip.top, bottom: clip.bottom - projected.bottom, left: projected.left - clip.left, scrollLeft: list.scrollLeft }
    })
    // 16px: the 4px lift plus the crosshair arms (5px) with room to spare.
    expect(room.top, 'room above the lifted card').toBeGreaterThanOrEqual(16)
    expect(room.bottom, 'room below the lifted card').toBeGreaterThanOrEqual(16)
    expect(room.left, 'room to the left of the lifted card').toBeGreaterThanOrEqual(16)
    expect(room.scrollLeft).toBe(0)
  })
})

for (const theme of THEMES) {
  test(`Cart: axe clean in a sheet with a removal toast showing in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/cart')
    await applyTheme(page, theme)
    await page.getByRole('button', { name: 'Open cart' }).click()
    const sheet = page.getByRole('dialog', { name: 'Your cart' })
    await sheet.getByRole('button', { name: 'Remove Beam 600 rail light' }).click()
    await expect(sheet.locator('li', { hasText: 'Removed Beam 600 rail light' })).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('Cart: a removal keeps focus in the cart, and Undo in the sheet puts the line back', async ({ page }) => {
  await page.goto('/components/cart')
  await page.getByRole('button', { name: 'Open cart' }).click()
  const sheet = page.getByRole('dialog', { name: 'Your cart' })
  await sheet.getByRole('button', { name: 'Remove Prism holo sight' }).click()
  await expect(sheet.getByRole('button', { name: 'Remove Beam 600 rail light' })).toBeFocused()
  const toast = sheet.locator('li', { hasText: 'Removed Prism holo sight' })
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(sheet.getByRole('button', { name: 'Remove Prism holo sight' })).toBeFocused()
  await expect(sheet.getByRole('status').filter({ hasText: 'Subtotal' })).toContainText('€261.00')
})

for (const theme of THEMES) {
  test(`Cart: axe clean with a page removal toast moved into a sheet opened after it in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/cart')
    await applyTheme(page, theme)
    const pageCart = page.getByRole('region', { name: 'Cart', exact: true })
    await pageCart.getByRole('button', { name: 'Remove Kestrel C carbine replica' }).click()
    await page.getByRole('button', { name: 'Open cart' }).click()
    const sheet = page.getByRole('dialog', { name: 'Your cart' })
    await expect(sheet.locator('li', { hasText: 'Removed Kestrel C carbine replica' })).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('Cart: Undo from a page removal is reachable and works inside a sheet opened after it', async ({ page }) => {
  await page.goto('/components/cart')
  const pageCart = page.getByRole('region', { name: 'Cart', exact: true })
  await pageCart.getByRole('button', { name: 'Remove Kestrel C carbine replica' }).click()
  // Not a `focusin` listener on the page Cart: Chromium really does attempt to focus content
  // under `aria-hidden="true"` (only native `inert` blocks that outright). What stops it landing
  // is Radix FocusScope's own document-level `focusout` handler -- when focus tries to leave the
  // sheet's trap, it reads `event.relatedTarget` (the element about to receive focus) and, if that
  // is outside the trapped container, immediately calls `.focus()` back on the last element inside
  // it, before a `focusin` on the outside target ever completes. A capture-phase `focusout`
  // listener on `document`, added before FocusScope's own bubble-phase one runs, still sees the
  // attempted target on `relatedTarget` even though the redirect means it never actually gets
  // focus for a `focusin` to fire on.
  await pageCart.evaluate(node => {
    const store = window as unknown as { __cartFocusoutAttempts: number }
    store.__cartFocusoutAttempts = 0
    document.addEventListener(
      'focusout',
      event => {
        const related = event.relatedTarget as Node | null
        if (related && node.contains(related)) store.__cartFocusoutAttempts++
      },
      true
    )
  })
  await page.getByRole('button', { name: 'Open cart' }).click()
  const sheet = page.getByRole('dialog', { name: 'Your cart' })
  const undo = sheet.getByRole('button', { name: 'Undo' })
  await expect(undo).toBeVisible()
  await settleAnimations(page)
  // Topmost: the point at Undo's centre hits Undo, not the scrim or the sheet.
  const hitsUndo = await undo.evaluate(element => {
    const box = element.getBoundingClientRect()
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
  })
  expect(hitsUndo).toBe(true)
  // Reachable from the keyboard: F8 lands in the sheet's own notifications, then the toast, then Undo.
  await page.keyboard.press('F8')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(undo).toBeFocused()
  await undo.click()
  await expect(sheet.locator('li', { hasText: 'Removed Kestrel C carbine replica' })).toHaveCount(0)
  // The restored line is on the page behind the sheet, so focus stays in the sheet, and the hidden
  // page Cart is never even an attempted focus target.
  await expect.poll(() => sheet.evaluate(element => element.contains(document.activeElement))).toBe(true)
  expect(await page.evaluate(() => (window as unknown as { __cartFocusoutAttempts: number }).__cartFocusoutAttempts)).toBe(
    0
  )
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(pageCart.getByRole('button', { name: 'Remove Kestrel C carbine replica' })).toBeVisible()
})

for (const theme of THEMES) {
  test(`AuthForm: axe clean with the error summary showing in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/auth-form')
    await applyTheme(page, theme)
    const form = page.getByRole('form', { name: 'Sign in' })
    await form.locator('button[type="submit"]').click()
    await expect(form.getByRole('group', { name: 'There is a problem' })).toBeFocused()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('AuthForm: from the keyboard, a wrong password keeps focus on the busy button, then lands on the summary', async ({ page }) => {
  await page.goto('/components/auth-form')
  const form = page.getByRole('form', { name: 'Sign in' })
  await form.getByRole('textbox', { name: 'Email' }).focus()
  await page.keyboard.type('ana@example.com')
  await page.keyboard.press('Tab')
  await page.keyboard.type('wrong horse')
  await page.keyboard.press('Tab')
  await expect(form.getByRole('button', { name: 'Show password' })).toBeFocused()
  await page.keyboard.press('Tab')
  const submit = form.locator('button[type="submit"]')
  await expect(submit).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(submit).toHaveAttribute('aria-busy', 'true')
  await expect(submit).toBeFocused()
  const summary = form.getByRole('group', { name: 'There is a problem' })
  await expect(summary).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(form.locator('input[autocomplete="current-password"]')).toBeFocused()
})

for (const theme of THEMES) {
  test(`CheckoutForm: axe clean with the error summary showing in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/checkout-form')
    await applyTheme(page, theme)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('group', { name: 'There is a problem' })).toBeFocused()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('CheckoutForm: three steps from the keyboard, through the country Select and a delivery radio, to a demo order', async ({ page }) => {
  await page.goto('/components/checkout-form')
  await page.getByRole('textbox', { name: 'Email' }).fill('ana@example.com')
  await page.getByRole('textbox', { name: 'Full name' }).fill('Ana Pop')
  await page.getByRole('textbox', { name: 'Address line 1' }).fill('Strada Lunga 12')
  await page.getByRole('textbox', { name: 'Town or city' }).fill('Brasov')
  await page.getByRole('textbox', { name: 'Postal code' }).fill('500035')
  const country = page.getByRole('combobox', { name: 'Country' })
  await country.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Ireland' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Romania' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(country).toHaveText('Romania')
  await page.getByRole('textbox', { name: 'Postal code' }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Step 2 of 3: Delivery' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('radio', { name: /Standard/ })).toBeFocused()
  // Radix's RadioGroupItem tracks "was an arrow key what moved focus here" with its own
  // document-level keydown/keyup listeners (set true on keydown, false on keyup) and only
  // auto-selects the newly focused item -- via a real .click() -- while that flag is still true.
  // Playwright's default `press()` sends keydown and keyup back to back with no gap, and under
  // Chromium that occasionally lands the keyup, and so the reset to false, before the roving
  // focus group's own focus-and-onFocus round trip completes: found flaky here (2 failures in 5
  // reruns without a delay, 0 in 23 with one). A `delay` keeps the key "held" long enough for the
  // focus/onFocus pair to land inside the window where Radix still calls that .click().
  await page.keyboard.press('ArrowDown', { delay: 100 })
  await expect(page.getByRole('radio', { name: /Express/ })).toBeChecked()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Step 3 of 3: Payment' })).toBeFocused()
  await page.getByRole('textbox', { name: 'Name on card' }).fill('Ana Pop')
  await page.getByRole('textbox', { name: 'Card number' }).fill('4242 4242 4242 4242')
  await page.getByRole('textbox', { name: 'Expiry date' }).fill('12/30')
  await page.getByRole('textbox', { name: 'Security code' }).fill('123')
  await page.getByRole('textbox', { name: 'Security code' }).press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Order placed' })).toHaveText(
    'Order placed. This is a demo: no payment was taken.'
  )
})

for (const theme of THEMES) {
  test(`ChartPanel: axe clean with the table shown in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/chart-panel')
    await applyTheme(page, theme)
    const panel = page.getByRole('region', { name: 'Weekly orders', exact: true })
    await panel.getByRole('button', { name: 'Show as table' }).click()
    await expect(panel.getByRole('table')).toBeVisible()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('ChartPanel: the chart is hidden and has no tab stop, two series have two colours, and the table holds the data', async ({ page }) => {
  await page.goto('/components/chart-panel')
  const panel = page.getByRole('region', { name: 'Weekly orders', exact: true })
  const svg = panel.locator('svg.recharts-surface').first()
  await expect(svg).toBeVisible()
  expect(await svg.evaluate(element => element.closest('[aria-hidden="true"]') !== null)).toBe(true)
  // Every chart on the page, not only Weekly orders' own: the docs page renders line, area, bar,
  // small, donut and radar examples, and accessibilityLayer's role/tabindex is a per-chart prop --
  // one clean example proves nothing about a sibling built the same way but never re-checked. A
  // layer inside the surface counts too: Recharts' Pie is a tab stop unless told otherwise.
  const everySurface = page.locator('svg.recharts-surface')
  await expect(everySurface).toHaveCount(10)
  for (const surface of await everySurface.all()) {
    await expect(surface).not.toHaveAttribute('role')
    await expect(surface).not.toHaveAttribute('tabindex')
    await expect(surface.locator('[tabindex]:not([tabindex="-1"])')).toHaveCount(0)
  }
  const strokes = await panel
    .locator('.recharts-line-curve')
    .evaluateAll(paths => paths.map(path => getComputedStyle(path).stroke))
  expect(strokes).toHaveLength(2)
  expect(new Set(strokes).size).toBe(2)
  // Two lines that can sit close together or cross must not rely on colour alone (SC 1.4.1):
  // series 2 is dashed, series 1 solid. jsdom draws no path here (recharts never renders a chart
  // at zero size under jsdom), so this real-browser check is the only place the actual stroke can
  // be seen -- the unit suite only proves the legend's own swatch.
  // Recharts animates a line's own draw-in by driving stroke-dasharray/stroke-dashoffset itself
  // (react-smooth, not a CSS animation settleAnimations' getAnimations() can see), so the final,
  // real dasharray only lands once that animation finishes -- poll for it rather than assert once.
  const dashesAt = () =>
    panel.locator('.recharts-line-curve').evaluateAll(paths => paths.map(path => path.getAttribute('stroke-dasharray')))
  await expect.poll(dashesAt).toEqual([null, '6 3'])
  const toggle = panel.getByRole('button', { name: 'Show as table' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const table = panel.getByRole('table')
  await expect(table.getByRole('row')).toHaveCount(9)
  await expect(table.getByRole('rowheader', { name: 'W5' })).toBeVisible()
})

test('ChartPanel: the second line series is dashed, with no draw-in animation to poll for under reduced motion', async ({
  page,
}) => {
  // Recharts' own isAnimationActive default is 'auto': it reads prefers-reduced-motion itself
  // (usePrefersReducedMotion, recharts/es6/util) and skips the draw-in animation when it is
  // reduced, landing straight on the settled dasharray -- so this asserts it directly, with no
  // expect.poll, proving the real value independent of the animation the test above waits out.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/components/chart-panel')
  const panel = page.getByRole('region', { name: 'Weekly orders', exact: true })
  const lines = panel.locator('.recharts-line-curve')
  await expect(lines).toHaveCount(2)
  const dashes = await lines.evaluateAll(paths => paths.map(path => path.getAttribute('stroke-dasharray')))
  expect(dashes).toEqual([null, '6 3'])
})

test('ChartPanel: at 320px, 24 hourly x labels never overlap, and the night band shades two areas and is named in text', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/components/chart-panel')
  const panel = page.getByRole('region', { name: 'Fine particles today', exact: true })
  // The x labels are the svg's only HH:00 text; Recharts 3 portals tick text into z-index layers,
  // so it does not sit under the axis group a selector would name.
  const ticks = panel.locator('svg.recharts-surface text').filter({ hasText: /^\d\d:00$/ })
  await expect(ticks.first()).toBeAttached()
  const boxes = await ticks.evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect()
    return { left: box.left, right: box.right, text: node.textContent }
  }))
  expect(boxes.length).toBeGreaterThan(1)
  expect(boxes.length).toBeLessThan(24)
  expect(boxes[0].text).toBe('00:00')
  for (let index = 1; index < boxes.length; index++) {
    expect(boxes[index].left).toBeGreaterThanOrEqual(boxes[index - 1].right)
  }
  // Wraps past midnight: 22:00 to 23:00, and 00:00 to 06:00.
  await expect(panel.locator('.recharts-reference-area-rect')).toHaveCount(2)
  await expect(panel.getByRole('list', { name: 'Shaded ranges' })).toHaveText('Night: 22:00 to 06:00')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

// Carousel. jsdom lays nothing out, so everything about real geometry is here: where a press
// lands, whether an edge item's ring fits inside the track, and whether the track ever moves
// without being asked.

test('Carousel: Next pages the track to an item start, the ends go inert and keep focus, Previous returns', async ({
  page,
}) => {
  // Reduced motion, so each press has landed by the time the next line reads the track. A narrow
  // window, so the track shows two cards of six and the first press stops short of the end: at
  // the end the track is clamped, and no item start lines up with anything.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 760, height: 900 })
  await page.goto('/components/carousel')
  const carousel = page.getByRole('region', { name: 'Offers' })
  const track = carousel.getByRole('list')
  const previous = carousel.getByRole('button', { name: 'Previous items' })
  const next = carousel.getByRole('button', { name: 'Next items' })
  await expect(previous).toHaveAttribute('aria-disabled', 'true')
  await expect(next).not.toHaveAttribute('aria-disabled', 'true')
  await expect(carousel.getByText(/^1 to \d of 6$/)).toBeVisible()

  await next.focus()
  await page.keyboard.press('Enter')
  // The track came to rest with an item's left edge on the gutter line, not part-way into one.
  await expect
    .poll(() =>
      track.evaluate(list => {
        const start = list.getBoundingClientRect().left + parseFloat(getComputedStyle(list).paddingLeft)
        const offsets = Array.from(list.children, item => Math.abs(item.getBoundingClientRect().left - start))
        return { moved: list.scrollLeft > 0, nearest: Math.round(Math.min(...offsets)) }
      })
    )
    .toEqual({ moved: true, nearest: 0 })
  await expect(previous).not.toHaveAttribute('aria-disabled', 'true')

  for (let press = 0; press < 6; press++) await page.keyboard.press('Enter')
  await expect(next).toHaveAttribute('aria-disabled', 'true')
  // aria-disabled, never `disabled`: the button it went inert on still has focus.
  await expect(next).toBeFocused()
  await expect(carousel.getByText(/^\d to 6 of 6$/)).toBeVisible()
  expect(await track.evaluate(list => Math.abs(list.scrollLeft - (list.scrollWidth - list.clientWidth)))).toBeLessThanOrEqual(1)
  // The announcement names where the track stopped, and is made once it has.
  await expect(carousel.getByRole('status')).toHaveText(/^\d to 6 of 6$/)

  await previous.focus()
  for (let press = 0; press < 6; press++) await page.keyboard.press('Space')
  await expect(previous).toHaveAttribute('aria-disabled', 'true')
  await expect(previous).toBeFocused()
  expect(await track.evaluate(list => list.scrollLeft)).toBe(0)
})

// design.md, "The focus ring is never clipped". A scroll container clips at its padding box, so
// the ring of an item at the edge has to land inside the track's padding. A card's ring is drawn
// 4px outside it and its crosshair arms 5px outside it, so 6px of clearance on every side is the
// bar at the sides. Above and below the bar is 20px: an interactive Card's lift and crosshair arms
// reach about 9px (see "Interactive cards" in design.md), and the track gives 24px. Mutation: change the track's `py-6 -my-4` to `py-2` -> top and bottom are 8.
// Change the gutter floor in Carousel.tsx from `max(0.5rem, ...)` to the bare prop and pass 0px
// -> left is 0.
test('Carousel: the first and last item each sit at least 6px inside the track, so an edge focus ring is not clipped', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/components/carousel')
  const carousel = page.getByRole('region', { name: 'Offers' })
  const track = carousel.getByRole('list')
  const clearance = (which: 'first' | 'last') =>
    track.evaluate((list, edge) => {
      const item = (edge === 'first' ? list.firstElementChild : list.lastElementChild)!.getBoundingClientRect()
      // clientLeft/clientTop/clientWidth/clientHeight: the padding box, which is where a scroll
      // container clips.
      const box = list.getBoundingClientRect()
      const left = box.left + list.clientLeft
      const top = box.top + list.clientTop
      return {
        left: Math.round(item.left - left),
        top: Math.round(item.top - top),
        right: Math.round(left + list.clientWidth - item.right),
        bottom: Math.round(top + list.clientHeight - item.bottom),
      }
    }, which)

  const first = await clearance('first')
  expect(first.left, 'first item, left').toBeGreaterThanOrEqual(6)
  expect(first.top, 'first item, top').toBeGreaterThanOrEqual(20)
  expect(first.bottom, 'first item, bottom').toBeGreaterThanOrEqual(20)

  // The ring itself: Tab to the first card's link, and its outline is the ring token.
  await carousel.getByRole('button', { name: 'Next items' }).focus()
  await page.keyboard.press('Tab')
  const link = carousel.getByRole('link', { name: 'Kestrel K compact replica' })
  await expect(link).toBeFocused()
  expect(await link.evaluate(node => getComputedStyle(node, '::after').outlineStyle)).toBe('solid')

  await track.evaluate(list => {
    list.scrollLeft = list.scrollWidth
  })
  const last = await clearance('last')
  expect(last.right, 'last item, right').toBeGreaterThanOrEqual(6)
  expect(last.top, 'last item, top').toBeGreaterThanOrEqual(20)
  expect(last.bottom, 'last item, bottom').toBeGreaterThanOrEqual(20)
})

// Mutation: remove `motion-reduce:scroll-auto` from the track -> under reduced motion the read in
// the same task as the click is still 0, because the glide has only begun.
test('Carousel: a press glides where motion is allowed and lands at once under reduced motion', async ({ page }) => {
  await page.goto('/components/carousel')
  const track = page.getByRole('region', { name: 'Offers' }).getByRole('list')
  expect(await track.evaluate(list => getComputedStyle(list).scrollBehavior)).toBe('smooth')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await track.evaluate(list => getComputedStyle(list).scrollBehavior)).toBe('auto')
  const afterClick = await page.evaluate(() => {
    const carousel = document.querySelector('[aria-roledescription="carousel"][aria-label="Offers"]')!
    const next = carousel.querySelector<HTMLButtonElement>('button[aria-label="Next items"]')!
    next.click()
    // Same task as the click: an instant scroll has already happened, a smooth one has not.
    return carousel.querySelector('ul')!.scrollLeft
  })
  expect(afterClick).toBeGreaterThan(0)
})

test('Carousel: a track with nothing focusable in it is a tab stop, and the arrow keys scroll it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/components/carousel')
  const carousel = page.getByRole('region', { name: 'Cleaning steps' })
  const track = carousel.getByRole('list')
  await expect(track).toHaveAttribute('tabindex', '0')
  await carousel.getByRole('button', { name: 'Next items' }).focus()
  await page.keyboard.press('Tab')
  await expect(track).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => track.evaluate(list => list.scrollLeft)).toBeGreaterThan(0)
  // A track of cards has links and buttons in it, so it is not a stop itself.
  await expect(page.getByRole('region', { name: 'Offers' }).getByRole('list')).not.toHaveAttribute('tabindex')
})

// No autoplay. Three seconds is longer than any carousel's first advance would wait to be seen.
test('Carousel: nothing moves on its own', async ({ page }) => {
  await gotoDocs(page, '/components/carousel')
  const positions = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[aria-roledescription="carousel"] ul'), list => list.scrollLeft)
    )
  expect(await positions()).toEqual([0, 0, 0])
  await page.waitForTimeout(3000)
  expect(await positions()).toEqual([0, 0, 0])
})

for (const theme of THEMES) {
  test(`NewsletterForm: axe clean with the error summary showing in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/newsletter-form')
    await applyTheme(page, theme)
    const form = page.getByRole('form', { name: 'Field notes by email' })
    await form.locator('button[type="submit"]').click()
    await expect(form.getByRole('group', { name: 'There is a problem' })).toBeFocused()
    await settleAnimations(page)
    await expectAxeClean(page)
  })

  test(`NewsletterForm: axe clean with the success message showing in ${theme} theme`, async ({ page }) => {
    await page.goto('/components/newsletter-form')
    await applyTheme(page, theme)
    const form = page.getByRole('form', { name: 'Field notes by email' })
    await form.getByRole('textbox', { name: 'Email' }).fill('ana@example.com')
    await form.locator('button[type="submit"]').click()
    await expect(page.getByRole('heading', { name: 'You are subscribed' })).toBeFocused()
    await settleAnimations(page)
    await expectAxeClean(page)
  })
}

test('NewsletterForm: from the keyboard, Enter submits, the busy button keeps focus, then the success heading takes it', async ({
  page,
}) => {
  await page.goto('/components/newsletter-form')
  const form = page.getByRole('form', { name: 'Field notes by email' })
  await form.getByRole('textbox', { name: 'Email' }).focus()
  await page.keyboard.type('ana@example.com')
  await page.keyboard.press('Tab')
  const submit = form.locator('button[type="submit"]')
  await expect(submit).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(submit).toHaveAttribute('aria-busy', 'true')
  await expect(submit).toBeFocused()
  const heading = page.getByRole('heading', { name: 'You are subscribed' })
  await expect(heading).toBeFocused()
  await expect(page.getByText('Updates go to ana@example.com.')).toBeVisible()
  await expect(form).toHaveCount(0)
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true)
})

test('NewsletterForm: a rejected submit shows the alert, keeps the address and leaves focus on the button', async ({
  page,
}) => {
  await page.goto('/components/newsletter-form')
  const form = page.getByRole('form', { name: 'Restock alerts by email' })
  const field = form.getByRole('textbox', { name: 'Email' })
  await field.fill('ana@example.com')
  const submit = form.locator('button[type="submit"]')
  await submit.focus()
  await page.keyboard.press('Enter')
  await expect(form.getByRole('alert')).toHaveText('Something went wrong. Please try again.')
  await expect(field).toHaveValue('ana@example.com')
  await expect(submit).not.toHaveAttribute('aria-busy', 'true')
  await expect(submit).toBeFocused()
})

// ---- Footer -------------------------------------------------------------------------------
//
// One structure, two trees. The Footer renders each group title twice, as text and as a button,
// and container-query CSS shows one of them; jsdom evaluates no container query, so
// Footer.test.tsx can only prove the tree is right GIVEN the switch. These tests are the switch
// itself, in a browser, asked through the accessibility tree (roles), which is what a screen
// reader gets: a `display: none` element has no role to find.

const FOOTER_PAGE = '/components/footer'

test.describe('Footer: in a wide container it is a grid of plain lists', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  // Mutation: remove `@md:hidden` (NARROW_ONLY) from the button in Footer.tsx -> four buttons
  // are in the tree at this width and the first assertion fails.
  test('no group title is a button, every list is open, and the headings are named without the slash', async ({
    page,
  }) => {
    await page.goto(FOOTER_PAGE)
    const nav = page.getByRole('navigation', { name: 'Store footer' })
    await expect(nav.getByRole('heading', { level: 4 })).toHaveCount(4)
    await expect(nav.getByRole('button')).toHaveCount(0)
    for (const title of ['Shop', 'Support', 'Company', 'Elsewhere']) {
      // exact: the slash is drawn after the title and must be in neither name.
      await expect(nav.getByRole('heading', { level: 4, name: title, exact: true })).toBeVisible()
      await expect(nav.getByRole('list', { name: title, exact: true })).toBeVisible()
    }
    await expect(nav.getByRole('link')).toHaveCount(13)
    // Four across: the four groups share one row.
    const tops = await nav
      .locator('[data-footer-group]')
      .evaluateAll(groups => groups.map(group => Math.round(group.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
  })

  test('six groups lay out four across, then two', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    const groups = page.getByRole('navigation', { name: 'Six-group footer' }).locator('[data-footer-group]')
    await expect(groups).toHaveCount(6)
    const boxes = await groups.evaluateAll(all =>
      all.map(group => {
        const box = group.getBoundingClientRect()
        return { top: Math.round(box.top), left: Math.round(box.left) }
      })
    )
    expect(boxes.filter(box => box.top === boxes[0].top)).toHaveLength(4)
    expect(boxes[4].top).toBeGreaterThan(boxes[0].top)
    expect(boxes[4].left).toBe(boxes[0].left)
    expect(boxes[5].left).toBe(boxes[1].left)
  })

  // The corner mark: one corner of the crosshair before each link. It answers the link, not the
  // row, and its foot sits on the text baseline instead of floating beside the x-height.
  // Mutation: change `group-has-[a:hover]/link:` to `group-hover/link:` in CornerMark -> hovering
  // the empty end of the row colours the mark and the second colour assertion fails.
  test('the corner mark takes the signal colour when its link is hovered, and only then', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    const nav = page.getByRole('navigation', { name: 'Store footer' })
    const link = nav.getByRole('link', { name: 'Replicas', exact: true })
    const row = link.locator('xpath=..')
    const mark = row.locator('[data-footer-mark]')
    const tokens = await page.evaluate(() => {
      const probe = document.createElement('span')
      document.body.appendChild(probe)
      const read = (token: string) => {
        probe.style.color = `var(${token})`
        return getComputedStyle(probe).color
      }
      const out = { muted: read('--color-text-muted'), signal: read('--color-accent-signal-fill') }
      probe.remove()
      return out
    })
    const colour = () => mark.evaluate(el => getComputedStyle(el).borderLeftColor)
    await expect.poll(colour).toBe(tokens.muted)
    // The row is as wide as its column; its right end is empty space, not the link.
    const box = (await row.boundingBox())!
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2)
    await page.waitForTimeout(250)
    expect(await colour()).toBe(tokens.muted)
    await link.hover()
    await expect.poll(colour).toBe(tokens.signal)
    // On the baseline: the foot of the mark is inside the lower half of the text line box.
    const { markBottom, lineTop, lineBottom } = await row.evaluate(el => {
      const m = el.querySelector('[data-footer-mark]')!.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(el.querySelector('a')!)
      const line = range.getBoundingClientRect()
      return { markBottom: m.bottom, lineTop: line.top, lineBottom: line.bottom }
    })
    expect(markBottom).toBeGreaterThan((lineTop + lineBottom) / 2)
    expect(markBottom).toBeLessThan(lineBottom)
  })

  // The wordmark: one line of capitals exactly as wide as the footer, the last thing in it, its
  // feet cut off by the bottom edge. An image named by the string, so the name is said once.
  // Mutation: change `textLength={width}` to `textLength={width * 0.9}` in Wordmark (Footer.tsx)
  // -> the line ends a tenth short of the right edge and the right-edge assertion fails.
  test('the wordmark runs edge to edge, ends the footer, and is one image named by the brand', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    await page.evaluate(() => document.fonts.ready)
    const footer = page.locator('footer').filter({ has: page.getByRole('navigation', { name: 'Wordmark footer' }) })
    const mark = footer.getByRole('img', { name: 'Hexline', exact: true })
    await expect(mark).toBeVisible()
    await expect(footer.getByRole('img')).toHaveCount(1)
    // The name is in the footer once: no brand link, no second copy of the word.
    await expect(footer.getByRole('link', { name: 'Hexline', exact: true })).toHaveCount(0)
    const m = await mark.evaluate(svg => {
      const box = svg.getBoundingClientRect()
      const foot = svg.closest('footer')!.getBoundingClientRect()
      const line = svg.querySelector('text')!.getBoundingClientRect()
      const [, , viewWidth, viewHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number)
      return {
        left: box.left - foot.left,
        right: foot.right - box.right,
        gapBelow: foot.bottom - box.bottom,
        ratio: box.width / box.height,
        viewRatio: viewWidth / viewHeight,
        width: box.width,
        // The line's own box: its advance, which starts one side bearing before the first stroke.
        lineLeft: line.left - box.left,
        lineRight: line.right - box.right,
        // The letters run past the bottom edge, and the box clips them there.
        lineBelow: line.bottom - box.bottom,
        clipped: getComputedStyle(svg).overflow,
      }
    })
    // Edge to edge: the gutter that insets the groups does not inset the wordmark.
    expect(Math.abs(m.left)).toBeLessThanOrEqual(1)
    expect(Math.abs(m.right)).toBeLessThanOrEqual(1)
    // Nothing under it: no padding, no small print.
    expect(Math.abs(m.gapBelow)).toBeLessThanOrEqual(1)
    // Sized from its viewBox, which is sized from the letters: not from a font measurement.
    expect(m.ratio).toBeCloseTo(m.viewRatio, 1)
    // The line starts and ends within a side bearing (under 2% of the width) of the two edges.
    expect(m.lineLeft).toBeLessThanOrEqual(0)
    expect(m.lineLeft).toBeGreaterThan(-m.width * 0.02)
    expect(m.lineRight).toBeGreaterThanOrEqual(0)
    expect(m.lineRight).toBeLessThan(m.width * 0.02)
    expect(m.lineBelow).toBeGreaterThan(0)
    expect(m.clipped).toBe('hidden')
    // A footer with no wordmark and no backdrop has no closing block and so no reserved space.
    await expect(
      page
        .locator('footer')
        .filter({ has: page.getByRole('navigation', { name: 'Store footer' }) })
        .locator('[data-footer-closing]')
    ).toHaveCount(0)
  })

  // No layout shift when the web font swaps in, by construction: the box comes from a table of
  // advances, and `textLength` holds the line to it in whatever font is drawing. Here the web
  // fonts never arrive at all, and the wordmark is the box it is with them.
  // Mutation: remove `textLength` from the text in Wordmark -> in the fallback font the line is a
  // different width, and the two line boxes differ.
  test('the wordmark is the same box, and the same line, with the web font and without it', async ({ page, context }) => {
    const measure = async (target: Page) => {
      await target.goto(FOOTER_PAGE)
      await target.evaluate(() => document.fonts.ready)
      return target
        .locator('footer')
        .filter({ has: target.getByRole('navigation', { name: 'Wordmark footer' }) })
        .locator('[data-footer-wordmark]')
        .evaluate(svg => {
          const round = (box: DOMRect) => [box.left, box.top, box.width, box.height].map(value => Math.round(value))
          return {
            box: round(svg.getBoundingClientRect()),
            line: round(svg.querySelector('text')!.getBoundingClientRect()),
            // How many web font faces the page has: none when the font stylesheet never arrived.
            faces: document.fonts.size,
          }
        })
    }
    const withFont = await measure(page)
    const bare = await context.newPage()
    // Aborted font requests log errors from the font hosts, which the fixture does not count.
    await bare.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort())
    const withoutFont = await measure(bare)
    await bare.close()
    // The condition this test is about: the second page really had no web font to draw with.
    expect(withoutFont.faces).toBe(0)
    expect(withoutFont.box[2]).toBe(withFont.box[2])
    expect(withoutFont.box[3]).toBe(withFont.box[3])
    // The line: same left edge and same width, whichever font drew it.
    expect(Math.abs(withoutFont.line[0] - withFont.line[0])).toBeLessThanOrEqual(1)
    expect(Math.abs(withoutFont.line[2] - withFont.line[2])).toBeLessThanOrEqual(1)
  })

  // The backdrop: a layer behind the wordmark, the full width of the footer, with headroom over
  // the letters, and its size is there before anything is drawn in it.
  test('the backdrop layer fills the closing block behind the wordmark, full width, with headroom', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    const footer = page.locator('footer').filter({ has: page.getByRole('navigation', { name: 'Backdrop footer' }) })
    const layer = footer.locator('[data-footer-backdrop]')
    await expect(layer).toHaveAttribute('aria-hidden', 'true')
    const m = await layer.evaluate(el => {
      const box = el.getBoundingClientRect()
      const closing = el.parentElement!.getBoundingClientRect()
      const foot = el.closest('footer')!.getBoundingClientRect()
      const mark = el.parentElement!.querySelector('[data-footer-wordmark]')!.getBoundingClientRect()
      return {
        fills: [box.left - closing.left, box.top - closing.top, box.width - closing.width, box.height - closing.height],
        fullWidth: closing.width - foot.width,
        gapBelow: foot.bottom - closing.bottom,
        headroom: mark.top - closing.top,
        markAtBottom: closing.bottom - mark.bottom,
        pointer: getComputedStyle(el).pointerEvents,
        behind: Number(getComputedStyle(el).zIndex),
      }
    })
    for (const difference of m.fills) expect(Math.abs(difference)).toBeLessThanOrEqual(1)
    expect(Math.abs(m.fullWidth)).toBeLessThanOrEqual(1)
    expect(Math.abs(m.gapBelow)).toBeLessThanOrEqual(1)
    // At least 6rem of the layer shows above the letters.
    expect(m.headroom).toBeGreaterThanOrEqual(95)
    expect(Math.abs(m.markAtBottom)).toBeLessThanOrEqual(1)
    expect(m.pointer).toBe('none')
    expect(m.behind).toBeLessThan(0)
  })

  // "It must hold nothing focusable" is a rule the gate holds, not a sentence: the layer is
  // aria-hidden, so a control put there is hidden from a screen reader and still in the tab
  // order, and the axe run every page gets fails on it.
  test('a control put in the backdrop fails axe', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    await page.locator('[data-footer-backdrop]').evaluate(el => {
      const button = document.createElement('button')
      button.textContent = 'Spin'
      el.firstElementChild!.appendChild(button)
    })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(results.violations.map(violation => violation.id)).toContain('aria-hidden-focus')
  })

  // The aside at this page's width (the examples are 822px, under the 64rem at which the two
  // sections go side by side): under the link section, opening on the same hairline and title a
  // group does. The side-by-side form is held on the demo store, below.
  test('an aside sits under the link groups in a footer narrower than 64rem, headed like a group', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    const footer = page.locator('footer').filter({ has: page.getByRole('navigation', { name: 'Aside footer' }) })
    await expect(footer.getByRole('heading', { level: 4, name: 'Visit', exact: true })).toBeVisible()
    const m = await footer.evaluate(el => {
      const links = el.querySelector('[data-footer-links]')!.getBoundingClientRect()
      const aside = el.querySelector('[data-footer-aside]')!.getBoundingClientRect()
      return { under: aside.top - links.bottom, sameLeft: aside.left - links.left, sameWidth: aside.width - links.width }
    })
    expect(m.under).toBeGreaterThan(0)
    expect(Math.abs(m.sameLeft)).toBeLessThanOrEqual(1)
    expect(Math.abs(m.sameWidth)).toBeLessThanOrEqual(1)
  })

  // The switch is the width of the CONTAINER, not of the viewport: the same page, at the same
  // 1280px, holds a footer in a 24rem column, and that one is an accordion.
  test('a footer in a narrow container is an accordion at any viewport width', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    const nav = page.getByRole('navigation', { name: 'Compact footer' })
    const help = nav.getByRole('button', { name: 'Help', exact: true })
    const legal = nav.getByRole('button', { name: 'Legal', exact: true })
    await expect(help).toHaveAttribute('aria-expanded', 'false')
    // defaultOpen.
    await expect(legal).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link')).toHaveCount(2)
    await expect(nav.getByRole('link', { name: 'Terms' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Shipping' })).toHaveCount(0)
  })
})

test.describe('Footer: in a narrow container it is an accordion', () => {
  test.use({ viewport: { width: 320, height: 800 } })

  // Mutation: remove `!open && WIDE_ONLY` from the className of the list in Footer.tsx -> the
  // links of a closed group are in the tree and `toHaveCount(0)` fails.
  test('every group starts closed: a button inside its heading, its list out of the tree and the tab order', async ({
    page,
  }) => {
    await page.goto(FOOTER_PAGE)
    const nav = page.getByRole('navigation', { name: 'Store footer' })
    await expect(nav.getByRole('button')).toHaveCount(4)
    for (const title of ['Shop', 'Support', 'Company', 'Elsewhere']) {
      const button = nav.getByRole('button', { name: title, exact: true })
      await expect(button).toHaveAttribute('aria-expanded', 'false')
      // The accordion pattern: the button is the content of the heading, and the heading has the
      // title as its whole name (the text form of the title is gone, not doubled).
      await expect(nav.getByRole('heading', { level: 4, name: title, exact: true }).getByRole('button')).toHaveCount(1)
      // 44px tall, well over the 24px target minimum.
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    await expect(nav.getByRole('link')).toHaveCount(0)
    await expect(nav.getByRole('list')).toHaveCount(0)

    // Tab goes button to button: nothing in a closed group takes focus.
    await nav.getByRole('button', { name: 'Shop', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(nav.getByRole('button', { name: 'Support', exact: true })).toBeFocused()
  })

  test('from the keyboard: Enter opens a group and keeps focus, Tab enters its links, Space closes it', async ({
    page,
  }) => {
    await page.goto(FOOTER_PAGE)
    const nav = page.getByRole('navigation', { name: 'Store footer' })
    const shop = nav.getByRole('button', { name: 'Shop', exact: true })
    await shop.focus()
    await page.keyboard.press('Enter')
    await expect(shop).toHaveAttribute('aria-expanded', 'true')
    await expect(shop).toBeFocused()
    const list = nav.getByRole('list', { name: 'Shop', exact: true })
    await expect(list).toBeVisible()
    expect(await list.getAttribute('id')).toBe(await shop.getAttribute('aria-controls'))
    await expect(list.getByRole('link')).toHaveCount(4)
    // Only this group opened.
    await expect(nav.getByRole('link')).toHaveCount(4)
    await page.keyboard.press('Tab')
    await expect(list.getByRole('link', { name: 'Replicas', exact: true })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Space')
    await expect(shop).toHaveAttribute('aria-expanded', 'false')
    await expect(nav.getByRole('link')).toHaveCount(0)
    await expect(shop).toBeFocused()
  })

  for (const theme of THEMES) {
    test(`Footer: axe clean and no horizontal overflow with a group open in ${theme} theme`, async ({ page }) => {
      await page.goto(FOOTER_PAGE)
      await applyTheme(page, theme)
      const nav = page.getByRole('navigation', { name: 'Store footer' })
      await nav.getByRole('button', { name: 'Elsewhere', exact: true }).click()
      await expect(nav.getByRole('link', { name: /Site finder/ })).toBeVisible()
      await settleAnimations(page)
      await expectAxeClean(page)
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    })
  }

  // The state survives the switch, and the switch needs no reload: widening the viewport turns
  // the open accordion into the grid (no button left to announce), narrowing it brings the same
  // group back open.
  test('resizing across the breakpoint swaps the two forms with no reload', async ({ page }) => {
    await page.goto(FOOTER_PAGE)
    const nav = page.getByRole('navigation', { name: 'Store footer' })
    await nav.getByRole('button', { name: 'Support', exact: true }).click()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(nav.getByRole('button')).toHaveCount(0)
    await expect(nav.getByRole('link')).toHaveCount(13)
    await page.setViewportSize({ width: 320, height: 800 })
    await expect(nav.getByRole('button', { name: 'Support', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link')).toHaveCount(4)
  })
})

// The Footer as the demo store uses it: the link groups and the sign-up side by side, the
// disclaimer as the small print, and the wordmark closing the page. The docs page cannot show
// the side-by-side form (its examples are narrower than 64rem), so it is held here.
test.describe('Footer: on the demo store', () => {
  // Mutation: remove `@5xl:flex-row` from the two sections' wrapper in Footer.tsx -> the aside is
  // under the groups at 1280 and the first assertion fails.
  test('at 1280 the link groups are on the left, the sign-up on the right, both inside the page gutter', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/demo/care')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('heading', { level: 2, name: 'Field notes by email', exact: true })).toBeVisible()
    await expect(footer.getByRole('form', { name: 'Newsletter sign-up' })).toBeVisible()
    const brandX = await page
      .getByRole('banner')
      .getByRole('link', { name: 'Hexline', exact: true })
      .evaluate(el => el.getBoundingClientRect().left)
    const m = await footer.evaluate(el => {
      const box = (selector: string) => el.querySelector(selector)!.getBoundingClientRect()
      const links = box('[data-footer-links]')
      const aside = box('[data-footer-aside]')
      const foot = el.getBoundingClientRect()
      return {
        linksLeft: links.left,
        asideLeftOfLinksRight: aside.left - links.right,
        tops: Math.abs(aside.top - links.top),
        asideWidth: aside.width,
        asideRightInset: foot.right - aside.right,
        groupTops: [...el.querySelectorAll('[data-footer-group]')].map(group => Math.round(group.getBoundingClientRect().top)),
      }
    })
    expect(m.tops).toBeLessThanOrEqual(1)
    expect(m.asideLeftOfLinksRight).toBeGreaterThanOrEqual(32)
    // 21rem.
    expect(Math.round(m.asideWidth)).toBe(336)
    // The gutter is the page's: the groups start where the Navbar brand does, and the aside ends
    // the same distance from the other edge.
    expect(Math.abs(m.linksLeft - brandX)).toBeLessThanOrEqual(1)
    expect(Math.abs(m.asideRightInset - brandX)).toBeLessThanOrEqual(1)
    // Four groups, one row.
    expect(m.groupTops).toHaveLength(4)
    expect(new Set(m.groupTops).size).toBe(1)
    // The name once, the disclaimer as the small print, and no concept-store line.
    await expect(footer.getByRole('img')).toHaveCount(1)
    await expect(footer.getByRole('img', { name: 'Hexline', exact: true })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Hexline', exact: true })).toHaveCount(0)
    await expect(footer.getByText('Airsoft replicas for sport. Not firearms.', { exact: true })).toBeVisible()
    await expect(footer.getByText(/Nothing here is for sale/)).toHaveCount(0)
  })

  // The reflow gate's widths and the wide ones: at each, the wordmark is the viewport's width,
  // starts at its left edge whatever the gutter is, and its bottom edge is the document's.
  // Mutation: add `pb-6` to the footer when it has a wordmark (Footer.tsx) -> 24px of page are
  // under the wordmark and the last assertion fails at every width.
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    test(`at ${width}px the wordmark spans the page, touches its bottom edge and overflows nothing`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/demo/care')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const m = await page.getByRole('contentinfo').evaluate(el => {
        const mark = el.querySelector('[data-footer-wordmark]')!.getBoundingClientRect()
        return {
          left: mark.left,
          width: mark.width,
          viewport: document.documentElement.clientWidth,
          belowMark: document.documentElement.scrollHeight - (mark.bottom + window.scrollY),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
      })
      expect(Math.abs(m.left)).toBeLessThanOrEqual(1)
      expect(Math.abs(m.width - m.viewport)).toBeLessThanOrEqual(1)
      expect(Math.abs(m.belowMark)).toBeLessThanOrEqual(1)
      expect(m.overflow).toBeLessThanOrEqual(0)
    })
  }

  test('at 390 the sign-up is under the accordion, full width, and the footer still ends on the wordmark', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/demo/care')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('navigation', { name: 'Hexline footer' }).getByRole('button')).toHaveCount(4)
    const m = await footer.evaluate(el => {
      const links = el.querySelector('[data-footer-links]')!.getBoundingClientRect()
      const aside = el.querySelector('[data-footer-aside]')!.getBoundingClientRect()
      return { under: aside.top - links.bottom, sameLeft: aside.left - links.left, sameWidth: aside.width - links.width }
    })
    expect(m.under).toBeGreaterThan(0)
    expect(Math.abs(m.sameLeft)).toBeLessThanOrEqual(1)
    expect(Math.abs(m.sameWidth)).toBeLessThanOrEqual(1)
    await expect(footer.getByRole('form', { name: 'Newsletter sign-up' })).toBeVisible()
  })
})

test.describe('KanbanBoard', () => {
  const board = (page: Page) => page.getByRole('region', { name: 'Hiring board' })
  const column = (page: Page, title: string) => board(page).getByRole('list', { name: title })

  test('a pointer drag moves a card into an empty column', async ({ page }) => {
    await page.goto('/components/kanban-board')
    const card = column(page, 'Applied').getByRole('listitem').filter({ hasText: 'Ilse Varga' })
    const empty = board(page).getByText('Nothing here')
    await card.scrollIntoViewIfNeeded()
    const from = (await card.boundingBox())!
    const to = (await empty.boundingBox())!
    // Grab the card away from its Move control, then travel in steps: dnd-kit waits for 6px of
    // movement before it lifts the card, and collision detection runs on every move.
    await page.mouse.move(from.x + 24, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + 40, from.y + from.height / 2, { steps: 4 })
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
    await page.mouse.up()
    await expect(column(page, 'Offer').getByText('Ilse Varga')).toBeVisible()
    await expect(column(page, 'Applied').getByText('Ilse Varga')).toHaveCount(0)
  })

  test('a keyboard drag moves a card to the next column, announces it, and keeps focus on its Move control', async ({
    page,
  }) => {
    await page.goto('/components/kanban-board')
    const move = board(page).getByRole('button', { name: 'Move Tomas Reyes' })
    await move.focus()
    await page.keyboard.press('Space')
    await expect(page.getByText('Picked up Tomas Reyes. It is in Applied, position 2 of 3.')).toBeAttached()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(/^Tomas Reyes is over Screening, position \d of 2\.$/)).toBeAttached()
    // Arrows belong to the drag while the card is lifted: the Move menu never opens.
    await expect(page.getByRole('menu')).toHaveCount(0)
    await page.keyboard.press('Space')
    await expect(column(page, 'Screening').getByText('Tomas Reyes')).toBeVisible()
    await expect(column(page, 'Applied').getByText('Tomas Reyes')).toHaveCount(0)
    await expect(page.getByText(/^Tomas Reyes moved to Screening, position \d of 2\.$/)).toBeAttached()
    await expect(board(page).getByRole('button', { name: 'Move Tomas Reyes' })).toBeFocused()
  })

  test('Escape puts a lifted card back, and nothing moves', async ({ page }) => {
    await page.goto('/components/kanban-board')
    await board(page).getByRole('button', { name: 'Move Mara Lind' }).focus()
    await page.keyboard.press('Space')
    // dnd-kit starts listening for the next key a task after the lift (a setTimeout in its
    // KeyboardSensor), so each key waits for the announcement of the last, as a person would.
    await expect(page.getByText('Picked up Mara Lind. It is in Applied, position 3 of 3.')).toBeAttached()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(/^Mara Lind is over Screening/)).toBeAttached()
    // The card now sits in Screening, and its Move control there has focus.
    await expect(column(page, 'Screening').getByRole('button', { name: 'Move Mara Lind' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Move cancelled. Mara Lind is back in Applied, position 3 of 3.')).toBeAttached()
    await expect(column(page, 'Applied').getByText('Mara Lind')).toBeVisible()
  })

  test('the Move menu moves a card to the end of a column and focus follows the card', async ({ page }) => {
    await page.goto('/components/kanban-board')
    await board(page).getByRole('button', { name: 'Move Ilse Varga' }).focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem')).toHaveText(['Move to Screening', 'Move to Interview', 'Move to Offer'])
    await menu.getByRole('menuitem', { name: 'Move to Interview' }).click()
    await expect(column(page, 'Interview').getByRole('listitem').last()).toContainText('Ilse Varga')
    await expect(board(page).getByRole('button', { name: 'Move Ilse Varga' })).toBeFocused()
  })

  test('under reduced motion a keyboard drag still lands, with no transition on the cards', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/components/kanban-board')
    const move = board(page).getByRole('button', { name: 'Move Oskar Behn' })
    await move.focus()
    await page.keyboard.press('Space')
    await expect(page.getByText('Picked up Oskar Behn. It is in Screening, position 1 of 1.')).toBeAttached()
    const transition = await column(page, 'Screening')
      .getByRole('listitem')
      .first()
      .evaluate(el => (el as HTMLElement).style.transition)
    expect(transition).toBe('')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByText(/^Oskar Behn is over Interview/)).toBeAttached()
    await page.keyboard.press('Space')
    await expect(column(page, 'Interview').getByText('Oskar Behn')).toBeVisible()
  })

  test('the columns scroll inside the board at 320px, never the page', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/components/kanban-board')
    await expect(board(page)).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  for (const theme of THEMES) {
    // Not with the menu open: Radix's modal DropdownMenu hides the rest of the page with
    // aria-hidden while it is open, which axe reports as aria-hidden-focus on any page, for any
    // DropdownMenu. The page-wide axe run in guidelines.spec.ts covers the board at rest.
    test(`axe clean after a move from the Move menu, in ${theme} theme`, async ({ page }) => {
      await page.goto('/components/kanban-board')
      await applyTheme(page, theme)
      await board(page).getByRole('button', { name: 'Move Ana Petrescu' }).click()
      await expect(page.getByRole('menu')).toBeVisible()
      await page.getByRole('menuitem', { name: 'Move to Offer' }).click()
      await expect(column(page, 'Offer').getByText('Ana Petrescu')).toBeVisible()
      await settleAnimations(page)
      await expectAxeClean(page)
    })
  }
})
