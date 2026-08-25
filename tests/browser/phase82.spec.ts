import { expect, test, type Page } from '@playwright/test'

/**
 * The surfaces Phase 82 created, in a real browser.
 *
 * Everything here exists because the unit suite cannot see it. The structural
 * skeleton is mostly engine work, and each package ends in something the owner
 * has to be able to find with a thumb: a course he can stop, a day he can
 * describe, a deferral with nothing to press, a stage he can put back, and a
 * date on a goal that had none.
 *
 * Phase 9 designs these. What this file holds is that they exist, that they say
 * what they were written to say, and that they are reachable at every width the
 * plan asks for (section 37).
 */

const APP = '/life-command-os-rebuild/preview/'

async function loadInQa(page: Page, title: string) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

async function go(page: Page, name: 'Now' | 'Life') {
  await page.locator('.nav').getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

// ---------------------------------------------------------------------------
// AUD-0020 — a course under way, seen and stoppable
// ---------------------------------------------------------------------------

test.describe('a course the owner can see and stop', () => {
  test('says on Now which course a move belongs to and where in it', async ({ page }) => {
    /*
     * A hidden plan is worse than no plan. A thread moves the ranking, so the
     * owner has to read which one at the moment he is deciding whether to do
     * the thing — not on a screen he would have to go looking for.
     */
    await loadInQa(page, 'Two sessions in')
    await go(page, 'Now')

    const rows = page.locator('.rows')
    await expect(rows).toContainText('Part of')
    await expect(rows).toContainText('Three sessions on subnetting')
    await expect(rows).toContainText('third of three')
  })

  test('lists it on Life and stops it in one tap', async ({ page }) => {
    await loadInQa(page, 'Two sessions in')
    await go(page, 'Life')

    const threads = page.getByTestId('life-threads')
    await expect(threads).toContainText('Three sessions on subnetting')

    const stop = page.getByTestId('life-thread-stop')
    await expect(stop).toBeVisible()
    // A real touch target, on the smallest width the plan asks for.
    const box = await stop.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThan(20)
    await stop.click()

    // Stopped, still listed, and no longer pulling.
    await expect(page.getByTestId('life-threads-past')).toContainText(
      'Three sessions on subnetting',
    )
    await expect(page.getByTestId('life-threads-past')).toContainText('Stopped.')

    await go(page, 'Now')
    await expect(page.locator('.rows')).not.toContainText('Part of')
  })
})

// ---------------------------------------------------------------------------
// AUD-0024 — the fifth state
// ---------------------------------------------------------------------------

test.describe('the deferral screen', () => {
  test('names the block it is holding for, and offers nothing to press', async ({ page }) => {
    /*
     * There is nothing to start, nothing to finish and nothing to decline: the
     * app is saying the move is right and the hour is not, and the way back is
     * the hour arriving. Five lifecycle buttons under it would ask him to act
     * on a sentence whose whole content is that acting can wait.
     */
    await loadInQa(page, 'Before the house is up')
    await go(page, 'Now')

    await expect(page.locator('.primary-surface__headline')).toContainText(
      'The morning suits Adaya better than now.',
    )
    await expect(page.getByTestId('now-reason')).toContainText('The morning has the room')
    await expect(page.getByTestId('now-actions')).toHaveCount(0)
  })

  test('offers the move itself once the hour has come round', async ({ page }) => {
    // Held into the next block, and offered there. The deferral is bounded by
    // being a deferral to somewhere rather than to later in general.
    await loadInQa(page, 'Before the house is up')
    await page.getByRole('button', { name: '+1 hour' }).click()
    await page.getByRole('button', { name: '+1 hour' }).click()
    await go(page, 'Now')

    await expect(page.locator('.primary-surface__headline')).toContainText('Adaya')
    await expect(page.getByTestId('now-actions')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// AUD-0004 — the shape of the day
// ---------------------------------------------------------------------------

test.describe('how the day is set up', () => {
  test('reads the obligation back and says what the time is short of', async ({ page }) => {
    await loadInQa(page, 'A school morning')
    await go(page, 'Life')
    await expect(page.getByTestId('day-shape-list')).toContainText('08:30 to 15:00, weekdays')

    await go(page, 'Now')
    // The sentence the app could not write at all until an obligation was
    // something it could see. It sits on the row that names what is in the way,
    // beside the move, rather than in the eyebrow — that is the no-action
    // screen's slot.
    await expect(page.locator('.rows')).toContainText('About 10 minutes before Adaya’s school day.')
  })

  test('invites the two questions as an aside rather than as a form', async ({ page }) => {
    /*
     * D-075. Life is a report, and the one thing on it the owner is asked to
     * add has to read as a line rather than as homework — the screen was
     * rebuilt once already for exactly this.
     */
    await loadInQa(page, 'Everything current except the studying')
    await go(page, 'Life')

    const seeds = page.getByTestId('day-shape-seeds')
    await expect(seeds).toContainText('reads the clock and nothing else about your day')
    await expect(page.getByTestId('day-shape-tell-working-hours')).toBeVisible()

    // And it opens into a form only once he asks for one.
    await expect(page.getByTestId('day-shape-starts')).toHaveCount(0)
    await page.getByTestId('day-shape-tell-working-hours').click()
    await expect(page.getByTestId('day-shape-starts')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// AUD-0017 and AUD-0015(a) — the growth flow
// ---------------------------------------------------------------------------

test.describe('the growth answer, in two steps', () => {
  test('asks where it happened after asking how she got on', async ({ page }) => {
    /*
     * The load-bearing half of AUD-0017, and an interaction change rather than
     * a label change: the claim "she handles this independently now" is about
     * generalisation and the evidence was about repetition.
     */
    /*
     * Reached by doing it, rather than by loading a history that already has a
     * result pending. No scenario in the library puts the growth move in front
     * of the owner as its primary suggestion, so the only honest way to see the
     * flow is the way he would: ask for something else until it comes up, do
     * it, and answer.
     */
    await loadInQa(page, 'Three times running, and the app noticed')
    await go(page, 'Now')

    const act = (name: string) => page.getByTestId('now-actions').getByRole('button', { name })

    await act('Something else').click()
    await act('Start it').click()
    await act('Done').click()
    await expect(page.locator('.primary-surface__headline')).toContainText(
      'Let Adaya take the lead',
    )

    await act('Start it').click()
    await act('Done').click()

    /*
     * And an hour on, because a result is not due the moment the move is.
     * `SOON` waits twenty minutes before asking, so that the answer is about
     * what happened rather than about the intention (section 20).
     */
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: '+1 hour' }).click()
    await go(page, 'Now')

    /*
     * The walk's own follow-up first, because it was done first and because it
     * is a reading rather than a grade (D-089). One question at a time is the
     * discipline the whole screen follows, so the growth result waits its turn.
     */
    await expect(page.getByTestId('now-reading')).toBeVisible()
    await page.locator('.now-options').first().getByRole('button').first().click()

    const outcome = page.getByTestId('now-outcome')
    await expect(outcome).toContainText('How did Adaya get on')
    // The three answers name what the parent did — section 4.4.
    const options = page.locator('.now-options').first()
    await expect(options).toContainText('On her own')
    await expect(options).toContainText('Needed me')

    await options.getByRole('button', { name: 'On her own' }).click()
    await expect(page.getByTestId('now-outcome-setting')).toContainText('Where was Adaya?')
    // Skippable, and the way past does not say "familiar" — a skipped setting
    // is unknown, and reading it as familiar would invent the fact the whole
    // generalisation claim rests on.
    const where = page.locator('.now-options').first()
    await expect(where).toContainText('Somewhere new')
    await expect(where).toContainText('Rather not say')
    await where.getByRole('button', { name: 'Somewhere new' }).click()
    // One record, written after both steps: the question is gone rather than
    // asked again.
    await expect(page.getByTestId('now-outcome-setting')).toHaveCount(0)
  })

  test('offers the stage on the Fatherhood page, and takes it back', async ({ page }) => {
    await loadInQa(page, 'Three times running, and the app noticed')
    await go(page, 'Life')
    await page.getByRole('link', { name: 'Fatherhood / Family' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fatherhood')

    const skill = page.getByTestId('domain-skill')
    await expect(skill).toContainText('ordering her own food')
    await expect(skill).toContainText('Being worked on')

    await page.getByTestId('domain-skill-stage').click()
    await expect(page.getByTestId('domain-skill')).toContainText('Settled')
    // Never permanent: the control that set it is the control that unsets it.
    await expect(page.getByTestId('domain-skill-stage')).toContainText('Working on it again')
    await page.getByTestId('domain-skill-stage').click()
    await expect(page.getByTestId('domain-skill')).toContainText('Being worked on')
  })
})

// ---------------------------------------------------------------------------
// AUD-0046 and AUD-0021 — a goal with a date and pieces
// ---------------------------------------------------------------------------

test.describe('a goal that is more than a sentence', () => {
  test('shows the trajectory in counts and offers the date control', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await go(page, 'Life')
    await page.getByRole('link', { name: 'Career & Learning' }).click()

    await expect(page.getByTestId('domain-goal-trajectory')).toContainText('3 pieces')
    await expect(page.getByTestId('domain-goal-trajectory')).toContainText('weeks out')
    // Counts and a date, and nothing that reads as a mark — section 22.
    const said = await page.getByTestId('domain-goal-trajectory').innerText()
    expect(said).not.toMatch(/%|percent|score/i)

    await expect(page.getByTestId('domain-goal-parts')).toContainText('no session yet')

    await expect(page.getByTestId('domain-goal-date')).toHaveCount(0)
    await page.getByTestId('domain-goal-open').click()
    await expect(page.getByTestId('domain-goal-date')).toBeVisible()
  })
})
