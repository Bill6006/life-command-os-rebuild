import { expect, test, type Page } from '@playwright/test'

/**
 * The sticky header, over whatever is scrolling underneath it (QA-07-010).
 *
 * Sticking the header as one group fixed its members overlapping each other.
 * It did nothing about what is behind them, and the stale-build notice is a
 * translucent orange wash with no blur: at the top of a document the only
 * thing behind it is the page background, and halfway down one it is a window.
 * Scrolled text was drawn straight through the words "A newer build is
 * deployed".
 *
 * **Rectangles cannot see this.** QA's own first pass compared all three
 * header controls at four scroll positions and passed; the collision was found
 * by looking at a screenshot. So this compares the header's *pixels* at rest
 * against its pixels with a page scrolled underneath it. If anything shows
 * through, the two differ — which is the defect stated as an image rather than
 * as a geometry, and the only form that can catch it.
 *
 * The notice is made to appear by answering the app's own freshness request
 * with a different SHA. No product code is touched: `useBuildFreshness` reads
 * `build-info.json`, and this is what a genuinely stale tab would receive.
 */

const APP = '/life-command-os-rebuild/preview/'

/** Answer the freshness check with a different build, as a stale tab would. */
async function pretendANewerBuildIsDeployed(page: Page) {
  await page.route('**/build-info.json*', async (route) => {
    const response = await route.fetch()
    const info = (await response.json()) as Record<string, unknown>
    await route.fulfill({
      json: {
        ...info,
        commitSha: 'f'.repeat(40),
        commitShort: 'fffffff',
      },
    })
  })
}

async function headerPixels(page: Page): Promise<Buffer> {
  // Animations settle before either capture, or the two differ for a reason
  // that is not the defect.
  await page.waitForTimeout(600)
  return await page.locator('.shell__top').screenshot()
}

/** Scroll far enough that real content is behind the header. */
async function scrollUnderTheHeader(page: Page, to: number) {
  await page.evaluate((y) => window.scrollTo(0, y), to)
  await page.waitForTimeout(200)
}

test.describe('the sticky header is opaque to what scrolls under it — QA-07-010', () => {
  test('the stale-build notice reads the same at rest and over content', async ({ page }) => {
    await pretendANewerBuildIsDeployed(page)
    await page.goto(`${APP}#/data`)
    await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()
    await expect(page.locator('.build-notice')).toBeVisible()

    const atRest = await headerPixels(page)

    await scrollUnderTheHeader(page, 1500)
    // There really is content behind it now — otherwise this proves nothing.
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled, 'the page did not scroll, so nothing was behind the header').toBeGreaterThan(
      400,
    )

    const overContent = await headerPixels(page)

    expect(overContent.equals(atRest), 'page content is visible through the sticky header').toBe(
      true,
    )
  })

  test('holds with both notices, at the Restore panel', async ({ page }) => {
    // The stacked case: the laboratory notice is opaque and the build notice is
    // not, so this is where a per-member fix would show its seam.
    await pretendANewerBuildIsDeployed(page)
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /Two ordinary weeks/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('Two ordinary weeks')

    await page.goto(`${APP}#/data`)
    await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()
    await expect(page.locator('.build-notice')).toBeVisible()
    await expect(page.locator('.lab-notice')).toBeVisible()

    const atRest = await headerPixels(page)

    await page.getByTestId('restore-blocked').scrollIntoViewIfNeeded()
    await scrollUnderTheHeader(page, await page.evaluate(() => window.scrollY))
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(400)

    expect(
      (await headerPixels(page)).equals(atRest),
      'page content is visible through the stacked sticky header',
    ).toBe(true)
  })

  test('holds on an ordinary destination, not only on Data', async ({ page }) => {
    await pretendANewerBuildIsDeployed(page)
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /Nine months of evenings/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('Nine months of evenings')

    await page.goto(`${APP}#/timeline`)
    await expect(page.getByRole('heading', { level: 1, name: 'Timeline' })).toBeVisible()
    await expect(page.locator('.build-notice')).toBeVisible()

    const atRest = await headerPixels(page)

    await scrollUnderTheHeader(page, 1200)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(400)

    expect(
      (await headerPixels(page)).equals(atRest),
      'Timeline content is visible through the sticky header',
    ).toBe(true)
  })

  test('every member of the group sits on something opaque', async ({ page }) => {
    /*
     * The structural half, so the reason survives a refactor that keeps the
     * screenshots passing by accident. Whatever a member's own tint is, there
     * has to be an opaque surface under it inside the group.
     */
    await pretendANewerBuildIsDeployed(page)
    await page.goto(`${APP}#/data`)
    await expect(page.locator('.build-notice')).toBeVisible()

    const opaque = await page.evaluate(() => {
      const group = document.querySelector('.shell__top')
      if (group === null) return false
      const background = getComputedStyle(group).backgroundColor
      // `rgb(...)` carries no alpha and is opaque. Only `rgba(...)` can be
      // translucent, and only its fourth component says so — reading the
      // fourth number out of `rgb(20, 23, 31)` finds the blue channel, which
      // is how the first version of this check failed on a correct fix.
      const translucent = /^rgba\(/.test(background)
      if (!translucent) return /^rgb\(/.test(background)
      const alpha = /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/.exec(background)
      return alpha !== null && Number(alpha[1]) === 1
    })

    expect(opaque, 'the sticky header group has no opaque backing').toBe(true)
  })
})
