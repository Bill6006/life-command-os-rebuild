import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

/**
 * Routing 90, package 90.0 — the ordinary-owner time-advance instrument.
 *
 * ## Why this file exists before anything else in the phase
 *
 * `ROUTING_91_BRIEF.md` section 7 named routing 82's failure pattern: an
 * unproven instrument bundled with the product whose acceptance depends on it,
 * so that when the pair fails there is no way to tell which half failed. The
 * second adjudication (§6.2) therefore makes this **routing 90's first
 * deliverable and its own acceptance item**, separate from every product claim
 * the phase makes.
 *
 * ## What it proves, and what would be worthless
 *
 * The claim is not "the fake clock moved". A fake clock always moves. The claim
 * is that **the product's own moment moved** — the moment `assembleSituation`
 * reasons from and the screen is written out of — and that it moved *at the
 * boundary* rather than merely along with the elapsed milliseconds.
 *
 * So every assertion here is a **pair**: an advance that stays on one side of a
 * boundary and must not change the reading, and a further advance that crosses
 * it and must. An instrument that only ever moved time forward and watched a
 * sentence change could not tell a moving moment from a re-render.
 *
 * ## Why it can be this cheap (a verified finding, §6.1)
 *
 * The whole product reads the wall clock in exactly one place —
 * `systemClock().now()` in `src/domain/time.ts` — and the ambient-clock guard in
 * `tests/unit/architecture-guards.test.ts` fails the build if a second appears.
 * `MemoryProvider` captures the moment with `useState(() => clock.now())`, so
 * `page.clock` installed **before** `page.goto`, then `fastForward` plus a
 * reload, moves the entire product's moment deterministically.
 *
 * ## D-161, extended from record kinds to screens
 *
 * No `#/qa`, no `loadInQa`, no fixture seeding, no `travelTo` — `travelTo` is a
 * laboratory control and this instrument must work in a browser that has never
 * opened the laboratory. That is not a stylistic preference: the whole point of
 * the instrument is to be usable by the ordinary-owner reality track, which the
 * owner defined as *normal product surfaces only*. The last test in this file
 * reads this file and fails if a later edit reaches for the laboratory.
 */

/**
 * The laboratory reaches this instrument may not make, and the region scanned
 * for them. Kept above the instrument so the scanned region excludes the list
 * itself — a guard that failed on its own vocabulary would teach the next
 * person to delete it.
 */
const LABORATORY_CONTROLS = [
  '#' + '/qa',
  'travel' + 'To',
  'loadIn' + 'Qa',
  'scenario' + 'ById',
  'load' + 'Document',
] as const
const SCAN_FROM = '//' + ' INSTRUMENT-BEGINS'
const SCAN_TO = '//' + ' INSTRUMENT-ENDS'

// INSTRUMENT-BEGINS
const APP = '/life-command-os-rebuild/preview/'

/*
 * UTC, so the arithmetic below is the product's local arithmetic.
 *
 * The instrument is about local days, local blocks and local weeks. Running it
 * in whatever zone the machine happens to be in would make "+2 hours" mean
 * different things in March in different countries, and a boundary test whose
 * boundaries move is not a boundary test. `g011` already covers zones and DST
 * as a product question; this file is about the clock.
 */
test.use({ timezoneId: 'UTC' })

/** A Wednesday morning, nowhere near a DST transition in UTC (there are none). */
const WEDNESDAY_0900 = new Date('2026-03-04T09:00:00Z')

/** Local week starts Monday (`DEFAULT_WEEK_START`), so Wednesday + 5 days is a new week. */
const HOURS = (n: number) => n * 60 * 60 * 1000
const DAYS = (n: number) => n * 24 * HOURS(1)

async function premise(page: Page): Promise<string> {
  return (await page.getByTestId('now-premise').innerText()).trim()
}

async function go(page: Page, name: 'Now' | 'Life' | 'Timeline' | 'Insights') {
  await page.locator('.nav').getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

/**
 * Move the product's moment, the way the owner's own passage of time would.
 *
 * `fastForward` advances the fake clock; the reload is what makes the product
 * re-read it, because `MemoryProvider` captures the moment once per mount and
 * re-reads it only on defined events. This is the mechanism §6.1 specifies, and
 * it is the whole instrument.
 */
async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms)
  await page.reload()
  await expect(page.getByTestId('now-premise')).toBeVisible()
}

/**
 * Answer one discovery question on Insights, through the owner's own controls.
 *
 * There is no seeding here and no shortcut: this is the route the empty Now
 * screen itself offers ("Answer one thing about you"), which is why a store
 * with one record in it is an ordinary store rather than a fixture.
 */
async function answerOneQuestion(page: Page, text: string) {
  await go(page, 'Insights')
  const open = page.getByTestId('discovery-open')
  await expect(open).toBeVisible()
  await open.click()
  const answer = page.getByTestId('discovery-answer')
  await expect(answer).toBeVisible()
  await answer.fill(text)
  await page.getByTestId('discovery-save').click()
  await expect(page.getByTestId('discovery-answer')).toBeHidden()
}

/**
 * The laboratory was never opened, on any surface, at any point.
 *
 * The route is named from `LABORATORY_CONTROLS` rather than written out, so
 * the run-time assertion and the source scan below cannot drift apart — and so
 * this line is not itself a laboratory reach for the scan to trip over.
 */
async function neverTheLaboratory(page: Page) {
  expect(page.url()).not.toContain(LABORATORY_CONTROLS[0])
  await expect(page.locator('.lab-notice')).toHaveCount(0)
}

test.describe('90.0 — the product’s moment moves under page.clock, from a fresh store', () => {
  test('a block boundary changes the word for the part of the day, and elapsed time alone does not', async ({
    page,
  }) => {
    await page.clock.install({ time: WEDNESDAY_0900 })
    await page.goto(APP)

    // A genuinely fresh store: the app says so itself before anything is written.
    await expect(page.getByRole('heading', { name: 'There is no history here yet.' })).toBeVisible()

    await answerOneQuestion(page, 'Finish the networking certification')
    await go(page, 'Now')

    // 09:00 — morning.
    expect(await premise(page)).toContain('Wednesday morning')

    // 11:00 — two hours later and still morning. The reading must not move.
    await advance(page, HOURS(2))
    expect(await premise(page)).toContain('Wednesday morning')

    // 13:00 — the same two hours again, and this pair crosses 12:00.
    await advance(page, HOURS(2))
    expect(await premise(page)).toContain('Wednesday afternoon')

    await neverTheLaboratory(page)
  })

  test('a day boundary changes the day, with the part of the day held still', async ({ page }) => {
    await page.clock.install({ time: WEDNESDAY_0900 })
    await page.goto(APP)
    await answerOneQuestion(page, 'Finish the networking certification')
    await go(page, 'Now')

    /*
     * The pair is chosen so the block word is the *same* on both sides.
     *
     * 23:00 and 01:00 are both "late night", and they are different days. A
     * test that advanced from Wednesday afternoon to Thursday afternoon would
     * pass equally if the clock had moved the block and the day together, or if
     * the day had come from somewhere other than the moment.
     */
    await advance(page, HOURS(14)) // 23:00 Wednesday
    expect(await premise(page)).toContain('Wednesday late night')

    await advance(page, HOURS(2)) // 01:00 Thursday — same block word, next day
    expect(await premise(page)).toContain('Thursday late night')

    await neverTheLaboratory(page)
  })

  test('a week boundary restores the weekly discovery budget, and days inside the week do not', async ({
    page,
  }) => {
    await page.clock.install({ time: WEDNESDAY_0900 })
    await page.goto(APP)

    /*
     * `DISCOVERY_PER_WEEK` is 2, and the budget is counted against the local
     * week the moment falls in. So spending it and then asking again is a
     * product behaviour that can only answer correctly if the product's own
     * week moved — which is a stronger reading than any sentence about a date,
     * because nothing here renders the week.
     */
    await answerOneQuestion(page, 'Finish the networking certification')
    await answerOneQuestion(page, 'Get back to lifting twice a week')

    await go(page, 'Insights')
    await expect(page.getByTestId('discovery-quiet')).toBeVisible()

    // Wednesday → Saturday. Three days later, and the same week: still quiet.
    await page.clock.fastForward(DAYS(3))
    await page.reload()
    await go(page, 'Insights')
    await expect(page.getByTestId('discovery-quiet')).toBeVisible()

    // Saturday → Monday. Two more days, and this pair crosses the week start.
    await page.clock.fastForward(DAYS(2))
    await page.reload()
    await go(page, 'Insights')
    await expect(page.getByTestId('discovery-open')).toBeVisible()

    await neverTheLaboratory(page)
  })

  // INSTRUMENT-ENDS

  /**
   * The instrument stays an ordinary-owner instrument.
   *
   * A regression here would not be a failing assertion — it would be a later
   * edit quietly reaching for `#/qa` or `travelTo` because that was easier, and
   * every test above would keep passing while the thing they exist to prove
   * stopped being true. So the file asserts its own text.
   */
  test('reaches for no laboratory control anywhere in this file', () => {
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8')

    /*
     * The scan covers the instrument, not the list of what it may not contain.
     *
     * Bounded by two markers rather than by a line number, so moving a test
     * cannot silently shrink the region being scanned — which is the way a
     * self-reading guard usually stops guarding anything.
     */
    const from = source.indexOf(SCAN_FROM)
    const to = source.indexOf(SCAN_TO)
    expect(from, 'the scan start marker is missing').toBeGreaterThan(-1)
    expect(to, 'the scan end marker is missing').toBeGreaterThan(from)

    const body = source.slice(from + SCAN_FROM.length, to)
    expect(body.length, 'the scanned region collapsed').toBeGreaterThan(3_000)

    for (const forbidden of LABORATORY_CONTROLS) {
      expect(body, `the instrument must not reach for ${forbidden}`).not.toContain(forbidden)
    }
    expect(body).toContain('clock.install')
  })
})
