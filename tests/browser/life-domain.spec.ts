import { expect, test, type Page } from '@playwright/test'

/**
 * Domain pages, on a real phone-sized screen (canonical plan section 50).
 *
 * The synthetic and unit suites prove a correction changes what the fact
 * layer, direction and coverage read next. These prove the owner can reach a
 * page, that its correction controls stay closed until tapped, that a
 * correction visibly changes the same screen, and that the private domain
 * stays exactly where section 11 puts it — nowhere but its own page.
 */

const APP = '/life-command-os-rebuild/preview/'

async function loadInQa(page: Page, title: string) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

async function goToLife(page: Page) {
  await page.locator('.nav').getByRole('button', { name: 'Life' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Life' })).toBeVisible()
}

test.describe('reaching a domain page', () => {
  test('opens from its name on Life, and links back', async ({ page }) => {
    await loadInQa(page, 'Everything current except the studying')
    await goToLife(page)

    await page.getByRole('link', { name: 'Career & Learning' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Career & Learning' })).toBeVisible()

    await page.getByRole('link', { name: /Back to Life/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Life' })).toBeVisible()
  })

  test('is deep-linkable and survives reload', async ({ page }) => {
    await page.goto(`${APP}#/life/health-recovery`)
    await expect(page.getByRole('heading', { level: 1, name: 'Health & Recovery' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Health & Recovery' })).toBeVisible()
  })

  test('still marks Life current in the bottom bar on a domain page', async ({ page }) => {
    await page.goto(`${APP}#/life/money`)
    await expect(page.locator('.nav').getByRole('button', { name: 'Life' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('reports plainly that an unknown page does not exist', async ({ page }) => {
    await page.goto(`${APP}#/life/nonsense`)
    await expect(page.getByText('There is no page here.')).toBeVisible()
    await page.getByRole('link', { name: 'Back to Life' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Life' })).toBeVisible()
  })

  test('reaches all ten pages without a crash, on the everyday history', async ({ page }) => {
    await loadInQa(page, 'Two ordinary weeks')
    for (const slug of [
      'health-recovery',
      'fatherhood',
      'career',
      'money',
      'social',
      'emotional',
      'faith',
      'home',
      'private',
      'direction',
    ]) {
      await page.goto(`${APP}#/life/${slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `horizontal overflow on ${slug}`).toBeLessThanOrEqual(0)
    }
  })
})

test.describe('a correction, and what it changes', () => {
  test('closes every correction control until it is tapped — no questionnaire dump', async ({
    page,
  }) => {
    await loadInQa(page, 'Everything current except the studying')
    await page.goto(`${APP}#/life/career`)

    // Section 59 excludes the old questionnaire UI by name. The proof is
    // structural: nothing editable is visible before a tap.
    await expect(page.locator('input.domain-input')).toHaveCount(0)
    await expect(page.getByText('Not right?').first()).toBeVisible()
  })

  test('QA-B2 — points at the overdue reading instead of offering a button that cannot settle it', async ({
    page,
  }) => {
    // Career's staleness here comes from a neglected standing concept
    // (the learning topic), not from domain-wide silence alone. Neither
    // "I've been keeping on top of this" nor "Something's changed" can
    // clear that — both write domain-level evidence with no concept to
    // resolve against — so offering them was the defect (QA-B2): a tap
    // wrote a "Recently" row and "How this stands" never moved.
    await loadInQa(page, 'Everything current except the studying')
    await page.goto(`${APP}#/life/career`)

    await expect(page.getByText(/Nothing has come in about career/)).toBeVisible()
    await expect(
      page.getByText(/Current learning topic is what is actually overdue here/),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: "I've been keeping on top of this" }),
    ).toHaveCount(0)
    await expect(page.getByRole('button', { name: "Something's changed" })).toHaveCount(0)

    // The concept's own correction is untouched and is still the way in.
    await expect(
      page
        .locator('.domain-reading', { hasText: 'Current learning topic' })
        .getByRole('button', { name: 'Not right?' }),
    ).toBeVisible()
  })

  test('correcting a stale reading turns the area current and updates the recommendation', async ({
    page,
  }) => {
    await loadInQa(page, 'Everything current except the studying')
    await page.goto(`${APP}#/life/career`)

    await expect(page.getByText(/Nothing has come in about career/)).toBeVisible()

    await page
      .locator('.domain-reading', { hasText: 'Current learning topic' })
      .getByRole('button', { name: 'Not right?' })
      .click()
    await page.locator('input.domain-input').fill('VLANs and trunking')
    await page.getByRole('button', { name: 'Save' }).click()

    // Not "is current" — that reads as a claim about what the app believes,
    // and the correction is evidence of intake, not of everything here being
    // up to date (DEF-0051).
    await expect(
      page.getByText(/Something has come in about career & learning recently/i),
    ).toBeVisible()
    await expect(
      page.locator('.domain-reading', { hasText: 'Current learning topic' }),
    ).toContainText('VLANs and trunking')
    await expect(page.locator('.domain-recent__row').first()).toContainText('VLANs and trunking')

    // The same correction is why Now stops proposing a refresh for it.
    await page.locator('.nav').getByRole('button', { name: 'Now' }).click()
    await expect(page.locator('.now-reason, .now-premise')).not.toContainText('career')
  })

  test('a reading with a closed set of answers reuses the guide’s own options', async ({
    page,
  }) => {
    await loadInQa(page, 'A settled arrangement, and one week away')
    await page.goto(`${APP}#/life/fatherhood`)

    await page
      .locator('.domain-reading', { hasText: 'Child with the owner' })
      .getByRole('button', { name: 'Not right?' })
      .click()
    await expect(page.locator('input.domain-input')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Not tonight' })).toBeVisible()

    await page.getByRole('button', { name: 'Not tonight' }).click()
    await expect(
      page.locator('.domain-reading', { hasText: 'Child with the owner' }),
    ).toContainText('no')
  })

  test('a goal correction takes it off the active list', async ({ page }) => {
    await loadInQa(page, 'Everything current except the studying')
    await page.goto(`${APP}#/life/career`)

    await expect(page.locator('.domain-goal')).toContainText('Pass the CCNA')
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator('.domain-goal')).toHaveCount(0)
  })
})

test.describe('the private domain stays where section 11 puts it', () => {
  test('the private reading only ever appears on its own page', async ({ page }) => {
    await loadInQa(page, 'Two ordinary weeks')

    await page.goto(`${APP}#/life/private`)
    // Appears twice on this page alone — the current reading and the
    // recent-changes row — which is exactly the point: only on this page.
    await expect(page.getByText('late scrolling again').first()).toBeVisible()

    await goToLife(page)
    const lifeText = await page.locator('.screen').innerText()
    expect(lifeText).not.toContain('late scrolling')

    await page.locator('.nav').getByRole('button', { name: 'Now' }).click()
    const nowText = await page.locator('.screen').innerText()
    expect(nowText).not.toContain('late scrolling')

    await page.locator('.nav').getByRole('button', { name: 'Timeline' }).click()
    const timelineText = await page.locator('.screen').innerText()
    expect(timelineText).not.toContain('late scrolling')
  })

  test('is manual-entry-first: nothing known reads as an invitation, not a gap', async ({
    page,
  }) => {
    await loadInQa(page, 'A week pointed at the house')
    await page.goto(`${APP}#/life/private`)

    await expect(page.getByText('Not known yet.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add this' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Not right?' })).toHaveCount(0)
  })
})
