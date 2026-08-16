import { expect, test, type Page } from '@playwright/test'

/**
 * The QA laboratory, in a real browser.
 *
 * These are the parts the unit suite cannot prove: that IndexedDB actually
 * keeps a history across a reload, that a damaged file leaves every surface
 * standing, and that the laboratory's code is not shipped to anyone who has
 * not asked for it.
 */

const APP = '/life-command-os-rebuild/preview/'

async function openQa(page: Page) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
}

async function loadScenario(page: Page, title: string) {
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

function block(page: Page, title: string) {
  return page.locator('details.qa-block', { has: page.locator('> summary', { hasText: title }) })
}

/** Some blocks open by default, so clicking blindly would close them. */
async function openBlock(page: Page, title: string) {
  const target = block(page, title)
  // `> summary` on purpose: the ranking block contains a <details> per move,
  // so a descendant match would resolve to several summaries.
  if ((await target.getAttribute('open')) === null) await target.locator('> summary').click()
  await expect(target).toHaveAttribute('open', '')
  return target
}

function rowValue(page: Page, label: string) {
  return page.locator('.rows__row', { hasText: label }).first().locator('dd')
}

test.describe('reaching the laboratory', () => {
  test('lives behind More rather than in the navigation', async ({ page }) => {
    await page.goto(APP)

    // The bar holds the four primary destinations. Neither QA nor More is one.
    await expect(page.locator('.nav .nav__item')).toHaveCount(4)
    await expect(page.locator('.nav').getByRole('button', { name: 'QA' })).toHaveCount(0)

    await page.locator('.topbar').getByRole('button', { name: 'More' }).click()
    await page.getByRole('link', { name: 'Open the QA laboratory' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  })

  test('its code is not downloaded until it is asked for', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (request) => requested.push(request.url()))

    await page.goto(APP)
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
    expect(requested.filter((url) => url.includes('QaScreen'))).toEqual([])

    await page.goto(`${APP}#/qa`)
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
    expect(requested.filter((url) => url.includes('QaScreen')).length).toBeGreaterThan(0)
  })
})

test.describe('a real store', () => {
  test('uses IndexedDB and says so', async ({ page }) => {
    await openQa(page)
    await expect(rowValue(page, 'Backend')).toHaveText('indexeddb')
    await expect(rowValue(page, 'Durable')).toHaveText('Yes')
  })

  test('keeps a loaded history across a reload', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A topic that keeps slipping')
    await expect(rowValue(page, 'Records')).toHaveText('4')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
    // Nothing was reloaded from a fixture — this came back off the disk.
    await expect(rowValue(page, 'Records')).toHaveText('4')
    await expect(rowValue(page, 'Entities')).toHaveText('2')
  })

  test('reopens the database and finds the same history', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')

    await page.getByRole('button', { name: 'Reopen and verify' }).click()
    const result = page.getByTestId('storage-check')
    await expect(result).toBeVisible()
    await expect(result).toHaveClass(/qa-ok/)
    await expect(result).toContainText('came back identical')
  })

  test('never puts history in localStorage', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')

    const stored = await page.evaluate(() =>
      Object.entries(localStorage).map(([key, value]) => `${key}=${String(value)}`),
    )
    for (const entry of stored) {
      expect(entry).not.toContain('sleep.hours-last-night')
      expect(entry).not.toContain('schemaVersion')
    }
  })

  test('clears everything back to nothing known', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')
    await page.getByRole('button', { name: 'Clear everything' }).click()
    await expect(rowValue(page, 'Records')).toHaveText('0')
  })
})

test.describe('the subject survives to the screen', () => {
  test('renders a recommendation that names subnetting', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A topic that keeps slipping')
    const recorded = await openBlock(page, 'Recommendations in history')

    const sentence = page.getByTestId('recommendation-sentence')
    await expect(sentence).toHaveText(
      'Spend 10 minutes recalling subnetting before you reopen your notes.',
    )
    // Scoped to this block: the engine's own decision has a Subject and a
    // Follow-up too, and they are about the move it chose rather than the one
    // stored in the history.
    await expect(recorded.locator('.rows__row', { hasText: 'Subject' }).locator('dd')).toHaveText(
      'subnetting',
    )
    await expect(recorded.locator('.rows__row', { hasText: 'Follow-up' }).locator('dd')).toHaveText(
      'How did the subnetting recall go?',
    )
  })

  test('shows an entity fact as the thing it names, not as an identifier', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A topic that keeps slipping')

    // Both places the fact appears — what is believed, and what the decision
    // actually read. An id leaking onto either would be the same defect.
    const believes = await openBlock(page, 'What the system believes')
    await expect(
      believes.locator('.rows__row', { hasText: 'Current learning topic' }).locator('dd'),
    ).toHaveText('subnetting')

    const considered = await openBlock(page, 'Facts considered')
    await expect(
      considered.locator('.rows__row', { hasText: 'Current learning topic' }).locator('dd'),
    ).toContainText('subnetting')
  })
})

test.describe('a file with damage in it', () => {
  test('lists every unreadable row with a reason, and keeps the rest of the screen', async ({
    page,
  }) => {
    await openQa(page)
    await loadScenario(page, 'A file with damage in it')

    await expect(rowValue(page, 'Records')).toHaveText('5')
    await expect(rowValue(page, 'Unreadable rows').first()).toHaveText('6')

    const rows = await openBlock(page, 'Unreadable rows')
    await expect(rows.getByTestId('malformed-rows').locator('.qa-malformed__row')).toHaveCount(6)
    await expect(rows.locator('.qa-malformed__issues li').first()).not.toBeEmpty()

    // The surface that matters is still populated, not blanked.
    const believes = await openBlock(page, 'What the system believes')
    await expect(believes.locator('.qa-group[data-state="explicit"]')).toBeVisible()
  })
})

test.describe('time travel', () => {
  test('moves the owner-local day without touching the history', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')

    await expect(rowValue(page, 'Owner-local')).toHaveText('2026-02-15 21:00')
    await expect(rowValue(page, 'Local week')).toHaveText('2026-W07')

    await page.getByRole('button', { name: '+1 day' }).click()
    await expect(rowValue(page, 'Owner-local')).toHaveText('2026-02-16 21:00')
    await expect(rowValue(page, 'Local week')).toHaveText('2026-W08')

    await page.getByRole('button', { name: '−1 week' }).click()
    await expect(rowValue(page, 'Owner-local')).toHaveText('2026-02-09 21:00')

    // Travelling does not rewrite anything.
    await expect(rowValue(page, 'Records')).toHaveText('19')
  })

  test('does not leave a DST warning up after moving away from the gap', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'The same evenings, read from four places')
    await page.getByLabel('Timezone').selectOption('America/New_York')

    // 02:30 on the morning New York springs forward. That wall-clock time does
    // not exist, and the screen should say so.
    await page.getByLabel('Travel to').fill('2026-03-08T02:30')
    await expect(page.getByTestId('dst-note')).toContainText('does not exist')

    // …and should stop saying so about 04:30, which plainly does exist.
    await page.getByRole('button', { name: '+1 hour' }).click()
    await expect(page.getByTestId('dst-note')).toHaveCount(0)
  })

  test('relabels the same history when the timezone changes', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'The same evenings, read from four places')

    const before = await rowValue(page, 'Owner-local').innerText()
    await page.getByLabel('Timezone').selectOption('Pacific/Auckland')
    const after = await rowValue(page, 'Owner-local').innerText()

    expect(after).not.toBe(before)
    await expect(rowValue(page, 'Records')).toHaveText('4')
  })
})

test.describe('privacy', () => {
  test('withholds private detail until it is asked for', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')
    await openBlock(page, 'What the system believes')

    const privateRow = page
      .locator('.rows__row', { hasText: 'Recent private pattern' })
      .locator('dd')
    await expect(privateRow).toHaveText('Private entry')

    await page.getByText('Show private detail').click()
    await expect(privateRow).toHaveText('late scrolling again')
  })
})

test.describe('mobile layout', () => {
  test('does not overflow sideways, however much is on screen', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A file with damage in it')

    for (const title of ['What the system believes', 'Ranking', 'The document']) {
      await openBlock(page, title)
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('the inspector says where a belief came from', () => {
  test('separates what the owner answered from what was worked out', async ({ page }) => {
    // Owner requirement 2. "3 comparable results" could be three things he
    // said, three things the app concluded, or a mix, and he cannot judge
    // whether to correct a belief without knowing which.
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /A month of what actually worked/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('what actually worked')

    await page.locator('summary', { hasText: 'What it has learned' }).click()
    const said = page.locator('.rows__row', { hasText: 'Who said so' }).first()
    await expect(said).toContainText('you answered')
  })
})
