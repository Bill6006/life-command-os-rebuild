import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Routing Phase 83, in a real browser.
 *
 * Four of this phase's five gate items are about what a person sees and can
 * press, and every one of them was found by a person with a browser rather than
 * by a suite: a Now card reading **Done** with five inert controls, a sentence
 * calling four records plenty, a promise the behaviour underneath it did not
 * keep, and a text field with no name on it.
 *
 * So the assertions here are the owner's: open the history, read the screen,
 * press the thing.
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

// ---------------------------------------------------------------------------
// 83.1 — D-160, the Now card that read Done
// ---------------------------------------------------------------------------

test.describe('a completion three days ago does not settle today', () => {
  test('offers all five controls on a freshly generated walk', async ({ page }) => {
    /*
     * E31, reproduced as a history and read as the owner read it. The walk was
     * finished on the 22nd; this is the 25th; the card used to say "Where this
     * stands — Done" with nothing pressable under it.
     */
    await loadInQa(page, 'Three days since that walk')
    await go(page, 'Now')

    await expect(page.locator('.primary-surface__headline')).toContainText('a walk')

    const actions = page.getByTestId('now-actions')
    await expect(actions).toBeVisible()
    for (const label of ['Start it', 'Done', 'Something else', "Can't right now", 'Not today']) {
      await expect(actions.getByRole('button', { name: label })).toBeEnabled()
    }

    // And the card does not claim a standing it does not have.
    await expect(page.locator('.screen')).not.toContainText('Where this stands')
  })

  test('still says where it stands once it is settled today', async ({ page }) => {
    // The other half. A guard that never fires is a deletion, not a guard.
    await loadInQa(page, 'Three days since that walk')
    await go(page, 'Now')

    await page.getByTestId('now-actions').getByRole('button', { name: 'Start it' }).click()
    await expect(page.locator('.rows')).toContainText('Where this stands')
    await expect(page.locator('.rows')).toContainText('Under way')
  })
})

// ---------------------------------------------------------------------------
// 83.2 — F39, sentences about how much history there is
// ---------------------------------------------------------------------------

test.describe('nothing claims a quantity of history the app did not count', () => {
  test('does not call four records plenty', async ({ page }) => {
    await loadInQa(page, 'One answer, and a lot of silence')
    await go(page, 'Now')

    const screen = await page.locator('.screen').innerText()
    expect(screen).not.toContain('plenty of history')
  })

  test('Timeline says what is recorded, not what happened', async ({ page }) => {
    await loadInQa(page, 'Four things, over three days')
    await go(page, 'Timeline')

    await expect(page.locator('.screen')).toContainText('Everything recorded here')
    const screen = await page.locator('.screen').innerText()
    expect(screen).not.toContain('Everything that happened')
  })

  test('does not call part of the record the whole of it', async ({ page }) => {
    /*
     * "One answer, and a lot of silence" holds four records, one dated the
     * following day. The page rendered three rows and called them the whole
     * record.
     */
    await loadInQa(page, 'One answer, and a lot of silence')
    await go(page, 'Timeline')

    const end = page.getByTestId('tl-end')
    await expect(end).toBeVisible()
    await expect(end).toContainText('everything up to the moment on screen')
    await expect(end).toContainText('dated later')
    await expect(end).not.toContainText('the whole record')
  })
})

// ---------------------------------------------------------------------------
// 83.3 — F30, the private promise, read from both ends
// ---------------------------------------------------------------------------

test.describe('the private promise and Timeline agree', () => {
  test('promises only what the behaviour keeps', async ({ page }) => {
    await loadInQa(page, 'Two ordinary weeks')
    await page.goto(`${APP}#/life/private`)

    const lede = page.locator('.screen')
    await expect(lede).toContainText('The words stay on this page')
    await expect(lede).toContainText('Timeline shows that an entry exists and when')
    const text = await lede.innerText()
    expect(text).not.toContain('Nothing here appears anywhere else')
  })

  test('and Timeline does exactly that, from the other end', async ({ page }) => {
    await loadInQa(page, 'Two ordinary weeks')
    await go(page, 'Timeline')

    const screen = await page.locator('.screen').innerText()
    // The existence and the timing, which the promise now names.
    expect(screen).toContain('Private entry')
    // Never the words, which the promise still keeps.
    expect(screen).not.toContain('late scrolling')
  })
})

// ---------------------------------------------------------------------------
// 83.4 — F40, every owner-facing control has a name
// ---------------------------------------------------------------------------

/** Every form control on the screen, and the accessible name it carries. */
async function namesOfControls(
  page: Page,
): Promise<readonly { tag: string; name: string; where: string }[]> {
  const controls: Locator = page.locator('.screen').locator('input, textarea, select')
  /*
   * The name a browser would compute, not the attribute it happened to be
   * written with. `aria-label`, `aria-labelledby`, a wrapping `<label>` and a
   * `htmlFor` are four ways of arriving at the same thing, and a check that
   * looked for one of them would pass a control named by another and fail a
   * control named by none in exactly the same way. `element.labels` is the DOM's
   * own answer for the last two.
   */
  return controls.evaluateAll((nodes) =>
    nodes.map((node) => {
      const element = node as HTMLInputElement
      const labelled = element.getAttribute('aria-labelledby')
      const fromIds =
        labelled === null
          ? ''
          : labelled
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ')
      const fromLabels = [...(element.labels ?? [])]
        .map((label) => label.textContent ?? '')
        .join(' ')
      const name = (element.getAttribute('aria-label') ?? '') + fromIds + fromLabels
      return {
        tag: element.tagName.toLowerCase(),
        name: name.trim(),
        where: `${element.tagName.toLowerCase()}[type=${element.getAttribute('type') ?? 'text'}].${element.className}`,
      }
    }),
  )
}

test.describe('every owner-facing control has a name', () => {
  test('the domain page’s free-text correction is named and says what it is for', async ({
    page,
  }) => {
    await loadInQa(page, 'Two ordinary weeks')
    await page.goto(`${APP}#/life/emotional`)

    /*
     * The first of them — routing 92. The Emotional page carries seven of these
     * now: the free-text reading he types, and D-166's six dimensions, four of
     * which are readable and never asked. That is the ordinary-owner contract's
     * own expectation rather than a change to this control, and what this test
     * is about is whether the control is named and says what it is for.
     */
    await page
      .getByRole('button', { name: /Not right\?|Add this/ })
      .first()
      .click()

    const field = page.getByRole('textbox', { name: /in your own words/i })
    await expect(field).toBeVisible()
    await expect(page.locator('.domain-correction__note')).toContainText('from now on')
  })

  test('the coverage correction is named after the area it is about', async ({ page }) => {
    /*
     * Reached by travelling, and that is itself worth writing down. No history
     * in the shipped library reaches this control at the moment it is written
     * for: an area has to be stale *and* have no single overdue reading to
     * point at instead, and every fixture that goes stale has one. Four weeks
     * on from a studying history is where it appears — which is the sort of
     * thing D-161's instrument exists to notice.
     */
    await loadInQa(page, 'A topic that keeps slipping')
    for (let week = 0; week < 4; week += 1) {
      await page.getByRole('button', { name: '+1 week' }).click()
    }

    await page.goto(`${APP}#/life/career`)
    const opener = page.getByRole('button', { name: "Something's changed" })
    await expect(opener).toBeVisible()
    await opener.click()

    await expect(page.getByRole('textbox', { name: /What has changed in/i })).toBeVisible()
    await expect(page.locator('.domain-correction__note')).toContainText(
      'brings the picture back up to date',
    )
  })

  test('no control anywhere the owner can reach is nameless', async ({ page }) => {
    /*
     * The sweep. `architecture-guards.test.ts` reads the source; this reads the
     * accessibility tree of the running app, which is the thing that actually
     * decides whether a screen reader has anything to say.
     */
    await loadInQa(page, 'A topic that keeps slipping')

    const surfaces = [
      `${APP}#/now`,
      `${APP}#/life`,
      `${APP}#/timeline`,
      `${APP}#/insights`,
      `${APP}#/more`,
      `${APP}#/data`,
      `${APP}#/life/health-recovery`,
      `${APP}#/life/career`,
      `${APP}#/life/private`,
      `${APP}#/qa`,
    ]

    for (const url of surfaces) {
      await page.goto(url)
      await expect(page.locator('.screen')).toBeVisible()
      for (const control of await namesOfControls(page)) {
        expect(control.name, `${url} has an unnamed ${control.where}`).not.toBe('')
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Round 1 repairs — QA-83-001 and QA-83-002, on the card they were read on
// ---------------------------------------------------------------------------

test.describe('the card independent QA read', () => {
  test('does not call one occasion the last few times', async ({ page }) => {
    /*
     * QA-83-001. The reason said "The last few times made little difference"
     * over a history whose own evidence panel said "One occasion in the record"
     * and "1 occasion".
     */
    await loadInQa(page, 'Three days since that walk')
    await go(page, 'Now')

    const reason = await page.getByTestId('now-reason').innerText()
    expect(reason).not.toContain('The last few times')
    expect(reason).toContain('The one time before')

    await page.getByTestId('now-see-evidence').click()
    const evidence = await page.getByTestId('now-evidence').innerText()
    expect(evidence).toContain('One occasion')
    expect(evidence).toContain('1 occasion')
  })

  test('names the walk in the belief and in the button that corrects it', async ({ page }) => {
    /*
     * QA-83-002. The headline said "a walk", the belief said "Move", the button
     * said "what move does for you" and the panel said "getting out for a
     * walk" — four registers for one thing, on one screen.
     */
    await loadInQa(page, 'Three days since that walk')
    await go(page, 'Now')

    const rests = page.getByTestId('now-rests-on')
    await expect(rests).toContainText('Getting out for a walk has made little difference')
    await expect(rests).not.toContainText('Move has made little difference')

    await expect(
      page.getByRole('button', { name: /correct what getting out for a walk does for you/i }),
    ).toBeVisible()

    // And the panel that was already right still agrees with both.
    await page.getByTestId('now-see-evidence').click()
    await expect(page.getByTestId('now-evidence')).toContainText('getting out for a walk')
  })

  test('counts the held move rather than the hold, on a deferral', async ({ page }) => {
    /*
     * DEF-0112, found by the sweep written for QA-83-001 rather than reported.
     * The panel said "0 occasions · too early to say" directly above "Clearing
     * the kitchen has worked several times".
     *
     * Half past five is where this history defers, so the clock is set rather
     * than nudged: a test that skips itself when it does not find the state it
     * was written for is a test that reports nothing.
     */
    await loadInQa(page, 'A month of what actually worked')
    const day = (await page.locator('.rows__row', { hasText: 'Owner-local' }).innerText()).match(
      /(\d{4}-\d{2}-\d{2})/,
    )?.[1]
    expect(day, 'the laboratory should say which day it is on').toBeDefined()
    await page.getByLabel('Travel to').fill(`${day}T05:30`)

    await go(page, 'Now')
    await expect(page.locator('.primary-surface__headline')).toContainText('suits')
    await expect(page.getByTestId('now-actions')).toHaveCount(0)

    await page.getByTestId('now-see-evidence').click()
    const evidence = await page.getByTestId('now-evidence').innerText()
    expect(evidence, 'the panel counts the held move, not the hold').not.toContain('0 occasions')
    expect(evidence).toContain('Clearing the kitchen')
  })
})
