import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  adaptationClaims,
  adaptationClaimsOnAnyScreen,
  containsApprovedBlockerCopy,
  isApprovedBlockerCopy,
  isApprovedWhenBlocked,
} from '../../scripts/adaptation-claims.mjs'

/**
 * Routing Phase 84, in a real browser — "what the owner is trying to become".
 *
 * D-161 is the reason this file is not the synthetic suite one layer thinner.
 * Every gate in this campaign has been green against fixtures authored by the
 * process that wrote the code, and an independent reader with a browser then
 * found forty-four things none of them had. So the assertions here are the
 * owner's: **open the near-empty history, read the screen, press the thing.**
 *
 * The store is `The first evening` throughout — one record, a single guide
 * answer — because a capability is accepted when an ordinary owner can reach it
 * from a near-empty store and not when a prepared fixture demonstrates it.
 */

const APP = '/life-command-os-rebuild/preview/'

async function loadInQa(page: Page, title: string) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

async function go(page: Page, name: 'Now' | 'Life' | 'Timeline' | 'Insights') {
  await page.locator('.nav').getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

/**
 * Every sentence a panel puts on screen — QA-84-012.
 *
 * The D-187 cases read a **child** locator: the question's inner block, and the
 * standing blocker's own row. Everything around them — the panel title, the
 * paragraph above the rows, the accessible name on the withdrawal control — was
 * outside the assertion, and QA showed that a promise written into any of it
 * would render on a green gate. So this reads the panel, leaf element by leaf
 * element, plus the accessibility tree with it.
 */
async function everySentenceIn(panel: Locator): Promise<readonly string[]> {
  return panel.evaluate((root) => {
    const out: string[] = []
    const flat = (text: string) => text.replace(/\s+/g, ' ').trim()
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const node = element as HTMLElement
      if (node.querySelector('*') === null) {
        const text = flat(node.textContent ?? '')
        if (text !== '') out.push(text)
      }
      const label = node.getAttribute('aria-label')
      if (label !== null) out.push(flat(label))
    }
    return [...new Set(out)]
  })
}

async function openCareer(page: Page) {
  await page.goto(`${APP}#/life/career`)
  await expect(page.getByRole('heading', { level: 1, name: 'Career & Learning' })).toBeVisible()
}

/**
 * Answer the guide until there is something to press.
 *
 * The near-empty store opens with a question rather than a move, which is the
 * app working correctly: it has one record and asks before it suggests. So this
 * is the ordinary opening of an evening rather than test scaffolding — two taps,
 * exactly as `tests/synthetic/ordinary-use-journey.test.ts` walks it.
 */
async function untilThereIsAMove(page: Page) {
  for (let taps = 0; taps < 3; taps += 1) {
    if (await page.getByTestId('now-actions').isVisible()) return
    const question = page.getByTestId('now-question')
    if (!(await question.isVisible())) break
    await page.locator('.now-option').first().click()
    await expect(question)
      .not.toBeVisible({ timeout: 5000 })
      .catch(() => undefined)
  }
  await expect(page.getByTestId('now-actions')).toBeVisible()
}

/**
 * Answer the guide until there is a move, choosing named answers where the
 * question is one this file cares about.
 *
 * `untilThereIsAMove` presses whatever comes first, which for energy is
 * *"Running on empty"* — a recovery evening. Several cases below need an
 * ordinary one, so they say which answers they mean.
 */
async function answerGuideWith(page: Page, wanted: readonly string[]) {
  /*
   * Answer whatever the guide is asking, preferring a named option, until
   * there is something to press.
   *
   * Written to survive the screen re-rendering underneath it, which it does
   * constantly and correctly: every control on Now carries `disabled={busy}`
   * while an append is in flight, travelling the clock rebuilds the whole
   * decision, and an answer can remove the question that was on screen when it
   * was read. So each pass re-reads what is there, waits for the state a click
   * needs, and treats a lost element as a reason to look again rather than as
   * a failure — the alternative is a test that reports the app broken because
   * it re-rendered.
   */
  for (let taps = 0; taps < 6; taps += 1) {
    if ((await page.getByTestId('now-actions').count()) > 0) return
    const options = page.locator('.now-option')
    if ((await options.count()) === 0) return

    /*
     * A plain loop, because `Array.find` with an async predicate does not do
     * what it reads like: every promise is truthy, so it returns the first
     * candidate whether or not the option is on screen. It passed by retrying,
     * which is the worst way for a test helper to be right.
     */
    let target = options.first()
    for (const label of wanted) {
      const option = page.locator('.now-option', { hasText: label }).first()
      if ((await option.count()) > 0) {
        target = option
        break
      }
    }
    try {
      await target.click({ timeout: 5_000 })
    } catch {
      // Gone or still busy. The next pass reads the screen as it now is.
    }
  }
}

/** Move the laboratory clock forward, the way the QA screen does. */
async function travel(page: Page, unit: '+1 day' | '+1 week', times: number) {
  await page.goto(`${APP}#/qa`)
  for (let step = 0; step < times; step += 1) {
    await page.locator('.qa-travel').getByRole('button', { name: unit }).click()
  }
}

// ---------------------------------------------------------------------------
// Item 1 — saying what he is aiming at, and the app changing its mind
// ---------------------------------------------------------------------------

test.describe('a destination can be named, from a near-empty store', () => {
  test('says what the area is for, and reads it back', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await openCareer(page)

    // Before: the page says plainly that nothing tells it what this is for.
    await expect(page.getByTestId('destination-empty')).toBeVisible()

    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Working as a cloud engineer')
    await page.getByTestId('destination-milestone-input').fill('Get through the networking basics')
    await page.getByTestId('destination-save').click()

    await expect(page.getByTestId('destination-aim')).toContainText('Working as a cloud engineer')
    await expect(page.getByTestId('destination-next')).toContainText(
      'Get through the networking basics',
    )
  })

  test('says what it does not know rather than filling it in', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await openCareer(page)

    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Working as a cloud engineer')
    await page.getByTestId('destination-save').click()

    // G-009's rule applied to an aspiration: an unstated baseline reads as
    // unstated, never as a zero and never as a default.
    await expect(page.getByTestId('destination-baseline')).toContainText('not said')
    await expect(page.getByTestId('destination-missing')).toBeVisible()
  })

  test('shows no percentage, bar or figure about him — D-162', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await openCareer(page)

    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Working as a cloud engineer')
    await page.getByTestId('destination-milestone-input').fill('Get through the networking basics')
    await page.getByTestId('destination-save').click()

    const screen = await page.locator('.screen').innerText()
    expect(screen).not.toMatch(/\d+\s*%/)
    expect(screen.toLowerCase()).not.toContain('readiness')
    expect(screen.toLowerCase()).not.toContain('life score')
    // And no progress element anywhere, which is the shape a figure arrives in.
    await expect(page.locator('progress, meter, [role="progressbar"]')).toHaveCount(0)
  })

  test('changes what Now suggests', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')

    // Two answers get a move on screen. Whatever it is, it is not about a
    // topic, because there is no topic in the store.
    await untilThereIsAMove(page)
    const before = await page.locator('.primary-surface__headline').innerText()
    expect(before).not.toContain('networking')

    await openCareer(page)
    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Working as a cloud engineer')
    await page.getByTestId('destination-milestone-input').fill('Get through the networking basics')
    await page.getByTestId('destination-save').click()

    await go(page, 'Now')
    /*
     * The study move is now in the running, which it could not be before: the
     * generator needs a learning topic and nothing an owner could tap made one.
     *
     * "In the running" rather than "on the card": which of them wins is the
     * arbiter's, and asserting a winner here would be this test quietly holding
     * the ranking rather than the capability.
     */
    await expect(page.locator('.screen')).toContainText('networking basics')
  })
})

// ---------------------------------------------------------------------------
// Item 3 — introducing a thing the app can refer to
// ---------------------------------------------------------------------------

test.describe('the owner can introduce something', () => {
  test('offers the six kinds, and says what it understood before it acts', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await openCareer(page)

    for (const kind of ['goal', 'routine', 'person', 'place', 'skill', 'obligation']) {
      await expect(page.getByTestId(`authoring-kind-${kind}`)).toBeVisible()
    }

    await page.getByTestId('authoring-kind-place').click()
    await page.getByTestId('authoring-name').fill('The library')

    // The confirmation, and the half that earns it: what it will not assume.
    await expect(page.getByTestId('authoring-proposal')).toContainText('The library')
    await expect(page.getByTestId('authoring-unknowns')).toBeVisible()

    await page.getByTestId('authoring-save').click()
    await expect(page.getByTestId('authoring-kinds')).toBeVisible()
  })

  test('refuses a draft it cannot build, and says why', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await openCareer(page)

    await page.getByTestId('authoring-kind-obligation').click()
    await page.getByTestId('authoring-name').fill('Working hours')
    await page.getByTestId('authoring-from').fill('17:00')
    await page.getByTestId('authoring-to').fill('09:00')

    /*
     * Two problems at once — the times are back to front and no day is named —
     * and both are said. Asserting on the block rather than on one row is the
     * point: a form that reported only the first thing wrong would send him
     * round twice.
     */
    const proposal = page.getByTestId('authoring-proposal')
    await expect(proposal).toContainText('end after it starts')
    await expect(page.getByTestId('authoring-save')).toBeDisabled()
  })

  test('every input on the new controls has a name a browser can compute', async ({ page }) => {
    /*
     * D-176, asked of the running app rather than of the source — which is what
     * `element.labels` actually is, and the half a static scan cannot see.
     */
    await loadInQa(page, 'The first evening')
    await openCareer(page)
    await page.getByTestId('destination-open').click()
    await page.getByTestId('authoring-kind-goal').click()

    const unnamed = await page.evaluate(() => {
      const out: string[] = []
      for (const control of document.querySelectorAll('input, textarea, select')) {
        const element = control as HTMLInputElement
        const named =
          element.labels?.length ||
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby')
        if (!named) out.push(element.outerHTML.slice(0, 90))
      }
      return out
    })
    expect(unnamed).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Item 2 — a session, a course and a milestone read as three things
// ---------------------------------------------------------------------------

test.describe('what has actually happened', () => {
  test('counts sessions and says what that is not evidence of', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await untilThereIsAMove(page)
    await page.getByTestId('now-actions').getByRole('button', { name: 'Start it' }).click()
    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).first().click()

    await page.goto(`${APP}#/life/health-recovery`)
    await expect(page.getByTestId('progress-completion')).toBeVisible()
    await expect(page.getByTestId('progress-completion')).toContainText('1 session')
    await expect(page.getByTestId('progress-completion')).toContainText('not what it came to')
  })

  test('does not turn sessions into a milestone', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await untilThereIsAMove(page)
    await page.getByTestId('now-actions').getByRole('button', { name: 'Start it' }).click()
    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).first().click()

    await page.goto(`${APP}#/life/health-recovery`)
    await expect(page.getByTestId('progress-milestone')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Item 5 — "Can't right now", and the way back
// ---------------------------------------------------------------------------

test.describe('an interruption is not a refusal', () => {
  test('asks once what was in the way, and offers a way out of the question', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await untilThereIsAMove(page)
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()

    const asked = page.getByTestId('blocker-question')
    const silent = page.getByTestId('blocker-silent')
    // One or the other, never neither: the decision always says something.
    await expect(asked.or(silent)).toBeVisible()

    if (await asked.isVisible()) {
      await expect(page.getByTestId('blocker-leave')).toBeVisible()
      await page.getByTestId('blocker-leave').click()
      await expect(asked).toHaveCount(0)
    }
  })

  test('offers the move back, with what was in the way on it', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await untilThereIsAMove(page)
    await page.getByTestId('now-actions').getByRole('button', { name: 'Start it' }).click()
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()

    await expect(page.getByTestId('resume-sentence')).toBeVisible()
    await expect(page.getByTestId('resume-state')).toContainText('did not fit')
    await expect(page.getByTestId('resume-start')).toBeEnabled()
  })

  test('has a button for the evening that ran out', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await untilThereIsAMove(page)
    const actions = page.getByTestId('now-actions')
    await actions.getByRole('button', { name: 'Start it' }).click()
    await expect(actions.getByRole('button', { name: 'Only part of it' })).toBeEnabled()
    await actions.getByRole('button', { name: 'Only part of it' }).click()
    await expect(page.locator('.rows')).toContainText('Part done')
  })
})

// ---------------------------------------------------------------------------
// Item 6 — a correction says what it will do, and the private permission
// ---------------------------------------------------------------------------

test.describe('correcting what the app recorded', () => {
  test('states the consequence before it acts', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await untilThereIsAMove(page)
    await page.getByTestId('now-actions').getByRole('button', { name: 'Start it' }).click()
    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).first().click()

    await page.goto(`${APP}#/life/health-recovery`)
    await page.getByTestId('correction-open-button').first().click()

    await expect(page.getByTestId('correction-consequence')).toBeVisible()
    await expect(page.getByTestId('correction-preserved')).toContainText('history')

    // And the other gesture states a different consequence.
    const first = await page.getByTestId('correction-consequence').innerText()
    await page.getByTestId('correction-gesture-timing').click()
    await expect(page.getByTestId('correction-consequence')).not.toHaveText(first)
  })

  test('withdraws an entry and leaves it in the record', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await untilThereIsAMove(page)
    await page.getByTestId('now-actions').getByRole('button', { name: 'Start it' }).click()
    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).first().click()

    await page.goto(`${APP}#/life/health-recovery`)
    const events = page.getByTestId('correctable-event')
    /*
     * Wait for the list to settle before reading it.
     *
     * One start and one completion, and the page renders them as the store
     * publishes: reading "the first row" mid-settle picks whichever arrived
     * first, and the assertion afterwards then compares a row against text that
     * was never in it. The count is the settled state, so waiting on it is
     * waiting on the right thing.
     */
    await expect(events).toHaveCount(2)
    /*
     * By what it says rather than by how many there are.
     *
     * A count is the wrong assertion here twice over: the page renders two
     * entries for one evening — the start and the completion — and a count read
     * before the list has settled is a count of a different screen. What the
     * owner is doing is withdrawing **that entry**, so that is what is checked.
     */
    const withdrawing = (await events.first().innerText()).split(String.fromCharCode(10))[0] ?? ''
    expect(withdrawing.length).toBeGreaterThan(0)

    await page.getByTestId('correction-open-button').first().click()
    await page.getByTestId('correction-apply').click()

    /*
     * Gone from the whole list, not merely off the top of it. A check on the
     * first row alone passes whenever the withdrawn entry moves down one.
     */
    await expect(events).toHaveCount(1)
    await expect(events.first()).not.toContainText(withdrawing)
  })
})

test.describe('the private permission', () => {
  test('is on the private page, off, and says what it does', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await page.goto(`${APP}#/life/private`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await expect(page.getByTestId('permission')).toBeVisible()
    await expect(page.getByTestId('permission-state')).toContainText('does not influence')
    await expect(page.getByTestId('permission-toggle')).toContainText('Allow it')
  })

  test('can be turned on and off again', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await page.goto(`${APP}#/life/private`)

    await page.getByTestId('permission-toggle').click()
    await expect(page.getByTestId('permission-state')).toContainText('may influence')

    await page.getByTestId('permission-toggle').click()
    await expect(page.getByTestId('permission-state')).toContainText('does not influence')
  })
})

// ---------------------------------------------------------------------------
// Item 4 — the second agenda, on Life and never on Now
// ---------------------------------------------------------------------------

test.describe('the second information agenda', () => {
  test('asks on Insights and not on Now', async ({ page }) => {
    /*
     * D-169 puts the review loop on Insights and the domain pages, and this is
     * the other half of the same subject: what the app has worked out sits
     * below it, and this is what it has not.
     *
     * It was on Life first, and `shell.spec.ts` is why it is not: Life is held
     * to about a screen and a half on a 360-wide phone, and one closed line
     * with no panel around it still left it over. A measured constraint saying
     * no is a placement decision, not an obstacle.
     */
    await loadInQa(page, 'The first evening')

    await go(page, 'Insights')
    /*
     * Closed until tapped, like every other control on a Life surface, and the
     * closed line says nothing about which area it is about — Life names every
     * area exactly once and a prompt that named one would make it twice.
     */
    await expect(page.getByTestId('discovery-closed')).toBeVisible()
    await page.getByTestId('discovery-open').click()
    await expect(page.getByTestId('discovery-prompt')).toBeVisible()
    await expect(page.getByTestId('discovery-leave')).toBeVisible()

    await go(page, 'Now')
    await expect(page.getByTestId('discovery-prompt')).toHaveCount(0)
    await expect(page.getByTestId('discovery-closed')).toHaveCount(0)
  })

  test('respects a skip', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Insights')

    await page.getByTestId('discovery-open').click()
    const asked = await page.locator('[data-testid="discovery-prompt"] label').first().innerText()
    await page.getByTestId('discovery-leave').click()

    await expect(page.getByTestId('discovery-closed')).toBeVisible()
    await page.getByTestId('discovery-open').click()
    await expect(
      page.locator('[data-testid="discovery-prompt"] label'),
      'the skipped prompt came back',
    ).not.toHaveText(asked)
  })

  test('shows what an answer changed', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Insights')

    await page.getByTestId('discovery-open').click()
    await page.getByTestId('discovery-answer').fill('Working as a cloud engineer')
    await page.getByTestId('discovery-save').click()

    await page.getByTestId('discovery-changes-open').click()
    await expect(page.getByTestId('discovery-changes')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// QA round 1 — the five defects, on the screens they were reported from
// ---------------------------------------------------------------------------

test.describe('what independent QA found on the deployed build', () => {
  test('QA-84-001 — a Health destination alone changes what Now suggests', async ({ page }) => {
    /*
     * The counterfactual, twice through the same store, with identical answers
     * and no other destination anywhere. QA reproduced this by hand and got the
     * same walk byte for byte; there was no browser case that would have.
     */
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    const before = await page.locator('.primary-surface__headline').innerText()
    expect(before).toContain('walk')

    await page.goto(`${APP}#/life/health-recovery`)
    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Strong enough to keep up with her')
    await page.getByTestId('destination-milestone-input').fill('Lift twice each week')
    await page.getByTestId('destination-save').click()
    await expect(page.getByTestId('destination-aim')).toBeVisible()

    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    const after = await page.locator('.primary-surface__headline').innerText()
    expect(after, 'a Health destination changed nothing on Now').not.toBe(before)
    expect(after).toContain('Lift twice each week')
    // And no duration was invented for a step the app has never seen.
    expect(after).not.toMatch(/\d+ minutes/)
  })

  test('QA-84-002 — partial work reads as partial on the page that counts it', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    const actions = page.getByTestId('now-actions')
    await actions.getByRole('button', { name: 'Start it' }).click()
    await actions.getByRole('button', { name: 'Only part of it' }).click()
    await expect(page.locator('.rows')).toContainText('Part done')

    await page.goto(`${APP}#/life/health-recovery`)
    // The rung it belongs on, and not the one above it.
    await expect(page.getByTestId('progress-part-done')).toBeVisible()
    await expect(page.getByTestId('progress-completion')).toHaveCount(0)

    // And the same event, worded the same way, in the correction list.
    const screen = await page.locator('.screen').innerText()
    expect(screen).not.toContain('Followed through')
    expect(screen).toContain('Got part of the way')
  })

  test('QA-84-003 — a course finished through the ordinary controls shows as a course', async ({
    page,
  }) => {
    /*
     * **Two sessions in** is the one history in the library that holds a course
     * at all, and it sits one occasion from the end — so the whole flow is the
     * final session, through the buttons an owner presses.
     *
     * An earlier version drove three occasions from the near-empty store across
     * six days of travel. It proved the same thing and it was flaky, because
     * whether a recovery move is on screen after travelling depends on what the
     * guide decides to ask — and a browser case whose setup can fail for a
     * reason unrelated to its subject is worse than no browser case. The
     * multi-day walk is held in the synthetic instrument, which can drive the
     * clock exactly.
     *
     * That the library contains exactly one course, and that it had never been
     * finished, is why `state === 'done'` survived in three separate readers.
     */
    await loadInQa(page, 'Two sessions in')
    await go(page, 'Now')

    const actions = page.getByTestId('now-actions')
    await expect(actions, 'the third session was not offered').toBeVisible()
    const start = actions.getByRole('button', { name: 'Start it' })
    await expect(start).toBeEnabled({ timeout: 15_000 })
    await start.click()
    const done = actions.getByRole('button', { name: 'Done', exact: true })
    await expect(done).toBeEnabled({ timeout: 15_000 })
    await done.click()

    await page.goto(`${APP}#/life/career`)
    // Three different things, and the page says three different things.
    await expect(page.getByTestId('progress-courses')).toBeVisible()
    await expect(page.getByTestId('progress-completion')).toBeVisible()
    await expect(page.getByTestId('progress-milestone')).toHaveCount(0)
  })

  test('QA-84-004 — the weekly question asks for a day of the week', async ({ page }) => {
    /*
     * What the question asks for is what the form accepts. It asked about a
     * regular chunk of the week and offered a calendar date, and stored one
     * dated occurrence.
     */
    test.setTimeout(120_000)
    await loadInQa(page, 'The first evening')

    /*
     * The agenda is deliberately slow: three aspiration questions come before
     * the weekly one and only two are put in a week (D-163, D-184). So an
     * owner reaches this question in his second week, and the test travels
     * rather than pretending he would not have to.
     */
    let asked = ''
    for (let round = 0; round < 8; round += 1) {
      await go(page, 'Insights')
      if (!(await page.getByTestId('discovery-closed').isVisible())) {
        await travel(page, '+1 week', 1)
        continue
      }
      await page.getByTestId('discovery-open').click()
      asked = await page.locator('[data-testid="discovery-prompt"] label').first().innerText()
      if (asked.includes('regular chunk')) break
      await page.getByTestId('discovery-leave').click()
    }

    const label = asked
    expect(label, 'the agenda never reached the weekly question').toContain('regular chunk')
    const day = page.getByTestId('discovery-day')
    await expect(day).toBeVisible()
    // A day of the week, not a date in a month.
    expect(await day.evaluate((node) => node.tagName)).toBe('SELECT')
    await expect(day).toContainText('Wednesday')
  })

  test('QA-84-005 — a blank next step is not confirmed as one', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await page.goto(`${APP}#/life/career`)
    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Working as a cloud engineer')

    // The optional box is empty, and the confirmation says so.
    const form = page.getByTestId('destination-form')
    await expect(form).toContainText('nothing is created')
    await expect(form).not.toContainText('The next step in Career & Learning: “that”')
    await expect(form).not.toContainText('currently studying')
  })
})

// ---------------------------------------------------------------------------
// The owner addendum — two corrections from real use, on the screens they
// were reported from. Neither is a QA finding.
// ---------------------------------------------------------------------------

test.describe('owner addendum — “I can’t leave, someone’s in my care”', () => {
  test('is on the list, and writes something that survives the evening', async ({ page }) => {
    /*
     * The owner's case on the deployed build: Now offered a walk while his
     * daughter was asleep and there was nobody else to watch her. The nearest
     * of the seven causes was *"Someone needed me"*, which is wrong twice —
     * nobody needed his time, he was not free to leave — and `standing: false`,
     * so it wrote nothing durable at all.
     */
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    /*
     * An ordinary evening, named rather than taken. `untilThereIsAMove` presses
     * whatever is first, which for energy is *"Running on empty"* — a recovery
     * evening, where the app may correctly decide the answer would change
     * nothing and say so instead of asking (D-164). This case is about the
     * question, so it asks for the evening the question is put on.
     */
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()

    const asked = page.getByTestId('blocker-question')
    await expect(asked, 'the app did not ask what was in the way').toBeVisible()

    const option = page.getByTestId('blocker-must-stay')
    await expect(option, 'the eighth cause is not offered').toBeVisible()
    await expect(option).toContainText('in my care')
    await option.click()
    await expect(asked).toHaveCount(0)

    // Durable, and on the page for the area the move belonged to — across a
    // reload, which is what "durable" has to mean on a phone.
    await page.goto(`${APP}#/life/health-recovery`)
    await expect(page.getByRole('heading', { level: 1, name: 'Health & Recovery' })).toBeVisible()
    await page.reload()
    const standing = page.getByTestId('domain-blocker')
    await expect(standing.first()).toContainText('someone was in my care')

    // And withdrawable, which is the way out the question always offers.
    await page.getByTestId('domain-blocker-lift').first().click()
    await expect(page.getByTestId('domain-blocker')).toHaveCount(0)
  })

  test('promises nothing about what the app will suggest next — D-187', async ({ page }) => {
    /*
     * Nothing in the engine reads a blocker constraint: `applyConstraints`
     * never looks at `situation.constraints`, and `cautionsFor` matches a
     * constraint's concept against a candidate's `leansOn`, which never holds a
     * `blocker.*` concept. So a sentence saying the walk will stop being
     * offered would be falsifiable by the owner within one evening.
     */
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()

    const asked = page.getByTestId('blocker-question')
    await expect(asked).toBeVisible()
    /*
     * The same rule the synthetic suite and the Android gate apply, from the
     * same module — QA-84-010. Three narrower copies of one blacklist existed
     * here, and all three passed while the deployed note promised *"the app can
     * offer something that fits next time"*.
     */
    for (const sentence of await everySentenceIn(asked)) {
      expect(
        adaptationClaims(sentence),
        `the question promised a change the engine cannot make: “${sentence}”`,
      ).toEqual([])
    }

    await page.getByTestId('blocker-must-stay').click()
    await page.goto(`${APP}#/life/health-recovery`)
    const standing = page.getByTestId('domain-blocker')
    await expect(standing.first()).toBeVisible()

    /*
     * The whole panel, not the row — QA-84-012. The title and the paragraph
     * above the rows are the copy that was outside every gate.
     */
    const panel = page.locator('.panel', { has: page.getByTestId('domain-blocker') }).first()
    const sentences = await everySentenceIn(panel)
    expect(sentences.length, 'the panel read as empty').toBeGreaterThan(3)
    for (const sentence of sentences) {
      expect(
        adaptationClaims(sentence),
        `the standing panel promised a change the engine cannot make: “${sentence}”`,
      ).toEqual([])
    }

    // And every sentence of it that is the app's own is one somebody approved.
    const statement = 'a walk means leaving, and I could not — someone was in my care.'
    const appsOwn = sentences
      .map((line) => line.split(statement).join('{statement}'))
      .filter((line) => line !== '{statement}' && !line.startsWith('Not true any more: '))
    for (const sentence of appsOwn) {
      expect(
        containsApprovedBlockerCopy(sentence),
        `the standing panel rendered copy nobody approved: “${sentence}”`,
      ).toBe(true)
    }
  })
})

test.describe('owner addendum — the discovery card says what it will do first', () => {
  test('shows the interpretation, what it makes and what it will not assume', async ({ page }) => {
    /*
     * The owner typed **More money** into the Career prompt and pressed *That
     * is it*, believing he had confirmed an interpretation. The branch went
     * straight to the record builder, and the panel one screen away has had the
     * whole contract since package 3.
     */
    await loadInQa(page, 'The first evening')
    await go(page, 'Insights')
    await page.getByTestId('discovery-open').click()

    // Nothing to confirm until there is something to confirm.
    await expect(page.getByTestId('discovery-proposal')).toHaveCount(0)
    await expect(page.getByTestId('discovery-save')).toBeDisabled()

    await page.getByTestId('discovery-answer').fill('More money')
    const proposal = page.getByTestId('discovery-proposal')
    await expect(proposal).toBeVisible()
    await expect(proposal, 'his words were not shown back to him').toContainText('More money')
    await expect(proposal).toContainText('Career & Learning')
    await expect(page.getByTestId('discovery-unknowns')).toContainText('the next step')
    await expect(page.getByTestId('discovery-save')).toBeEnabled()
  })

  test('and writes nothing at all if he leaves it', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Insights')
    await page.getByTestId('discovery-open').click()
    await page.getByTestId('discovery-answer').fill('More money')
    await expect(page.getByTestId('discovery-proposal')).toBeVisible()

    await page.getByTestId('discovery-leave').click()
    await expect(page.getByTestId('discovery-prompt')).toHaveCount(0)

    // Career has no aspiration on it: reading a proposal is not agreeing to one.
    await openCareer(page)
    await expect(page.locator('body')).not.toContainText('More money')
  })
})

// ---------------------------------------------------------------------------
// QA round 2 — the four the retest found, on the screens they were found on
// ---------------------------------------------------------------------------

test.describe('what independent QA found on the repaired build', () => {
  test('QA-84-007 — a first-run store offers ordinary ways on, not a developer tool', async ({
    page,
  }) => {
    /*
     * A genuinely fresh store: no scenario, no QA laboratory. The abstention is
     * unchanged and is right — the engine will not guess — but abstaining from a
     * recommendation is not the same as having nothing to offer.
     */
    await page.goto(APP)
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
    await expect(page.locator('.primary-surface__headline')).toContainText('no history here yet')

    await expect(page.getByTestId('empty-to-insights')).toBeVisible()
    await expect(page.getByTestId('empty-to-life')).toBeVisible()

    // And nothing was invented to fill the screen.
    await expect(page.getByTestId('now-actions')).toHaveCount(0)
  })

  test('QA-84-007 — and Life and its pages carry their controls on an empty store', async ({
    page,
  }) => {
    await page.goto(`${APP}#/life`)
    await expect(page.getByRole('heading', { level: 1, name: 'Life' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Career & Learning' }),
      'Life listed no areas on a first run',
    ).toBeVisible()

    await openCareer(page)
    await expect(
      page.getByTestId('destination-open'),
      'the aspiration control was switched off by an empty history',
    ).toBeVisible()
    await expect(page.getByTestId('authoring-kinds')).toBeVisible()
  })

  test('QA-84-008 — what Health promises is what Health then does', async ({ page }) => {
    /*
     * The contradiction QA met in two consecutive screens: the form said the
     * app would **not** start suggesting the step, and the next screen suggested
     * it. Both halves are read here, in one case, in the order the owner met
     * them.
     */
    await loadInQa(page, 'The first evening')
    await page.goto(`${APP}#/life/health-recovery`)
    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Build sustainable strength')
    await page.getByTestId('destination-milestone-input').fill('Lift twice each week')

    const form = page.getByTestId('destination-form')
    const promise = await form.innerText()
    expect(promise, 'the form still denies the suggestion it is about to make').not.toMatch(
      /will not start suggesting/,
    )
    expect(promise).toMatch(/start suggesting it/)

    await page.getByTestId('destination-save').click()
    await expect(page.getByTestId('destination-aim')).toContainText('Build sustainable strength')

    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await expect(
      page.locator('.primary-surface__headline'),
      'the step was promised and not proposed',
    ).toContainText('Lift twice each week')
  })

  test('QA-84-009 — Timeline does not call a partial completion Done', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    const actions = page.getByTestId('now-actions')
    await actions.getByRole('button', { name: 'Start it' }).click()
    await expect(actions.getByRole('button', { name: 'Only part of it' })).toBeEnabled()
    await actions.getByRole('button', { name: 'Only part of it' }).click()
    await expect(page.locator('.rows')).toContainText('Part done')

    await go(page, 'Timeline')
    /*
     * The whole row, not the sentence. The defect was that the tag and the
     * sentence sat one above the other and said opposite things, so reading
     * either one alone is how it survived a round.
     */
    const row = page
      .locator('.timeline__entry, .tl-entry, li')
      .filter({ hasText: 'Got part of the way' })
      .first()
    await expect(row).toBeVisible()
    const text = await row.innerText()
    expect(text, 'the tag above the sentence still says Done').not.toMatch(/\bDone\b/)
    expect(text).toMatch(/Part done/)
  })

  test('QA-84-010 — the blocker note claims nothing the engine does not do', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()

    const asked = page.getByTestId('blocker-question')
    await expect(asked).toBeVisible()
    const note = await asked.innerText()

    // The exact string QA read, gone.
    expect(note).not.toMatch(/offer something that fits next time/)
    expect(note).not.toMatch(/stop putting it in front of you/)
    // And both halves of the shared guard, from the module all three gates use:
    // the class net, and the catalogue the copy has to come from.
    expect(adaptationClaims(note), 'the note promised a future adaptation').toEqual([])
    expect(
      containsApprovedBlockerCopy(note),
      'the question rendered copy that is not in APPROVED_BLOCKER_COPY',
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// QA-84-015 — what is on screen *because* the blocker is
// ---------------------------------------------------------------------------

/**
 * Every sentence the whole screen is showing.
 *
 * The screen, not a panel. Round 7's escape was a sentence written **beside**
 * the blocker question by the screen that renders it, and every check this phase
 * had was scoped to the question's own subtree.
 */
async function everySentenceOnScreen(page: Page): Promise<readonly string[]> {
  return page.locator('.screen').evaluate((root) => {
    const out: string[] = []
    const flat = (text: string) => text.replace(/\s+/g, ' ').trim()
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const node = element as HTMLElement
      if (node.querySelector('*') === null) {
        const text = flat(node.textContent ?? '')
        if (text !== '') out.push(text)
      }
      const label = node.getAttribute('aria-label')
      if (label !== null) out.push(flat(label))
    }
    return [...new Set(out)]
  })
}

test.describe('what is on screen because the blocker is', () => {
  test('QA-84-015 — the blocker question brings only approved copy with it', async ({ page }) => {
    /*
     * The check Round 7's Proof B asked for, and the reason it is a **delta**.
     *
     * `blockerSurfacesInSource()` finds components by the blocker types in their
     * props. `NowScreen` takes none — it derives `blocked` and `blockerDecision`
     * from local state — so a sentence written beside `<BlockerQuestion>` inside
     * the same branch was invisible to every enumeration this phase had, and the
     * synthetic catalogue passed 13/13 while the browser case passed 3/3.
     *
     * What a parent cannot avoid is that its sentence appears **with** the
     * question and goes **with** it. So: read the whole screen with the question
     * up, dismiss it with the control the app already offers, read the whole
     * screen again, and require everything in the difference to be approved
     * copy. That is exactly "what is on screen because the blocker is",
     * wherever it was written and whatever the writer takes as props.
     */
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()

    const asked = page.getByTestId('blocker-question')
    await expect(asked).toBeVisible()
    const withQuestion = await everySentenceOnScreen(page)

    await page.getByTestId('blocker-leave').click()
    await expect(asked).toHaveCount(0)
    const without = new Set(await everySentenceOnScreen(page))

    const brought = withQuestion.filter((line) => !without.has(line))
    expect(
      brought.length,
      'dismissing the question changed nothing, so nothing was compared',
    ).toBeGreaterThan(3)

    const unapproved = brought.filter(
      (line) => !isApprovedBlockerCopy(line) && !containsApprovedBlockerCopy(line),
    )
    expect(
      unapproved,
      'the blocker question brought copy nobody approved onto the screen with it',
    ).toEqual([])

    for (const line of brought) {
      expect(adaptationClaims(line), `“${line}” promised a future adaptation`).toEqual([])
    }
  })

  test('QA-84-015 — and so does the standing blocker on a domain page', async ({ page }) => {
    /*
     * The same delta on the other host. `DomainPage` renders `BlockersPanel`,
     * and the way to make the panel go is the control the owner already has.
     */
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()
    await page.getByTestId('blocker-must-stay').click()

    await page.goto(`${APP}#/life/health-recovery`)
    await expect(page.getByTestId('domain-blocker').first()).toBeVisible()
    const withBlocker = await everySentenceOnScreen(page)

    await page.getByTestId('domain-blocker-lift').first().click()
    await expect(page.getByTestId('domain-blocker')).toHaveCount(0)
    const without = new Set(await everySentenceOnScreen(page))

    const statement = 'a walk means leaving, and I could not — someone was in my care.'
    const brought = withBlocker
      .filter((line) => !without.has(line))
      .map((line) => line.split(statement).join('{statement}'))
    expect(brought.length, 'lifting it changed nothing, so nothing was compared').toBeGreaterThan(2)

    const unapproved = brought.filter(
      (line) =>
        line !== '{statement}' &&
        !line.startsWith('Not true any more: ') &&
        !isApprovedBlockerCopy(line) &&
        !containsApprovedBlockerCopy(line),
    )
    expect(
      unapproved,
      'the standing blocker panel brought copy nobody approved onto the page with it',
    ).toEqual([])

    for (const line of brought) {
      expect(adaptationClaims(line), `“${line}” promised a future adaptation`).toEqual([])
    }
  })
})

// ---------------------------------------------------------------------------
// QA-84-016 and QA-84-018 — every screen the owner can reach, not every
// component somebody could name
// ---------------------------------------------------------------------------

/**
 * Every screen the owner can reach, read off the running app.
 *
 * This is the enumeration that finally has nothing avoidable in it. Round 7's
 * host inventory keyed on the literal JSX tag and Round 8 defeated it with
 * `import { BlockerQuestion as Surface }` — and would have defeated a list of
 * imports, of prop types, or of anything else a component can be spelled as.
 *
 * **A screen the owner can reach cannot be aliased.** It is behind the bottom
 * bar or behind a link on Life, and this walks both rather than being told what
 * they are — so a twelfth page or a fifth destination joins the sweep by
 * existing, and no list in this file has to be kept up to date.
 *
 * The QA laboratory is excluded, and only that: it is a developer tool, not a
 * screen the product offers as part of the owner's life.
 */
async function everyRoute(page: Page): Promise<readonly string[]> {
  await page.goto(`${APP}#/now`)
  await page.waitForSelector('h1')
  const destinations = await page
    .locator('.nav')
    .evaluate((nav) =>
      [...nav.querySelectorAll('button')].map((button) => (button.textContent ?? '').trim()),
    )

  await page.goto(`${APP}#/life`)
  await page.waitForSelector('h1')
  const pages = await page
    .locator('.screen')
    .evaluate((screen) =>
      [...screen.querySelectorAll('a[href]')]
        .map((link) => link.getAttribute('href') ?? '')
        .filter((href) => href.includes('#/life/')),
    )

  const routes = new Set<string>()
  for (const destination of destinations) {
    if (destination === '') continue
    routes.add(`#/${destination.toLowerCase()}`)
  }
  for (const href of pages) routes.add(href.slice(href.indexOf('#/')))
  return [...routes]
}

/** Every sentence and every accessible name on one screen. */
async function sentencesOn(page: Page, route: string): Promise<readonly string[]> {
  await page.goto(`${APP}${route}`)
  await page.waitForSelector('h1')
  return page.locator('.screen').evaluate((root) => {
    const out: string[] = []
    const flat = (text: string) => text.replace(/\s+/g, ' ').trim()
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const node = element as HTMLElement
      if (node.querySelector('*') === null) {
        const text = flat(node.textContent ?? '')
        if (text !== '') out.push(text)
      }
      const label = node.getAttribute('aria-label')
      if (label !== null) out.push(flat(label))
    }
    return [...new Set(out)]
  })
}

async function sweepEveryRoute(page: Page): Promise<ReadonlySet<string>> {
  const seen = new Set<string>()
  const routes = await everyRoute(page)
  expect(routes.length, 'the crawl found almost no screens').toBeGreaterThan(10)
  for (const route of routes) {
    for (const sentence of await sentencesOn(page, route)) seen.add(sentence)
  }
  return seen
}

test.describe('everything a blocker puts on any screen', () => {
  test('QA-84-016/018 — no screen in the app promises an adaptation, before or after a block', async ({
    page,
  }) => {
    /*
     * Round 8 broke the last two ways this was checked, and both breaks share a
     * shape: **the guard identified "the blocker path" by something a writer can
     * simply not do.**
     *
     * **QA-84-016** — the delta compared the screen with the blocker question up
     * against the screen with it dismissed, on the claim that a parent's copy
     * "arrives with the surface and leaves with it". It does not: **Can't right
     * now** also creates a resumable move and `ResumePanel` stays, so a sentence
     * keyed to *that* state sat in both snapshots and the subtraction removed it.
     *
     * **QA-84-018** — the host inventory looked for the literal JSX tag, and
     * `import { BlockerQuestion as Surface }` is not that tag. Nor would a list
     * of imports, prop types, or any other spelling of a component have held.
     *
     * ## So this stops identifying the path, and checks every screen
     *
     * A screen the owner can reach cannot be aliased: it is behind the bottom bar
     * or behind a link on Life, and this walks both rather than being told what
     * they are. **Every string on every one of them, before a block and after
     * one, must make no claim that the app will change what it offers.** That is
     * D-187's actual rule, and there is nowhere left to write a promise that this
     * does not read — not beside a surface, not through a wrapper, not on a
     * screen nobody thought of.
     *
     * ## What this does not do, and why
     *
     * It does not require every string it reads to be **in the catalogue**. The
     * delta between the two sweeps is not blocker copy: it is Now's no-action
     * sentence, Insights' counts, Timeline's total, the correction panel that
     * appears once there is something correctable. Cataloguing those as blocker
     * copy would make the catalogue mean something it does not mean, and would
     * make an unrelated Insights edit fail the blocker gate.
     *
     * The catalogue therefore covers what it genuinely covers — `blockers.ts`,
     * the three surfaces' own rendered copy, what a record reads as, and the
     * export's shapes — and **D-198 says so plainly instead of claiming the
     * whole path**. An unapproved but honest sentence beside a blocker surface
     * is not caught here; a promise is, wherever it is.
     */
    const statement = 'a walk means leaving, and I could not — someone was in my care.'
    const sweepBoth = async (): Promise<readonly string[]> => [...(await sweepEveryRoute(page))]

    /*
     * Both sweeps come from **one** session, and that is load-bearing.
     *
     * The first version of this loaded the scenario twice and answered the
     * guide twice. `answerGuideWith` answers whatever is being asked, so the
     * two passes could answer a different number of questions — and the delta
     * then carried a reading the second pass had recorded rather than anything
     * the block did. It passed alone and failed inside the full suite, which
     * is the signature of a comparison whose two halves are not the same run.
     *
     * Blocking the move in the session that was just swept makes the pre-block
     * state literally the state the block happened to.
     */
    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    const before = await sweepBoth()
    expect(before.length, 'the crawl read almost nothing before the block').toBeGreaterThan(40)

    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()
    await expect(page.getByTestId('blocker-question')).toBeVisible()
    await page.getByTestId('blocker-must-stay').click()
    const after = await sweepBoth()

    /*
     * The app-wide calibration, not the blocker path's. `adaptationClaims` is
     * tuned for short controlled copy — a bare `it` counts as the app, and
     * `can` counts as a modality — and over the whole product that flags honest
     * sentences like *"the app cannot work out on its own"*. Narrowing the
     * shared rule until those went quiet would be tuning a guard to pass.
     * `adaptationClaimsOnAnyScreen` is a second calibration with a principled
     * difference: a **named** subject and **futurity**, never ability.
     */
    const claiming: string[] = []
    for (const line of [...before, ...after]) {
      for (const claim of adaptationClaimsOnAnyScreen(line)) claiming.push(`“${line}” → ${claim}`)
    }
    expect(claiming, 'a screen in the app claims the app will change what it offers').toEqual([])

    /*
     * And the whole difference, which is what closes QA-84-016.
     *
     * The comparison is against the screens **before** the block, not against
     * the same screen with one surface dismissed. Round 7's version compared
     * those two and Round 8 disproved the claim underneath it: **Can't right
     * now** also leaves a resumable move, so `ResumePanel` stays and a sentence
     * keyed to it sat in both snapshots and was subtracted away.
     *
     * Comparing against the pristine screens brings along everything else the
     * new records changed — Now's no-action line, Timeline's total, Insights'
     * counts, the correction control that appears once there is something to
     * correct. Those are approved in `APPROVED_WHEN_A_MOVE_IS_BLOCKED`, under
     * that name rather than as blocker copy, because that is what they are.
     */
    const asTemplate = (line: string) =>
      line
        .split(statement)
        .join('{statement}')
        .split('getting out for a walk')
        .join('{object}')
        .split('Getting out for a walk')
        .join('Getting out for {move}')
        .split('not right now')
        .join('{state}')
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '{day}')
        .replace(/\d+/g, '{n}')

    const brought = after.filter((line) => !before.includes(line)).map(asTemplate)
    expect(brought.length, 'blocking a move changed nothing anywhere').toBeGreaterThan(4)

    const unapproved = brought.filter(
      (line) =>
        line !== '{statement}' &&
        !line.startsWith('Not true any more: ') &&
        !isApprovedBlockerCopy(line) &&
        !containsApprovedBlockerCopy(line) &&
        !isApprovedWhenBlocked(line),
    )
    expect(
      unapproved,
      'blocking a move put copy nobody approved on a screen — approve it in APPROVED_BLOCKER_COPY if it is blocker copy, or in APPROVED_WHEN_A_MOVE_IS_BLOCKED if it is what another screen says once a record exists',
    ).toEqual([])
  })

  test('QA-84-016 — and the blocker surfaces themselves carry only approved copy', async ({
    page,
  }) => {
    /*
     * The catalogue's own claim, on the two surfaces it covers, read from the
     * whole panel rather than a child locator. This is the part that **is**
     * closed: what `BlockerQuestion` and `BlockersPanel` put on the page is
     * exactly what somebody approved.
     */
    const statement = 'a walk means leaving, and I could not — someone was in my care.'

    await loadInQa(page, 'The first evening')
    await go(page, 'Now')
    await answerGuideWith(page, ['Enough', 'Nothing'])
    await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).click()

    const asked = page.getByTestId('blocker-question')
    await expect(asked).toBeVisible()
    for (const sentence of await everySentenceIn(asked)) {
      expect(
        containsApprovedBlockerCopy(sentence) || isApprovedBlockerCopy(sentence),
        `the question rendered copy nobody approved: “${sentence}”`,
      ).toBe(true)
    }

    await page.getByTestId('blocker-must-stay').click()
    await page.goto(`${APP}#/life/health-recovery`)
    const panel = page.locator('.panel', { has: page.getByTestId('domain-blocker') }).first()
    await expect(panel).toBeVisible()
    for (const sentence of await everySentenceIn(panel)) {
      const line = sentence.split(statement).join('{statement}')
      if (line === '{statement}' || line.startsWith('Not true any more: ')) continue
      expect(
        containsApprovedBlockerCopy(line) || isApprovedBlockerCopy(line),
        `the standing panel rendered copy nobody approved: “${line}”`,
      ).toBe(true)
    }
  })
})
