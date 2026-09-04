import { expect, test, type Page } from '@playwright/test'

/**
 * Routing 94 on a real screen — the check-in, the readings and the score.
 *
 * ## Why this file drives a fresh store and a fake clock
 *
 * Routing 93's own record says its first full matrix passed *"exactly the count
 * routing 92 left behind, because not one browser spec had changed"* — a gate
 * that covered nothing and read as evidence. The lesson is not *write a spec*;
 * it is *drive the thing the phase built through the owner's own controls.*
 *
 * The check-in is **scheduled**, so the hour is not decoration here: before
 * 08:00 there is nothing to open, and every assertion about a slot is an
 * assertion about a time of day. `page.clock` is the only honest way to stand
 * in one — the QA laboratory would give a synthetic history and this phase's
 * claim is about an ordinary store with nothing in it, which is the store that
 * was measured at **one question a day** before this phase existed.
 *
 * Three widths, because routing 4's record is five defects invisible at desktop
 * — and the anchors are the longest owner-facing strings this app has ever put
 * on a button.
 */

const APP = '/life-command-os-rebuild/preview/'

test.use({ timezoneId: 'UTC' })

/** A Wednesday, inside the morning check-in's window. There is no DST in UTC. */
const WEDNESDAY_0830 = new Date('2026-03-04T08:30:00Z')
/** And before the first one opens. */
const WEDNESDAY_0600 = new Date('2026-03-04T06:00:00Z')

async function open(page: Page, at: Date, hash = '#/check-in') {
  await page.clock.install({ time: at })
  await page.goto(`${APP}${hash}`)
}

async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/** Answer the reading on screen by pressing one of its anchors. */
async function tapAnchor(page: Page, index: number) {
  const anchors = page.locator('.checkin-anchor')
  await expect(anchors.first()).toBeVisible()
  await anchors.nth(index).click()
}

// ---------------------------------------------------------------------------
// The ritual, driven
// ---------------------------------------------------------------------------

test.describe('the check-in is a real screen with real answers on it', () => {
  test('opens the morning check-in and counts its thirteen readings', async ({ page }) => {
    await open(page, WEDNESDAY_0830)

    await expect(page.getByRole('heading', { level: 1, name: 'Check-in' })).toBeVisible()
    await expect(page.getByTestId('checkin-open')).toContainText('Morning check-in')
    await expect(page.getByTestId('checkin-progress')).toHaveText('0 of 13 answered')

    // Five anchors, and every one of them a sentence rather than a grade.
    await expect(page.locator('.checkin-anchor')).toHaveCount(5)
    const first = await page.getByTestId('checkin-question').innerText()
    expect(first.length, 'the question is not a question').toBeGreaterThan(10)
  })

  test('records an answer and moves to the next reading', async ({ page }) => {
    await open(page, WEDNESDAY_0830)
    const question = page.getByTestId('checkin-question')
    const asked = await question.innerText()

    await tapAnchor(page, 2)

    await expect(page.getByTestId('checkin-progress')).toHaveText('1 of 13 answered')
    await expect(question).not.toHaveText(asked)
  })

  test('shows a figure the moment the first reading lands, and says what it is over', async ({
    page,
  }) => {
    /*
     * The phase's own promise, and the one thing it can actually deliver
     * against *"asked but never learned"*: **what he can see today for what he
     * answered today.** One tap, and the reading is on the same screen with its
     * denominator beside it.
     */
    await open(page, WEDNESDAY_0830)
    await expect(page.getByTestId('checkin-score-unknown')).toBeVisible()

    await tapAnchor(page, 4)

    const figure = page.getByTestId('checkin-score-figure')
    await expect(figure).toBeVisible()
    await expect(page.getByTestId('checkin-score-figure')).toContainText('out of 100')
    await expect(page.getByTestId('checkin-score-basis')).toContainText('From 1 of the 10')
    await expect(page.getByTestId('checkin-score-weighting')).toContainText('same')
  })

  test('puts no per-cent sign and no verdict anywhere on the screen', async ({ page }) => {
    /*
     * D-287's line, on the rendered page rather than in the source. The number
     * stays a reading only while it never acquires a quality word, and the
     * per-cent sign is the shared evidence component's alone.
     */
    await open(page, WEDNESDAY_0830)
    await tapAnchor(page, 3)

    const main = await page.locator('main').innerText()
    expect(main, 'a per-cent sign reached an owner screen').not.toContain('%')
    for (const verdict of ['good day', 'bad day', 'falling behind', 'on track', 'wellbeing']) {
      expect(main.toLowerCase(), `the screen says "${verdict}"`).not.toContain(verdict)
    }
  })

  test('shows the words he tapped back to him, not the number', async ({ page }) => {
    await open(page, WEDNESDAY_0830)
    const anchors = page.locator('.checkin-anchor')
    const chosen = (await anchors.nth(1).innerText()).trim()
    await anchors.nth(1).click()

    await expect(page.locator('.checkin-reading__answer').first()).toContainText(chosen)
  })

  test('says nothing is open before the first check-in of the day', async ({ page }) => {
    await open(page, WEDNESDAY_0600)
    await expect(page.getByTestId('checkin-closed')).toBeVisible()
    await expect(page.getByTestId('checkin-closed-note')).toContainText('08:00')
    await expect(page.locator('.checkin-anchor')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// The card on Now, and the setting on More
// ---------------------------------------------------------------------------

test.describe('the check-in is reachable from where the owner already is', () => {
  test('offers it from Now while one is open, and stops once it is finished', async ({ page }) => {
    await open(page, WEDNESDAY_0830, '#/now')
    const card = page.getByTestId('now-check-in')
    await expect(card).toBeVisible()
    await expect(page.getByTestId('now-check-in-note')).toContainText('13 readings still')

    await card.getByRole('link', { name: 'Open the check-in' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Check-in' })).toBeVisible()
  })

  test('carries the depth and frequency controls on More, with the trade on them', async ({
    page,
  }) => {
    await open(page, WEDNESDAY_0830, '#/more')
    const panel = page.getByTestId('checkin-settings')
    await expect(panel).toBeVisible()
    // D-293's default, on screen rather than only in the record.
    await expect(page.getByTestId('checkin-settings-current')).toContainText('23 readings a day')
    // D-285's requirement: the trade is stated on the control itself.
    await expect(page.getByTestId('checkin-depth-trade')).toContainText(
      'Fewer readings will not produce the best results',
    )
    await expect(page.getByTestId('checkin-depth-full')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('checkin-frequency-three')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('changes what the check-in asks when the depth changes', async ({ page }) => {
    /*
     * The control does something, driven end to end: press a level on More, go
     * to the check-in, and the ritual is a different size. A settings panel that
     * writes a record nothing reads is the shape D-161 exists to catch.
     */
    await open(page, WEDNESDAY_0830, '#/more')
    await page.getByTestId('checkin-depth-fewest').click()
    await expect(page.getByTestId('checkin-depth-fewest')).toHaveAttribute('aria-pressed', 'true')

    await page.goto(`${APP}#/check-in`)
    await expect(page.getByTestId('checkin-progress')).toHaveText('0 of 5 answered')
  })

  test('says what a reminder can and cannot do', async ({ page }) => {
    // The honest half. No service worker ships, so a reminder cannot arrive
    // while the app is closed, and the control says so rather than letting him
    // find out on a morning he needed it.
    await open(page, WEDNESDAY_0830, '#/more')
    await expect(page.getByTestId('checkin-reminders')).toContainText(
      'Nothing appears when it is closed',
    )
  })
})

// ---------------------------------------------------------------------------
// Geometry — the anchors are the longest strings this app puts on a button
// ---------------------------------------------------------------------------

test.describe('the readings fit the screen they are read on', () => {
  test('never scrolls sideways, at any width', async ({ page }) => {
    await open(page, WEDNESDAY_0830)
    await expect(page.locator('.checkin-anchor').first()).toBeVisible()
    expect(await sidewaysOverflow(page), 'the check-in scrolls sideways').toBeLessThanOrEqual(0)

    await page.goto(`${APP}#/more`)
    await expect(page.getByTestId('checkin-settings')).toBeVisible()
    expect(await sidewaysOverflow(page), 'the settings scroll sideways').toBeLessThanOrEqual(0)
  })

  test('gives every anchor a thumb-sized target and shows all of its words', async ({ page }) => {
    /*
     * Section 37's minimum, and the truncation check beside it. An anchor whose
     * clause is clipped is an unreadable answer — and the Linux runner's wider
     * font fallback is where a truncation Windows hides shows up, which is why
     * this measures the rendered box rather than trusting the design.
     */
    await open(page, WEDNESDAY_0830)
    const anchors = page.locator('.checkin-anchor')
    // Wait for the store to open before counting. `count()` does not retry, and
    // the screen renders "Opening your history…" first — so an unwaited count
    // reads zero and passes any assertion phrased as "no anchor is too small".
    await expect(anchors.first()).toBeVisible()
    const count = await anchors.count()
    expect(count).toBe(5)

    for (let i = 0; i < count; i += 1) {
      const anchor = anchors.nth(i)
      const box = await anchor.boundingBox()
      expect(box, `anchor ${i} has no box`).not.toBeNull()
      expect(box!.height, `anchor ${i} is under the touch minimum`).toBeGreaterThanOrEqual(44)

      const clipped = await anchor.evaluate(
        (element) => element.scrollWidth > element.clientWidth + 1,
      )
      expect(clipped, `anchor ${i} is cut off`).toBe(false)
    }
  })

  test('keeps every reading row readable once they are all answered', async ({ page }) => {
    // The screen at its longest: thirteen answered readings, a figure and the
    // budget. Nothing here should need a horizontal scroll to read.
    await open(page, WEDNESDAY_0830)
    await expect(page.locator('.checkin-anchor').first()).toBeVisible()
    for (let i = 0; i < 13; i += 1) {
      const anchors = page.locator('.checkin-anchor')
      if ((await anchors.count()) === 0) break
      await anchors.nth(2).click()
      await expect(
        page.getByTestId('checkin-progress').or(page.getByTestId('checkin-done')),
      ).toBeVisible()
    }

    await expect(page.getByTestId('checkin-done')).toBeVisible()
    await expect(page.getByTestId('checkin-done-note')).toContainText('All 13 answered')
    await expect(page.getByTestId('checkin-score-basis')).toContainText('From 10 of the 10')
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0)

    // And every one of the thirteen is on the page with the words he tapped.
    await expect(page.getByTestId('checkin-reading')).toHaveCount(13)
  })
})
