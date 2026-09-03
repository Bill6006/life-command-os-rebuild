import { expect, test, type Page } from '@playwright/test'

/**
 * What routing 93 concluded, on a real phone-sized screen.
 *
 * ## Why this file exists at all
 *
 * The phase's first full matrix passed **849 of 849 — exactly the count routing
 * 92 left behind**, because not one browser spec had changed. Every new reading
 * was proved through the builders the screens call and none of them through a
 * rendered screen. That is DEF-0165's lesson wearing a different costume: a gate
 * that passes without covering the claim reads as evidence and is not.
 *
 * ## What is covered, and what honestly is not
 *
 * Two of this phase's readings are reachable from the QA laboratory's own
 * scenarios, so they are asserted here on real DOM at three widths:
 *
 * - **the recovery run** (AUD-0009) — the shortfall said in nights rather than in
 *   one night, and the course that follows it naming how many;
 * - **the week's load** (AUD-0007) — the heavy week, and the count it was read
 *   from.
 *
 * The rest of the phase's readings — the trajectory card, the study interval, the
 * alongside row, the cue, the review readings — need histories no shipped
 * scenario holds, which is stated plainly in the QA handoff rather than papered
 * over here. **A spec that loaded a scenario and asserted nothing appeared would
 * be worse than this file's silence**, because it would read as coverage.
 *
 * Phase 4's record is why geometry is measured beside the words: five defects
 * invisible at three desktop widths.
 */

const APP = '/life-command-os-rebuild/preview/'

/** The evening of three broken nights — `running-on-empty`. */
const EVENING = 'Three broken nights, and a deadline'
/** The morning after them — `morning-after-bad-nights`. */
const MORNING = 'A morning after three bad nights'

async function loadInQa(page: Page, title: string) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

async function go(page: Page, destination: 'Now' | 'Insights') {
  await page.locator('.nav').getByRole('button', { name: destination }).click()
  await expect(page.getByRole('heading', { level: 1, name: destination })).toBeVisible()
}

async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

// ---------------------------------------------------------------------------
// AUD-0009 — three poor nights are not one poor night, and the screen says so
// ---------------------------------------------------------------------------

test.describe('the shortfall is read as a run of nights', () => {
  test('names the hours and the nights it counted', async ({ page }) => {
    await loadInQa(page, EVENING)
    await go(page, 'Now')

    const reason = await page.locator('main').innerText()
    // The figure and the span it was read over, in the same sentence: a number
    // without what it measures is the thing Insights has never been allowed to
    // do, and Now inherits the rule.
    expect(reason).toMatch(/\d+ hours down over the last \d+ nights/)
    expect(reason).toContain("more than one night's worth")
  })

  test('says it from his record rather than from a study', async ({ page }) => {
    /*
     * §13C's line, on the screen rather than in a comment. The span comes from
     * the hours he reported; the research that suggested the shape of the
     * question stays in the decision log, and the owner is never told what
     * people generally need.
     */
    await loadInQa(page, EVENING)
    await go(page, 'Now')

    const body = await page.locator('main').innerText()
    expect(body).not.toMatch(/research|\bstudy shows\b|on average|typically|most people/i)
  })

  test('offers a course that says how many nights it is', async ({ page }) => {
    // The run reaches the owner as a bounded course with its length in words —
    // never "keep going" with no end, which is the shape a thread may not take.
    await loadInQa(page, EVENING)
    await go(page, 'Now')

    const offer = page.locator('main')
    await expect(offer).toContainText(/three quiet nights in a row/i)
    await expect(offer).toContainText(/stop it any time/i)
  })

  test('reads the same way in the morning as in the evening', async ({ page }) => {
    /*
     * The run is a fact about the nights behind him, so it does not change
     * because he opened the app at ten in the morning. What changes is the move
     * it justifies — a light day rather than an evening's recovery — and that
     * separation is the reading being about the record rather than the hour.
     */
    await loadInQa(page, MORNING)
    await go(page, 'Now')

    const body = await page.locator('main').innerText()
    expect(body).toMatch(/\d+ hours down over the last \d+ nights/)
    expect(body).toContain("more than one night's worth")
  })

  test('does not overflow sideways with the course on screen', async ({ page }) => {
    await loadInQa(page, EVENING)
    await go(page, 'Now')
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// AUD-0007 — a heavy week is heavy, and a light one says nothing
// ---------------------------------------------------------------------------

test.describe("the week's load is stated with what it was read from", () => {
  test('says the week was heavy, and how far short', async ({ page }) => {
    await loadInQa(page, EVENING)
    await go(page, 'Insights')

    const card = page.locator('main')
    await expect(card).toContainText(/the week has been a heavy one/i)
    // "The week has been a heavy one" rather than "this has been a heavy week":
    // G-001's orphan-pronoun class, which this sentence was rewritten to clear.
    const body = await card.innerText()
    expect(body).not.toMatch(/\bThis has been a heavy\b/)
  })

  test('shows the count behind the claim rather than the claim alone', async ({ page }) => {
    /*
     * Section 27's rule, and the reason a load reading is allowed on Insights at
     * all: the card states what it counted — nights recorded, demanding moves
     * finished, times he said he could not — so the owner can disagree with the
     * evidence rather than only with the conclusion.
     */
    await loadInQa(page, EVENING)
    await go(page, 'Insights')

    const body = await page.locator('main').innerText()
    expect(body).toMatch(/across the last seven days/i)
    expect(body).toMatch(/\d+ nights of sleep recorded/i)
    expect(body).toMatch(/\d+ demanding moves? finished/i)
    expect(body).toMatch(/\d+ times? you said you could not/i)
  })

  test('promises nothing about the week ahead', async ({ page }) => {
    /*
     * D-269's bound, which is why only the heavy week speaks. "You have room
     * this week" is a claim about a future the record does not hold, and the
     * light week is silent for that reason rather than for want of copy.
     */
    await loadInQa(page, EVENING)
    await go(page, 'Insights')

    const body = await page.locator('main').innerText()
    expect(body).not.toMatch(/you (will|should) have (room|time)|next week you|expect to/i)
  })

  test('does not overflow sideways with the card on screen', async ({ page }) => {
    await loadInQa(page, EVENING)
    await go(page, 'Insights')
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1)
  })
})
