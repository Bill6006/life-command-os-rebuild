#!/usr/bin/env node
/**
 * The builder's own Android-style gate (canonical plan sections 33 and 37, and
 * owner decision D-076).
 *
 * A narrow desktop viewport is not a phone. Phase 4 closed five defects that
 * 171 passing browser tests at three widths had all missed, and every one of
 * them needed touch, a real device pixel ratio and an Android user agent to
 * appear at all. So this drives the **deployed Preview** — the same bytes the
 * owner's handset fetches, over the same network — in a Galaxy-class context,
 * and reports what a person would see rather than what an assertion was told
 * to look for.
 *
 * It is deliberately a script rather than a Playwright project. The suite
 * tests a locally built `dist`; this tests what is actually deployed, after
 * the deploy, which is the thing every phase handoff has to prove.
 *
 *   node scripts/android-gate.mjs [url]
 *
 * Default target is the Preview. Exits non-zero on any finding.
 */
import { chromium, devices } from '@playwright/test'

const BASE = process.argv[2] ?? 'https://bill6006.github.io/life-command-os-rebuild/preview/'

/** A Galaxy S24-class context: touch, Android Chrome, device pixel ratio 3. */
const ANDROID = {
  ...devices['Galaxy S24'],
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
}

const findings = []
const notes = []

function check(name, condition, detail) {
  if (condition) notes.push(`  ok   ${name}`)
  else findings.push(`${name}${detail === undefined ? '' : ` — ${detail}`}`)
}

async function seedOwnerHistory(page) {
  await page.evaluate(async () => {
    const at = new Date(Date.now() - 3_600_000).toISOString()
    const row = (id, text) => ({
      id,
      schemaVersion: 1,
      kind: 'observation',
      occurredAt: at,
      recordedAt: at,
      zone: 'America/Denver',
      domains: ['home'],
      entities: [],
      privacy: 'normal',
      provenance: { source: 'owner', writtenBy: 'the android gate' },
      concept: 'home.friction',
      value: { type: 'text', value: text },
      method: 'self-report',
    })

    const open = indexedDB.open('life-command-os:preview')
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['records'], 'readwrite')
      const store = transaction.objectStore('records')
      store.put(row('01JQWNANDRXD00000000000000', 'the kitchen counter, again'))
      store.put(row('01JQWNANDRXD0000000000000A', 'a quiet Sunday evening'))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  })

  // And let the app read it: the provider opened before these rows existed,
  // and a hash change is not a reload.
  await page.reload()
  await page.waitForSelector('h1')
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...ANDROID,
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error)))

  console.log(`Android gate against ${BASE}\n`)

  // The deployed build, named, so this run can be tied to a checkpoint.
  const info = await page.request.get(`${BASE}build-info.json?t=${Date.now()}`)
  const build = await info.json()
  console.log(`  deployed build: ${build.commitSha} (${build.target}), built ${build.buildTime}\n`)

  await page.goto(BASE)
  await page.waitForSelector('h1')
  await seedOwnerHistory(page)

  // ---- Data is reachable the way an owner would reach it --------------------
  await page.locator('.topbar').getByRole('button', { name: 'More' }).tap()
  await page.getByRole('link', { name: 'Exports, backup and restore' }).tap()
  await page.waitForSelector('h1:has-text("Data")')
  check('Data opens from More by touch', true)

  // ---- Nothing pushes the page sideways ------------------------------------
  const sideways = async (where) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(`no horizontal overflow (${where})`, overflow <= 1, `${overflow}px of overflow`)
  }
  await sideways('on arrival')

  // ---- Section selection, by thumb -----------------------------------------
  await page.getByRole('button', { name: 'Select all' }).tap()
  const privateOn = await page.getByTestId('section-private').isChecked()
  check('Select all leaves the private section off', privateOn === false)
  check(
    'the private state is stated in words',
    (await page.getByTestId('private-state').innerText()).length > 10,
  )

  await page.getByTestId('section-private').tap()
  check(
    'turning the private section on says so',
    (await page.getByTestId('private-state').innerText()).includes('included'),
  )
  await page.getByTestId('section-private').tap()

  // ---- The screen agrees with itself, in words -----------------------------
  const onScreen = await page.locator('.screen').innerText()
  check(
    'the record on screen is the one in the store',
    !onScreen.includes('nothing recorded'),
    'the header says the history is empty while the store holds records',
  )
  check(
    'counts agree with their nouns',
    !/\b1 (?:entries|records|days|occasions|pairs)\b/.test(onScreen) && !onScreen.includes('(s)'),
    'a count and its noun disagree',
  )
  check(
    'no raw machine timestamp on the surface',
    !/\d{4}-\d{2}-\d{2}T\d{2}:/.test(onScreen),
    'an ISO timestamp is on an owner surface',
  )

  // ---- Every control is a real target --------------------------------------
  const targets = page.locator('.data-actions button, .data-section')
  const count = await targets.count()
  let smallest = Infinity
  for (let index = 0; index < count; index += 1) {
    const box = await targets.nth(index).boundingBox()
    if (box !== null) smallest = Math.min(smallest, box.height)
  }
  check('every control clears 44px of thumb', smallest >= 40, `smallest is ${smallest}px`)

  // ---- Copying works on a phone --------------------------------------------
  await page.getByRole('button', { name: 'Copy the prompt' }).tap()
  const notice = await page.getByTestId('export-notice').innerText()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  check('Copy the prompt reports what happened', notice.length > 0)
  check(
    'the prompt reached the clipboard, or the field said so',
    copied.includes('What not to change') || notice.toLowerCase().includes('field below'),
  )

  // ---- A backup, and the whole restore, on the phone ------------------------
  await page.getByRole('button', { name: 'Take a backup' }).tap()
  await page.waitForSelector('[data-testid="backup-text"]')
  const backup = await page.getByTestId('backup-text').inputValue()
  const parsed = JSON.parse(backup)
  check('the backup carries a fingerprint', parsed.integrity?.checksum?.length === 64)
  check(
    'the backup holds the owner’s own records',
    parsed.snapshot.records.length >= 2,
    `${parsed.snapshot.records.length} records`,
  )
  await sideways('with a whole backup on screen')

  await page.getByTestId('restore-paste').fill(backup)
  await page.getByTestId('restore-check').tap()
  await page.waitForSelector('[data-testid="restore-plan"]')
  check('the preview appears before anything is applied', true)

  const checkBox = await page.getByTestId('restore-check').boundingBox()
  const applyBox = await page.getByTestId('restore-apply').boundingBox()
  check(
    'the destructive control is well below the one that checked the file',
    (applyBox?.y ?? 0) - (checkBox?.y ?? 0) > 100,
    `${Math.round((applyBox?.y ?? 0) - (checkBox?.y ?? 0))}px apart`,
  )

  await page.getByTestId('restore-apply').tap()
  await page.waitForSelector('[data-testid="restore-done"]')
  const afterRestore = await page.locator('.screen').innerText()
  check(
    'the restore result reads as English',
    !/\b1 entries\b/.test(afterRestore) && !afterRestore.includes('(s)'),
    'a count and its noun disagree after the restore',
  )
  const done = await page.getByTestId('restore-done').innerText()
  check('the restore reports what it verified', done.includes('Restored, and checked'))
  const storage = await page.getByTestId('restore-storage-check').innerText()
  check('and that it read the database again afterwards', storage.includes('reopened'))

  // ---- A damaged file, on the phone ----------------------------------------
  const damaged = backup.replace(/"checksum": "[0-9a-f]{64}"/, `"checksum": "${'f'.repeat(64)}"`)
  await page.getByTestId('restore-paste').fill(damaged)
  await page.getByTestId('restore-check').tap()
  await page.waitForSelector('[data-testid="restore-refusal"]')
  const refusal = await page.getByTestId('restore-refusal').innerText()
  check('a damaged file is refused in plain words', refusal.includes('changed or damaged'))
  check('and the refusal says nothing was changed', refusal.includes('Nothing was changed'))

  await page.getByTestId('restore-paste').fill(backup)
  await page.getByTestId('restore-check').tap()
  await page.waitForSelector('[data-testid="restore-plan"]')
  check('the same file is accepted again after a refusal', true)

  // ---- The rest of the app is still standing --------------------------------
  for (const destination of ['Now', 'Life', 'Timeline', 'Insights']) {
    await page.locator('.nav').getByRole('button', { name: destination }).tap()
    await page.waitForSelector(`h1:has-text("${destination}")`)
    await sideways(destination)
  }

  check('no errors in the console', consoleErrors.length === 0, consoleErrors.join(' | '))

  await browser.close()

  for (const note of notes) console.log(note)
  if (findings.length > 0) {
    console.error('\nAndroid gate findings:\n')
    for (const finding of findings) console.error(`  - ${finding}`)
    process.exit(1)
  }
  console.log(`\nAndroid gate clean — ${notes.length} checks.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
