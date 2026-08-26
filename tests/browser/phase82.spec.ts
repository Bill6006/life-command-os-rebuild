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

  test('says why later rather than now when the owner asks', async ({ page }) => {
    /*
     * QA-82-001's sibling finding, and the reason this file did not catch it:
     * the deferral test above stopped at the headline. One tap lower, the panel
     * that exists to answer *why this?* was answering it about the move — the
     * conditions, the counts, the comparable occasions — and saying nothing at
     * all about the only question a held decision raises.
     */
    await loadInQa(page, 'Before the house is up')
    await go(page, 'Now')

    await page.getByTestId('now-see-evidence').click()
    const why = page.getByTestId('now-evidence-deferral')
    await expect(why).toBeVisible()
    // The block it is held for, and the room in it. Not "later" in general.
    await expect(why).toContainText('the morning')
    await expect(why).toContainText('not spoken for')
    // And nothing arguing for doing it now under a sentence that says to wait.
    await expect(why).not.toContainText('closes on its own')
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

  test('stops claiming she is here once her school day has started', async ({ page }) => {
    /*
     * QA-82-001, on the complete owner screen.
     *
     * This file loaded the school morning at twenty past eight and never moved
     * the clock, so it only ever saw the ten minutes before the school run.
     * Two hours later the same fixture had the app saying "Adaya is here" in
     * the premise and offering thirty unhurried minutes with her, while the
     * Life page beside it showed her school day running until three.
     */
    await loadInQa(page, 'A school morning')
    await page.getByRole('button', { name: '+1 hour' }).click()
    await page.getByRole('button', { name: '+1 hour' }).click()
    await go(page, 'Now')

    const premise = page.getByTestId('now-premise')
    await expect(premise).not.toContainText('Adaya is here')
    // Better than silence: where she is, and until when.
    await expect(premise).toContainText('Adaya’s school day is on until 15:00')

    // And nothing on the screen proposing time with someone who is at school.
    await expect(page.locator('.primary-surface__headline')).not.toContainText('with Adaya')
    await expect(page.locator('.rows')).not.toContainText('Adaya is here')
  })

  test('says the same thing about her on the fact ledger and the domain page', async ({ page }) => {
    /*
     * QA-82-001, round 2, and the two screens this file was not opening.
     *
     * The test above walks Now into the window and passed on the deployed
     * build while, one tap away, the QA laboratory's own fact ledger said
     * "Child with the owner \u00b7 known \u2014 yes \u2014 for whether she is here today" and
     * the Fatherhood page said "Child with the owner \u2014 yes". Both are generic
     * surfaces that render the concept registry, so neither knew anything had
     * been repaired.
     */
    await loadInQa(page, 'A school morning')
    await page.getByRole('button', { name: '+1 hour' }).click()
    await page.getByRole('button', { name: '+1 hour' }).click()

    // The laboratory's own ledger, at the clock it is holding.
    const facts = page.getByTestId('qa-facts')
    await expect(facts).toContainText('Child in the owner\u2019s care today')
    await expect(facts).toContainText('Child here right now')
    await expect(facts).toContainText('school day is on until 15:00')
    await expect(facts).not.toContainText('for whether she is here today')

    // And the page the owner would go to for the same question.
    await go(page, 'Life')
    await page.getByRole('link', { name: 'Fatherhood / Family' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fatherhood')

    const believes = page.locator('.domain-reading')
    await expect(believes.filter({ hasText: 'Child here right now' })).toContainText(
      'school day is on until 15:00',
    )
    // The arrangement is still there, still his to correct, and still says yes
    // \u2014 because it is still his day. It just no longer claims to be the answer
    // to where she is.
    await expect(
      believes.filter({ hasText: 'Child in the owner\u2019s care today' }),
    ).toContainText('yes')
    // A conclusion is not the owner's to correct.
    await expect(
      believes.filter({ hasText: 'Child here right now' }).getByTestId('domain-reading-derived'),
    ).toBeVisible()
    await expect(
      believes
        .filter({ hasText: 'Child here right now' })
        .getByRole('button', { name: 'Not right?' }),
    ).toHaveCount(0)
  })

  test('does not disown the reading in the document it puts it in', async ({ page }) => {
    /*
     * QA-82-005, on the surface it was found on.
     *
     * The two screens above were repaired in round 2 and this file checked
     * them. The review export is a third surface, built from raw fact state
     * rather than from the decision, and it printed the derived reading under
     * *what it read to decide* and the same concept under *what it does not
     * know* \u2014 in one document that asks its reader to treat it as the source
     * of truth.
     */
    await loadInQa(page, 'A school morning')
    await page.getByRole('button', { name: '+1 hour' }).click()
    await page.getByRole('button', { name: '+1 hour' }).click()

    await page.goto(`${APP}#/data`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Data')
    await page.getByRole('button', { name: 'Select all' }).click()

    const text = page.getByTestId('export-text')
    await expect(text).toBeVisible()
    const said = await text.inputValue().catch(() => text.innerText())

    expect(said).toContain(
      'Child here right now \u2014 No \u2014 Adaya\u2019s school day is on until 15:00.',
    )
    expect(said).not.toContain('Child here right now \u2014 never answered')
    // And the honest unknowns are still listed, which is the half an
    // over-broad fix would quietly remove.
    expect(said).toContain('Things the app knows it does not know:')
    expect(said).toContain('\u2014 never answered')
  })

  test('says nothing about the area it says it is leaving out', async ({ page }) => {
    /*
     * QA-82-007, on the deployed document. **Select all** reaches Diagnostics
     * and deliberately does not reach the private section, so this is the
     * document one tap produces \u2014 and the one that named the withheld area and
     * stated that nothing was known in it.
     */
    await loadInQa(page, 'Two ordinary weeks')

    await page.goto(`${APP}#/data`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Data')
    await page.getByRole('button', { name: 'Select all' }).click()

    const text = page.getByTestId('export-text')
    await expect(text).toBeVisible()
    const said = await text.inputValue().catch(() => text.innerText())

    expect(said).toContain('The Private / Sexual Health section is left out.')
    expect(said).not.toContain('Recent private pattern')
    expect(said).not.toContain('Private entry')
    // The counts survive, and say what they are of, before they are given.
    expect(said).toContain(
      'Every count below is of the part of the record this document may describe',
    )
    expect(said).toMatch(/- Records still standing after corrections: \d+/)
    /*
     * And it says what it was worked out from — round 5.
     *
     * The exclusion reaches the record the document is composed from rather
     * than only the rows it prints, because a conclusion drawn from a withheld
     * record is that record's content in another form. So the app's own screen
     * may be saying something else, and the document says so rather than
     * letting the reader take it for a photograph of Now.
     */
    expect(said).toContain(
      'Everything below is worked out from the part of the record in this document',
    )
  })

  test('says why it does not know, rather than one sentence for every reason', async ({ page }) => {
    /*
     * QA-82-008. `One answer, and a lot of silence` states soreness at 06:41
     * and withdraws it at 06:55. The document printed the withdrawal under the
     * recent record and called the same concept never answered under what it
     * does not know.
     */
    await loadInQa(page, 'One answer, and a lot of silence')

    await page.goto(`${APP}#/data`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Data')
    await page.getByRole('button', { name: 'Select all' }).click()

    const text = page.getByTestId('export-text')
    await expect(text).toBeVisible()
    const said = await text.inputValue().catch(() => text.innerText())

    expect(said).toContain('Soreness or pain \u2014 answered once, and the answer was withdrawn')
    expect(said).not.toContain('Soreness or pain \u2014 never answered')
    // And a concept nobody has been asked about still reads as one nobody has
    // been asked about, so the list has not been emptied to make this pass.
    expect(said).toContain('\u2014 never answered')
  })

  test('has her back, and the middle of the day free, either side of it', async ({ page }) => {
    /*
     * The half that would be easy to break while fixing the first. Her school
     * day is hers: it must not be read as five hours of his own time being
     * taken, and the moment it ends she is in the room again.
     */
    await loadInQa(page, 'A school morning')
    for (let hour = 0; hour < 2; hour += 1) {
      await page.getByRole('button', { name: '+1 hour' }).click()
    }
    await go(page, 'Now')
    // Ten o'clock, the house quiet: the app must not fall silent about time.
    await expect(page.getByTestId('now-premise')).not.toContainText('10 minutes free')

    await page.goto(`${APP}#/qa`)
    for (let hour = 0; hour < 6; hour += 1) {
      await page.getByRole('button', { name: '+1 hour' }).click()
    }
    await go(page, 'Now')
    await expect(page.getByTestId('now-premise')).toContainText('Adaya is here')
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
