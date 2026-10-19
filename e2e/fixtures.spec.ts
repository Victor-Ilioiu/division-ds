import { test } from './fixtures'

// The fixture's own canary, the job src/test/harness.test.tsx does for the axe matcher: a guard
// that cannot fail is worse than none. `test.fail()` inverts the result, so this passes only while
// a console.error really does fail the test that logged it.
test('the console fixture fails a test that logs console.error', async ({ page }) => {
  test.fail()
  await page.goto('/')
  await page.evaluate(() => console.error('fixture canary'))
})
