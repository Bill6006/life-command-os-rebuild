import { expect, test, type Page } from '@playwright/test'

const APP = '/life-command-os-rebuild/preview/'

async function open(page: Page, hash = '') {
  await page.goto(`${APP}${hash}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

test.describe('app shell', () => {
  test('opens on Now by default', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
  })

  test('every primary destination is reachable and marked current', async ({ page }) => {
    await open(page)

    for (const name of ['Life', 'Timeline', 'Insights', 'Now']) {
      await page.getByRole('button', { name }).click()
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      await expect(page.getByRole('button', { name })).toHaveAttribute('aria-current', 'page')
    }
  })

  test('the bottom bar holds the four primary destinations and nothing else', async ({ page }) => {
    // Canonical plan section 5. More is a secondary surface; a permanent tab
    // would make it a fifth primary destination whatever the label says.
    await open(page)

    const items = page.locator('.nav .nav__item')
    await expect(items).toHaveCount(4)
    await expect(items).toHaveText(['Now', 'Life', 'Timeline', 'Insights'])
    await expect(page.locator('.nav').getByRole('button', { name: 'More' })).toHaveCount(0)
  })

  test('More is reached from the header, and marks itself current there', async ({ page }) => {
    await open(page)

    await page.locator('.topbar').getByRole('button', { name: 'More' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'More' })).toBeVisible()
    await expect(page.locator('.topbar__more')).toHaveAttribute('aria-current', 'page')

    // And the primary four are still one tap away from it.
    await page.getByRole('button', { name: 'Now' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
    await expect(page.locator('.topbar__more')).not.toHaveAttribute('aria-current', 'page')
  })

  test('a destination is deep-linkable and survives reload', async ({ page }) => {
    await open(page, '#/insights')
    await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()
  })

  test('an unknown route falls back to Now instead of a blank screen', async ({ page }) => {
    await open(page, '#/nonsense')
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
  })
})

test.describe('mobile layout', () => {
  test('no horizontal overflow on any destination', async ({ page }) => {
    await open(page)

    for (const hash of ['#/now', '#/life', '#/timeline', '#/insights', '#/more']) {
      await page.goto(`${APP}${hash}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `horizontal overflow on ${hash}`).toBeLessThanOrEqual(0)
    }
  })

  test('the fixed nav does not cover the end of the content', async ({ page }) => {
    await open(page, '#/life')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    const nav = page.locator('.nav')
    const lastPanel = page.locator('.panel').last()

    const navBox = await nav.boundingBox()
    const panelBox = await lastPanel.boundingBox()
    expect(navBox).not.toBeNull()
    expect(panelBox).not.toBeNull()
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(navBox!.y + 1)
  })

  test('keyboard focus is visible on the navigation', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Life' }).focus()

    const outline = await page
      .getByRole('button', { name: 'Life' })
      .evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).not.toBe('none')
  })
})

test.describe('preview build identity', () => {
  test('the Preview label and short SHA are visible without opening a menu', async ({ page }) => {
    await open(page)

    await expect(page.locator('.preview-strip__label')).toContainText('Preview')
    await expect(page.locator('.preview-strip__sha')).toHaveText(/[0-9a-f]{7}|unknown/)
  })

  test('the running build matches build-info.json on the server', async ({ page, request }) => {
    await open(page, '#/more')

    const shown = await page
      .locator('.rows__row', { hasText: 'Full SHA' })
      .locator('dd')
      .innerText()

    const response = await request.get(`${APP}build-info.json`)
    expect(response.ok()).toBeTruthy()
    const deployed = (await response.json()) as { commitSha: string; target: string }

    expect(shown.trim()).toBe(deployed.commitSha)
    expect(deployed.target).toBe('preview')
  })

  test('no service worker is registered', async ({ page }) => {
    await open(page)
    const count = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 0
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.length
    })
    expect(count).toBe(0)
  })

  test('the stale-build notice stays hidden when the build is current', async ({ page }) => {
    await open(page)
    await expect(page.locator('.build-notice')).toHaveCount(0)
  })
})

/**
 * Life — the coverage overview (canonical plan sections 7 and 63).
 */
test.describe('Life reports how each area stands', () => {
  const APP_LIFE = '/life-command-os-rebuild/preview/'

  async function loadAndOpenLife(page: import('@playwright/test').Page, title: string) {
    await page.goto(`${APP_LIFE}#/qa`)
    await page.getByRole('button', { name: new RegExp(title) }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText(title)
    await page.locator('.nav').getByRole('button', { name: 'Life' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Life' })).toBeVisible()
  }

  test('puts the area that has gone quiet on its own, with the reason', async ({ page }) => {
    await loadAndOpenLife(page, 'Everything current except the studying')

    const going = page.getByTestId('life-group-going-quiet')
    await expect(going).toContainText('Career & Learning')
    await expect(going).toContainText('7 weeks')
    await expect(going).toContainText('may come up on Now')

    // And everything calm is a row of names, not a stack of paragraphs.
    await expect(page.getByTestId('life-group-fresh')).toContainText('Sleep & Recovery')
    await expect(page.getByTestId('life-group-nothing-here-yet')).toContainText('Faith & Meaning')
  })

  /**
   * P4-4 — the regression for the wall itself.
   *
   * The first version gave all eleven areas a row carrying the same sentence,
   * right-aligned; seven read identically and the page ran to two and a half
   * phone screens. Every assertion about it passed. So this measures the thing
   * that was actually wrong: how much the screen repeats itself, and how long
   * it is.
   */
  test('says the same sentence once rather than seven times', async ({ page }) => {
    await loadAndOpenLife(page, 'Everything current except the studying')

    const repeats = await page.evaluate(() => {
      const seen = new Map<string, number>()
      for (const node of document.querySelectorAll('.screen p, .screen li, .screen dd')) {
        const text = (node.textContent ?? '').trim()
        if (text.length < 25) continue
        seen.set(text, (seen.get(text) ?? 0) + 1)
      }
      return [...seen.entries()].filter(([, count]) => count > 1)
    })
    expect(repeats, 'a sentence the owner reads more than once').toEqual([])
  })

  test('fits in about a screen and a half rather than two and a half', async ({ page }) => {
    await loadAndOpenLife(page, 'Everything current except the studying')
    const ratio = await page.evaluate(
      () => document.body.scrollHeight / document.documentElement.clientHeight,
    )
    expect(ratio, 'Life is still a wall').toBeLessThan(1.9)
  })

  test('names every one of the eleven areas exactly once', async ({ page }) => {
    await loadAndOpenLife(page, 'Everything current except the studying')
    const text = await page.locator('.screen').innerText()
    for (const area of [
      'Health & Physical Capacity',
      'Sleep & Recovery',
      'Fatherhood / Family',
      'Career & Learning',
      'Money & Financial Resilience',
      'Social & Relationships',
      'Emotional Health',
      'Faith & Meaning',
      'Home & Environment',
      'Private / Sexual Health',
      'Long-Range Direction / Identity',
    ]) {
      expect(text.split(area).length - 1, `${area} should appear once`).toBe(1)
    }
  })

  test('uses no evidence terminology and no phase language', async ({ page }) => {
    // Section 7 asks for this by name, and DEF-0007 is what happens when a
    // screen starts talking about its own construction.
    await loadAndOpenLife(page, 'Everything current except the studying')
    const text = (await page.locator('.screen').innerText()).toLowerCase()

    for (const banned of ['phase', 'stale', 'confidence', 'record', 'concept', 'coverage engine']) {
      expect(text, `Life should not say "${banned}"`).not.toContain(banned)
    }
  })

  test('never puts the private subject on screen', async ({ page }) => {
    // Section 11 — display discretion. A status exposes nothing; a summary that
    // could name a behaviour would.
    await loadAndOpenLife(page, 'Two ordinary weeks')
    const text = await page.locator('.screen').innerText()
    expect(text).toContain('Private / Sexual Health')
    expect(text.toLowerCase()).not.toContain('pattern')
  })

  test('reports nothing at all rather than guessing, with no history loaded', async ({ page }) => {
    await page.goto(`${APP_LIFE}#/life`)
    await expect(page.getByRole('heading', { level: 1, name: 'Life' })).toBeVisible()
    await expect(page.locator('.panel__title').first()).toContainText('none of them optional')
  })

  test('does not overflow sideways with eleven areas on screen', async ({ page }) => {
    await loadAndOpenLife(page, 'Everything current except the studying')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
