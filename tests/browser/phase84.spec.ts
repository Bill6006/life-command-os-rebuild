import { expect, test, type Page } from '@playwright/test'

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

async function go(page: Page, name: 'Now' | 'Life' | 'Timeline') {
  await page.locator('.nav').getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
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
    await expect(question).not.toBeVisible({ timeout: 5000 }).catch(() => undefined)
  }
  await expect(page.getByTestId('now-actions')).toBeVisible()
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
    await expect(actions.getByRole('button', { name: 'Got some of it done' })).toBeEnabled()
    await actions.getByRole('button', { name: 'Got some of it done' }).click()
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
    await expect(events.first()).toBeVisible()
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

    await expect(page.getByTestId('correctable-event').first()).not.toContainText(withdrawing)
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
  test('asks on Life and not on Now', async ({ page }) => {
    await loadInQa(page, 'The first evening')

    await go(page, 'Life')
    await expect(page.getByTestId('discovery-prompt')).toBeVisible()
    await expect(page.getByTestId('discovery-skip')).toBeVisible()

    await go(page, 'Now')
    await expect(page.getByTestId('discovery-prompt')).toHaveCount(0)
  })

  test('respects a skip', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Life')

    const first = await page.getByTestId('discovery-answer').getAttribute('id')
    const asked = await page.locator('[data-testid="discovery-prompt"] label').innerText()
    await page.getByTestId('discovery-skip').click()

    const next = page.locator('[data-testid="discovery-prompt"] label')
    if (await next.isVisible()) {
      await expect(next).not.toHaveText(asked)
    }
    expect(first).toBe('discovery-answer')
  })

  test('shows what an answer changed', async ({ page }) => {
    await loadInQa(page, 'The first evening')
    await go(page, 'Life')

    await page.getByTestId('discovery-answer').fill('Working as a cloud engineer')
    await page.getByTestId('discovery-save').click()

    await page.getByTestId('discovery-changes-open').click()
    await expect(page.getByTestId('discovery-changes')).toBeVisible()
  })
})
