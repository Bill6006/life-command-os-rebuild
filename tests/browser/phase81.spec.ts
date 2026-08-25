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

/**
 * Move the laboratory clock, the way an owner returning to it would.
 *
 * A hash change on the same document rather than a reload, because the session
 * ledger is what both of the findings below turn on and a reload would clear
 * it — which is also why neither was visible to any test that decides one hour
 * at a time from a clean start.
 */
async function travel(page: Page, direction: '−' | '+', hours: number) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  const button = page.getByRole('button', { name: `${direction}1 hour` })
  for (let step = 0; step < hours; step += 1) await button.click()
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

// ---------------------------------------------------------------------------
// AUD-0023 — the escalation, on the screen QA reproduced it on
// ---------------------------------------------------------------------------

test.describe('two refusals in one block', () => {
  /*
   * QA-81-004's reproduction, pressed rather than computed.
   *
   * "A week pointed at the house" is set at 19:30 on 2026-09-15, which is the
   * hour of the report, so the laboratory lands on it directly. What was
   * observed there: `Can't right now` twice, and the app answering with a third
   * suggestion — "Spend the next 30 minutes with Adaya, phone away" — under
   * "Nothing else worth asking right now".
   *
   * The unit suite proved the same sequence and was passing throughout, because
   * it proved it on a fixture that happened to have a question available. This
   * is here so the next version of that mistake is caught by a thumb.
   */
  test('stops offering and asks, instead of guessing a third time', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    const headline = page.locator('.primary-surface__headline')
    await expect(headline).toContainText('kitchen')

    const refuse = page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" })
    await refuse.click()
    await expect(headline).not.toContainText('kitchen')

    const second = await headline.textContent()
    await refuse.click()

    // Not a third move — and specifically not a third move about his daughter,
    // which is the one of the three that costs him something to turn down.
    await expect(headline).not.toHaveText(second ?? '')
    await expect(headline).toContainText('not landing')
    await expect(page.getByTestId('now-actions')).toHaveCount(0)
    await expect(page.getByTestId('now-question')).toBeVisible()
  })

  test('looks again once he answers, and stops for good at the third', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    const headline = page.locator('.primary-surface__headline')
    const refuse = page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" })
    await refuse.click()
    await refuse.click()
    await expect(headline).toContainText('not landing')

    // The answer is the owner making visible the thing the app could not see,
    // so the app looks again. Otherwise it asked for nothing.
    await page.getByTestId('now-question').waitFor()
    await page.locator('.now-options').getByRole('button').first().click()
    await expect(page.getByTestId('now-actions')).toBeVisible()

    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()
    await expect(headline).toContainText('Nothing then')
    await expect(page.getByTestId('now-reason')).toContainText('part of the day')
  })
})

// ---------------------------------------------------------------------------
// QA-81-006 — the repetition rule and the limiter, on one screen
// ---------------------------------------------------------------------------

test.describe('a day where the recovery answer has already been read', () => {
  test('does not end up prescribing the study session it spent the day declining', async ({
    page,
  }) => {
    /*
     * QA's reproduction, in one session: "A morning after three bad nights" at
     * 15:00, 20:00 and 23:00, pressing nothing. What it used to end on was
     * "Spend 10 minutes recalling subnetting", at eleven at night, to a man the
     * same screen still described as nine hours short of sleep — because the
     * repetition rule had removed the recovery move and the runner-up won.
     *
     * The unit suite could not see it: it decides an hour at a time from a
     * clean session, and the defect only exists once something has been on
     * screen twice.
     */
    await loadInQa(page, 'A morning after three bad nights')

    await travel(page, '+', 5)
    await goToNow(page)
    const headline = page.locator('.primary-surface__headline')
    await expect(headline).toContainText('recovery')

    await travel(page, '+', 5)
    await goToNow(page)
    await expect(headline).toContainText('recovery')

    await travel(page, '+', 3)
    await goToNow(page)

    // Whatever it says now, it is not the thing it has been declining all day.
    const screen = page.locator('.screen')
    await expect(screen).not.toContainText('recalling subnetting')
    await expect(page.getByTestId('now-premise')).toContainText('short on sleep')
    // And it says why it has nothing, rather than blaming the hour for it.
    await expect(page.getByTestId('now-reason')).toContainText('already been in front of you')
  })
})

// ---------------------------------------------------------------------------
// QA-81-007 — the sentence at half past eleven
// ---------------------------------------------------------------------------

test.describe('the no-action screen at late night', () => {
  test('is a sentence', async ({ page }) => {
    /*
     * QA's reproduction, exactly: refuse twice, answer, refuse a third time,
     * then let the block turn over. What the reset block used to print was
     * "Nothing on the list is worth tonight it would cost."
     *
     * Reached through the refusal sequence rather than constructed, because
     * that is how a person got to it, and because the block rollover is the
     * thing that makes the state real rather than a leftover.
     */
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    const refuse = () =>
      page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" })
    const headline = page.locator('.primary-surface__headline')

    await refuse().click()
    await expect(headline).not.toContainText('kitchen')
    await refuse().click()
    await expect(headline).toContainText('not landing')

    await page.getByTestId('now-question').waitFor()
    await page.locator('.now-options').getByRole('button').first().click()
    await expect(page.getByTestId('now-actions')).toBeVisible()
    await refuse().click()
    await expect(headline).toContainText('Nothing then')

    await travel(page, '+', 4)
    await goToNow(page)

    const reason = page.getByTestId('now-reason')
    await expect(reason).not.toContainText('worth tonight it would cost')
    await expect(reason).not.toContainText('worth night it would cost')
    /*
     * The whole sentence, because "does not contain the broken fragment" is
     * satisfied by a screen that says nothing at all.
     *
     * **Which sentence this route reaches moved in Phase 82**, and the reason is
     * worth writing down. `recall-practice` used to refuse no hour at all, so at
     * half past eleven it survived the filter, scored below the bar, and the
     * screen said "nothing on the list is worth the night it would cost". It now
     * refuses the late night like every one of its siblings (AUD-0039's widened
     * rubric found it), so at this hour there is nothing left to weigh and the
     * honest answer is the other one: things were worth doing and the hour rules
     * all of them out. Which is true here — every candidate on this history
     * refuses the late night.
     *
     * The sentence that used to be here is not unread. It is one of the forty
     * finished lines in `tests/synthetic/no-action-copy.test.ts`, rendered at
     * every block, which is the instrument QA-81-007 produced precisely because
     * a browser route only ever reaches the states a history happens to reach.
     */
    await expect(reason).toContainText('none of them suit where you actually are')
    const spoken = (await reason.innerText()).trim()
    expect(spoken.endsWith('.'), spoken).toBe(true)
    expect(spoken, 'a fragment where a noun belongs').not.toMatch(/\b(?:the|a)\s+(?:the|a)\b/)
  })
})
