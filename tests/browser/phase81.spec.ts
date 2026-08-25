import { expect, test, type Page } from '@playwright/test'

/**
 * The controls and sentences Phase 81 added, in a real browser.
 *
 * Everything here exists because the unit suite cannot see it: a control the
 * owner has to find with a thumb, a panel that has to open, and copy that has to
 * arrive on the screen it was written for rather than in the object behind it.
 */

const APP = '/life-command-os-rebuild/preview/'

async function loadInQa(page: Page, title: string) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

async function goToNow(page: Page) {
  await page.locator('.nav').getByRole('button', { name: 'Now' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
}

// ---------------------------------------------------------------------------
// AUD-0008 — the block sweep
// ---------------------------------------------------------------------------

test.describe('the block sweep', () => {
  test('shows one day’s history decided at all five parts of the day', async ({ page }) => {
    /*
     * The instrument the audit asked for, and the reason it asked: to find the
     * morning defects an auditor had to already know to move the clock to ten,
     * and nothing in the laboratory said so. One press answers the question the
     * library could not ask.
     */
    await loadInQa(page, 'A morning after three bad nights')

    await expect(page.getByTestId('qa-sweep-rows')).toHaveCount(0)
    await page.getByTestId('qa-sweep').click()

    const rows = page.getByTestId('qa-sweep-rows').locator('.qa-sweep__row')
    await expect(rows).toHaveCount(5)
    for (const block of ['early-morning', 'morning', 'afternoon', 'evening', 'late-night']) {
      await expect(rows.filter({ has: page.locator(`[data-block="${block}"]`) })).toBeDefined()
    }

    // Five answers, and not five copies of one answer.
    const said = await rows.locator('.qa-sweep__move').allTextContents()
    expect(new Set(said).size).toBeGreaterThan(1)
  })

  test('does not move the clock the rest of the screen is reading', async ({ page }) => {
    await loadInQa(page, 'A morning after three bad nights')
    const before = await page.locator('.rows__row', { hasText: 'Owner-local' }).textContent()

    await page.getByTestId('qa-sweep').click()
    await expect(page.getByTestId('qa-sweep-rows')).toBeVisible()

    const after = await page.locator('.rows__row', { hasText: 'Owner-local' }).textContent()
    expect(after).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// AUD-0003 — the morning has an answer
// ---------------------------------------------------------------------------

test.describe('a morning with something to decide', () => {
  test('does not prescribe a study session to a man nine hours short of rest', async ({ page }) => {
    await loadInQa(page, 'A morning after three bad nights')
    await goToNow(page)

    await expect(page.getByTestId('now-premise')).toContainText('morning')
    await expect(page.locator('.primary-surface__headline')).toContainText('light day')
    await expect(page.getByTestId('now-reason')).toContainText('hours down')
    // And it promises nothing about a tomorrow the app has no model of.
    await expect(page.getByTestId('now-reason')).not.toContainText('tomorrow')
  })

  test('says nothing about the evening before the evening', async ({ page }) => {
    await loadInQa(page, 'A morning after three bad nights')
    await goToNow(page)

    const screen = page.locator('.screen')
    await expect(screen).not.toContainText('tonight')
    await expect(screen).not.toContainText('this evening')
  })
})

// ---------------------------------------------------------------------------
// AUD-0048 / AUD-0049 — what the app says about her
// ---------------------------------------------------------------------------

test.describe('the growth suggestion', () => {
  test('claims no run from a record that alternates', async ({ page }) => {
    await loadInQa(page, 'Six chances, three managed')
    await goToNow(page)

    const growth = page.getByTestId('now-growth')
    await expect(growth).toBeVisible()
    // The skill that turned a corner may be asked about; the one that never
    // went well twice in a row may not.
    await expect(growth).not.toContainText('ordering her own food')
    await expect(growth).toContainText('in a row')
  })

  test('says how many occasions went the other way', async ({ page }) => {
    await loadInQa(page, 'Six chances, three managed')
    await goToNow(page)

    const evidence = page.getByTestId('now-growth-evidence')
    await expect(evidence).toBeVisible()
    await expect(evidence).toContainText('needed a hand')
    // Counts of occasions, never a mark about a four-year-old.
    await expect(evidence).not.toContainText('%')
  })
})

// ---------------------------------------------------------------------------
// AUD-0050 — the sixth owner action
// ---------------------------------------------------------------------------

test.describe('stopping a recommendation family', () => {
  /**
   * Refuse the move on screen, and the offer to stop it for good follows it.
   *
   * The refused move leaves immediately — a move refused in this block is out of
   * the running for it (AUD-0023) — so the control is about the move he just
   * pressed no on rather than about whatever came next.
   */
  async function refuse(page: Page) {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)
    await expect(page.locator('.primary-surface__headline')).toContainText('kitchen')
    await expect(page.getByTestId('now-stop')).toHaveCount(0)

    await page.getByRole('button', { name: "Can't right now" }).click()
    await expect(page.getByTestId('now-stop')).toBeVisible()
  }

  test('is offered behind a refusal, and not before one', async ({ page }) => {
    await refuse(page)
  })

  test('names the move and asks again before it writes anything', async ({ page }) => {
    await refuse(page)

    await page.getByTestId('now-stop').click()
    const confirm = page.getByTestId('now-stop-confirm')
    await expect(confirm).toBeVisible()
    // Named, because "stop suggesting it" is the "it" problem (D-018).
    await expect(confirm).toContainText('kitchen')
    await expect(confirm).toContainText('lift it')

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirm).toHaveCount(0)
    await expect(page.getByTestId('now-stop')).toHaveCount(0)
  })

  test('is listed on the area’s own page, and lifting it brings the move back', async ({
    page,
  }) => {
    await refuse(page)
    await page.getByTestId('now-stop').click()
    await page.getByTestId('now-stop-move').click()
    await expect(page.getByTestId('now-stop-confirm')).toHaveCount(0)

    // Found again where the confirmation said it would be.
    await page.locator('.nav').getByRole('button', { name: 'Life' }).click()
    await page.getByRole('link', { name: /Home/ }).first().click()
    const veto = page.getByTestId('domain-veto').first()
    await expect(veto).toBeVisible()
    await expect(veto).toContainText('Stop suggesting')

    await page.getByTestId('domain-veto-lift').first().click()
    await expect(page.getByTestId('domain-veto')).toHaveCount(0)
  })

  test('keeps the area on Life while its recommendations are stopped', async ({ page }) => {
    // Section 4.1 forbids a domain-off switch, and an area veto is not one.
    await refuse(page)
    await page.getByTestId('now-stop').click()
    await page.getByTestId('now-stop-area').click()

    await page.locator('.nav').getByRole('button', { name: 'Life' }).click()
    await expect(page.getByRole('link', { name: /Home/ }).first()).toBeVisible()
  })
})
