import { expect, test, type Page } from '@playwright/test'

/**
 * Timeline, Insights and Now's evidence, on a real phone-sized screen
 * (canonical plan sections 26, 27 and 51).
 *
 * The synthetic suite proves what the kernel concludes. These prove what the
 * owner can actually reach and read: that the machinery stays closed until
 * asked for, that a figure never arrives without the sentence naming what it
 * measures, that Timeline offers nothing to press, and that private detail is
 * nowhere on either surface.
 *
 * Phase 4's own record is why this file measures geometry as well as text —
 * five defects invisible at three desktop widths.
 */

const APP = '/life-command-os-rebuild/preview/'

async function loadInQa(page: Page, title: string) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

async function go(page: Page, destination: 'Timeline' | 'Insights' | 'Now') {
  await page.locator('.nav').getByRole('button', { name: destination }).click()
  await expect(page.getByRole('heading', { level: 1, name: destination })).toBeVisible()
}

async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

test.describe('Timeline reads as a record', () => {
  test('groups by day, newest first, in words a person would use', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Timeline')

    const days = page.locator('.tl-day__label')
    await expect(days.first()).toHaveText('Today')
    expect(await days.count()).toBeGreaterThan(3)

    // No machine identifier where a person expects a date — DEF-0029's class.
    for (const text of await days.allTextContents()) {
      expect(text).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  test('says what became of a suggestion by naming the suggestion', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Timeline')

    const body = await page.locator('main').innerText()
    expect(body).toContain('Followed through — clearing the kitchen.')
    expect(body).not.toContain('a suggestion here')
  })

  test('tells a result from an effect on the same episode', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Timeline')

    const body = await page.locator('main').innerText()
    expect(body).toContain('How far clearing the kitchen got:')
    expect(body).toContain('What clearing the kitchen was worth:')
  })

  test('grows on request rather than rendering a lifetime at once', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Timeline')

    const before = await page.locator('.tl-entry').count()
    expect(before).toBeLessThanOrEqual(40)

    await page.getByRole('button', { name: /Show earlier/ }).click()
    expect(await page.locator('.tl-entry').count()).toBeGreaterThan(before)
  })

  test('offers nothing to press but the pager', async ({ page }) => {
    /*
     * Section 26 — Timeline must never create a phantom actionable item from
     * corrupt data. Asserted as the stronger property: there is nothing on the
     * surface to create.
     */
    await loadInQa(page, 'A file with damage in it')
    await go(page, 'Timeline')

    const buttons = page.locator('main button')
    for (const label of await buttons.allTextContents()) {
      expect(label).toMatch(/Show earlier/)
    }
    await expect(page.locator('main input, main textarea, main select')).toHaveCount(0)
  })

  test('reports the rows it could not read, apart from the record', async ({ page }) => {
    await loadInQa(page, 'A file with damage in it')
    await go(page, 'Timeline')

    await expect(page.getByTestId('tl-damaged')).toBeVisible()
    // The readable history is still there, above and unaffected.
    expect(await page.locator('.tl-entry').count()).toBeGreaterThan(0)
    await expect(page.getByText('are not used for anything')).toBeVisible()
  })

  test('keeps the private row and withholds what it says', async ({ page }) => {
    await loadInQa(page, 'Two ordinary weeks')
    await go(page, 'Timeline')

    const body = await page.locator('main').innerText()
    // Section 11: show that it exists, not what it says. Never drop the row.
    expect(body).toContain('Private entry')
    expect(body.toLowerCase()).not.toContain('late scrolling')
  })

  test('pins nothing of its own under the app bar', async ({ page }) => {
    /*
     * Found by measuring, and the first version of this test was wrong in an
     * instructive way.
     *
     * The defect was real: the day label was `position: sticky`, and the app
     * bar is sticky in the same scroll container, so a stuck heading came to
     * rest *behind* it — measured at 8–38px under a bar occupying 0–53px.
     *
     * The first test asserted that no heading ever intersects the bar, which
     * cannot hold and should not: ordinary content scrolls underneath a sticky
     * translucent bar by design, and it passed at 360px only because the scroll
     * position happened to be kind. The property that actually distinguishes
     * the defect from normal scrolling is whether Timeline pins anything at
     * all, so that is what is asserted.
     */
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Timeline')

    const pinned = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter((element) => {
          const position = getComputedStyle(element).position
          return position === 'sticky' || position === 'fixed'
        })
        .map((element) => element.className || element.tagName),
    )
    expect(pinned, 'Timeline pins something of its own').toEqual([])
  })

  test('does not overflow sideways on a long history', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Timeline')
    await page.getByRole('button', { name: /Show earlier/ }).click()
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

test.describe('Insights says what it has worked out', () => {
  test('opens as sentences, with no figure on screen until asked', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Insights')

    // Section 27: "do not display research machinery by default."
    await expect(page.getByTestId('insight-evidence')).toHaveCount(0)
    expect(await page.locator('main').innerText()).not.toContain('%')

    await expect(page.getByTestId('insight-context-effect')).toBeVisible()
    await expect(
      page.getByText('Clearing the kitchen goes better on a weekday than at the weekend.'),
    ).toBeVisible()
  })

  test('opens the evidence on one card at a time', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Insights')

    await page.getByRole('button', { name: /See the evidence for: Clearing the kitchen/ }).click()
    await expect(page.getByTestId('insight-evidence')).toHaveCount(1)

    await page.getByRole('button', { name: /See the evidence for: Getting out for a walk/ }).click()
    await expect(page.getByTestId('insight-evidence')).toHaveCount(1)
  })

  test('never shows a figure without the sentence naming what it measures', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Insights')
    await page.getByRole('button', { name: /See the evidence for: Clearing the kitchen/ }).click()

    const rates = page.locator('.ev-rate')
    expect(await rates.count()).toBeGreaterThan(1)
    for (let index = 0; index < (await rates.count()); index += 1) {
      const block = rates.nth(index)
      const measures = (await block.locator('.ev-rate__measures').innerText()).trim()
      expect(measures.length, 'a figure with nothing saying what it measures').toBeGreaterThan(10)
      const figure = block.locator('.ev-rate__percent')
      if ((await figure.count()) === 0) continue
      // The count travels with the percentage, always.
      await expect(block.locator('.ev-rate__of')).toContainText(/\d+ of \d+/)
    }
  })

  test('says what it is watching rather than manufacturing a figure', async ({ page }) => {
    await loadInQa(page, 'A month of what actually worked')
    await go(page, 'Insights')

    await expect(page.getByText('Still gathering')).toBeVisible()
    await expect(page.getByText(/2 so far — 2 more occasions like these/).first()).toBeVisible()
  })

  test('says nothing at all rather than inventing a pattern', async ({ page }) => {
    await loadInQa(page, 'One answer, and a lot of silence')
    await go(page, 'Insights')

    await expect(page.getByText('Nothing worth saying here yet')).toBeVisible()
    expect(await page.locator('main').innerText()).not.toContain('%')
  })

  test('offers a way to disagree with a belief it states', async ({ page }) => {
    await loadInQa(page, 'A month of what actually worked')
    await go(page, 'Insights')
    await page
      .getByRole('button', { name: /See the evidence for/ })
      .first()
      .click()

    await expect(
      page.getByRole('button', { name: /Not right — stop the app assuming/ }),
    ).toBeVisible()
  })

  test('puts the private area on no card of its own', async ({ page }) => {
    // Section 11 — the app does not raise the private domain unprompted. It is
    // still reported on Life and on its own page.
    await loadInQa(page, 'Two ordinary weeks')
    await go(page, 'Insights')

    const body = (await page.locator('main').innerText()).toLowerCase()
    expect(body).not.toContain('private / sexual health')
    expect(body).not.toContain('late scrolling')
  })

  test('does not overflow sideways with every card open', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Insights')
    await page
      .getByRole('button', { name: /See the evidence for/ })
      .first()
      .click()
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Now
// ---------------------------------------------------------------------------

test.describe('the evidence behind the move on Now', () => {
  test('is one closed link, and adds nothing else to the screen', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Now')

    await expect(page.getByTestId('now-see-evidence')).toBeVisible()
    await expect(page.getByTestId('now-evidence')).toHaveCount(0)
    // Section 51 — Now stays action-first. No figure until it is asked for.
    expect(await page.locator('main').innerText()).not.toContain('%')
  })

  /**
   * The same nine months, read on the Friday — AUD-0035.
   *
   * "Nine months of evenings" is written around clearing the kitchen: it helped
   * on all six weekday evenings and on two of six weekends, and the scenario's
   * own clock stands on a Saturday. Before the instrument was re-cut, the app
   * offered the kitchen on both — 5.3 units of dead weight compressed every
   * candidate toward the middle and the ordering came out of the compression.
   * It now offers the kitchen on the Friday and something else on the Saturday,
   * which is the app acting on the split this panel describes.
   *
   * So the panel is opened on the day the move is on. That is not a convenience:
   * the evidence panel explains the move on screen, and on the Saturday the
   * kitchen is not the move on screen.
   */
  async function onTheWeekdayBefore(page: Page) {
    await loadInQa(page, 'Nine months of evenings')
    await page.getByRole('button', { name: '−1 day' }).click()
    await go(page, 'Now')
  }

  test('opens real evidence for the move actually on screen', async ({ page }) => {
    await onTheWeekdayBefore(page)

    const move = await page.locator('.primary-surface__headline').innerText()
    await page.getByTestId('now-see-evidence').click()

    const panel = page.getByTestId('now-evidence')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('12 occasions in the record are like this evening.')
    /*
     * "you said", since D-089 and QA-A1. This panel used to read "how often
     * clearing the kitchen made a difference afterwards — 67% — 8 of 12", which
     * asserts an observed fact about the world over a count of the occasions
     * the owner said so. The eight are his judgments and the sentence now says
     * whose they are.
     */
    await expect(panel).toContainText(
      'How often you said clearing the kitchen made a difference afterwards',
    )
    expect(move).toContain('the kitchen')
  })

  test('says which side of a context split tonight falls on', async ({ page }) => {
    /*
     * The line that reconciles the app's own cautious conclusion with the
     * plainer tally beside it. Without it the panel states a split and leaves
     * the reader to work out which half applies to tonight.
     */
    await onTheWeekdayBefore(page)
    await page.getByTestId('now-see-evidence').click()

    const panel = page.getByTestId('now-evidence')
    await expect(panel).toContainText('6 of 6 on a weekday, 2 of 6 at the weekend.')
    await expect(panel).toContainText('This evening is on a weekday.')
  })

  test('states the belief in the same words Now already used', async ({ page }) => {
    await onTheWeekdayBefore(page)

    const onScreen = await page.getByTestId('now-rests-on').innerText()
    await page.getByTestId('now-see-evidence').click()
    const belief = onScreen.replace('Not how it went', '').trim()
    await expect(page.getByTestId('now-evidence')).toContainText(belief)
  })

  test('says nothing like tonight rather than a figure over nothing', async ({ page }) => {
    await loadInQa(page, 'A topic that keeps slipping')
    await go(page, 'Now')
    await page.getByTestId('now-see-evidence').click()

    const panel = page.getByTestId('now-evidence')
    await expect(panel).toContainText('Nothing in the record is much like this evening yet.')
    await expect(panel.locator('.ev-rate')).toHaveCount(0)
    await expect(panel).toContainText('Too early to say')
  })

  test('asks for a reading rather than a grade of what a move did', async ({ page }) => {
    /*
     * QA-A1, on the surface it was found on. The app used to ask "How much did
     * a walk do for you?" and offer four grades of difference — the causal
     * question the system exists to answer, handed to the owner. It now asks
     * for the reading and works the rest out.
     */
    await loadInQa(page, 'Two months of readings, and nothing graded')
    await go(page, 'Insights')
    await expect(page.getByTestId('insight-state-association')).toBeVisible()
    await expect(
      page.getByText(/has more often been higher after a walk than without one/),
    ).toBeVisible()

    // And the finding reaches the panel behind the decision, not only Insights.
    await go(page, 'Now')
    await page.getByTestId('now-see-evidence').click()
    const panel = page.getByTestId('now-evidence')
    await expect(panel).toContainText('What the record shows follows it')
    await expect(panel).toContainText('11 of 14 against 4 of 14')
    expect(await panel.innerText()).not.toMatch(/\bcauses?\b|\bimproves?\b/i)
  })

  test('closes again, and the entry point is a real touch target', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Now')

    const link = page.getByTestId('now-see-evidence')
    const box = await link.boundingBox()
    expect(box?.height ?? 0, 'section 37 — 44px minimum').toBeGreaterThanOrEqual(44)

    await link.click()
    await expect(page.getByTestId('now-evidence')).toBeVisible()
    await link.click()
    await expect(page.getByTestId('now-evidence')).toHaveCount(0)
  })

  test('does not overflow sideways with the panel open', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await go(page, 'Now')
    await page.getByTestId('now-see-evidence').click()
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0)
  })
})
