import { expect, test, type Page } from '@playwright/test'

/**
 * Independent QA Round 1's blockers, in a browser — QA-90-001 and QA-90-002.
 *
 * ## Why these are here rather than folded into `phase90.spec.ts`
 *
 * Two of Round 1's three findings were **false greens in that file**. Keeping
 * the repairs beside the assertions that missed them would invite the same
 * shortcut: an existing helper reused, an existing fixture assumed to be rich
 * enough. These start from what QA actually did.
 *
 * ## QA-90-001 is an ordinary-owner journey and has to stay one
 *
 * The phase's contract ends *"repeat the first half in a second domain and
 * confirm Life reads as direction rather than recency."* QA ran it from a fresh
 * deployed store with no laboratory and Life showed only **Recent** and
 * **Nothing here yet**. So this authors both directions through the same
 * controls the owner uses — no `#/qa`, no fixture — because a seeded
 * destination would prove the panel renders without proving an owner can get
 * one there.
 */

const APP = '/life-command-os-rebuild/preview/'

async function go(page: Page, name: 'Now' | 'Life' | 'Timeline' | 'Insights') {
  await page.locator('.nav').getByRole('button', { name }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

async function openPage(page: Page, slug: string) {
  await page.goto(`${APP}#/life/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

/**
 * Author a destination, and a milestone under it, the way the owner does.
 *
 * The control is the domain page's own, and the milestone field is the one
 * beside it — this is the journey step QA walked, not a shortcut to its
 * result.
 */
async function authorDirection(page: Page, slug: string, aim: string, milestone: string) {
  await openPage(page, slug)
  const open = page.getByTestId('destination-open')
  await expect(open).toBeVisible()
  await open.click()
  await page.getByTestId('destination-aim-input').fill(aim)
  await page.getByTestId('destination-milestone-input').fill(milestone)
  await page.getByTestId('destination-save').click()
  await expect(page.getByTestId('destination-aim')).toContainText(aim)
}

test.describe('QA-90-001 — Life reads as direction once there is direction to read', () => {
  test('shows both authored aims after a second domain, from a fresh store', async ({ page }) => {
    await page.goto(APP)
    await expect(page.getByRole('heading', { name: 'There is no history here yet.' })).toBeVisible()

    await authorDirection(
      page,
      'health-recovery',
      'Move comfortably through a full day',
      'Walk three times this week',
    )
    await authorDirection(
      page,
      'career',
      'Move into a networking role',
      'Finish the CCNA study plan',
    )

    await go(page, 'Life')

    /*
     * The assertion QA's journey ended on. Both aims, in his own words, on the
     * screen whose job is to say what the app understands.
     */
    const screen = page.locator('.screen')
    await expect(screen).toContainText('Move comfortably through a full day')
    await expect(screen).toContainText('Move into a networking role')

    // Two directions, one row each — said once, not once per area (D-075).
    await expect(page.getByTestId('life-direction')).toHaveCount(2)

    // The laboratory was never opened.
    expect(page.url()).not.toContain('#' + '/qa')
    await expect(page.locator('.lab-notice')).toHaveCount(0)
  })

  test('names what is next, and drops it once the milestone is reached', async ({ page }) => {
    await page.goto(APP)
    await authorDirection(
      page,
      'career',
      'Move into a networking role',
      'Finish the CCNA study plan',
    )

    await go(page, 'Life')
    await expect(page.getByTestId('life-direction-next')).toContainText(
      'Finish the CCNA study plan',
    )

    /*
     * What is *next* is direction; what is done is history, and Timeline and the
     * domain page already carry it. So reaching the milestone takes the line off
     * Life rather than turning it into an achievement notice — the app has no
     * business congratulating him on the size of his own work (D-223).
     */
    await openPage(page, 'career')
    /*
     * Scoped to the milestone's own row: a page can carry more than one goal,
     * and pressing whichever Done came first would prove something else.
     *
     * An achieved goal leaves the active list — that is settled behaviour
     * (`life-domain.spec.ts`, "a goal correction takes it off the active
     * list"), so the row going is what "reached" looks like here.
     */
    const row = page.locator('.domain-goal', { hasText: 'Finish the CCNA study plan' })
    await row.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(row).toHaveCount(0)

    await go(page, 'Life')
    await expect(page.getByTestId('life-direction')).toHaveCount(1)
    await expect(page.getByTestId('life-direction-next')).toHaveCount(0)
  })

  test('is absent, not empty, on a history with no direction in it', async ({ page }) => {
    /*
     * The other half of the repair, and the one that protects D-075's work:
     * every existing history has no authored destination, and Life must look
     * exactly as it did. A panel that rendered an empty heading on every store
     * would be the homework this screen had removed.
     */
    await page.goto(`${APP}#/qa`)
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
    await page.getByRole('button', { name: /Everything current except the studying/ }).click()
    await go(page, 'Life')

    await expect(page.getByTestId('life-direction')).toHaveCount(0)
    await expect(page.locator('.screen')).not.toContainText('Where you are heading')
    // The coverage reading is untouched.
    await expect(page.getByRole('heading', { name: 'How each area stands' })).toBeVisible()
  })
})

test.describe('QA-90-002 / QA-90-004 — the three named object kinds, rendered and distinct', () => {
  /**
   * All three of section 54's named objects on one Career page — QA-90-004.
   *
   * ## The correction this encodes
   *
   * The Round 1 repair asserted Session, Milestone and Destination and left
   * **Course** out, on the strength of a claim that no shipped history reaches
   * a finished course. **That claim was wrong.** The probe behind it advanced
   * the clock and looked for a finished thread — but a course does not finish
   * because time passes, it finishes when the owner completes its final
   * session. `phase84.spec.ts` has driven exactly that flow since routing 84,
   * and QA reproduced it live.
   *
   * The lesson is worth more than the fix: *"unreachable"* was concluded from a
   * probe that could not have found the thing it was looking for, and then
   * written into a handoff as a limitation for somebody else to judge. A
   * negative claim needs a probe capable of returning a positive.
   *
   * ## The flow, which is entirely the owner's
   *
   * **Two sessions in** sits one occasion from the end of its course. Finishing
   * that session through Now's buttons produces a completed **Session** and a
   * finished **Course**; authoring direction on the same page produces a
   * **Destination** and a **Milestone**. No fixture was added to manufacture
   * any of it — the requirement was explicit that none should be.
   */
  async function careerWithAllThreeObjects(page: Page) {
    await page.goto(`${APP}#/qa`)
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
    await page.getByRole('button', { name: /Two sessions in/ }).click()

    await go(page, 'Now')
    const actions = page.getByTestId('now-actions')
    await expect(actions, 'the final session was not offered').toBeVisible()
    const start = actions.getByRole('button', { name: 'Start it' })
    await expect(start).toBeEnabled({ timeout: 15_000 })
    await start.click()
    const done = actions.getByRole('button', { name: 'Done', exact: true })
    await expect(done).toBeEnabled({ timeout: 15_000 })
    await done.click()

    await authorDirection(page, 'career', 'Move into a networking role', 'Finish the CCNA')
  }

  test('labels a completed session as a Session, not as generic Evidence', async ({ page }) => {
    /*
     * The defect exactly: the rung whose visible measure is **Sessions done**
     * was rendered with `kind="evidence"`, so the page said Evidence about a
     * session and the `session` kind existed nowhere in the product.
     */
    await careerWithAllThreeObjects(page)

    const completion = page.getByTestId('progress-completion')
    await expect(completion).toBeVisible()
    await expect(completion.locator('.rung__label')).toContainText('Sessions done')
    await expect(completion.locator('.kind')).toHaveText('Session')
  })

  test('puts a Session, a Course and a Milestone on one page, saying three different things', async ({
    page,
  }) => {
    /*
     * Canonical section 54's gate item 2, as one rendered proof: *"a completed
     * session, a completed course and a milestone are three different things on
     * the page."* All three are on **this** page, reached by the owner's own
     * buttons, and each says its own word.
     */
    await careerWithAllThreeObjects(page)

    /*
     * Compared upper-case, because that is what the owner actually sees.
     *
     * `.kind` carries `text-transform: uppercase`, and `innerText` reflects
     * rendered CSS while `textContent` does not. Reading the rendered text is
     * the right choice on a test about what is on a page — it just has to
     * compare against the rendered form.
     */
    const seen = new Set(
      (await page.locator('.kind').allInnerTexts()).map((word) => word.trim().toUpperCase()),
    )

    for (const kind of ['SESSION', 'COURSE', 'MILESTONE', 'DESTINATION']) {
      expect([...seen], `${kind} is on the page`).toContain(kind)
    }

    /*
     * And the generic word is still available for the rungs that are evidence
     * *about* an object rather than the object itself — "how they went" is not
     * a session. Collapsing everything into Session would be the same defect
     * pointing the other way.
     */
    expect([...seen]).toContain('EVIDENCE')
  })

  test('marks the finished course as a Course, beside the session that finished it', async ({
    page,
  }) => {
    /*
     * The half Round 1 left unproved, read off the two blocks themselves rather
     * than off every marker on the screen — so a Course marker appearing
     * somewhere unrelated could not satisfy it.
     */
    await careerWithAllThreeObjects(page)

    const courses = page.getByTestId('progress-courses')
    await expect(courses).toBeVisible()
    await expect(courses.locator('.rung__label')).toContainText('Courses finished')
    await expect(courses.locator('.kind')).toHaveText('Course')

    const completion = page.getByTestId('progress-completion')
    await expect(completion.locator('.kind')).toHaveText('Session')
  })

  test('marks the milestone at every place the page renders one', async ({ page }) => {
    /*
     * ## Why this is not covered by the page-wide word check above
     *
     * The first version of the collapse proof found this: reverting the
     * destination list's marker to `goal` **did not fail any test**, because a
     * milestone is drawn in *two* places on a Career page — inside the
     * destination it belongs to, and again as a row of the goals panel — and a
     * set of every word on the screen still contained MILESTONE from the other
     * one.
     *
     * That is the same false-green shape as QA-90-004 itself, one level down: a
     * page-wide assertion cannot tell "both are right" from "one is right and
     * one is wrong". Where a word has more than one source, each source has to
     * be asserted where it is rendered.
     *
     * Course and Session needed no equivalent because each has exactly one
     * source block, which is why collapsing either of them failed immediately.
     */
    await careerWithAllThreeObjects(page)

    // Inside the destination it belongs to.
    const underDestination = page.getByTestId('destination-milestones').locator('.milestone')
    await expect(underDestination.first()).toBeVisible()
    await expect(underDestination.first().locator('.kind')).toHaveText('Milestone')

    // And again as a row of the goals panel, which is a different component.
    const goalRow = page.locator('.domain-goal', { hasText: 'Finish the CCNA' })
    await expect(goalRow.locator('.kind')).toHaveText('Milestone')
  })

  test('keeps every marker styled alike, whatever it says', async ({ page }) => {
    /*
     * The restrained system survives the repair. The markers now carry
     * different **words** and must still carry no difference in colour, size or
     * weight — a set of coloured markers on progress objects reads as a ranking
     * of them, which is a score in costume (D-231).
     */
    await careerWithAllThreeObjects(page)

    const markers = await page.locator('.kind').evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node)
        return {
          word: (node.textContent ?? '').trim(),
          color: style.color,
          size: style.fontSize,
          weight: style.fontWeight,
        }
      }),
    )
    expect(markers.length, 'markers are on the page').toBeGreaterThan(1)
    expect(
      new Set(markers.map((marker) => marker.word)).size,
      'and they say different things',
    ).toBeGreaterThan(1)
    expect(new Set(markers.map((marker) => marker.color)).size, 'no kind is coloured apart').toBe(1)
    expect(new Set(markers.map((marker) => marker.size)).size, 'no kind is larger').toBe(1)
    expect(new Set(markers.map((marker) => marker.weight)).size, 'no kind is heavier').toBe(1)
  })
})
