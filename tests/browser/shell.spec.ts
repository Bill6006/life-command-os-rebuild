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

    for (const name of ['Life', 'Timeline', 'Insights', 'More', 'Now']) {
      await page.getByRole('button', { name }).click()
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      await expect(page.getByRole('button', { name })).toHaveAttribute('aria-current', 'page')
    }
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
