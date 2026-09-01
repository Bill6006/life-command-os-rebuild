import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Routing 90 in a real browser — visual coherence, motion and mobile.
 *
 * ## Why the assertions here are shaped the way they are
 *
 * A visual phase is the easiest one in this campaign to test dishonestly. It is
 * trivial to assert that a class name is present, and a class name proves
 * nothing about what the owner sees. So every check below reads a **computed**
 * value out of the running page — the colour that was actually resolved, the
 * box that was actually laid out, the number of pixels the document actually
 * overflows — and each one is a rule the design must not break rather than a
 * measurement of what it happens to be today.
 *
 * The rules the phase is most at risk of breaking are the no-score rules, and
 * they are here as well: a visual phase is the second place a percentage
 * arrives looking reasonable (section 54), and a shape that could carry one is
 * as much of a problem as a figure that does.
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

async function openPage(page: Page, slug: string) {
  await page.goto(`${APP}#/life/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

/** Every element's own box, so overflow is measured rather than eyeballed. */
async function widestElement(page: Page): Promise<number> {
  return page.evaluate(() => {
    let widest = 0
    for (const node of document.querySelectorAll('body *')) {
      const box = node.getBoundingClientRect()
      if (box.width === 0) continue
      widest = Math.max(widest, Math.ceil(box.right))
    }
    return widest
  })
}

/**
 * Author a destination on Career, the way the owner does.
 *
 * Two of the checks below are about what a destination looks like when most of
 * it is unstated, and that is the state it is in on the evening it is created.
 * Loading a fixture that already carries a full one would test the easy case.
 */
async function nameADestination(page: Page) {
  await openPage(page, 'career')
  const start = page.getByRole('button', { name: 'Say what you are aiming at' })
  if ((await start.count()) > 0) {
    await start.click()
    await page.getByTestId('destination-aim-input').fill('Pass the CCNA and move into networking')
    await page.getByTestId('destination-save').click()
  }
  await expect(page.getByTestId('destination').first()).toBeVisible()
}

test.describe('90.1 — the page has a hierarchy, and it is visible', () => {
  test('one surface comes forward, and it is the decision', async ({ page }) => {
    /*
     * The card-soup fix, measured rather than asserted.
     *
     * Seven panels each lifted sixteen pixels off the ground read as a deck of
     * equal cards. What matters is not which shadow token is used but that the
     * **primary surface is the only one with real elevation**, so the owner's
     * eye is told where to go before he has read a word.
     */
    await loadInQa(page, 'A week pointed at the house')
    await go(page, 'Now')

    const shadows = await page.evaluate(() => {
      const depth = (selector: string): number => {
        const node = document.querySelector(selector)
        if (node === null) return -1
        // The blur radius of the first shadow layer, which is what reads as lift.
        const shadow = getComputedStyle(node).boxShadow
        const blur = /rgba?\([^)]*\)\s+\S+\s+\S+\s+(\d+(?:\.\d+)?)px/.exec(shadow)
        return blur === null ? 0 : Number(blur[1])
      }
      return { primary: depth('.primary-surface'), panel: depth('.panel') }
    })

    expect(shadows.primary, 'the primary surface is on screen').toBeGreaterThan(0)
    expect(shadows.panel, 'an ordinary panel is on screen').toBeGreaterThanOrEqual(0)
    expect(shadows.primary, 'the decision comes forward of everything else').toBeGreaterThan(
      shadows.panel,
    )
  })

  test('a quiet surface sits back without dimming what it says', async ({ page }) => {
    /*
     * The rule the quiet tier is most likely to be got wrong by: turning down
     * the *contrast* rather than the *surface*. An honest "the app has not
     * worked this out" is one of the most useful things this product says.
     */
    await loadInQa(page, 'Two ordinary weeks')
    await openPage(page, 'career')

    const quiet = page.locator('.panel--quiet').first()
    if ((await quiet.count()) === 0) test.skip(true, 'no quiet surface on this history')

    const read = await quiet.evaluate((node) => {
      const plain = document.querySelector('.panel:not(.panel--quiet)')
      const title = node.querySelector('.panel__title')
      const plainTitle = plain?.querySelector('.panel__title')
      return {
        quietTitle: title === null ? '' : getComputedStyle(title).color,
        plainTitle: plainTitle == null ? '' : getComputedStyle(plainTitle).color,
      }
    })
    expect(read.quietTitle, 'the words are not turned down with the surface').toBe(read.plainTitle)
  })
})

test.describe('90.2 — routing 84’s objects read as different kinds of thing', () => {
  test('a destination draws all four of its parts, and an unstated one says so', async ({
    page,
  }) => {
    /*
     * G-009, typeset. An absent part used to be left out of the list and named
     * in a footnote, which reads as a *shorter destination* rather than as a
     * question nobody has answered.
     *
     * The destination is **authored here**, through the control the owner uses,
     * rather than loaded from a fixture that already has one — the point of the
     * test is a destination with most of its parts unstated, which is what one
     * looks like on the evening it is created.
     */
    await loadInQa(page, 'The first evening')
    await nameADestination(page)

    const destination = page.getByTestId('destination').first()
    await expect(destination).toBeVisible()

    for (const part of [
      'destination-baseline',
      'destination-next',
      'destination-evidence',
      'destination-unknowns',
    ]) {
      await expect(destination.getByTestId(part), `${part} is drawn either way`).toBeVisible()
    }
  })

  test('nothing counts the parts of a destination', async ({ page }) => {
    /*
     * The back door section 54 warns about, and the reason `stated` is four
     * booleans with no length. "2 of 4" is a completion figure about the owner.
     */
    await loadInQa(page, 'The first evening')
    await nameADestination(page)

    const text = await page.locator('.destination').first().innerText()
    expect(text, 'a destination is not a fraction').not.toMatch(/\b\d+\s*(?:of|\/)\s*4\b/)
    expect(text, 'and not a percentage').not.toContain('%')
  })

  test('no object marker is styled to outrank another', async ({ page }) => {
    /*
     * ## Retitled after QA-90-004, and the retitling is the repair
     *
     * This was called *"a session, a course and a milestone are three different
     * things"* and asserted no such thing. It required a non-empty `.kind` list
     * and then that every marker shared a colour, a size and a weight — which
     * `[Evidence, Evidence]` satisfies perfectly. It was green over the exact
     * defect it was named for, twice: once when the kinds were collapsed, and
     * again after the Round 1 repair, because uniformity was all it ever read.
     *
     * A title is a claim. This one now says what the assertions establish:
     * **restraint** — no kind coloured apart, larger or heavier than another,
     * because coloured markers on progress objects read as a ranking of them
     * and a ranking of progress objects is a score in costume (D-231).
     *
     * The claim it used to make is proved where it can be: one rendered page
     * carrying all three, reached through the owner's own controls, in
     * `phase90-round1.spec.ts`. Two tests, two claims, each honest about which
     * one it holds.
     */
    await loadInQa(page, 'Nine months of evenings')
    await openPage(page, 'career')

    const kinds = await page.locator('.kind').evaluateAll((nodes) =>
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
    expect(kinds.length, 'markers are on the page').toBeGreaterThan(0)

    // Unordered, uncoloured, one size: a marker may say what a thing is and may
    // never say a thing is worth more.
    expect(new Set(kinds.map((kind) => kind.color)).size, 'no kind is coloured apart').toBe(1)
    expect(new Set(kinds.map((kind) => kind.size)).size, 'no kind is larger').toBe(1)
    expect(new Set(kinds.map((kind) => kind.weight)).size, 'no kind is heavier').toBe(1)
  })

  test('a rung’s “what this is not” is not fine print', async ({ page }) => {
    /*
     * The half of the ladder the review is actually about: what a completed
     * session is **not** evidence of. Set smaller than the fact above it, it is
     * the line a reader skips.
     */
    await loadInQa(page, 'Nine months of evenings')
    await openPage(page, 'career')

    const rung = page.locator('.rung').first()
    await expect(rung).toBeVisible()

    const sizes = await rung.evaluate((node) => ({
      says: getComputedStyle(node.querySelector('.rung__says')!).fontSize,
      not: getComputedStyle(node.querySelector('.rung__not')!).fontSize,
    }))
    expect(sizes.not, 'the second half of the statement is the same size as the first').toBe(
      sizes.says,
    )
  })

  test('the progress ladder is not drawn as a ladder', async ({ page }) => {
    /*
     * `PROGRESS_EVIDENCE` is ordinal and `rankOf` indexes it. A ladder rendered
     * as a ladder is a scale, and a scale about the owner is what section 22
     * forbids — so no rung is numbered, filled, tracked or coloured by rank.
     */
    await loadInQa(page, 'Nine months of evenings')
    await openPage(page, 'career')

    const rungs = await page.locator('.rung').evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node)
        return {
          text: (node.textContent ?? '').trim(),
          color: style.color,
          background: style.backgroundColor,
        }
      }),
    )
    if (rungs.length === 0) test.skip(true, 'no rungs on this history')

    expect(new Set(rungs.map((rung) => rung.color)).size, 'no rung is coloured by rank').toBe(1)
    expect(new Set(rungs.map((rung) => rung.background)).size, 'and none is filled by rank').toBe(1)
    for (const rung of rungs) {
      expect(rung.text, 'a rung is not numbered').not.toMatch(/^\s*\d+\s*[./)]/)
      expect(rung.text, 'and carries no percentage').not.toContain('%')
    }
  })
})

test.describe('90.1 — mobile, at the widths the gate names', () => {
  test('nothing overflows the page sideways', async ({ page }) => {
    /*
     * Section 37: no accidental horizontal overflow. Measured on every element
     * rather than on `document.scrollWidth`, because `body { overflow-x:
     * hidden }` hides the symptom from the document and not from a thumb.
     */
    await loadInQa(page, 'Nine months of evenings')

    for (const slug of ['career', 'fatherhood', 'health-recovery']) {
      await openPage(page, slug)
      const viewport = page.viewportSize()!.width
      expect(await widestElement(page), `${slug} fits its viewport`).toBeLessThanOrEqual(
        viewport + 1,
      )
    }
  })

  test('a control at the end of a row is not squeezed into two lines', async ({ page }) => {
    /*
     * The defect: `base.css` gives every button a one-target `min-width`, which
     * is a floor and not a reservation. Inside a flex row the sentence took the
     * space first and "Not right?" rendered as "Not" over "right?" beside every
     * entry in a five-entry list.
     */
    await loadInQa(page, 'Nine months of evenings')
    await openPage(page, 'career')

    const controls = page.locator('.domain-recent__row > .domain-linkish')
    const count = await controls.count()
    if (count === 0) test.skip(true, 'no correction rows on this history')

    for (let index = 0; index < count; index += 1) {
      const lines = await controls.nth(index).evaluate((node) => {
        const style = getComputedStyle(node)
        const height = node.getBoundingClientRect().height
        const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5
        // The button also carries a touch-target minimum, so the height alone
        // says nothing; this asks how many lines the *text* actually took.
        const range = document.createRange()
        range.selectNodeContents(node)
        return { rects: range.getClientRects().length, height, line }
      })
      expect(lines.rects, 'the label stays on one line').toBe(1)
    }
  })

  test('every touch target clears the minimum on a phone', async ({ page }) => {
    await loadInQa(page, 'Nine months of evenings')
    await openPage(page, 'career')

    const small = await page.evaluate(() => {
      const out: string[] = []
      for (const node of document.querySelectorAll('button:not([disabled])')) {
        const box = node.getBoundingClientRect()
        if (box.width === 0 || box.height === 0) continue
        if (box.height < 44)
          out.push(`${(node.textContent ?? '').trim().slice(0, 40)} @ ${box.height}`)
      }
      return out
    })
    expect(small, 'a control below the thumb minimum').toEqual([])
  })
})

test.describe('90.2 — the no-score rule, on the surfaces this phase re-typeset', () => {
  /** Every leaf of a surface, so a figure cannot hide inside a wrapper. */
  async function sentences(root: Locator): Promise<readonly string[]> {
    return root.evaluateAll((nodes) =>
      nodes.flatMap((node) =>
        [...node.querySelectorAll('*')]
          .filter((child) => child.children.length === 0)
          .map((child) => (child.textContent ?? '').trim())
          .filter((text) => text.length > 0),
      ),
    )
  }

  test('no percentage, share, rank, grade or readiness figure about the owner', async ({
    page,
  }) => {
    await loadInQa(page, 'Nine months of evenings')

    for (const slug of ['career', 'fatherhood']) {
      await openPage(page, slug)
      for (const text of await sentences(page.locator('.destination, .rung, .milestones'))) {
        expect(text, `${slug}: no percentage`).not.toContain('%')
        expect(text, `${slug}: no score word`).not.toMatch(
          /\b(score|rating|rank|grade|readiness|percent|complete[d]?\s*:)\b/i,
        )
        expect(text, `${slug}: no bare fraction of the owner`).not.toMatch(/\b\d+\s*\/\s*\d+\b/)
      }
    }
  })

  test('nothing on a re-typeset surface is a bar, a ring or a meter', async ({ page }) => {
    /*
     * The shape, not the figure. A completion bar with no number on it is still
     * a completion bar, and a design phase is exactly where one arrives.
     */
    await loadInQa(page, 'Nine months of evenings')
    await openPage(page, 'career')

    const shapes = await page.evaluate(() => {
      const out: string[] = []
      for (const node of document.querySelectorAll('.destination *, .rung *, .milestones *')) {
        if (node.tagName === 'PROGRESS' || node.tagName === 'METER') out.push(node.tagName)
        const role = node.getAttribute('role')
        if (role === 'progressbar' || role === 'meter') out.push(role)
      }
      return out
    })
    expect(shapes, 'a progress shape reached a surface that may not carry one').toEqual([])
  })
})

test.describe('90.1 — motion is restrained and never required', () => {
  test('nothing on a settled screen animates forever', async ({ page }) => {
    /*
     * Section 25: motion must be meaningful. An infinite animation is by
     * definition not attached to a change — it is decoration that never stops,
     * on a screen the owner opens every evening.
     */
    await loadInQa(page, 'A week pointed at the house')
    await go(page, 'Now')

    const endless = await page.evaluate(() => {
      const out: string[] = []
      for (const node of document.querySelectorAll('body *')) {
        const style = getComputedStyle(node)
        if (style.animationName === 'none') continue
        if (style.animationIterationCount === 'infinite') {
          out.push(`${node.className} runs ${style.animationName} forever`)
        }
      }
      return out
    })
    expect(endless, 'nothing loops').toEqual([])
  })

  test('with reduced motion, every duration is zero and the screen is complete', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    try {
      await loadInQa(page, 'A week pointed at the house')
      await go(page, 'Now')

      // The screen is fully readable: no state is expressed by movement alone.
      await expect(page.getByTestId('now-premise')).toBeVisible()

      const durations = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement)
        return ['--dur-fast', '--dur', '--dur-slow'].map((name) =>
          root.getPropertyValue(name).trim(),
        )
      })
      expect(durations, 'every motion token is off').toEqual(['0ms', '0ms', '0ms'])

      const moving = await page.evaluate(() => {
        const out: string[] = []
        for (const node of document.querySelectorAll('body *')) {
          const style = getComputedStyle(node)
          const ms =
            parseFloat(style.animationDuration) * (/ms$/.test(style.animationDuration) ? 1 : 1000)
          if (style.animationName !== 'none' && ms > 1) out.push(style.animationName)
        }
        return out
      })
      expect(moving, 'nothing animates under reduced motion').toEqual([])
    } finally {
      await context.close()
    }
  })
})
