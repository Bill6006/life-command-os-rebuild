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

import {
  adaptationClaims,
  containsApprovedBlockerCopy,
  readingUnits,
} from './adaptation-claims.mjs'

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

/**
 * The smallest a control may be for a thumb — QA-82-004.
 *
 * One number, read by the name, the predicate and the diagnostic. It used to be
 * three: two checks were called "clears 44px of thumb" and asserted `>= 40`,
 * and the four that asserted `>= 44` printed the measurement rounded — so a
 * control measuring 43.9996 failed a check whose own diagnostic said it was
 * 44px tall. Whatever this gate reports has to be the thing it tested.
 */
const THUMB = 44

/**
 * A touch target, measured and reported unrounded.
 *
 * `toFixed(2)` rather than `Math.round`, because the value this exists to make
 * legible is the fractional one: a subpixel miss and an undersized button are
 * different findings and used to print identically.
 */
function clearsThumb(what, height) {
  check(
    `${what} clears ${THUMB}px of thumb`,
    height !== undefined && height !== null && height >= THUMB,
    height === undefined || height === null ? 'not on screen' : `${height.toFixed(2)}px tall`,
  )
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
  // `Infinity` would sail through the comparison, so nothing found is reported
  // as nothing found rather than as a pass.
  clearsThumb(
    'the smallest control on the data screen',
    Number.isFinite(smallest) ? smallest : undefined,
  )

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
  clearsThumb(
    'the smallest of the import controls',
    importSizes.length === 0 ? undefined : Math.min(...importSizes),
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

  // ---- A conclusion drawn only from imported history — QA-08-001 retest ----
  //
  // The half the first repair missed. Marking the Timeline row and leaving the
  // Life overview and an Insights card unmarked satisfies "recognisably
  // imported" only if the owner reads the rows rather than the conclusion, and
  // the conclusion is what those two screens exist to show him.
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  const lifeMarks = await page.getByTestId('life-origin').count()
  check('an area heard about only through an import says so on Life', lifeMarks > 0)
  await sideways('Life, with imported history')

  await page.locator('.nav').getByRole('button', { name: 'Insights' }).tap()
  await page.waitForSelector('h1:has-text("Insights")')
  const cardMarks = await page.getByTestId('insight-origin').count()
  check('and an Insights card drawn from it says so too', cardMarks > 0)
  await sideways('Insights, with imported history')

  // ---- Phase 81: the sentences and the controls, on a phone -----------------
  /*
   * Every check here is a thing the audit found by *reading a screen* rather
   * than by asserting a string, which is why they belong in this gate as well
   * as in the suite: a control the owner has to find with a thumb, and copy
   * that has to be true at the hour it is read.
   */
  const loadScenario = async (title) => {
    await page.goto(`${BASE}#/qa`)
    await page.waitForSelector('h1:has-text("QA")')
    await page.getByRole('button', { name: new RegExp(title) }).tap()
    await page.waitForSelector('.qa-scenario--active')
  }
  const openNow = async () => {
    await page.locator('.nav').getByRole('button', { name: 'Now' }).tap()
    await page.waitForSelector('h1:has-text("Now")')
  }

  await loadScenario('A morning after three bad nights')

  const sweep = page.getByTestId('qa-sweep')
  check('the laboratory offers a block sweep', (await sweep.count()) === 1)
  await sweep.tap()
  const sweptRows = await page.getByTestId('qa-sweep-rows').locator('.qa-sweep__row').count()
  check('and it answers for all five parts of the day', sweptRows === 5, `${sweptRows} rows`)
  await sideways('QA, block sweep open')

  await openNow()
  const morning = await page.locator('.screen').innerText()
  check(
    'a morning nine hours short of rest is not told to study',
    /light day/i.test(morning),
    morning.slice(0, 160),
  )
  check(
    'and nothing on that screen claims it is the evening',
    !/tonight|this evening/i.test(morning),
    (morning.match(/[^.]*(tonight|this evening)[^.]*/i) ?? [''])[0],
  )
  await sideways('Now, a morning')

  await loadScenario('Six chances, three managed')
  await openNow()
  const growth = await page.getByTestId('now-growth').innerText()
  check(
    'no run is claimed about a skill that never went well twice in a row',
    !/ordering her own food/i.test(growth),
    growth,
  )
  const growthEvidence = await page.getByTestId('now-growth-evidence').innerText()
  check(
    'and the occasions that went the other way are counted',
    /needed a hand/i.test(growthEvidence),
  )
  check(
    'with nothing that reads as a mark about a four-year-old',
    !/%|\bscore\b|\brate\b|\bout of\b/i.test(`${growth} ${growthEvidence}`),
    `${growth} ${growthEvidence}`,
  )
  await sideways('Now, a growth suggestion')

  await loadScenario('A week pointed at the house')
  await openNow()
  check(
    'stopping a recommendation family is not offered before a refusal',
    (await page.getByTestId('now-stop').count()) === 0,
  )
  await page.getByRole('button', { name: "Can't right now" }).tap()
  const stop = page.getByTestId('now-stop')
  check('and is offered behind one', (await stop.count()) === 1)

  const stopBox = await stop.boundingBox()
  clearsThumb('the stop control', stopBox?.height)

  await stop.tap()
  const confirm = await page.getByTestId('now-stop-confirm').innerText()
  check('it names the move rather than saying "this"', /kitchen/i.test(confirm), confirm)
  check('and says where it can be lifted', /lift it/i.test(confirm), confirm)
  await sideways('Now, stopping a family')

  await page.getByTestId('now-stop-move').tap()
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: /Home/ }).first().tap()
  // The page's own heading, not any heading: `h1` is already on screen while
  // Life is, so waiting for it resolves before the navigation has happened.
  await page.waitForSelector('h1:has-text("Home & Environment")')
  await page.waitForSelector('[data-testid="domain-veto"]', { timeout: 5000 }).catch(() => {})
  const listed = await page.getByTestId('domain-veto').count()
  check('the veto is listed on the area it was filed under', listed > 0)
  const lift = page.getByTestId('domain-veto-lift').first()
  const liftBox = await lift.boundingBox()
  clearsThumb('and lifting it', liftBox?.height)
  await lift.tap()
  // Appending a record is a round trip to IndexedDB, so the row leaves on the
  // render after it rather than on the tap.
  await page
    .waitForSelector('[data-testid="domain-veto"]', { state: 'detached', timeout: 5000 })
    .catch(() => {})
  check('and it goes when lifted', (await page.getByTestId('domain-veto').count()) === 0)
  await sideways('a domain page, standing vetoes')

  // ---- Phase 81.6: what QA found by pressing things -------------------------
  /*
   * QA-81-003 and QA-81-004 were both found on a deployed screen, in one
   * session, by pressing a button twice and by looking at the same sentence at
   * four hours of one day. Neither was visible to the unit suite, which was
   * green throughout. So both reproductions are pressed here, on a handset,
   * against the deployed bytes.
   */
  const nowHeadline = async () => {
    await openNow()
    return (await page.locator('.primary-surface__headline').innerText()).trim()
  }
  /** What the laboratory says the owner-local clock currently reads. */
  const ownerLocal = async () => {
    const row = await page.locator('.rows__row', { hasText: 'Owner-local' }).innerText()
    return (row.match(/(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/) ?? []).slice(1)
  }

  /*
   * Move the laboratory clock, and check that it moved.
   *
   * A hash change on the same document, which is how the owner would get there
   * and the only way the session ledger survives the trip. Each press is
   * confirmed against the clock the screen is showing rather than counted:
   * `travelTo` exists because a loop of presses can outrun the re-render and
   * land an hour short, and a gate that lands an hour short reports on a screen
   * nobody asked about.
   */
  const travel = async (direction, hours) => {
    await page.goto(`${BASE}#/qa`)
    await page.waitForSelector('h1:has-text("QA")')
    const button = page.getByRole('button', { name: `${direction}1 hour` })
    for (let step = 0; step < hours; step += 1) {
      const before = (await ownerLocal()).join(' ')
      await button.tap()
      await page
        .waitForFunction(
          (was) =>
            ![...document.querySelectorAll('.rows__row')]
              .find((row) => row.textContent?.includes('Owner-local'))
              ?.textContent?.includes(was),
          before,
          { timeout: 5000 },
        )
        .catch(() => {})
    }
  }

  /*
   * Forwards, and from the morning — QA-81-003's own hours.
   *
   * The ledger only reads entries earlier than the moment being decided, which
   * is deliberate: noting a render must not change the render it is noting. So
   * a day walked *backwards* is a day where nothing has been shown yet, and a
   * gate that walked backwards would report the defect as present forever. The
   * scenario is set at 19:30, so the trip to 06:30 happens before Now is opened
   * at all and nothing is recorded on the way.
   */
  await loadScenario('A week pointed at the house')
  await travel('−', 13)
  const acrossTheDay = [await nowHeadline()]
  for (const hours of [4, 4, 5]) {
    await travel('+', hours)
    acrossTheDay.push(await nowHeadline())
  }
  check(
    'the same sentence is not repeated through the hours of one day',
    new Set(acrossTheDay).size > 1,
    acrossTheDay.join(' | '),
  )
  await sideways('Now, later in the same session')

  await loadScenario('A week pointed at the house')
  await openNow()
  const refuseNow = () => page.getByTestId('now-actions').getByRole('button', { name: /right now/ })
  const headline = page.locator('.primary-surface__headline')
  /*
   * Waiting for the sentence to change, not for the button to exist.
   *
   * Writing the refusal is a round trip to IndexedDB and the button never
   * leaves the screen, so a second tap taken immediately lands on the same move
   * — and two refusals of one move are one refusal of one move. The gate would
   * then report the escalation missing when what it had done was refuse once,
   * twice.
   */
  const refuseAndWait = async () => {
    const before = await headline.innerText()
    await refuseNow().tap()
    await page.waitForFunction(
      (was) => document.querySelector('.primary-surface__headline')?.textContent?.trim() !== was,
      before.trim(),
      { timeout: 5000 },
    )
  }
  await refuseAndWait()
  await refuseAndWait()

  const stopped = await headline.innerText()
  check('two refusals stop the app offering', /not landing/i.test(stopped), stopped)
  check(
    'and there is nothing left to refuse a third time',
    (await page.getByTestId('now-actions').count()) === 0,
  )
  const asked = page.getByTestId('now-question')
  check('it asks instead of guessing again', (await asked.count()) === 1)
  const answerBox = await page.locator('.now-options button').first().boundingBox()
  clearsThumb('and the answer', answerBox?.height)
  await sideways('Now, two refusals in one block')

  await page.locator('.now-options button').first().tap()
  await page.waitForSelector('[data-testid="now-actions"]', { timeout: 5000 })
  check('answering it is worth something — the app looks again', true)
  await refuseAndWait()
  const stoppedForGood = await headline.innerText()
  check(
    'and the third refusal still stops the block',
    /nothing then/i.test(stoppedForGood),
    stoppedForGood,
  )
  await sideways('Now, the third refusal')

  /*
   * And the sentence the block turns over into — QA-81-007.
   *
   * This is the screen independent QA reached by pressing through the whole
   * refusal sequence and then waiting four hours, and what it printed was
   * "Nothing on the list is worth night it would cost." Broken English on a
   * real screen, in the phase about what the app says, under a green suite.
   */
  await travel('+', 4)
  const rolled = await nowHeadline()
  const rolledReason = await page.getByTestId('now-reason').innerText()
  check(
    'the block turns over into something to do or a sentence about not',
    rolled.length > 0 && rolledReason.length > 0,
    `${rolled} | ${rolledReason}`,
  )
  check(
    'and the late-night no-action copy is a sentence',
    !/worth (to)?night it would cost/i.test(rolledReason),
    rolledReason,
  )
  await sideways('Now, the block after the stop')

  /*
   * QA-81-006 — the repetition rule meeting the limiter, on a handset.
   *
   * One session on "A morning after three bad nights": 15:00, 20:00, 23:00,
   * pressing nothing. It used to end on ten minutes of subnetting recall, at
   * eleven at night, on a screen still saying he was nine hours short.
   */
  await loadScenario('A morning after three bad nights')
  await travel('+', 5)
  const afternoon = await nowHeadline()
  await travel('+', 5)
  const evening = await nowHeadline()
  await travel('+', 3)
  const lateNight = await nowHeadline()
  const lateNightScreen = await page.locator('.screen').innerText()

  check(
    'a day nine hours short opens on recovery and stays there',
    /recovery/i.test(afternoon) && /recovery/i.test(evening),
    `${afternoon} | ${evening}`,
  )
  check(
    'and never turns into the study session it spent the day declining',
    !/recalling subnetting/i.test(lateNightScreen),
    lateNight,
  )
  check(
    'and says why it has nothing rather than blaming the hour',
    /already been in front of you/i.test(lateNightScreen),
    lateNight,
  )
  await sideways('Now, the third hour of one day')

  /*
   * ------------------------------------------------------------------------
   * Phase 82 — the structural skeleton, on a handset
   * ------------------------------------------------------------------------
   *
   * Five packages end in something the owner has to find with a thumb, and
   * every one of them is new. A course he can stop, a deferral with nothing to
   * press, a day he can describe, a stage he can put back, and a date on a goal
   * that had none. The suite checks that they exist at three widths; this
   * checks that they are usable on a phone against the deployed bytes, which is
   * the distinction Phase 4 paid five defects to learn.
   */

  // ---- A course under way, and the one tap that stops it — AUD-0020 ---------
  await loadScenario('Two sessions in')
  await openNow()
  const partOf = await page.locator('.screen').innerText()
  check(
    'Now says which course the move belongs to',
    /Part of/.test(partOf) && /Three sessions on subnetting/.test(partOf),
  )
  check('and where in it, in words rather than a share', /third of three/.test(partOf))
  check('with no percentage anywhere on the screen', !/%/.test(partOf))
  await sideways('Now, a move inside a course')

  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  const stopControl = page.getByTestId('life-thread-stop')
  check('Life lists the course', (await stopControl.count()) === 1)
  const threadStopBox = await stopControl.boundingBox()
  clearsThumb('and the stop', threadStopBox?.height)
  await stopControl.tap()
  await page.waitForSelector('[data-testid="life-threads-past"]')
  const stoppedThread = await page.getByTestId('life-threads-past').innerText()
  check(
    'stopping it leaves it visible rather than vanishing',
    /Three sessions on subnetting/.test(stoppedThread) && /Stopped/.test(stoppedThread),
    stoppedThread.replace(/\s+/g, ' ').trim(),
  )
  await openNow()
  check(
    'and Now stops naming it the moment it is stopped',
    !/Part of/.test(await page.locator('.screen').innerText()),
  )
  await sideways('Life, a course stopped')

  // ---- The fifth state — AUD-0024 ------------------------------------------
  await loadScenario('Before the house is up')
  const held = await nowHeadline()
  const heldScreen = await page.locator('.screen').innerText()
  check(
    'a deferral names the part of today it is holding for',
    /The morning suits/.test(held),
    held,
  )
  check(
    'and says what is being held and why later is better',
    /has the room/.test(heldScreen) && /Adaya/.test(heldScreen),
  )
  check(
    'and offers nothing to press, because there is nothing to start',
    (await page.getByTestId('now-actions').count()) === 0,
  )
  /*
   * And one tap lower — QA-82-002.
   *
   * The round 1 report is explicit that this gate repeated the existence,
   * touch-target and overflow checks and none of the cross-line semantic
   * comparisons that found the defects. This is one of the two it was missing:
   * the panel that exists to answer *why this?* said nothing about the only
   * question a held decision raises.
   */
  await page.getByTestId('now-see-evidence').tap()
  await page.waitForSelector('[data-testid="now-evidence"]')
  const heldWhy = await page.getByTestId('now-evidence-deferral').innerText()
  check(
    'and the evidence says why later rather than now',
    /the morning/.test(heldWhy) && /not spoken for/.test(heldWhy),
    heldWhy.replace(/\s+/g, ' ').trim(),
  )
  check(
    'without arguing for doing it now under a sentence that says to wait',
    !/closes on its own/.test(heldWhy),
  )
  await sideways('Now, a deferral with its evidence open')

  // ---- The shape of the day — AUD-0004 -------------------------------------
  await loadScenario('A school morning')
  await openNow()
  const squeezed = await page.locator('.screen').innerText()
  check(
    'the time limiter says what the time is short of',
    /minutes before Adaya/.test(squeezed),
    (squeezed.match(/About \d+ minutes before [^.]*\./) ?? ['not found'])[0],
  )
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  const dayShape = await page.getByTestId('day-shape-list').innerText()
  check(
    'and Life reads the obligation back in the owner’s own words',
    /08:30 to 15:00, weekdays/.test(dayShape),
    dayShape.replace(/\s+/g, ' ').trim(),
  )
  await sideways('Life, the day’s shape')

  /*
   * And two hours on, inside the window — QA-82-001.
   *
   * The other comparison this gate was missing. It read the run-up to her
   * school day and never walked into it, so the hours the app was wrong about
   * her were the hours nothing here ever looked at.
   */
  await page.goto(`${BASE}#/qa`)
  await page.waitForSelector('h1:has-text("QA")')
  await page.getByRole('button', { name: '+1 hour' }).tap()
  await page.getByRole('button', { name: '+1 hour' }).tap()
  await openNow()
  const insideSchool = await page.getByTestId('now-premise').innerText()
  check(
    'the premise stops claiming she is here once her school day has started',
    !/Adaya is here/.test(insideSchool),
    insideSchool.replace(/\s+/g, ' ').trim(),
  )
  check(
    'and says where she is instead of going quiet about her',
    /school day is on until 15:00/.test(insideSchool),
  )
  const insideScreen = await page.locator('.screen').innerText()
  check(
    'and nothing on the screen offers time with someone at school',
    !/with Adaya/.test(insideScreen),
  )
  check(
    'while the middle of her school day is still his to use',
    !/About \d+ minutes before Adaya/.test(insideScreen),
  )
  /*
   * And the two fact surfaces one tap away — QA-82-001, round 2.
   *
   * Now was repaired in round 1 and this gate checked Now. The laboratory's
   * own ledger and the Fatherhood page render the concept registry, knew
   * nothing about the repair, and went on printing the durable arrangement as
   * the answer to whether she was here.
   */
  // The ledger lives on the laboratory screen, and the clock stays where it was.
  await page.goto(`${BASE}#/qa`)
  await page.waitForSelector('h1:has-text("QA")')
  const ledger = await page.getByTestId('qa-facts').innerText()
  check(
    'the fact ledger separates whose day it is from where she is',
    /Child in the owner’s care today/.test(ledger) && /Child here right now/.test(ledger),
    ledger.replace(/\s+/g, ' ').slice(0, 160),
  )
  check(
    'and the current reading names the span that took her',
    /school day is on until 15:00/.test(ledger),
  )
  check(
    'and nothing on it is used for whether she is here',
    !/for whether she is here/.test(ledger),
  )

  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: 'Fatherhood / Family' }).tap()
  await page.waitForSelector('h1:has-text("Fatherhood")')
  const believes = await page.locator('.domain-reading').allInnerTexts()
  const presence = believes.find((row) => /Child here right now/.test(row)) ?? ''
  check(
    'the Fatherhood page says where she actually is',
    /school day is on until 15:00/.test(presence),
    presence.replace(/\s+/g, ' ').trim(),
  )
  check('and offers no correction on a thing the app worked out', !/Not right\?/.test(presence))
  await sideways('Fatherhood, inside the school window')

  /*
   * And the document the owner would hand somebody — QA-82-005.
   *
   * A third surface, and the one the previous two repairs did not reach: the
   * review export is built from raw fact state rather than from the decision,
   * and it printed the current reading in one section and called the same
   * concept "never answered" in another.
   */
  await page.goto(`${BASE}#/data`)
  await page.waitForSelector('h1:has-text("Data")')
  await page.getByRole('button', { name: 'Select all' }).tap()
  const exported = await page.getByTestId('export-text').inputValue()
  check(
    'the export carries the reading it worked out',
    /Child here right now — No — Adaya’s school day is on until 15:00\./.test(exported),
  )
  check(
    'and never calls that same fact one nobody answered',
    !/Child here right now — never answered/.test(exported),
  )
  check(
    'while still saying what it genuinely has not heard',
    /Things the app knows it does not know:/.test(exported) && /— never answered/.test(exported),
  )
  await sideways('Data, the export inside the school window')

  /*
   * And the two things that document says about itself — QA-82-007 and
   * QA-82-008.
   *
   * Both are read on the handset from the document one tap produces, because
   * both were found by reading a whole generated export rather than by
   * checking a string in it. `Select all` reaches Diagnostics and deliberately
   * does not reach the private section, so the leak was on by default.
   */
  await loadScenario('Two ordinary weeks')
  await page.goto(`${BASE}#/data`)
  await page.waitForSelector('h1:has-text("Data")')
  await page.getByRole('button', { name: 'Select all' }).tap()
  const withPrivateOff = await page.getByTestId('export-text').inputValue()
  check(
    'the export leaves the private area out, and says so',
    /The Private \/ Sexual Health section is left out\./.test(withPrivateOff),
  )
  check(
    'and says nothing about it under diagnostics either',
    !/Recent private pattern/.test(withPrivateOff) && !/Private entry/.test(withPrivateOff),
  )
  check(
    'while still reporting the record it may describe',
    /Every count below is of the part of the record this document may describe/.test(
      withPrivateOff,
    ) && /- Records still standing after corrections: \d+/.test(withPrivateOff),
  )
  /*
   * And it says what it was worked out from — QA-82-007, round 5.
   *
   * The exclusion reaches the record the document is composed from, not only
   * the rows it prints, so the app's own screen can be saying something else.
   * A reader not told that would take this for a photograph of it.
   */
  check(
    'and says the app itself reads more than this document does',
    /Everything below is worked out from the part of the record in this document/.test(
      withPrivateOff,
    ),
  )
  await sideways('Data, the private area left out')

  await loadScenario('One answer, and a lot of silence')
  await page.goto(`${BASE}#/data`)
  await page.waitForSelector('h1:has-text("Data")')
  await page.getByRole('button', { name: 'Select all' }).tap()
  const withdrawn = await page.getByTestId('export-text').inputValue()
  check(
    'a withdrawn answer is not one that was never given',
    /Soreness or pain — answered once, and the answer was withdrawn/.test(withdrawn) &&
      !/Soreness or pain — never answered/.test(withdrawn),
  )
  check(
    'and something nobody has been asked still reads that way',
    /— never answered/.test(withdrawn),
  )
  await sideways('Data, why it does not know')

  await openNow()
  await sideways('Now, inside the school window')

  // ---- A stage on a child’s skill, set and unset — AUD-0015(a) --------------
  await loadScenario('Three times running, and the app noticed')
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: 'Fatherhood / Family' }).tap()
  await page.waitForSelector('h1:has-text("Fatherhood")')
  const stage = page.getByTestId('domain-skill-stage')
  const stageBox = await stage.boundingBox()
  clearsThumb('the growth stage', stageBox?.height)
  await stage.tap()
  await page.waitForSelector('[data-testid="domain-skill"]:has-text("Settled")')
  check('one tap settles it', true)
  await page.getByTestId('domain-skill-stage').tap()
  await page.waitForSelector('[data-testid="domain-skill"]:has-text("Being worked on")')
  check('and one tap puts it back — it is never permanent', true)
  const skillRow = await page.getByTestId('domain-skill').innerText()
  check(
    'and nothing on the row grades her',
    !/%|percent|score|rank|grade/i.test(skillRow),
    skillRow.replace(/\s+/g, ' ').trim(),
  )
  await sideways('Fatherhood, a growth stage')

  // ---- A goal with a date and pieces — AUD-0046, AUD-0021 -------------------
  await loadScenario('A week pointed at the house')
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: 'Career & Learning' }).tap()
  await page.waitForSelector('h1:has-text("Career")')
  const trajectory = await page.getByTestId('domain-goal-trajectory').innerText()
  check(
    'the goal says how many pieces have moved and when the date is',
    /pieces/.test(trajectory) && /date you set/.test(trajectory),
    trajectory.replace(/\s+/g, ' ').trim(),
  )
  check('in counts, never a share', !/%|percent|score/i.test(trajectory))
  check(
    'and the date control is closed until it is asked for',
    (await page.getByTestId('domain-goal-date').count()) === 0,
  )
  await page.getByTestId('domain-goal-open').tap()
  await page.waitForSelector('[data-testid="domain-goal-date"]')
  check('and opens on a tap', true)
  await sideways('Career, a goal with a date')

  /*
   * ------------------------------------------------------------------------
   * Routing 83 — the instrument, and the things that are untrue, on a handset
   * ------------------------------------------------------------------------
   *
   * Every one of this phase's four repairs was found by a person with a
   * browser, and three of them are sentences. The suite reads them at three
   * widths; this reads them on the deployed bytes, in a Galaxy-class context,
   * because that is the distinction Phase 4 paid five defects to learn.
   */

  // ---- A completion three days back does not settle today — D-160 -----------
  await loadScenario('Three days since that walk')
  await openNow()
  const staleWalk = await page.locator('.screen').innerText()
  check('a walk is proposed three days after one was finished', /a walk/.test(await nowHeadline()))
  check(
    'and the card does not claim a standing it does not have',
    !/Where this stands/.test(staleWalk),
    (staleWalk.match(/Where this stands[^\n]*/) ?? ['not present'])[0],
  )

  const lifecycle = page.getByTestId('now-actions')
  check('the five controls are drawn', (await lifecycle.count()) === 1)
  for (const label of ['Start it', 'Done', 'Something else', "Can't right now", 'Not today']) {
    const control = lifecycle.getByRole('button', { name: label })
    check(`"${label}" is live`, (await control.isDisabled()) === false)
    clearsThumb(`"${label}"`, (await control.boundingBox())?.height)
  }
  await sideways('Now, a walk three days after one was finished')

  // And the other half: today's own start really does settle it.
  await lifecycle.getByRole('button', { name: 'Start it' }).tap()
  await page.waitForSelector('.rows')
  const underWay = await page.locator('.rows').innerText()
  check(
    'starting it today does say where it stands',
    /Where this stands/.test(underWay) && /Under way/.test(underWay),
    underWay.replace(/\s+/g, ' ').trim().slice(0, 120),
  )

  // ---- Nothing claims a quantity of history nobody counted — F39 ------------
  await loadScenario('One answer, and a lot of silence')
  await openNow()
  const fourRecords = await page.locator('.screen').innerText()
  check('four records are not called plenty', !/plenty of history/i.test(fourRecords))

  await page.locator('.nav').getByRole('button', { name: 'Timeline' }).tap()
  await page.waitForSelector('h1:has-text("Timeline")')
  const timeline = await page.locator('.screen').innerText()
  check(
    'Timeline says what is recorded rather than what happened',
    /Everything recorded here/.test(timeline) && !/Everything that happened/.test(timeline),
  )
  const extent = await page.getByTestId('tl-end').innerText()
  check(
    'and does not call part of the record the whole of it',
    /up to the moment on screen/.test(extent) && /dated later/.test(extent),
    extent.replace(/\s+/g, ' ').trim(),
  )
  await sideways('Timeline, a history with an entry dated later')

  // ---- The private promise, read from both ends — F30 -----------------------
  await loadScenario('Two ordinary weeks')
  await page.goto(`${BASE}#/life/private`)
  await page.waitForSelector('h1:has-text("Private")')
  const privatePage = await page.locator('.screen').innerText()
  check(
    'the Private page promises what the behaviour keeps',
    /The words stay on this page/.test(privatePage) &&
      /Timeline shows that an entry exists and when/.test(privatePage),
  )
  check(
    'and no longer promises more than that',
    !/Nothing here appears anywhere else/.test(privatePage),
  )
  await sideways('the Private page')

  await page.locator('.nav').getByRole('button', { name: 'Timeline' }).tap()
  await page.waitForSelector('h1:has-text("Timeline")')
  const withPrivate = await page.locator('.screen').innerText()
  check('and Timeline does exactly that — the entry is there', /Private entry/.test(withPrivate))
  check('and the words are not', !/late scrolling/.test(withPrivate))

  // ---- Every control the owner can reach has a name — F40, D-176 ------------
  await page.goto(`${BASE}#/life/emotional`)
  await page.waitForSelector('h1:has-text("Emotional")')
  await page
    .getByRole('button', { name: /Not right\?|Add this/ })
    .first()
    .tap()
  const namedField = page.getByRole('textbox', { name: /in your own words/i })
  check('the free-text correction has an accessible name', (await namedField.count()) === 1)
  clearsThumb('the free-text correction', (await namedField.boundingBox())?.height)
  check(
    'and says what the app will do with the answer',
    /from now on/.test(await page.locator('.domain-correction__note').innerText()),
  )
  await sideways('a domain page with a correction open')

  /*
   * The sweep, on the deployed bytes.
   *
   * `element.labels` is what a browser computes a name from, so this asks the
   * page the same question a screen reader would rather than checking which
   * attribute happened to be used.
   */
  for (const route of ['now', 'life', 'timeline', 'insights', 'more', 'data', 'life/career']) {
    await page.goto(`${BASE}#/${route}`)
    await page.waitForSelector('h1')
    const nameless = await page
      .locator('.screen')
      .locator('input, textarea, select')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const element = node
            const labelled = element.getAttribute('aria-labelledby')
            const fromIds =
              labelled === null
                ? ''
                : labelled
                    .split(/\s+/)
                    .map((id) => document.getElementById(id)?.textContent ?? '')
                    .join(' ')
            const fromLabels = [...(element.labels ?? [])]
              .map((label) => label.textContent ?? '')
              .join(' ')
            const name = (element.getAttribute('aria-label') ?? '') + fromIds + fromLabels
            return name.trim() === '' ? `${element.tagName.toLowerCase()}.${element.className}` : ''
          })
          .filter(Boolean),
      )
    check(`every control on ${route} has a name`, nameless.length === 0, nameless.join(', '))
  }

  // ---- The card round 1 read — QA-83-001, QA-83-002 -------------------------
  await loadScenario('Three days since that walk')
  await openNow()
  const walkReason = await page.getByTestId('now-reason').innerText()
  check(
    'one comparable occasion is not called the last few times',
    !/the last few times/i.test(walkReason) && /the one time before/i.test(walkReason),
    walkReason,
  )
  const restsOn = await page.getByTestId('now-rests-on').innerText()
  check(
    'the belief names the walk rather than the verb',
    /getting out for a walk/i.test(restsOn) && !/^Move has/.test(restsOn.trim()),
    restsOn.replace(/\s+/g, ' ').trim(),
  )
  const correctName = await page
    .getByTestId('now-rests-on')
    .locator('button')
    .getAttribute('aria-label')
  check(
    'and so does the button that corrects it',
    /getting out for a walk/i.test(correctName ?? ''),
    correctName ?? 'no name',
  )
  await sideways('Now, the card round 1 read')

  // ---- What an ordinary owner can reach from a near-empty store — D-161 -----
  await loadScenario('The first evening')
  await openNow()
  const firstEvening = await page.locator('.screen').innerText()
  const firstQuestion = page.getByTestId('now-question')
  check(
    'a near-empty store is asked one question rather than shown a form',
    (await firstQuestion.count()) === 1 &&
      (await page.locator('.now-options .now-option').count()) <= 4,
    firstEvening.replace(/\s+/g, ' ').trim().slice(0, 160),
  )
  clearsThumb(
    'the first answer offered',
    (await page.locator('.now-option').first().boundingBox())?.height,
  )
  check('and it does not claim a history it has not got', !/plenty of history/i.test(firstEvening))
  await sideways('Now, on the first evening')

  /*
   * ------------------------------------------------------------------------
   * Routing 84 — what the owner is trying to become, on a handset
   * ------------------------------------------------------------------------
   *
   * QA r84Asked for this in Round 1 and it was the one request the repair had not
   * answered: the phase's own controls read at three widths and never on the
   * deployed bytes with a thumb. Everything below is reached the way the owner
   * reaches it — from the near-empty store, by tapping.
   */

  // ---- Naming an aspiration, from one record — F01, D-173 -------------------
  await loadScenario('The first evening')
  await page.goto(`${BASE}#/life/career`)
  await page.waitForSelector('h1:has-text("Career")')
  check(
    'the aspiration control is closed until it is asked for',
    (await page.getByTestId('destination-form').count()) === 0,
  )
  const r84OpenAim = page.getByTestId('destination-open')
  clearsThumb('the aspiration control', (await r84OpenAim.boundingBox())?.height)
  await r84OpenAim.tap()
  await page.waitForSelector('[data-testid="destination-form"]')

  const r84AimBox = page.getByTestId('destination-aim-input')
  clearsThumb('the aspiration box', (await r84AimBox.boundingBox())?.height)
  await r84AimBox.fill('Working as a cloud engineer')
  const r84AimForm = await page.getByTestId('destination-form').innerText()
  check(
    'the optional next step says plainly that leaving it empty creates nothing',
    /nothing is created/.test(r84AimForm),
    r84AimForm.replace(/\s+/g, ' ').trim().slice(0, 200),
  )
  check(
    'and never confirms a next step he did not name',
    !/“that”/.test(r84AimForm) && !/currently studying/.test(r84AimForm),
  )
  await sideways('Career, naming an aspiration')

  await page.getByTestId('destination-save').tap()
  await page.waitForSelector('[data-testid="destination-aim"]')
  const r84Named = await page.getByTestId('destination-aim').innerText()
  check(
    'his words come back exactly as he wrote them',
    r84Named.includes('Working as a cloud engineer'),
    r84Named.replace(/\s+/g, ' ').trim(),
  )
  const r84Card = await page.getByTestId('destination').innerText()
  check(
    'and nothing on it scores him — D-162',
    !/%|percent|score|rank|grade|\bon track\b/i.test(r84Card),
    r84Card.replace(/\s+/g, ' ').trim().slice(0, 200),
  )
  check(
    'what it does not know is named rather than filled — F01',
    (await page.getByTestId('destination-missing').count()) >= 1,
    r84Card.replace(/\s+/g, ' ').trim().slice(0, 200),
  )
  await sideways('Career, with an aspiration on it')

  // ---- Attendance is not capability — gate item 2 ---------------------------
  await loadScenario('Two sessions in')
  await page.goto(`${BASE}#/life/career`)
  await page.waitForSelector('h1:has-text("Career")')
  const r84Happened = await page.locator('.screen').innerText()
  check(
    'what has actually happened is counted rather than rated',
    !/%|percent|\bscore\b|\bgrade\b|\bproficien/i.test(r84Happened),
    (r84Happened.match(/[^\n]*(%|percent|score|grade)[^\n]*/i) ?? ['clean'])[0],
  )
  check(
    'and a session says what it is not evidence of',
    /not what it came to|does not say|is not/i.test(r84Happened),
  )
  await sideways('Career, what has actually happened')

  // ---- The second agenda, and the confirmation it now shows — D-188 ---------
  await loadScenario('The first evening')
  await page.locator('.nav').getByRole('button', { name: 'Insights' }).tap()
  await page.waitForSelector('h1:has-text("Insights")')
  const r84Closed = page.getByTestId('discovery-closed')
  check('the second agenda is one closed line until it is tapped', (await r84Closed.count()) === 1)
  const r84OpenAgenda = page.getByTestId('discovery-open')
  clearsThumb('the agenda control', (await r84OpenAgenda.boundingBox())?.height)
  await r84OpenAgenda.tap()
  await page.waitForSelector('[data-testid="discovery-prompt"]')

  check(
    'and proposes nothing before there is anything to propose',
    (await page.getByTestId('discovery-proposal').count()) === 0,
  )
  check(
    'with the confirm control held until then',
    await page.getByTestId('discovery-save').isDisabled(),
  )

  await page.getByTestId('discovery-answer').fill('More money')
  await page.waitForSelector('[data-testid="discovery-proposal"]')
  const r84Proposed = await page.getByTestId('discovery-proposal').innerText()
  check(
    'the card says what it understood, in his words',
    /More money/.test(r84Proposed),
    r84Proposed.replace(/\s+/g, ' ').trim().slice(0, 200),
  )
  /*
   * D-188's contract, in the words the card actually uses — QA-91-004.
   *
   * This asserted the literal `will not assume`, which was the whole sentence
   * until routing 91 split the unknowns into two named sets so that six of them
   * stopped arriving as a seven-line comma-run (D-248). **The contract is
   * unchanged and the wording is not**: what has to be true is that the card
   * says what it has not concluded before anything is written, and both halves
   * are named here so a future rewording fails loudly rather than passing on a
   * substring that happens to survive.
   */
  check(
    'and what it is not assuming, before anything is written — D-188, D-248',
    /do not say/.test(r84Proposed) &&
      /has not been told/.test(r84Proposed) &&
      /next step/.test(r84Proposed),
    r84Proposed.replace(/\s+/g, ' ').trim().slice(0, 200),
  )

  /*
   * And the reading is offered rather than asserted — routing 91, rule 4.
   *
   * What stood here was routing 84's D-172 check: *does not read a second
   * meaning into the phrase*. Routing 91 is the phase that reads it, so that
   * claim is no longer the product's. It was still passing — but only because
   * the reading renders in a **sibling** of the block this variable holds, which
   * is a check passing for a reason unrelated to what it says (D-238).
   *
   * The live rule is stronger and is what is asserted now: the app may say the
   * words sound like they are about Money, and until the owner says otherwise
   * the aim is still going where the question was.
   */
  const r84Reading = await page.getByTestId('discovery-reading').innerText()
  check(
    'reads a second meaning and offers it rather than taking it — routing 91, rule 4',
    /sound like they are about Money/.test(r84Reading) &&
      /aiming at in Career & Learning/.test(r84Proposed),
    `${r84Reading} | ${r84Proposed}`.replace(/\s+/g, ' ').trim().slice(0, 220),
  )
  check(
    'with the row that changes nothing selected until he says otherwise',
    (await page.getByTestId('discovery-keep').getAttribute('aria-pressed')) === 'true',
  )
  await sideways('Insights, the agenda with a proposal on it')

  // ---- What was in the way, including the cause the owner needed — D-187 ----
  await loadScenario('The first evening')
  await openNow()
  for (let r84Taps = 0; r84Taps < 4; r84Taps += 1) {
    if ((await page.getByTestId('now-actions').count()) > 0) break
    const r84Options = page.locator('.now-option')
    if ((await r84Options.count()) === 0) break
    const r84Enough = r84Options.filter({ hasText: /Enough|Nothing/ })
    await ((await r84Enough.count()) > 0 ? r84Enough.first() : r84Options.first()).tap()
    await page.waitForTimeout(150)
  }
  await page.getByTestId('now-actions').getByRole('button', { name: "Can't right now" }).tap()
  await page.waitForSelector('[data-testid="blocker-question"]')

  const r84Causes = await page
    .getByTestId('blocker-question')
    .locator('.domain-options .domain-option')
    .count()
  /*
   * Nine now — routing 92 added the bounded form of the supervision answer.
   *
   * S2 Tier 1 asks for a bounded `until` on a constraint, and §5.2 records that
   * *"while she is asleep"* had no representation because no blocker path ever
   * set `ConstraintRecord.until`. D-164 allows **one** compact question about
   * what was in the way, so the bound travels with the answer as a second
   * button rather than following it as a second question — which is why this
   * count moved and the number of questions did not.
   *
   * The count is asserted rather than bounded because it is the whole point of
   * the check: every cause the app knows about has to be reachable in one
   * screen, on a phone, without scrolling past it.
   */
  check('all nine causes are offered on one screen', r84Causes === 9, `${r84Causes} controls`)
  const r84MustStay = page.getByTestId('blocker-must-stay')
  check(
    'including the one for being the only person who can watch somebody',
    (await r84MustStay.count()) === 1,
  )
  clearsThumb('that cause', (await r84MustStay.boundingBox())?.height)

  const r84Asked = await page.getByTestId('blocker-question').innerText()
  /*
   * The same rule the other two gates apply, from the same module — QA-84-010.
   * This carried its own narrower copy of a phrase blacklist and passed while
   * the note promised *"the app can offer something that fits next time"*.
   */
  const r84Claims = adaptationClaims(r84Asked)
  check(
    'and the question promises no change the engine cannot make — D-187',
    r84Claims.length === 0,
    r84Claims.join(' / ') || r84Asked.replace(/\s+/g, ' ').trim().slice(0, 200),
  )
  check(
    'and every word of it comes from the approved catalogue — D-193',
    containsApprovedBlockerCopy(r84Asked),
    r84Asked.replace(/\s+/g, ' ').trim().slice(0, 200),
  )
  await sideways('Now, what was in the way')

  await r84MustStay.tap()
  await page.goto(`${BASE}#/life/health-recovery`)
  await page.waitForSelector('h1:has-text("Health")')
  const r84Standing = page.getByTestId('domain-blocker')
  check(
    'choosing it writes something durable on the area it belonged to',
    (await r84Standing.count()) >= 1,
  )
  const r84Kept = await r84Standing.first().innerText()
  check(
    'which says what happened and nothing about what follows from it',
    /in my care/.test(r84Kept) && adaptationClaims(r84Kept).length === 0,
    r84Kept.replace(/\s+/g, ' ').trim(),
  )

  /*
   * The whole panel, not the row — QA-84-012.
   *
   * This read the standing blocker's own row and stopped there, so the panel
   * title, the paragraph above the rows and the withdrawal control's accessible
   * name were outside every gate. A promise written into any of them rendered
   * on a green board.
   */
  const r84Panel = page.locator('.panel', { has: page.getByTestId('domain-blocker') }).first()
  const r84Sentences = (await r84Panel.evaluate(readingUnits)).map((unit) => unit.text)
  const r84Statement = 'a walk means leaving, and I could not — someone was in my care.'
  const r84Promises = r84Sentences.filter((line) => adaptationClaims(line).length > 0)
  check(
    'and no sentence anywhere in that panel promises a change the engine cannot make',
    r84Sentences.length > 3 && r84Promises.length === 0,
    r84Promises.join(' / ') || `${r84Sentences.length} sentences read`,
  )
  const r84Unapproved = r84Sentences
    .map((line) => line.split(r84Statement).join('{statement}'))
    .filter((line) => line !== '{statement}' && !line.startsWith('Not true any more: '))
    .filter((line) => !containsApprovedBlockerCopy(line))
  check(
    'and every sentence of it that is the app’s own was approved — D-194',
    r84Unapproved.length === 0,
    r84Unapproved.join(' / ') || 'all approved',
  )
  const r84Lift = page.getByTestId('domain-blocker-lift').first()
  check('and there is always a way out of it', (await r84Lift.count()) === 1)
  clearsThumb('the way out', (await r84Lift.boundingBox())?.height)
  await r84Lift.tap()
  await page.waitForSelector('[data-testid="domain-blocker"]', { state: 'detached' })
  check('one tap takes it back', true)
  await sideways('Health & Recovery, a standing blocker lifted')

  /*
   * ------------------------------------------------------------------------
   * QA round 2 — the four the retest found, on a handset
   * ------------------------------------------------------------------------
   */

  // ---- A first run offers an ordinary way on — QA-84-007 --------------------
  /*
   * A genuinely fresh store, which means a fresh **context**.
   *
   * `seedOwnerHistory` ran near the top of this gate and the history lives in
   * IndexedDB, so navigating back to the root does not produce a first run — it
   * produces the seeded owner's Now. The first draft of this block did exactly
   * that and waited thirty seconds for a control that only exists on an empty
   * store. The failure was honest and the check was not: it did not test what
   * its own name said.
   */
  const coldContext = await browser.newContext({ ...ANDROID })
  const cold = await coldContext.newPage()
  await cold.goto(BASE)
  await cold.waitForSelector('h1:has-text("Now")')
  const r2Cold = await cold.locator('.screen').innerText()
  check(
    'a first run still refuses to guess',
    /no history here yet/i.test(r2Cold),
    r2Cold.replace(/\s+/g, ' ').trim().slice(0, 120),
  )
  const r2ToInsights = cold.getByTestId('empty-to-insights')
  check(
    'and offers an ordinary way on rather than a developer tool',
    (await r2ToInsights.count()) === 1,
  )
  clearsThumb('the way on', (await r2ToInsights.boundingBox())?.height)
  check(
    'and invents no recommendation to fill the screen',
    (await cold.getByTestId('now-actions').count()) === 0,
  )
  const r2ColdOverflow = await cold.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  check(
    'no horizontal overflow (Now, on a first run)',
    r2ColdOverflow <= 1,
    `${r2ColdOverflow}px of overflow`,
  )

  await cold.goto(`${BASE}#/life`)
  await cold.waitForSelector('h1:has-text("Life")')
  const r2Areas = await cold.getByRole('link', { name: /Career & Learning/ }).count()
  check('Life lists its areas on an empty store', r2Areas === 1)
  await cold.goto(`${BASE}#/life/career`)
  await cold.waitForSelector('h1:has-text("Career")')
  check(
    'and the aspiration control is there before there is any history',
    (await cold.getByTestId('destination-open').count()) === 1,
  )
  check(
    'as are the six things he can tell it about',
    (await cold.getByTestId('authoring-kinds').count()) === 1,
  )
  await coldContext.close()

  // ---- Timeline does not contradict itself about extent — QA-84-009 ---------
  await loadScenario('The first evening')
  await openNow()
  for (let taps = 0; taps < 4; taps += 1) {
    if ((await page.getByTestId('now-actions').count()) > 0) break
    const options = page.locator('.now-option')
    if ((await options.count()) === 0) break
    const enough = options.filter({ hasText: /Enough|Nothing/ })
    await ((await enough.count()) > 0 ? enough.first() : options.first()).tap()
    await page.waitForTimeout(150)
  }
  await page.getByTestId('now-actions').getByRole('button', { name: 'Start it' }).tap()
  await page.getByTestId('now-actions').getByRole('button', { name: 'Only part of it' }).tap()
  await page.waitForSelector('.rows')

  await page.locator('.nav').getByRole('button', { name: 'Timeline' }).tap()
  await page.waitForSelector('h1:has-text("Timeline")')
  const r2Timeline = await page.locator('.screen').innerText()
  const r2Row = (r2Timeline.match(/[^\n]*\n?[^\n]*Got part of the way[^\n]*/) ?? [''])[0]
  check(
    'the partial event reads as partial on Timeline',
    /Got part of the way/.test(r2Timeline),
    r2Timeline.replace(/\s+/g, ' ').trim().slice(0, 160),
  )
  check(
    'and its tag does not say the opposite one line above it',
    /Part done/.test(r2Row) && !/\bDone\b/.test(r2Row.replace(/Part done/g, '')),
    r2Row.replace(/\s+/g, ' ').trim(),
  )
  await sideways('Timeline, a partial completion')

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
