import { expect, test, type Page } from '@playwright/test'

/**
 * Now, on a real phone-sized screen.
 *
 * The unit and synthetic suites prove the engine reaches the right decision.
 * These prove the owner can see it: that a scenario loaded in the laboratory is
 * the same history Now is reading, that the sentence on screen names the real
 * subject, and that tapping an answer changes what the app says rather than
 * merely recording something.
 */

const APP = '/life-command-os-rebuild/preview/'

async function loadInQa(page: Page, title: string) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

async function goToNow(page: Page) {
  await page.getByRole('button', { name: 'Now' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
}

test.describe('with nothing to go on', () => {
  test('says so rather than offering something plausible', async ({ page }) => {
    await page.goto(APP)
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()

    // Section 36 — a fallback must not look like a confident empty-state answer.
    await expect(page.locator('.primary-surface__headline')).toContainText(
      'There is no history here yet',
    )
    await expect(page.getByRole('link', { name: 'Open the QA laboratory' })).toBeVisible()
  })
})

test.describe('one scenario, read from Now', () => {
  test('shows the move, why it, and what it was chosen over', async ({ page }) => {
    await loadInQa(page, 'Three broken nights, and a deadline')
    await goToNow(page)

    // The whole of G-005, on a phone: recovery wins over a live career goal,
    // and the sentence still names the thing being put down.
    await expect(page.locator('.primary-surface__headline')).toHaveText(
      'Take tonight as recovery — no subnetting session.',
    )
    await expect(page.getByTestId('now-reason')).toContainText('down over the last 3 nights')
    await expect(page.getByTestId('now-premise')).toContainText('short on sleep')

    const over = page.locator('.rows__row', { hasText: 'Chosen over' }).locator('dd')
    await expect(over).toContainText('subnetting')
    const why = page.locator('.rows__row', { hasText: 'Why this one' }).locator('dd')
    await expect(why).toHaveText('Answers what is actually in the way.')
  })

  test('states no duration it is about to ask for, and no engine bookkeeping', async ({ page }) => {
    // DEF-0005 and the copy sweep: a "Time" row carrying the move's own length
    // read as the owner's free time and contradicted the guide beneath it, and
    // "Where this stands: New tonight" said nothing at all.
    await loadInQa(page, 'A settled arrangement, and one week away')
    await goToNow(page)

    await expect(page.locator('.rows__row', { hasText: 'Time' })).toHaveCount(0)
    await expect(page.locator('.rows__row', { hasText: 'Where this stands' })).toHaveCount(0)
    await expect(page.locator('.rows__row', { hasText: 'Still unknown' })).toHaveCount(0)
  })

  test('reads the clock the laboratory set', async ({ page }) => {
    await loadInQa(page, 'Three broken nights, and a deadline')
    await goToNow(page)

    // Time travel has to reach the engine rather than stopping at the screen
    // that offers it, so Now says plainly which evening it is talking about.
    await expect(page.getByTestId('clock-moved')).toContainText('2026-09-15 21:40')
  })

  test('says something different about a different life', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    await expect(page.locator('.primary-surface__headline')).toContainText('kitchen')
    await expect(page.getByTestId('now-reason')).toContainText('a calmer house')
  })
})

test.describe('the guide, on the Now flow', () => {
  test('asks one question and changes its answer when it is answered', async ({ page }) => {
    await loadInQa(page, 'Two ordinary weeks')
    await goToNow(page)

    const headline = page.locator('.primary-surface__headline')
    await expect(page.getByTestId('now-question')).toContainText('How much have you got left')
    await expect(headline).toHaveText('Nothing to suggest just yet.')

    await page.locator('.now-option').last().click()

    /*
     * Section 12: record the answer, recompute immediately.
     *
     * A fortnight of sleep readings and nothing about how the owner feels, so
     * the honest answer is that there is nothing to suggest — and the app says
     * so without pretending the history is thin. One tap saying there is plenty
     * in the tank turns it into a walk, explained by the thing that was
     * actually asked rather than by whatever number was nearest.
     */
    await expect(headline).toHaveText('Move for 25 minutes: a walk.')
    await expect(page.getByTestId('now-reason')).toHaveText(
      'Energy is good and nothing more pressing is in the way.',
    )
  })

  test('does not ask anything when it already knows enough', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    await expect(page.getByTestId('now-settled')).toBeVisible()
    await expect(page.getByTestId('now-question')).toHaveCount(0)
  })

  test('never asks about a settled custody arrangement', async ({ page }) => {
    // G-002 as the owner would meet it: the guide's list contains the question
    // and this history means it never comes up.
    await loadInQa(page, 'A settled arrangement, and one week away')
    await goToNow(page)

    const question = page.getByTestId('now-question')
    if ((await question.count()) > 0) await expect(question).not.toContainText('Adaya')
  })
})

test.describe('mobile layout', () => {
  test('does not overflow sideways with a decision on screen', async ({ page }) => {
    await loadInQa(page, 'Three broken nights, and a deadline')
    await goToNow(page)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('keeps the answer buttons clear of the fixed navigation', async ({ page }) => {
    await loadInQa(page, 'Two ordinary weeks')
    await goToNow(page)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    const nav = await page.locator('.nav').boundingBox()
    const option = await page.locator('.now-option').first().boundingBox()
    expect(nav).not.toBeNull()
    expect(option).not.toBeNull()
    expect(option!.y + option!.height).toBeLessThanOrEqual(nav!.y + 1)
  })
})
