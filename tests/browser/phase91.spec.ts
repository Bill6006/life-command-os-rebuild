import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

/**
 * Routing 91 in a real browser — the ordinary-owner reality contract.
 *
 * ## What makes this the gate rather than a re-run of the suite
 *
 * `PRODUCT_ADJUDICATION_2.md` §6.3's completion condition is *"all eight CASE A
 * acceptance tests, from a fresh store, in a browser that has never opened
 * `#/qa`, plus (f) proved in two domains."* Every assertion below is therefore
 * the owner's: **open an empty app, meet the question, type the words, read what
 * the app says back, press the thing.** No scenario, no `loadInQa`, no fixture
 * seeding, no record injection.
 *
 * `tests/synthetic/interpretation.test.ts` is the other half. It proves the
 * engine reasons correctly over evidence — byte-identity across the library, the
 * digest, the adversarial phrases. This proves the evidence can be created at
 * all, which is the half no fixture can stand in for (D-161, extended to screen
 * reachability).
 *
 * ## Time moves the way routing 90 proved it moves
 *
 * `(g) advance three days and confirm the interpretation is not re-proposed`
 * uses `page.clock`, installed before `page.goto`, then `fastForward` plus a
 * reload — the instrument routing 90 gated separately and on its own, precisely
 * so that a failure here is a product failure (`ROUTING_91_BRIEF.md` §7).
 *
 * ## The laboratory is never opened
 *
 * Not a preference: the whole worth of this file is that it uses the app the way
 * the owner does. The last test reads this file's own text and fails if a later
 * edit reaches for a laboratory control because it was easier.
 */

const LABORATORY_CONTROLS = [
  '#' + '/qa',
  'travel' + 'To',
  'loadIn' + 'Qa',
  'scenario' + 'ById',
  'load' + 'Document',
] as const
const SCAN_FROM = '//' + ' OWNER-BEGINS'
const SCAN_TO = '//' + ' OWNER-ENDS'

// OWNER-BEGINS
const APP = '/life-command-os-rebuild/preview/'

/** UTC, so "three days later" means three local days and not two-and-a-bit. */
test.use({ timezoneId: 'UTC' })

/** A Tuesday morning, nowhere near a DST transition in UTC (there are none). */
const TUESDAY_0900 = new Date('2026-03-03T09:00:00Z')
const DAYS = (n: number) => n * 24 * 60 * 60 * 1000

async function go(page: Page, name: 'Now' | 'Life' | 'Timeline' | 'Insights') {
  await page.locator('.nav').getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

/** A store with nothing in it, and the app says so itself before anything else. */
async function freshApp(page: Page) {
  await page.goto(APP)
  await expect(page.getByRole('heading', { name: 'There is no history here yet.' })).toBeVisible()
}

/** Open the question the second agenda is putting, on Insights. */
async function openTheQuestion(page: Page) {
  await go(page, 'Insights')
  const open = page.getByTestId('discovery-open')
  await expect(open).toBeVisible()
  await open.click()
  await expect(page.getByTestId('discovery-answer')).toBeVisible()
}

async function typeAim(page: Page, words: string) {
  await page.getByTestId('discovery-answer').fill(words)
  await expect(page.getByTestId('discovery-proposal')).toBeVisible()
}

async function confirm(page: Page) {
  await page.getByTestId('discovery-save').click()
  await expect(page.getByTestId('discovery-answer')).toBeHidden()
}

/** The laboratory was never opened, on any surface, at any point. */
async function neverTheLaboratory(page: Page) {
  expect(page.url()).not.toContain(LABORATORY_CONTROLS[0])
  await expect(page.locator('.lab-notice')).toHaveCount(0)
}

async function openPage(page: Page, slug: string, heading: string) {
  await page.goto(`${APP}#/life/${slug}`)
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
}

/** Introduce a thing on whatever domain page is open, through its own control. */
async function introduce(page: Page, name: string) {
  await page.getByTestId('authoring-kind-goal').click()
  await page.getByTestId('authoring-name').fill(name)
  await expect(page.getByTestId('authoring-proposal')).toBeVisible()
  await page.getByTestId('authoring-save').click()
  await expect(page.getByTestId('authoring-kinds')).toBeVisible()
}

// ---------------------------------------------------------------------------
// Journey A — the Career question, "More money", and Money on Now
// ---------------------------------------------------------------------------

test.describe('91 — CASE A, walked from a store with nothing in it', () => {
  test('(a) the Career question is met, and the app names Money out of two words', async ({
    page,
  }) => {
    await freshApp(page)
    await openTheQuestion(page)

    await expect(page.getByTestId('discovery-prompt')).toContainText(
      'What are you hoping Career & Learning eventually looks like?',
    )
    await typeAim(page, 'More money')

    const reading = page.getByTestId('discovery-reading')
    await expect(reading).toContainText(
      'These words sound like they are about Money & Financial Resilience, from “money”.',
    )
    await expect(page.getByTestId('discovery-keep')).toHaveText('Keep it in Career & Learning')
    await expect(page.getByTestId('discovery-refile')).toHaveText(
      'File it in Money & Financial Resilience instead',
    )
    await expect(
      page.getByTestId('discovery-keep'),
      'and nothing is moved until he moves it',
    ).toHaveAttribute('aria-pressed', 'true')

    await neverTheLaboratory(page)
  })

  test('the chosen row is visibly chosen, and not only announced as chosen', async ({ page }) => {
    /*
     * A toggle with no visible state is a control that lies about what will
     * happen. `aria-pressed` tells a screen reader; this asks the running page
     * for the **computed** colours, because a rule that was never written, or
     * was written into a stylesheet this screen does not load, would leave
     * `aria-pressed` perfectly correct and the two pills identical.
     */
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'More money')

    const paint = (id: string) =>
      page.getByTestId(id).evaluate((node) => {
        const style = getComputedStyle(node as Element)
        return `${style.color}|${style.backgroundColor}|${style.borderColor}|${style.fontWeight}`
      })

    const keptWhileKeeping = await paint('discovery-keep')
    const offeredWhileKeeping = await paint('discovery-refile')
    expect(keptWhileKeeping, 'the selected row differs from the unselected one').not.toBe(
      offeredWhileKeeping,
    )

    /*
     * Polled, because `.domain-option` transitions its background and border.
     *
     * Reading the computed style the instant after the click returns the value
     * the transition started from — which is a real property of the page and
     * not the one being asserted. The first draft of this test failed on
     * exactly that and reported a missing rule that was there.
     */
    await page.getByTestId('discovery-refile').click()
    await expect
      .poll(() => paint('discovery-refile'), { message: 'the treatment follows the choice' })
      .toBe(keptWhileKeeping)
    await expect.poll(() => paint('discovery-keep')).toBe(offeredWhileKeeping)

    await neverTheLaboratory(page)
  })

  test('(c) it names what it did not conclude, before he agrees to anything', async ({ page }) => {
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'More money')

    const unknowns = page.getByTestId('discovery-unknowns')
    await expect(unknowns).toContainText('how much')
    await expect(unknowns).toContainText('by when')
    await expect(unknowns).toContainText('earning more or keeping more of it')
  })

  test('(c) delivers the six as two named sets rather than as one comma-run', async ({ page }) => {
    /*
     * QA-91-004, asserted on the **delivered shape** rather than on substrings.
     *
     * The old check proved the three words occurred somewhere and that the page
     * did not overflow sideways — both true of a seven-line paragraph. What was
     * wrong was never the content: all six unknowns are honest and all six
     * survive. What was wrong was that they arrived as one sentence, so an
     * admission read as a disclaimer at the width the phase is gated at.
     */
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'More money')

    const unknowns = page.getByTestId('discovery-unknowns')
    await expect(unknowns.locator('.unknowns__label')).toHaveText([
      'These words do not say',
      'And the app has not been told',
    ])

    const rows = unknowns.locator('.unknowns__list li')
    await expect(rows, 'every unknown survives — none is dropped or summarised').toHaveCount(6)
    await expect(unknowns.locator('.unknowns__list').first().locator('li')).toHaveText([
      'how much',
      'by when',
      'whether this is about earning more or keeping more of it',
    ])

    /*
     * And it is still not a questionnaire: six unknowns are not six prompts.
     * The card carries exactly one answer box, which is D-184's budget read on
     * the screen rather than in the agenda.
     */
    await expect(page.getByTestId('discovery-answer')).toHaveCount(1)
    await expect(unknowns.locator('input, textarea, select')).toHaveCount(0)
  })

  test('(e) declining writes no derived row, and leaves the offer where the aim is', async ({
    page,
  }) => {
    /*
     * Retitled after QA-91-001, because the old title was the finding.
     *
     * It said *"no reading row"* and asserted exactly that — and the absence it
     * was celebrating was the defect: nothing was written, correctly, and
     * nothing was left either, so §6.3's *decline, then redo and accept* could
     * not be performed at all. Declining still costs nothing; what it must not
     * cost is the choice.
     */
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'More money')
    await confirm(page)

    await openPage(page, 'career', 'Career & Learning')
    await expect(page.getByTestId('destination-aim')).toHaveText('More money')

    const reading = page.getByTestId('destination-reading')
    await expect(reading, 'the words still say what they said').toContainText(
      'These words sound like they are about Money & Financial Resilience',
    )
    await expect(page.getByTestId('destination-reading-accept')).toHaveText(
      'File it in Money & Financial Resilience',
    )
    await expect(
      page.getByTestId('destination-reading-withdraw'),
      'and there is nothing to take back, because nothing was written',
    ).toHaveCount(0)

    await openPage(page, 'money', 'Money')
    await expect(page.getByTestId('destination-aim')).toHaveCount(0)

    await go(page, 'Timeline')
    await expect(page.locator('body')).not.toContainText('Read this as being about')
  })

  test('(b) accepting files it in Money with his words unchanged, and says the app read them', async ({
    page,
  }) => {
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'More money')
    await page.getByTestId('discovery-refile').click()

    await expect(page.getByTestId('discovery-proposal')).toContainText(
      'it in Money & Financial Resilience rather than Career & Learning, which is where the question was',
    )
    await confirm(page)

    await openPage(page, 'money', 'Money')
    await expect(page.getByTestId('destination-aim')).toHaveText('More money')

    const reading = page.getByTestId('destination-reading')
    await expect(reading).toContainText('Read as being about Money & Financial Resilience')
    await expect(reading).toContainText('“money”')
    await expect(reading, 'and it says whose words those are').toContainText(
      'the words above are yours and were not changed',
    )

    // The positive beside the negative in (e): the Career page has nothing now.
    await openPage(page, 'career', 'Career & Learning')
    await expect(page.getByTestId('destination-aim')).toHaveCount(0)

    await neverTheLaboratory(page)
  })

  test('(d) exactly one follow-up is put, and it asks for a money thing', async ({ page }) => {
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'More money')
    await page.getByTestId('discovery-refile').click()
    await confirm(page)

    await expect(page.getByTestId('discovery-open')).toBeVisible()
    await page.getByTestId('discovery-open').click()
    await expect(page.getByTestId('discovery-prompt')).toContainText(
      'What is the money thing you would deal with first, towards “More money”?',
    )

    /*
     * One, not three. The card puts a single question and the app's other two
     * unconcluded things stay on the record as unknowns rather than becoming
     * questions — which is what "exactly one follow-up" means and what a card
     * showing a second box would break.
     */
    await expect(page.getByTestId('discovery-answer')).toHaveCount(1)
  })

  test('(f) Now offers a money move it did not offer before the clarification', async ({
    page,
  }) => {
    await freshApp(page)

    await go(page, 'Now')
    await expect(
      page.locator('body'),
      'nothing about money is on the screen to begin with',
    ).not.toContainText('Deal with')

    await openTheQuestion(page)
    await typeAim(page, 'More money')
    await page.getByTestId('discovery-refile').click()
    await confirm(page)

    await go(page, 'Now')
    await expect(
      page.locator('body'),
      'and a bare aim still offers nothing — correction 3.6',
    ).not.toContainText('Deal with')

    await openTheQuestion(page)
    await page.getByTestId('discovery-answer').fill('Clear the credit card')
    await confirm(page)

    await go(page, 'Now')
    await expect(page.locator('.primary-surface__headline')).toContainText(
      'Deal with Clear the credit card today.',
    )

    await neverTheLaboratory(page)
  })

  test('(g) three days later the interpretation is not put to him again', async ({ page }) => {
    await page.clock.install({ time: TUESDAY_0900 })
    await freshApp(page)

    await openTheQuestion(page)
    await typeAim(page, 'More money')
    await page.getByTestId('discovery-refile').click()
    await confirm(page)
    await openTheQuestion(page)
    await page.getByTestId('discovery-answer').fill('Clear the credit card')
    await confirm(page)

    await page.clock.fastForward(DAYS(3))
    await page.reload()

    await go(page, 'Insights')
    /*
     * The week's two are spent, so the card is quiet — and the important half is
     * what it is quiet **about**: nothing anywhere asks again whether "More
     * money" is about money.
     */
    await expect(page.getByTestId('discovery-quiet')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('These words sound like')

    await openPage(page, 'money', 'Money')
    await expect(
      page.getByTestId('destination-reading'),
      'the reading is a settled row, not a standing question',
    ).toContainText('Read as being about Money & Financial Resilience')
    await expect(page.locator('body')).not.toContainText('These words sound like')

    await go(page, 'Now')
    await expect(
      page.locator('.primary-surface__headline'),
      'and the move it produced is still there three days on',
    ).toContainText('Clear the credit card')

    await neverTheLaboratory(page)
  })

  test('(7) the reading is reversible from the aim’s own row', async ({ page }) => {
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'More money')
    await page.getByTestId('discovery-refile').click()
    await confirm(page)

    await openPage(page, 'money', 'Money')
    await page.getByTestId('destination-reading-withdraw').click()
    await expect(
      page.getByTestId('destination-reading-consequence'),
      'a gesture with a consequence says what it is first',
    ).toContainText('The aim moves to Career & Learning')
    await page.getByTestId('destination-reading-confirm').click()
    await expect(page.getByTestId('destination-aim')).toHaveCount(0)

    await openPage(page, 'career', 'Career & Learning')
    await expect(page.getByTestId('destination-aim')).toHaveText('More money')
    /*
     * The settled reading is gone; the **offer** is back, because the words
     * still say what they said. That symmetry is the repair for QA-91-001, and
     * it is why this assertion is about the sentence rather than about the row:
     * a row-count check here would have to say the row is absent, which was the
     * one-way world's claim and is no longer true.
     */
    await expect(page.getByTestId('destination-reading')).not.toContainText('Read as being about')
    await expect(page.getByTestId('destination-reading-accept')).toBeVisible()

    /*
     * And the taking-back is a row of its own, in the app's own voice.
     *
     * Asserted on the row rather than on the page — D-238's first corollary —
     * because two rows here carry *replaced an earlier entry* and a page-wide
     * check could not tell which one it had found.
     *
     * **What this does not claim:** that the withdrawn reading is still *on
     * Timeline*. It is not, and correctly: Timeline renders the effective
     * history, so a superseded row is represented by the note on the row that
     * replaced it. That the earlier row is still **stored** is asserted where
     * the store can actually be read, in `interpretation.test.ts`.
     */
    await go(page, 'Timeline')
    const withdrawal = page
      .locator('.tl-entry')
      .filter({ hasText: 'Took back reading this as being about Money & Financial Resilience.' })
    await expect(withdrawal).toHaveCount(1)
    await expect(withdrawal.locator('.tl-entry__tag'), 'and it is the app talking').toHaveText(
      'Worked out',
    )
    await expect(withdrawal.locator('.tl-entry__note')).toContainText('replaced an earlier entry')

    const aim = page.locator('.tl-entry').filter({ hasText: 'More money' })
    await expect(aim.locator('.tl-entry__tag'), 'and his words are still his').toHaveText(
      'Aiming at',
    )

    await neverTheLaboratory(page)
  })
})

// ---------------------------------------------------------------------------
// (h) — the private boundary, on the screens the owner uses
// ---------------------------------------------------------------------------

test.describe('91 — (h) private words are not read, and the same box reads an ordinary one', () => {
  test('reads a Money thing he named and reads nothing from a Private one', async ({ page }) => {
    /*
     * Two things he named, differing in one property — the area they are in, and
     * therefore the privacy class they inherit. The negative claim is *"no
     * interpretation of the private one appears anywhere"*, and the positive
     * beside it is the **same box, same gesture, same kind of name** finding the
     * other one. Without that pair this test would pass on a build where the
     * interpreter read nothing at all.
     */
    await freshApp(page)

    await openPage(page, 'money', 'Money')
    await introduce(page, 'Trelanwick')

    await openPage(page, 'private', 'Private / Sexual Health')
    await introduce(page, 'Kesterholt')

    await openTheQuestion(page)

    await page.getByTestId('discovery-answer').fill('Sort out Trelanwick')
    await expect(
      page.getByTestId('discovery-reading'),
      'the ordinary name is read, so the box can read a name at all',
    ).toContainText('These words sound like they are about Money & Financial Resilience')
    await expect(page.getByTestId('discovery-reading')).toContainText('“Trelanwick”')

    await page.getByTestId('discovery-answer').fill('Sort out Kesterholt')
    await expect(
      page.getByTestId('discovery-reading'),
      'and the private one names nothing at all',
    ).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('sound like they are about')

    await confirm(page)
    await openPage(page, 'career', 'Career & Learning')
    await expect(page.getByTestId('destination-aim')).toHaveText('Sort out Kesterholt')
    await expect(
      page.getByTestId('destination-reading'),
      'nothing was derived from a private name',
    ).toHaveCount(0)

    await neverTheLaboratory(page)
  })
})

// ---------------------------------------------------------------------------
// The second area, on the second authoring surface
// ---------------------------------------------------------------------------

test.describe('91 — the same journey in a second area, with a differently-shaped phrase', () => {
  test('(f) again: the Money page reads Career, and Now offers a career move', async ({ page }) => {
    await freshApp(page)

    await openPage(page, 'money', 'Money')
    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Get qualified enough to be worth more')

    const offer = page.getByTestId('destination-reading-offer')
    await expect(offer).toContainText(
      'These words sound like they are about Career & Learning, from “qualified”.',
    )
    await expect(page.getByTestId('destination-unknowns')).toContainText('by when')

    await page.getByTestId('destination-refile').click()
    await page.getByTestId('destination-save').click()

    await openPage(page, 'career', 'Career & Learning')
    await expect(page.getByTestId('destination-aim')).toHaveText(
      'Get qualified enough to be worth more',
    )
    await expect(page.getByTestId('destination-reading')).toContainText(
      'Read as being about Career & Learning',
    )

    await go(page, 'Now')
    await expect(page.locator('body')).not.toContainText('Cloud engineering')

    await openTheQuestion(page)
    await expect(page.getByTestId('discovery-prompt')).toContainText(
      'What would you be learning or working on, towards “Get qualified enough to be worth more”?',
    )
    await page.getByTestId('discovery-answer').fill('Cloud engineering')
    await confirm(page)

    await go(page, 'Now')
    await expect(page.locator('.primary-surface__headline')).toContainText('Cloud engineering')

    await neverTheLaboratory(page)
  })

  test('an unambiguous phrase in the area it was asked about produces no offer', async ({
    page,
  }) => {
    /*
     * The null case, on the screen. The card shows the confirmation it has shown
     * since routing 84 and adds nothing: no reading line, no option rows, and
     * the next question is D-188's own.
     */
    await freshApp(page)
    await openTheQuestion(page)
    await typeAim(page, 'Get promoted to senior engineer by the summer')

    await expect(page.getByTestId('discovery-reading')).toHaveCount(0)
    await expect(page.getByTestId('discovery-refile')).toHaveCount(0)
    await expect(page.getByTestId('discovery-proposal')).toContainText(
      'Something you are aiming at in Career & Learning',
    )

    await confirm(page)
    await page.getByTestId('discovery-open').click()
    await expect(page.getByTestId('discovery-prompt')).toContainText(
      'What would be the next step towards “Get promoted to senior engineer by the summer”?',
    )

    await neverTheLaboratory(page)
  })
})

// ---------------------------------------------------------------------------
// The contract as one journey, in one store — QA Round 1, repair item 5
// ---------------------------------------------------------------------------

test.describe('91 — the whole contract as one owner, in one store', () => {
  /*
   * ## Why this test exists, and why the ones above are not it
   *
   * Round 1's sharpest instrument finding: `phase91.spec.ts` called itself the
   * ordinary-owner journey while (e), (b)/(f), the reversal and the second area
   * were four separate `test()` cases, and `freshApp()` gives each of them its
   * own empty context. Two of the phase's contracts are **transitions between**
   * those states — decline then redo, and withdraw *after* the consequence
   * exists — and no arrangement of isolated stores can reach a transition. Both
   * blockers lived in the gap, under a header claiming the gap was covered.
   *
   * So this is one store, one sequence, and it is the sequence §6.3 actually
   * describes. The focused cases above are kept because a failure in one of them
   * localises better than a failure in a nine-step walk — but they are branches,
   * and this is the journey.
   */
  test('declines, reconsiders, accepts, clarifies, sees Now change, takes it back, and moves on to a second area', async ({
    page,
  }) => {
    await freshApp(page)

    // 1 — the question, the words, and the offer left where it was.
    await openTheQuestion(page)
    await typeAim(page, 'More money')
    await expect(page.getByTestId('discovery-keep')).toHaveAttribute('aria-pressed', 'true')
    await confirm(page)

    // 2 — declining cost nothing, and cost nothing he cannot get back.
    await openPage(page, 'career', 'Career & Learning')
    await expect(page.getByTestId('destination-aim')).toHaveText('More money')
    await go(page, 'Timeline')
    await expect(
      page.locator('body'),
      'nothing was derived from a reading he did not take',
    ).not.toContainText('Read this as being about')

    // 3 — the route back, from the object's own row, saying what it will do.
    await openPage(page, 'career', 'Career & Learning')
    await page.getByTestId('destination-reading-accept').click()
    await expect(page.getByTestId('destination-reading-consequence')).toContainText(
      'The aim moves to Money & Financial Resilience',
    )
    await page.getByTestId('destination-reading-confirm').click()

    // 4 — and it landed, with the reading recorded as the app's own sentence.
    await openPage(page, 'money', 'Money')
    await expect(page.getByTestId('destination-aim')).toHaveText('More money')
    await expect(page.getByTestId('destination-reading')).toContainText(
      'Read as being about Money & Financial Resilience',
    )

    // 5 — one concrete clarification, in the resolved area's own terms.
    await openTheQuestion(page)
    await expect(page.getByTestId('discovery-prompt')).toContainText(
      'What is the money thing you would deal with first, towards “More money”?',
    )
    await page.getByTestId('discovery-answer').fill('Clear the credit card')
    await confirm(page)

    // 6 — Now says something it could not have said before.
    await go(page, 'Now')
    await expect(page.locator('.primary-surface__headline')).toContainText(
      'Deal with Clear the credit card today.',
    )

    // 7 — and taking the reading back now names what else moves with it.
    await openPage(page, 'money', 'Money')
    await page.getByTestId('destination-reading-withdraw').click()
    await expect(
      page.getByTestId('destination-reading-consequence'),
      'the next step he named is part of what he is taking back',
    ).toContainText('Clear the credit card')
    await page.getByTestId('destination-reading-confirm').click()

    // 8 — the aim went back, and so did what the app acts on.
    await openPage(page, 'career', 'Career & Learning')
    await expect(page.getByTestId('destination-aim')).toHaveText('More money')
    await expect(
      page.getByTestId('destination-next'),
      'his own sentence came across unchanged',
    ).toContainText('Clear the credit card')

    await go(page, 'Now')
    await expect(
      page.locator('body'),
      'Now no longer acts on it as a money thing',
    ).not.toContainText('Deal with Clear the credit card')
    await expect(page.locator('.primary-surface__headline')).toContainText('Clear the credit card')

    // 9 — a second area, a differently shaped phrase, the same store.
    await openPage(page, 'money', 'Money')
    await page.getByTestId('destination-open').click()
    await page.getByTestId('destination-aim-input').fill('Be able to run 5k without stopping')
    await expect(page.getByTestId('destination-reading-offer')).toContainText(
      'These words sound like they are about Health & Physical Capacity',
    )
    await page.getByTestId('destination-refile').click()
    await page.getByTestId('destination-save').click()

    await openPage(page, 'health-recovery', 'Health & Recovery')
    await expect(page.getByTestId('destination-aim')).toHaveText(
      'Be able to run 5k without stopping',
    )
    await expect(page.getByTestId('destination-reading')).toContainText(
      'Read as being about Health & Physical Capacity',
    )

    await neverTheLaboratory(page)
  })
})

// OWNER-ENDS

test.describe('91 — the instrument stays an ordinary-owner instrument', () => {
  test('reaches for no laboratory control anywhere in this file', () => {
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8')

    const from = source.indexOf(SCAN_FROM)
    const to = source.indexOf(SCAN_TO)
    expect(from, 'the scan start marker is missing').toBeGreaterThan(-1)
    expect(to, 'the scan end marker is missing').toBeGreaterThan(from)

    const body = source.slice(from + SCAN_FROM.length, to)
    expect(body.length, 'the scanned region collapsed').toBeGreaterThan(10_000)

    for (const forbidden of LABORATORY_CONTROLS) {
      expect(body, `the owner journey must not reach for ${forbidden}`).not.toContain(forbidden)
    }
    expect(body, 'and it starts from an empty store every time').toContain('freshApp')
  })
})
