/**
 * The builder's own Android-style gate, against the deployed Preview.
 *
 * Canonical plan section 43 and D-076: a real mobile context — touch, an
 * Android Chrome user agent, a realistic device pixel ratio, mobile scrolling —
 * driven against the bytes actually on the server, not a narrow desktop
 * viewport and not a local build.
 *
 * It prints what the owner would read and measures what he would touch. Phase
 * 4's five defects and Phase 5's three were all invisible to a passing suite.
 */

import { chromium, devices } from '@playwright/test'

const PREVIEW = 'https://bill6006.github.io/life-command-os-rebuild/preview/'
const EXPECTED_SHA = process.argv[2]

const findings = []
function finding(where, what) {
  findings.push(`${where}: ${what}`)
}

async function textOf(page, selector = 'main') {
  return (await page.locator(selector).innerText()).replace(/\n{3,}/g, '\n\n')
}

async function geometry(page, where) {
  const report = await page.evaluate(() => {
    const doc = document.documentElement
    const small = []
    for (const el of document.querySelectorAll('main button, main a, main input, .nav button')) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 && box.height === 0) continue
      if (box.height < 44 || box.width < 44) {
        small.push({
          text: (el.textContent || '').trim().slice(0, 40),
          w: Math.round(box.width * 10) / 10,
          h: Math.round(box.height * 10) / 10,
        })
      }
    }
    const wide = []
    for (const el of document.querySelectorAll('main *')) {
      const box = el.getBoundingClientRect()
      if (box.right > doc.clientWidth + 0.5) {
        wide.push({ text: (el.textContent || '').trim().slice(0, 40), right: Math.round(box.right) })
      }
    }
    const pinned = [...document.querySelectorAll('main *')]
      .filter((el) => ['sticky', 'fixed'].includes(getComputedStyle(el).position))
      .map((el) => el.className)
    return {
      overflow: doc.scrollWidth - doc.clientWidth,
      small,
      wide: wide.slice(0, 5),
      pinned,
    }
  })

  if (report.overflow > 0) finding(where, `horizontal overflow of ${report.overflow}px`)
  for (const el of report.wide) finding(where, `element past the right edge: "${el.text}"`)
  for (const el of report.small) {
    // P4-7, owner-deferred and re-measured every phase.
    if (el.text === 'More') continue
    finding(where, `touch target ${el.w}×${el.h} — "${el.text}"`)
  }
  for (const name of report.pinned) finding(where, `pinned element: ${name}`)
  return report
}

async function loadScenario(page, title) {
  await page.goto(`${PREVIEW}#/qa`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await page.waitForTimeout(400)
}

async function go(page, name) {
  await page.locator('.nav').getByRole('button', { name }).click()
  await page.waitForTimeout(400)
}

const browser = await chromium.launch()
const context = await browser.newContext({
  ...devices['Galaxy S9+'],
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
})
const page = await context.newPage()

page.on('pageerror', (error) => finding('console', `page error: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') finding('console', `console error: ${message.text()}`)
})

// --- the build actually being tested ---------------------------------------
await page.goto(`${PREVIEW}#/more`, { waitUntil: 'networkidle' })
const more = await textOf(page)
console.log('\n===== MORE =====\n' + more)
const sha = /Commit\s+(\w{7})/.exec(more)?.[1]
if (EXPECTED_SHA !== undefined && sha !== EXPECTED_SHA.slice(0, 7)) {
  finding('build', `serving ${sha}, expected ${EXPECTED_SHA.slice(0, 7)}`)
}
await geometry(page, 'More')

const SURFACES = [
  ['Nine months of evenings', ['Insights', 'Timeline', 'Now']],
  ['A month of what actually worked', ['Insights']],
  ['One answer, and a lot of silence', ['Insights', 'Timeline']],
  ['A file with damage in it', ['Timeline']],
  ['Two ordinary weeks', ['Timeline', 'Insights']],
  ['A Thursday with nothing needing doing', ['Now', 'Insights']],
  ['Everything current except the studying', ['Insights', 'Now']],
  ['A settled arrangement, and one week away', ['Timeline', 'Insights']],
]

for (const [scenario, screens] of SURFACES) {
  await loadScenario(page, scenario)
  for (const screen of screens) {
    await go(page, screen)
    console.log(`\n===== ${scenario} → ${screen} =====\n` + (await textOf(page)))
    await geometry(page, `${scenario} → ${screen}`)

    if (screen === 'Insights') {
      const openers = page.locator('button.ev-open')
      const count = await openers.count()
      for (let index = 0; index < count; index += 1) {
        await openers.nth(index).click()
        await page.waitForTimeout(200)
        console.log(
          `\n----- ${scenario} → Insights, card ${index + 1} open -----\n` + (await textOf(page)),
        )
        await geometry(page, `${scenario} → Insights (card ${index + 1} open)`)
        await openers.nth(index).click()
        await page.waitForTimeout(150)
      }
    }

    if (screen === 'Now') {
      const link = page.getByTestId('now-see-evidence')
      if ((await link.count()) > 0) {
        await link.click()
        await page.waitForTimeout(250)
        console.log(`\n----- ${scenario} → Now, evidence open -----\n` + (await textOf(page)))
        await geometry(page, `${scenario} → Now (evidence open)`)
      }
    }

    if (screen === 'Timeline') {
      const pager = page.getByRole('button', { name: /Show earlier/ })
      if ((await pager.count()) > 0) {
        await pager.click()
        await page.waitForTimeout(300)
        await geometry(page, `${scenario} → Timeline (paged)`)
      }
    }
  }
}

// --- a double tap on the one thing on Timeline that can be tapped ----------
await loadScenario(page, 'Nine months of evenings')
await go(page, 'Timeline')
const pager = page.getByRole('button', { name: /Show earlier/ })
const before = await page.locator('.tl-entry').count()
await pager.dispatchEvent('click')
await pager.dispatchEvent('click')
await page.waitForTimeout(400)
const after = await page.locator('.tl-entry').count()
console.log(`\n===== double tap on the pager: ${before} → ${after} entries =====`)

// --- reduced motion, and text scaling --------------------------------------
await context.close()
const scaled = await browser.newContext({
  ...devices['Galaxy S9+'],
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
})
const zoomed = await scaled.newPage()
await zoomed.goto(`${PREVIEW}#/qa`, { waitUntil: 'networkidle' })
await zoomed.getByRole('button', { name: /Nine months of evenings/ }).click()
await zoomed.waitForTimeout(400)
await zoomed.addStyleTag({ content: 'html { font-size: 20px !important; }' })
for (const screen of ['Insights', 'Timeline', 'Now']) {
  await zoomed.locator('.nav').getByRole('button', { name: screen }).click()
  await zoomed.waitForTimeout(400)
  await geometry(zoomed, `${screen} at 125% text`)
}

await browser.close()

console.log('\n\n===== FINDINGS =====')
if (findings.length === 0) console.log('none')
for (const line of findings) console.log('- ' + line)
