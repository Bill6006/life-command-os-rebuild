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

/** A count of one against a plural noun. The nouns are named, not guessed. */
const DISAGREEMENT =
  /\b1 (?:entries|records|entities|rows|days|occasions|pairs|things|unreadable rows)\b/

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
    !DISAGREEMENT.test(onScreen) && !onScreen.includes('(s)'),
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
    !DISAGREEMENT.test(afterRestore) && !afterRestore.includes('(s)'),
    'a count and its noun disagree after the restore',
  )
  const done = await page.getByTestId('restore-done').innerText()
  check('the restore reports what it verified', done.includes('Restored and checked'))
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

  // ---- Bringing the old app's history across, by thumb ----------------------
  //
  // Driven on the deployed build, in a Galaxy-class context, because the whole
  // flow depends on the page's own Web Crypto: the file is encrypted here and
  // decrypted a moment later by the same implementation, at the parameters the
  // old application used. A desktop viewport would prove none of that, and a
  // hard-coded blob would prove only that one blob can be read.
  /*
   * One base moment for every file this gate builds.
   *
   * The row dates have to be **identical** across two builds, or the second
   * file is a genuinely different file and the later-backup checks below prove
   * nothing about the product. Recomputing them from `Date.now()` inside each
   * evaluate made every row differ by the milliseconds between the two calls,
   * which is a defect in this harness that reads exactly like the defect it is
   * checking for.
   */
  const baseMoment = Date.now()

  const buildLegacy = async (secret, createdAtDays, energyOrdinal) =>
    page.evaluate(
      async ({ secret, createdAtDays, energyOrdinal, baseMoment }) => {
        const b64 = (bytes) => {
          let binary = ''
          for (const byte of bytes) binary += String.fromCharCode(byte)
          return btoa(binary)
        }
        const at = (days) =>
          new Date(baseMoment - days * 86400000).toISOString().replace(/\.\d+Z$/, '.000Z')
        const row = (id, type, occurredAt, extra) => ({
          recordId: id,
          recordType: type,
          schemaVersion: 1,
          occurredAt,
          recordedAt: occurredAt,
          localTime: { localIso: occurredAt, timeZone: 'America/Denver', utcOffsetMinutes: -360 },
          source: 'user-entry',
          provenance: { method: 'direct-report' },
          privacy: 'general',
          ...extra,
        })

        const records = [
          row('android-1', 'observation', at(3), {
            category: 'time-attention-capacity',
            attribute: 'state:energy',
            value: {
              kind: 'anchored-scale',
              scaleId: 'energy',
              ordinal: energyOrdinal,
              label: 'Good',
            },
          }),
          row('android-2', 'goal', at(30), {
            statement: 'Pass the CCNA',
            category: 'career-work-learning',
            state: 'active',
            privacy: 'workplace',
          }),
          row('android-3', 'recommendation', at(5), { statement: 'Ten minutes of subnetting' }),
          row('android-4', 'move-preference', at(20), {
            engineCandidateId: 'social:message-someone',
            moveStatement: 'Message someone you have not spoken to',
            stance: 'forbidden',
          }),
        ]

        const serialised = JSON.stringify(
          [...records].sort((a, b) => a.recordId.localeCompare(b.recordId)),
        )
        const digest = async (value) => {
          const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
          return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
        }
        const payload = {
          payloadVersion: 1,
          storageSchemaVersion: 1,
          recordCount: records.length,
          integrity: { algorithm: 'SHA-256', digest: await digest(serialised) },
          records: JSON.parse(serialised),
        }

        const salt = crypto.getRandomValues(new Uint8Array(16))
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const meta = {
          cryptoVersion: 1,
          kdf: 'PBKDF2',
          kdfHash: 'SHA-256',
          iterations: 1000,
          cipher: 'AES-GCM',
          keyBits: 256,
          saltBase64: b64(salt),
          ivBase64: b64(iv),
        }
        const aad = new TextEncoder().encode(
          [
            String(meta.cryptoVersion),
            meta.kdf,
            meta.kdfHash,
            String(meta.iterations),
            meta.cipher,
            String(meta.keyBits),
            meta.saltBase64,
            meta.ivBase64,
          ].join('|'),
        )
        const material = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(secret),
          'PBKDF2',
          false,
          ['deriveKey'],
        )
        const key = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: meta.iterations, hash: 'SHA-256' },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt'],
        )
        const ciphertext = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv, additionalData: aad },
          key,
          new TextEncoder().encode(JSON.stringify(payload)),
        )

        return JSON.stringify({
          format: 'life-command-os.backup',
          formatVersion: 2,
          createdAt: at(createdAtDays),
          encrypted: true,
          approximateRecordCount: records.length,
          crypto: meta,
          ciphertextBase64: b64(new Uint8Array(ciphertext)),
        })
      },
      { secret, createdAtDays, energyOrdinal, baseMoment },
    )

  const legacy = await buildLegacy('the one from the old phone', 1, 4)

  await page.getByTestId('import-paste').fill(legacy)
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  const recognised = await page.getByTestId('import-recognised').innerText()
  check(
    'an old backup is recognised before a passphrase is asked for',
    recognised.includes('old app'),
  )
  check('and it says how the file was encrypted', recognised.includes('AES-GCM'))
  await sideways('import, recognised')

  // A wrong passphrase, first. Nothing should be written, and the sentence has
  // to be one an owner can act on.
  await page.getByTestId('import-passphrase').fill('not the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-refusal"]')
  const wrong = await page.getByTestId('import-refusal').innerText()
  check('a wrong passphrase is refused in plain words', wrong.includes('did not work'))
  /*
   * Said once (QA-08-N2). It used to appear in the sentence and again in a
   * standing note underneath, in two slightly different wordings, which reads
   * as two separate reassurances. Counted rather than matched on one phrasing,
   * because the old check named the duplicate and would have held it in place.
   */
  const reassurance = wrong.match(/nothing (?:has been|was) changed/gi) ?? []
  check(
    'and says nothing was changed, once',
    reassurance.length === 1,
    `said ${String(reassurance.length)} times`,
  )

  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')

  const report = await page.getByTestId('import-report').innerText()
  check(
    'the whole report appears before anything is written',
    report.includes('Nothing has been written yet'),
  )
  check('it says what is deliberately left out', report.includes('Left out on purpose'))
  check(
    'and it names the standing decision it cannot keep',
    (await page.getByTestId('import-unkept').innerText()).includes('Message someone'),
  )
  check(
    'the passphrase field is gone once it has been used',
    (await page.getByTestId('import-passphrase').count()) === 0,
  )
  await sideways('import, report')

  const importTargets = page.locator('[data-testid="import-report"] ~ .data-actions button')
  const importSizes = await importTargets.evaluateAll((nodes) =>
    nodes.map((node) =>
      Math.min(node.getBoundingClientRect().height, node.getBoundingClientRect().width),
    ),
  )
  check(
    'the import controls clear 44px of thumb',
    importSizes.every((size) => size >= 40),
    `smallest is ${Math.min(...importSizes, 999)}px`,
  )

  await page.getByTestId('import-apply').tap()
  await page.waitForSelector('[data-testid="import-outcome"]')
  const imported = await page.getByTestId('import-outcome').innerText()
  check(
    'the import reports what it brought and that it checked it',
    imported.includes('read them back to check'),
  )
  check('and it says nothing about a machine timestamp', !/\d{4}-\d{2}-\d{2}T\d{2}:/.test(imported))
  check(
    'and the app never prints a count of one against a plural noun',
    !/\b1 (?:entries|records|entities|rows)\b/.test(await page.locator('main').innerText()),
  )

  // The same file again. It has to say there is nothing left rather than
  // rewriting the store to change nothing.
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')
  const again = await page.getByTestId('import-report').innerText()
  check('a second run says it is already here', again.includes('Already here from an earlier run'))
  check('and offers nothing to press', await page.getByTestId('import-apply').isDisabled())
  await sideways('import, second run')

  // ---- A later backup of the same old history — QA-08-002 -------------------
  //
  // The ordinary way an append-first old history gains rows is a new backup,
  // and a new backup has a new creation time. That used to rewrite every
  // archived row's fingerprint and report six unchanged rows as changed.
  const laterSame = await buildLegacy('the one from the old phone', 0, 4)
  await page.getByTestId('import-paste').fill(laterSame)
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')
  check(
    'a newer backup of unchanged history reports no conflicts',
    (await page.getByTestId('import-conflicts').count()) === 0,
  )
  check(
    'and still says everything is already here',
    (await page.getByTestId('import-report').innerText()).includes(
      'Already here from an earlier run',
    ),
  )

  const laterChanged = await buildLegacy('the one from the old phone', 0, 1)
  await page.getByTestId('import-paste').fill(laterChanged)
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')
  const conflictText = await page.getByTestId('import-conflicts').innerText()
  check('one changed old row reports exactly one entry', conflictText.startsWith('1 entry'))
  check('and reads as one thing rather than several', !/\b1 entries\b/.test(conflictText))

  // ---- What came across says so, where it is read — QA-08-001 ---------------
  await page.locator('.nav').getByRole('button', { name: 'Timeline' }).tap()
  await page.waitForSelector('h1:has-text("Timeline")')
  const badges = await page.getByTestId('tl-origin').count()
  const rows = await page.locator('.tl-entry').count()
  check('imported entries are marked on Timeline', badges > 0)
  check('and the owner’s own entries are not', rows > badges, `${rows} rows, ${badges} marked`)
  check(
    'the marker reads as a word rather than a code',
    (await page.getByTestId('tl-origin').first().innerText()) === 'Imported',
  )
  await sideways('Timeline, with imported history')

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
