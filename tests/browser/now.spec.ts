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
  // Scoped to the bar: role names match as substrings, and a scenario summary
  // reading "everything the app knows" contains one.
  await page.locator('.nav').getByRole('button', { name: 'Now' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
}

/**
 * Back to the laboratory without reloading.
 *
 * `page.goto` would remount the app, and the clock is captured at mount — so a
 * scenario set on a September evening would come back on today's. The in-app
 * link is a hash change, which is what the owner would use anyway.
 */
async function backToQa(page: Page) {
  await page.getByRole('link', { name: 'The QA laboratory' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
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

  test('renders no empty card when there is nothing to put in one', async ({ page }) => {
    /*
     * On an evening with no limiter and a single candidate, all four detail
     * rows are absent — and the panel around them was still drawn, leaving an
     * empty bordered rectangle under the recommendation for the owner to work
     * out. A panel with nothing in it is not a quiet panel.
     */
    await loadInQa(page, 'A settled arrangement, and one week away')
    await goToNow(page)

    await expect(page.locator('.primary-surface__headline')).toContainText('Adaya')

    // No limiter, one candidate, nothing asked — so there is nothing to put in
    // a panel, and none is drawn.
    await expect(page.locator('.panel')).toHaveCount(0)
  })

  test('never draws a panel with nothing in it, on any scenario', async ({ page }) => {
    for (const title of [
      'Three broken nights, and a deadline',
      'A week pointed at the house',
      'A settled arrangement, and one week away',
      'A month of history, three weeks ago',
      'Two ordinary weeks',
    ]) {
      await loadInQa(page, title)
      await goToNow(page)
      for (const panel of await page.locator('.panel').all()) {
        await expect(panel, title).not.toBeEmpty()
      }
    }
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
    await expect(page.getByTestId('now-question')).toContainText('How much energy have you got')
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
    // Only what the walk actually won on: the reading just given, and the part
    // of the day, which the ranking scored positively.
    await expect(page.getByTestId('now-reason')).toHaveText(
      'Energy is good, and the evening suits a walk.',
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

test.describe('the loop, on a phone', () => {
  /*
   * Section 66's slice, walked the way the owner walks it. The unit suites
   * prove the engine reaches the right decision and the right records; these
   * prove the buttons are there, that tapping one changes the screen, and that
   * two taps in the same second do not become two of anything.
   */
  test('offers something to do about the move, and remembers it', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    await expect(page.locator('.primary-surface__headline')).toContainText('kitchen')

    const actions = page.getByTestId('now-actions')
    await expect(actions.getByRole('button', { name: 'Start it' })).toBeVisible()
    await expect(actions.getByRole('button', { name: 'Done' })).toBeVisible()
    await expect(actions.getByRole('button', { name: "Can't right now" })).toBeVisible()

    await actions.getByRole('button', { name: 'Start it' }).click()

    // Started moves stay in front of the owner. Every event recomputes, so
    // without that rule the top spot could go elsewhere while they were at the
    // sink.
    await expect(page.locator('.primary-surface__headline')).toContainText('kitchen')
    const stands = page.locator('.rows__row', { hasText: 'Where this stands' }).locator('dd')
    await expect(stands).toHaveText('Under way')
    // Still drawn, so nothing under the finger moves — and no longer live,
    // because starting something twice is not a transition.
    await expect(actions.getByRole('button', { name: 'Start it' })).toBeDisabled()
  })

  test('moves on when the owner asks for something else', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    const headline = page.locator('.primary-surface__headline')
    await expect(headline).toContainText('kitchen')

    await page.getByTestId('now-actions').getByRole('button', { name: 'Something else' }).click()
    await expect(headline).not.toContainText('kitchen')
  })

  test('keeps the buttons where they were after one is pressed', async ({ page }) => {
    /*
     * The hazard a shifting row creates: tap **Start it**, and **Done** slides
     * into the space the finger has not left yet. The second half of a double
     * tap then records "I have done this" — a legal transition, a plausible
     * thing to have meant, and indistinguishable downstream from the truth.
     */
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    const actions = page.getByTestId('now-actions')

    // Measured inside the row rather than against the viewport: the page grows
    // by a line when the move gains a state, and a few pixels of scroll is not
    // what this is about.
    const placeOfDone = async () =>
      page.evaluate(() => {
        const row = document.querySelector('[data-testid="now-actions"]')
        const done = [...(row?.querySelectorAll('.now-act') ?? [])].find(
          (element) => element.textContent === 'Done',
        )
        if (row === null || done === undefined) return undefined
        const outer = row.getBoundingClientRect()
        const inner = done.getBoundingClientRect()
        return { x: inner.x - outer.x, y: inner.y - outer.y }
      })

    const before = await placeOfDone()
    await actions.getByRole('button', { name: 'Start it' }).click()
    await expect(actions.getByRole('button', { name: 'Start it' })).toBeDisabled()

    expect(before).toBeDefined()
    expect(await placeOfDone()).toEqual(before)
  })

  test('creates one episode from a double tap', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    /*
     * Both clicks in one task, which is what a double tap actually is.
     *
     * Two Playwright clicks cannot express this: the second waits for the page
     * to settle first, so it is a slow tap rather than a fast one. Dispatching
     * them together lands both before React has re-rendered, which is the
     * moment the latch in `NowScreen` exists for.
     */
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('.now-act')].find(
        (element) => element.textContent === 'Start it',
      )
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await expect(
      page.locator('.rows__row', { hasText: 'Where this stands' }).locator('dd'),
    ).toHaveText('Under way')

    // Counted in the inspector rather than inferred from the screen. Reached by
    // the in-app link so the laboratory's clock survives the trip — a reload
    // would put the app back on the real evening.
    await backToQa(page)
    await expect(
      page.locator('.qa-block__summary', { hasText: 'Episodes' }).locator('.qa-block__count'),
    ).toHaveText('1')
  })

  test('says what a decision rests on, and lets the owner disagree', async ({ page }) => {
    await loadInQa(page, 'A month of what actually worked')
    await goToNow(page)

    await expect(page.locator('.primary-surface__headline')).toContainText('kitchen')
    const rests = page.getByTestId('now-rests-on')
    await expect(rests).toContainText('has worked')
    await expect(rests).toContainText('situations like tonight')

    // Section 62 — a belief the owner cannot see is one they cannot correct.
    await rests.getByRole('button', { name: /Not how it went/ }).click()
    await expect(page.getByTestId('now-rests-on')).toHaveCount(0)
  })

  test('asks for a result once there is one to give', async ({ page }) => {
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).click()
    // Not yet: asking the moment a thing is finished collects an answer about
    // intent, which looks exactly like evidence and is not.
    await expect(page.getByTestId('now-outcome')).toHaveCount(0)

    // The window opens twenty minutes after the move is finished, and the
    // laboratory's clock is the way to be there for it.
    await backToQa(page)
    await page.getByRole('button', { name: '+1 hour' }).click()
    await goToNow(page)

    /*
     * Two questions, because they are two facts — DEF-0020.
     *
     * Whether the kitchen got cleared is not what Done recorded: Done is the
     * attempt, and fifteen minutes may not reach the end state. Whether the
     * evening went better afterwards is a third thing again. Both are asked as
     * graded questions because both have graded answers, which is precisely
     * what "Did the kitchen get cleared?" against *About the same* was not.
     */
    await expect(page.getByTestId('now-outcome')).toHaveText('How much of the kitchen got cleared?')
    await page.getByRole('button', { name: 'Completely' }).click()

    await expect(page.getByTestId('now-outcome')).toHaveText(
      'How much did clearing the kitchen do for the evening?',
    )
    await page.getByRole('button', { name: 'A real difference' }).click()

    await expect(page.getByTestId('now-outcome')).toHaveCount(0)
  })

  test('stops asking about the evening when the kitchen never got cleared', async ({ page }) => {
    // The short-circuit: there is no honest answer to how the evening went
    // after clearing a kitchen that was never cleared, and whichever one was
    // picked would be recorded as evidence about clearing kitchens.
    await loadInQa(page, 'A week pointed at the house')
    await goToNow(page)

    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).click()
    await backToQa(page)
    await page.getByRole('button', { name: '+1 hour' }).click()
    await goToNow(page)

    await expect(page.getByTestId('now-outcome')).toHaveText('How much of the kitchen got cleared?')
    await page.getByRole('button', { name: 'Not at all' }).click()

    await expect(page.getByTestId('now-outcome')).toHaveCount(0)
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

/**
 * Phase 4 — coverage, growth, and evidence the owner never typed.
 */
test.describe('the morning reading answers the question', () => {
  /**
   * Section 8's first preference, end to end and only reachable here.
   *
   * The derivation is a pure function that returns records; the one place with
   * a store to put them in is `MemoryProvider`, so this flow is the only test
   * that exercises the whole path — finish an early night, wake up, tell the
   * app how you slept, and never be asked what that did for your sleep.
   */
  test('does not ask what an early night did once it knows how the night went', async ({
    page,
  }) => {
    await loadInQa(page, 'Three broken nights, and a deadline')
    await goToNow(page)
    await expect(page.locator('.primary-surface__headline')).toContainText('recovery')

    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).click()

    // The next morning, which is when a night's sleep can honestly be judged.
    await backToQa(page)
    await page.getByRole('button', { name: '+1 day' }).click()
    await goToNow(page)

    // He is asked how he slept, once, by the guide — the question he would be
    // asked anyway.
    await expect(page.getByTestId('now-question')).toHaveText(
      'How much sleep did you actually get?',
    )
    await page.getByRole('button', { name: 'A full night' }).click()

    // And never asked the second time in the other shape. The reading he just
    // gave is the answer to "how much did that do for your sleep?", and asking
    // is asking twice.
    await expect(page.getByTestId('now-outcome')).toHaveCount(0)
  })

  test('writes the result down without ever asking for it', async ({ page }) => {
    await loadInQa(page, 'Three broken nights, and a deadline')
    await goToNow(page)
    await page.getByTestId('now-actions').getByRole('button', { name: 'Done' }).click()

    await backToQa(page)
    await page.getByRole('button', { name: '+1 day' }).click()
    await goToNow(page)
    await page.getByRole('button', { name: 'A full night' }).click()

    // The episode ends with an answer against it, and no outcome question was
    // ever put on screen. That is section 8's first preference, from the only
    // angle the owner could check it from.
    await backToQa(page)
    await page.locator('summary', { hasText: 'Episodes' }).click()
    await expect(page.locator('.rows__row', { hasText: 'recovery' }).first()).toContainText(
      'answer(s) given',
    )
  })
})

test.describe('a growth area that has moved on', () => {
  test('asks whether to call it settled, and stops once answered', async ({ page }) => {
    await loadInQa(page, 'Three times running, and the app noticed')
    await goToNow(page)

    // Section 9's own sentence, in this app's words. It sits below the move
    // rather than replacing it — the evening still gets a recommendation.
    await expect(page.getByTestId('now-growth')).toContainText('Adaya')
    await expect(page.getByTestId('now-growth')).toContainText('ordering her own food')
    await expect(page.locator('.primary-surface__headline')).not.toHaveText('')

    await page.getByRole('button', { name: 'Yes, she has got this' }).click()
    await expect(page.getByTestId('now-growth')).toHaveCount(0)
  })

  test('takes not-yet as an answer rather than as a snooze', async ({ page }) => {
    await loadInQa(page, 'Three times running, and the app noticed')
    await goToNow(page)

    await page.getByRole('button', { name: 'Not yet' }).click()
    await expect(page.getByTestId('now-growth')).toHaveCount(0)
  })
})
